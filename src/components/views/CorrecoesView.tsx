import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Camera, 
  CameraOff,
  Sparkles, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MinusCircle, 
  Save, 
  Trash2, 
  ArrowRight, 
  Home, 
  RotateCw, 
  Upload, 
  User, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Check, 
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Info,
  Layers,
  Award,
  Crosshair,
  Focus,
  Sun,
  Compass,
  ScanLine,
  Share2,
  ExternalLink
} from 'lucide-react';
import { ShareModal } from '../ShareModal';
import { 
  Assessment, 
  Student, 
  CorrectionRecord, 
  Alternative, 
  StudentAnswer, 
  SystemSettings, 
  QuestionEvaluationStatus 
} from '../../types';
import { playThreeLoudBeeps, playSheetDetectedTone, playLongBeep } from '../../utils/audioFeedback';
import { generateSyntheticAnswerSheet } from '../../utils/omrTestCardGenerator';
import { sendImageToOmrVisionApi } from '../../services/omrVisionService';
import { executePureOmrScan } from '../../services/pureOmrEngine';
import { detectFramingCorners } from '../../services/perspectiveWarpService';
import { storageService } from '../../services/storage';
import {
  measureFrameSharpness,
  processIndustrialImageEnhancement,
  captureStabilizedFrame,
  SharpnessMetrics,
  SharpnessFilterMode,
} from '../../services/industrialOmrEnhancer';

export interface CorrecoesViewProps {
  assessments: Assessment[];
  students: Student[];
  corrections: CorrectionRecord[];
  settings?: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onSaveCorrection: (record: CorrectionRecord) => void;
  onDeleteCorrection?: (correctionId: string) => void;
  preselectedAssessmentId?: string;
  preselectedStudentId?: string;
  onNavigate?: (tab: 'inicio' | 'turmas' | 'avaliacoes' | 'correcoes' | 'boletim' | 'relatorios' | 'consultas' | 'configuracoes' | 'manutencao' | 'ajuda') => void;
  onOpenShareModal?: () => void;
}

export type ScanQuality = '720p' | '1080p';
export type ScanEngine = 'hybrid' | 'gemini_vision' | 'pure_omr';

interface QuestionCheckItem {
  questionNumber: number;
  markedAlternative: Alternative | 'BLANK' | 'MULTIPLE';
  officialAlternative: Alternative;
  status: QuestionEvaluationStatus;
  weight: number;
  score: number;
}

interface ScanResultSummary {
  assessmentId: string;
  assessmentTitle: string;
  turmaId: string;
  turmaName: string;
  studentId: string;
  studentName: string;
  totalQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  erasedCount: number; // Rasuradas ou com mais de uma marcação
  blankCount: number;  // Em branco / Nulas
  answers: QuestionCheckItem[];
  scannedAt: string;
  capturedImageUrl?: string;
  engineUsed: ScanEngine;
  executionTimeMs: number;
}

export const CorrecoesView: React.FC<CorrecoesViewProps> = ({
  assessments,
  students,
  corrections,
  settings,
  onUpdateSettings,
  onSaveCorrection,
  onDeleteCorrection,
  preselectedAssessmentId,
  preselectedStudentId,
  onNavigate,
  onOpenShareModal,
}) => {
  // 1. Seletor de Teste a ser escaneado
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(() => {
    if (preselectedAssessmentId && assessments.some((a) => a.id === preselectedAssessmentId)) {
      return preselectedAssessmentId;
    }
    return assessments[0]?.id || '';
  });

  const selectedAssessment = useMemo(() => {
    return assessments.find((a) => a.id === selectedAssessmentId) || assessments[0] || null;
  }, [assessments, selectedAssessmentId]);

  // Alunos da turma da avaliação selecionada
  const turmaStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    return students.filter((s) => s.turmaId === selectedAssessment.turmaId);
  }, [students, selectedAssessment]);

  // Alunos ativos da turma
  const activeStudents = useMemo(() => {
    return turmaStudents.filter((s) => s.active !== false);
  }, [turmaStudents]);

  // 2. Seletor de Aluno a ser escaneado
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (preselectedStudentId && turmaStudents.some((s) => s.id === preselectedStudentId)) {
      return preselectedStudentId;
    }
    return activeStudents[0]?.id || turmaStudents[0]?.id || '';
  });

  // Atualiza aluno selecionado caso mude a avaliação/turma
  useEffect(() => {
    if (turmaStudents.length > 0 && !turmaStudents.some((s) => s.id === selectedStudentId)) {
      const firstActive = activeStudents[0] || turmaStudents[0];
      setSelectedStudentId(firstActive ? firstActive.id : '');
    }
  }, [turmaStudents, activeStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return turmaStudents.find((s) => s.id === selectedStudentId) || null;
  }, [turmaStudents, selectedStudentId]);

  // 3. Qualidade da Imagem: Padrão 720p HD (solicitado pelo usuário)
  const [quality, setQuality] = useState<ScanQuality>(() => {
    return settings?.cameraResolution === '1080p' ? '1080p' : '720p';
  });

  // 4. Três tipos de motores: Padrão Motor Gemini (solicitado pelo usuário)
  const [engine, setEngine] = useState<ScanEngine>(() => {
    return (settings?.scanEngineMode as ScanEngine) || 'gemini_vision';
  });

  // 5. Melhorias de Nitidez Industrial & Sistema OMR: Padrão Nitidez Padrão e Retículo Limpo
  const [sharpnessMode, setSharpnessMode] = useState<SharpnessFilterMode>('sharp');
  const [viewfinderStyle, setViewfinderStyle] = useState<'industrial' | 'clean'>('clean');
  const [realtimeSharpness, setRealtimeSharpness] = useState<SharpnessMetrics | null>(null);
  const [tiltAngle, setTiltAngle] = useState<number>(0);
  const [isLevel, setIsLevel] = useState<boolean>(true);

  // Congelamento de Imagem: Sugerido Desligado pelo usuário (câmera com foco contínuo e vídeo sempre ao vivo)
  const [autoFreezeEnabled, setAutoFreezeEnabled] = useState<boolean>(() => {
    return settings?.autoFreezeOnSharpness ?? false;
  });

  useEffect(() => {
    if (settings && typeof settings.autoFreezeOnSharpness === 'boolean') {
      setAutoFreezeEnabled(settings.autoFreezeOnSharpness);
    }
  }, [settings?.autoFreezeOnSharpness]);

  // Modal de Compartilhamento do Aplicativo
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Scanner & Câmera States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');

  // Estado de Congelamento Óptico quando enquadramento e foco ideais são detectados
  const [frozenFrame, setFrozenFrame] = useState<{ canvas: HTMLCanvasElement; dataUrl: string } | null>(null);
  const [isFrameFrozen, setIsFrameFrozen] = useState<boolean>(false);
  const consecutiveIdealRef = useRef<number>(0);
  const isFreezingRef = useRef<boolean>(false);

  // Resultado da leitura e checagem
  const [scanResult, setScanResult] = useState<ScanResultSummary | null>(null);

  // Refs de mídia e canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Descongela o quadro, limpa a leitura anterior e retoma a câmera ao vivo
  const handleUnfreeze = useCallback(() => {
    setFrozenFrame(null);
    setIsFrameFrozen(false);
    consecutiveIdealRef.current = 0;
    isFreezingRef.current = false;
    // REQUISITO DO USUÁRIO: quando acionado o botão retomar na tela OMR, limpar a leitura anterior
    setScanResult(null);
    setFeedbackToast('Leitura anterior limpa e câmera retomada!');
    setTimeout(() => setFeedbackToast(null), 2500);
    if (videoRef.current && isCameraActive) {
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Medição contínua em tempo real: detecta enquadramento e foco ideais, emite beep longo e congela a imagem
  useEffect(() => {
    if (!isCameraActive) {
      setRealtimeSharpness(null);
      setIsFrameFrozen(false);
      setFrozenFrame(null);
      consecutiveIdealRef.current = 0;
      isFreezingRef.current = false;
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted || !videoRef.current || videoRef.current.readyState < 2) return;
      if (isFrameFrozen || isScanning || isFreezingRef.current) return;

      try {
        const metrics = measureFrameSharpness(videoRef.current);
        setRealtimeSharpness(metrics);

        // Se o usuário desligou o Congelamento (padrão sugerido desligado), não efetuar congelamento automático
        if (autoFreezeEnabled === false) {
          consecutiveIdealRef.current = 0;
          return;
        }

        // Critério adaptativo universal: funciona em qualquer dispositivo (Samsung S20, Tab A11, notebooks, iPhones)
        // Aceita nitidez adequada (score >= 45% ou variância >= 35) e iluminação visível
        const isNitidezAdequada = metrics.isSharpEnough || metrics.score >= 45 || metrics.variance >= 35;
        const isLuzVisivel = metrics.averageLuma >= 40 && metrics.averageLuma <= 245;
        // Permite inclinação natural de apoio sobre a mesa em tablets e celulares (até 35°)
        const isLevelOk = Math.abs(tiltAngle) <= 35 || tiltAngle === 0;

        // Amostra ultra-leve de cantos de enquadramento (apenas 200x260px)
        let cornersCount = 0;
        try {
          const sampleW = 200;
          const sampleH = 260;
          const sampleCanvas = document.createElement('canvas');
          sampleCanvas.width = sampleW;
          sampleCanvas.height = sampleH;
          const sCtx = sampleCanvas.getContext('2d');
          if (sCtx && videoRef.current) {
            sCtx.drawImage(videoRef.current, 0, 0, sampleW, sampleH);
            const sData = sCtx.getImageData(0, 0, sampleW, sampleH);
            const det = detectFramingCorners(sData.data, sampleW, sampleH);
            cornersCount = det.corners.foundCount;
          }
        } catch {
          // Fallback silencioso
        }

        const isFramingPresent = cornersCount >= 1 || metrics.variance >= 40;

        if (isNitidezAdequada && isLuzVisivel && isLevelOk && isFramingPresent && !isFrameFrozen && !isFreezingRef.current) {
          consecutiveIdealRef.current += 1;
          // Exige 2 ciclos consecutivos (~560ms) de nitidez estável para evitar disparos em movimento brusco
          if (consecutiveIdealRef.current >= 2) {
            isFreezingRef.current = true;
            const capture = await captureStabilizedFrame(videoRef.current, sharpnessMode);
            if (capture && isMounted) {
              setFrozenFrame(capture);
              setIsFrameFrozen(true);
              try {
                videoRef.current.pause();
              } catch {}
              // Emite beep longo de confirmação de enquadramento
              playLongBeep();
              setFeedbackToast('Foco e enquadramento prontos! Imagem congelada. Pressione "Acionar Leitura Agora".');
              setTimeout(() => setFeedbackToast(null), 4000);
            }
            isFreezingRef.current = false;
          }
        } else {
          consecutiveIdealRef.current = 0;
        }
      } catch {
        // Ignora transitórios durante renderização
      }
    }, 280);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isCameraActive, isFrameFrozen, isScanning, tiltAngle, sharpnessMode, settings?.autoFreezeOnSharpness]);

  // Sensor de nivelamento óptico (orientação do dispositivo)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && typeof e.gamma === 'number') {
        const gamma = Math.round(e.gamma);
        setTiltAngle(gamma);
        setIsLevel(Math.abs(gamma) <= 4);
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Enumeração de câmeras conectadas
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      })
      .catch(() => {});
  }, []);

  // Limpeza de stream ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Iniciar Câmera com foco nítido contínuo e resolução selecionada
  // Suporte universal a qualquer dispositivo (Samsung S20, Galaxy Tab A11, notebooks, iPhones, etc.)
  const startCamera = useCallback(async (desiredFacingMode = currentFacingMode) => {
    setCameraError(null);
    stopCamera();

    const idealWidth = quality === '1080p' ? 1920 : 1280;
    const idealHeight = quality === '1080p' ? 1080 : 720;

    // Tentativas progressivas para garantir acesso em 100% dos dispositivos
    const attempts: MediaStreamConstraints[] = [
      // 1. Resolução ideal com facingMode
      {
        audio: false,
        video: {
          facingMode: { ideal: desiredFacingMode },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
      },
      // 2. Apenas facingMode ideal (permite que tablets com 4:3 ou câmeras de menor resolução conectem de primeira)
      {
        audio: false,
        video: {
          facingMode: { ideal: desiredFacingMode },
        },
      },
      // 3. Qualquer câmera de vídeo disponível
      {
        audio: false,
        video: true,
      },
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraint of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
        // Se a permissão foi negada explicitamente, não adianta tentar outros modos
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    if (!stream) {
      console.error('Erro ao ativar câmera em todas as tentativas:', lastError);
      let msg = 'Não foi possível acessar a câmera do dispositivo.';
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera negada. Habilite a câmera nas configurações do navegador.';
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera encontrada conectada ao dispositivo.';
      } else if (lastError?.name === 'NotReadableError') {
        msg = 'A câmera está sendo utilizada por outro aplicativo no momento.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
      return;
    }

    try {
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Aplica foco contínuo se suportado pelo hardware (ex: Samsung S20)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        try {
          const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
          const advancedConstraints: any[] = [];
          if (capabilities?.focusMode?.includes('continuous')) {
            advancedConstraints.push({ focusMode: 'continuous' });
          }
          if (capabilities?.exposureMode?.includes('continuous')) {
            advancedConstraints.push({ exposureMode: 'continuous' });
          }
          if (advancedConstraints.length > 0) {
            await videoTrack.applyConstraints({ advanced: advancedConstraints } as any);
          }
        } catch {
          // Ignora se o dispositivo não permitir aplicar constraints dinâmicas
        }
      }

      setIsCameraActive(true);
      setCurrentFacingMode(desiredFacingMode);
    } catch (playErr) {
      console.error('Erro ao iniciar playback de vídeo:', playErr);
      setCameraError('Erro ao iniciar o vídeo da câmera.');
      setIsCameraActive(false);
    }
  }, [currentFacingMode, quality, stopCamera]);

  // Alternar qualidade da imagem reinicia a câmera se ativa
  const handleQualityChange = (newQuality: ScanQuality) => {
    setQuality(newQuality);
    if (onUpdateSettings && settings) {
      onUpdateSettings({ ...settings, cameraResolution: newQuality });
    }
    if (isCameraActive) {
      setTimeout(() => {
        startCamera(currentFacingMode);
      }, 50);
    }
  };

  // Alternar motor de leitura
  const handleEngineChange = (newEngine: ScanEngine) => {
    setEngine(newEngine);
    if (onUpdateSettings && settings) {
      onUpdateSettings({ ...settings, scanEngineMode: newEngine });
    }
  };

  // Alternar entre câmera frontal e traseira
  const handleToggleFacingMode = () => {
    const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Ligar ou desligar Congelamento sob Nitidez Ideal
  const handleToggleAutoFreeze = (enable: boolean) => {
    setAutoFreezeEnabled(enable);
    const baseSettings = settings || storageService.getSettings();
    const updated = { ...baseSettings, autoFreezeOnSharpness: enable };
    if (onUpdateSettings) {
      onUpdateSettings(updated);
    }
    storageService.setSettings(updated);
    setFeedbackToast(`Congelamento automático ${enable ? 'LIGADO' : 'DESLIGADO'}`);
    setTimeout(() => setFeedbackToast(null), 2500);
    if (!enable && isFrameFrozen) {
      handleUnfreeze();
    }
  };

  // Aplica as opções sugeridas pelo usuário (720p HD, Padrão, Limpo, Gemini e congelamento desligado)
  const handleApplySuggestedOptions = () => {
    handleQualityChange('720p');
    setSharpnessMode('sharp');
    setViewfinderStyle('clean');
    handleEngineChange('gemini_vision');
    handleToggleAutoFreeze(false);
    setFeedbackToast('✨ Opções Sugeridas Aplicadas: 720p HD • Padrão • Limpo • Gemini • Congelamento Desligado!');
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  /**
   * Captura frame atual do vídeo em canvas de alta resolução
   * Aplica processamento de nitidez industrial (Unsharp Masking + Normalização de Contraste)
   */
  const captureFrameFromVideo = (): { canvas: HTMLCanvasElement; dataUrl: string } | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (sharpnessMode !== 'none') {
      const enhanced = processIndustrialImageEnhancement(canvas, sharpnessMode);
      return { canvas: enhanced.enhancedCanvas, dataUrl: enhanced.enhancedDataUrl };
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    return { canvas, dataUrl };
  };

  /**
   * Executa a checagem das questões comparando respostas extraídas com o gabarito oficial
   */
  const evaluateAnswersAgainstKey = (
    rawAnswersMap: Record<string, string>,
    assessment: Assessment,
    student: Student,
    capturedImageUrl: string,
    engineUsed: ScanEngine,
    executionTimeMs: number
  ): ScanResultSummary => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let erasedCount = 0;
    let blankCount = 0;

    const evaluatedAnswers: QuestionCheckItem[] = assessment.answerKey.map((q) => {
      const qNum = q.number;
      const weight = q.weight > 0 ? q.weight : (assessment.maxScore / Math.max(1, assessment.totalQuestions));
      maxPossibleScore += weight;

      // Normaliza chaves numéricas ("01", "1", "Q01")
      const key2 = String(qNum).padStart(2, '0');
      const key1 = String(qNum);
      const rawVal = rawAnswersMap[key2] ?? rawAnswersMap[key1] ?? rawAnswersMap[`Q${key2}`] ?? rawAnswersMap[`Q${key1}`] ?? '';

      let marked: Alternative | 'BLANK' | 'MULTIPLE' = 'BLANK';
      const cleanVal = String(rawVal).trim().toUpperCase();

      if (['A', 'B', 'C', 'D', 'E'].includes(cleanVal)) {
        marked = cleanVal as Alternative;
      } else if (
        cleanVal.includes('DUPLA') || 
        cleanVal.includes('MARCA') || 
        cleanVal.includes('RASURA') || 
        cleanVal.includes('MULTIPLE')
      ) {
        marked = 'MULTIPLE';
      } else if (
        cleanVal.includes('NULA') || 
        cleanVal.includes('BRANCO') || 
        cleanVal === '' || 
        cleanVal === '-'
      ) {
        marked = 'BLANK';
      } else {
        const singleChar = cleanVal.match(/^[A-E]$/);
        if (singleChar) {
          marked = singleChar[0] as Alternative;
        } else {
          marked = 'BLANK';
        }
      }

      const official = (q.correctAlternative || 'A').trim().toUpperCase() as Alternative;

      let status: QuestionEvaluationStatus = 'ERRADA';
      let scoreEarned = 0;

      if (marked === 'MULTIPLE') {
        // Rasurada ou com mais de uma marcação
        status = 'RASURADA';
        erasedCount++;
        scoreEarned = 0;
      } else if (marked === 'BLANK') {
        // Questão em branco / Nula
        status = 'NULA';
        blankCount++;
        scoreEarned = 0;
      } else if (marked === official) {
        // Correta
        status = 'CORRETA';
        correctCount++;
        scoreEarned = weight;
        totalScore += weight;
      } else {
        // Errada (marcou outra letra)
        status = 'ERRADA';
        wrongCount++;
        scoreEarned = 0;
      }

      return {
        questionNumber: qNum,
        markedAlternative: marked,
        officialAlternative: official,
        status,
        weight,
        score: scoreEarned,
      };
    });

    const finalScore = Math.round(totalScore * 100) / 100;
    const finalMaxScore = Math.round((assessment.maxScore || maxPossibleScore || 10) * 100) / 100;
    const percentage = finalMaxScore > 0 ? Math.round((finalScore / finalMaxScore) * 100) : 0;

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      turmaId: assessment.turmaId,
      turmaName: assessment.turmaName,
      studentId: student.id,
      studentName: student.name,
      totalQuestions: assessment.totalQuestions,
      score: finalScore,
      maxScore: finalMaxScore,
      percentage,
      correctCount,
      wrongCount,
      erasedCount,
      blankCount,
      answers: evaluatedAnswers,
      scannedAt: new Date().toISOString(),
      capturedImageUrl,
      engineUsed,
      executionTimeMs,
    };
  };

  /**
   * Acionador de Leitura Imediata (Botão transparente na tela ou upload)
   */
  const handleTriggerImmediateScan = async (sourceImage?: string) => {
    if (!selectedAssessment) {
      alert('Selecione primeiro uma avaliação para escanear.');
      return;
    }
    if (!selectedStudent) {
      alert('Selecione o aluno que está sendo escaneado.');
      return;
    }

    let imageBase64 = sourceImage;
    let canvasEl: HTMLCanvasElement | null = null;

    if (!imageBase64) {
      if (isFrameFrozen && frozenFrame) {
        // Utiliza diretamente o quadro congelado que possui o foco e enquadramento ideais
        imageBase64 = frozenFrame.dataUrl;
        canvasEl = frozenFrame.canvas;
        setIsScanning(true);
      } else {
        if (!isCameraActive) {
          // Se a câmera não estiver ligada, liga primeiro
          await startCamera();
          return;
        }
        setIsScanning(true);
        const capture = await captureStabilizedFrame(videoRef.current, sharpnessMode);
        if (!capture) {
          setIsScanning(false);
          alert('Câmera ainda carregando imagem. Aguarde 1 segundo e tente novamente.');
          return;
        }
        imageBase64 = capture.dataUrl;
        canvasEl = capture.canvas;
      }
    } else {
      setIsScanning(true);
    }
    const MAX_SCAN_TIMEOUT_MS = 20000;
    const startTime = performance.now();
    let isTimedOut = false;
    let scanTimeoutTimer: any = null;

    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      scanTimeoutTimer = setTimeout(() => {
        isTimedOut = true;
        resolve({ timedOut: true });
      }, MAX_SCAN_TIMEOUT_MS);
    });

    try {
      const readingPromise = (async (): Promise<{ timedOut: false; rawAnswers: Record<string, string>; usedEngine: ScanEngine }> => {
        let rawAnswers: Record<string, string> = {};
        let usedEngine: ScanEngine = engine;

        if (engine === 'pure_omr') {
          // Motor 1: OMR Local Puro (Instantâneo, em canvas/OpenCV local)
          const localOmrResult = await executePureOmrScan(
            imageBase64,
            selectedAssessment,
            selectedStudent,
            turmaStudents
          );
          for (const ans of localOmrResult.answers) {
            rawAnswers[String(ans.questionNumber)] = ans.markedAlternative;
          }
        } else if (engine === 'gemini_vision') {
          // Motor 2: Visão IA Gemini com fallback resiliente para OMR Local
          try {
            const apiResponse = await sendImageToOmrVisionApi(
              imageBase64,
              selectedAssessment.totalQuestions
            );
            rawAnswers = apiResponse.respostas_aluno || {};
          } catch (visionErr) {
            console.warn('[Visão Gemini] Não respondeu ou sem internet; acionando motor OMR Local ultrarrápido:', visionErr);
            const localOmrResult = await executePureOmrScan(
              imageBase64,
              selectedAssessment,
              selectedStudent,
              turmaStudents
            );
            for (const ans of localOmrResult.answers) {
              rawAnswers[String(ans.questionNumber)] = ans.markedAlternative;
            }
            usedEngine = 'pure_omr';
          }
        } else {
          // Motor 3: Híbrido Inteligente (Tenta IA com fallback instantâneo no OMR Local)
          try {
            // Timeout de 7s para conexão móvel (3G/4G/Wi-Fi de tablet)
            const hybridTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AI_TIMEOUT')), 7000)
            );
            const aiPromise = sendImageToOmrVisionApi(
              imageBase64,
              selectedAssessment.totalQuestions
            );
            const apiResponse = (await Promise.race([aiPromise, hybridTimeout])) as any;
            rawAnswers = apiResponse.respostas_aluno || {};
          } catch (hybridFallbackErr) {
            console.warn('[Scanner Híbrido] Alternando para motor OMR Local ultrarrápido:', hybridFallbackErr);
            const localOmrResult = await executePureOmrScan(
              imageBase64,
              selectedAssessment,
              selectedStudent,
              turmaStudents
            );
            for (const ans of localOmrResult.answers) {
              rawAnswers[String(ans.questionNumber)] = ans.markedAlternative;
            }
            usedEngine = 'pure_omr';
          }
        }

        return { timedOut: false, rawAnswers, usedEngine };
      })();

      const raceResult = await Promise.race([readingPromise, timeoutPromise]);
      if (scanTimeoutTimer) clearTimeout(scanTimeoutTimer);

      const elapsedMs = performance.now() - startTime;

      // Regra: Se a leitura levar mais que 20 segundos, desconsiderar e limpar a leitura anterior
      if (raceResult.timedOut || isTimedOut || elapsedMs > MAX_SCAN_TIMEOUT_MS || !('rawAnswers' in raceResult)) {
        setScanResult(null); // Limpar a leitura anterior
        handleUnfreeze(); // Descongelar o quadro
        setFeedbackToast('Tempo limite de 20s excedido! Leitura anterior limpa e desconsiderada.');
        setTimeout(() => setFeedbackToast(null), 5000);
        return;
      }

      const durationMs = Math.round(elapsedMs);

      // Avaliação das questões (Correta, Errada, Rasurada/Dupla, Em Branco)
      const evaluated = evaluateAnswersAgainstKey(
        raceResult.rawAnswers,
        selectedAssessment,
        selectedStudent,
        imageBase64,
        raceResult.usedEngine,
        durationMs
      );

      setScanResult(evaluated);

      // Regra: Manter os três beeps quando completada a leitura
      playThreeLoudBeeps();
      setFeedbackToast('Leitura completada com sucesso!');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err: any) {
      if (scanTimeoutTimer) clearTimeout(scanTimeoutTimer);
      const elapsedMs = performance.now() - startTime;

      if (isTimedOut || elapsedMs > MAX_SCAN_TIMEOUT_MS) {
        setScanResult(null);
        handleUnfreeze();
        setFeedbackToast('Tempo limite de 20s excedido! Leitura anterior limpa e desconsiderada.');
        setTimeout(() => setFeedbackToast(null), 5000);
        return;
      }

      console.error('Erro na leitura óptica:', err);
      // Tentativa de resgate via OMR Local se houver tempo restante antes dos 20s
      try {
        const remainingTime = MAX_SCAN_TIMEOUT_MS - (performance.now() - startTime);
        if (remainingTime > 1500) {
          const localOmrResult = await executePureOmrScan(
            imageBase64,
            selectedAssessment,
            selectedStudent,
            turmaStudents
          );
          const fallbackElapsed = performance.now() - startTime;
          if (fallbackElapsed <= MAX_SCAN_TIMEOUT_MS) {
            const rawAnswers: Record<string, string> = {};
            for (const ans of localOmrResult.answers) {
              rawAnswers[String(ans.questionNumber)] = ans.markedAlternative;
            }
            const evaluated = evaluateAnswersAgainstKey(
              rawAnswers,
              selectedAssessment,
              selectedStudent,
              imageBase64,
              'pure_omr',
              Math.round(fallbackElapsed)
            );
            setScanResult(evaluated);
            // Manter os três beeps quando completada a leitura
            playThreeLoudBeeps();
            setFeedbackToast('Leitura completada com sucesso!');
            setTimeout(() => setFeedbackToast(null), 3000);
            return;
          }
        }

        // Se excedeu os 20s
        setScanResult(null);
        handleUnfreeze();
        setFeedbackToast('Tempo limite de 20s excedido! Leitura anterior limpa e desconsiderada.');
        setTimeout(() => setFeedbackToast(null), 5000);
      } catch (finalErr) {
        alert('Não foi possível ler a folha. Posicione o cartão-resposta bem alinhado com boa iluminação e tente novamente.');
      }
    } finally {
      if (scanTimeoutTimer) clearTimeout(scanTimeoutTimer);
      setIsScanning(false);
    }
  };

  /**
   * Upload de foto do cartão-resposta com processamento de nitidez industrial
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        if (sharpnessMode !== 'none') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const enhanced = processIndustrialImageEnhancement(canvas, sharpnessMode);
              handleTriggerImmediateScan(enhanced.enhancedDataUrl);
            } else {
              handleTriggerImmediateScan(base64);
            }
          };
          img.onerror = () => {
            handleTriggerImmediateScan(base64);
          };
          img.src = base64;
        } else {
          handleTriggerImmediateScan(base64);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /**
   * Teste Instantâneo com Gabarito Sintético Oficial para validação imediata da fidelidade OMR
   */
  const handleTestSyntheticSheet = () => {
    if (!selectedAssessment) {
      alert('Selecione primeiro uma avaliação para testar.');
      return;
    }
    const stu = selectedStudent || activeStudents[0];
    if (!stu) {
      alert('Cadastre ou selecione um aluno para testar o cartão-resposta.');
      return;
    }
    const syntheticDataUrl = generateSyntheticAnswerSheet(selectedAssessment, stu, {
      simulateWrongQuestions: [3],
      simulateDoubleMarkQuestion: 7,
      simulateBlankQuestion: 9,
    });
    handleTriggerImmediateScan(syntheticDataUrl);
  };

  /**
   * Permite ajuste manual pontual em qualquer questão no resumo
   */
  const handleManualToggleQuestionAnswer = (qIndex: number, newMarked: Alternative | 'BLANK' | 'MULTIPLE') => {
    if (!scanResult || !selectedAssessment) return;

    const updatedAnswers = [...scanResult.answers];
    const targetQ = updatedAnswers[qIndex];
    if (!targetQ) return;

    targetQ.markedAlternative = newMarked;
    const official = targetQ.officialAlternative;

    if (newMarked === 'MULTIPLE') {
      targetQ.status = 'RASURADA';
      targetQ.score = 0;
    } else if (newMarked === 'BLANK') {
      targetQ.status = 'NULA';
      targetQ.score = 0;
    } else if (newMarked === official) {
      targetQ.status = 'CORRETA';
      targetQ.score = targetQ.weight;
    } else {
      targetQ.status = 'ERRADA';
      targetQ.score = 0;
    }

    // Recalcula totais
    let newScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let erasedCount = 0;
    let blankCount = 0;

    for (const a of updatedAnswers) {
      if (a.status === 'CORRETA') {
        correctCount++;
        newScore += a.score;
      } else if (a.status === 'ERRADA') {
        wrongCount++;
      } else if (a.status === 'RASURADA') {
        erasedCount++;
      } else {
        blankCount++;
      }
    }

    const percentage = scanResult.maxScore > 0 ? Math.round((newScore / scanResult.maxScore) * 100) : 0;

    setScanResult({
      ...scanResult,
      score: Math.round(newScore * 100) / 100,
      percentage,
      correctCount,
      wrongCount,
      erasedCount,
      blankCount,
      answers: updatedAnswers,
    });
  };

  /**
   * Converte scanResult para CorrectionRecord
   */
  const buildCorrectionRecord = (summary: ScanResultSummary): CorrectionRecord => {
    const studentAnswers: StudentAnswer[] = summary.answers.map((a) => ({
      questionNumber: a.questionNumber,
      markedAlternative: a.markedAlternative,
      isCorrect: a.status === 'CORRETA',
      status: a.status,
      confidence: 96,
      checkedAgainstKey: a.status !== 'NULA',
    }));

    return {
      id: `corr_${summary.assessmentId}_${summary.studentId}_${Date.now().toString(36)}`,
      assessmentId: summary.assessmentId,
      assessmentTitle: summary.assessmentTitle,
      turmaId: summary.turmaId,
      turmaName: summary.turmaName,
      studentId: summary.studentId,
      studentName: summary.studentName,
      score: summary.score,
      totalQuestions: summary.totalQuestions,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      blankCount: summary.blankCount,
      erasedCount: summary.erasedCount,
      answers: studentAnswers,
      scannedAt: summary.scannedAt,
      imageUrl: summary.capturedImageUrl,
      deviceType: 'celular',
      status: 'confirmado',
    };
  };

  /**
   * 1. Gravar e avançar para o próximo aluno ativo
   */
  const handleSaveAndAdvanceNextActive = () => {
    if (!scanResult) return;

    const record = buildCorrectionRecord(scanResult);
    onSaveCorrection(record);

    // Localiza o próximo aluno ativo na lista da turma
    const currentIdx = activeStudents.findIndex((s) => s.id === scanResult.studentId);
    let nextStudent: Student | null = null;

    if (activeStudents.length > 1) {
      const nextIdx = (currentIdx + 1) % activeStudents.length;
      nextStudent = activeStudents[nextIdx];
    }

    // Notificação breve
    setFeedbackToast(
      nextStudent
        ? `Gravado com sucesso! Próximo aluno: ${nextStudent.name}`
        : 'Gravado com sucesso!'
    );
    setTimeout(() => setFeedbackToast(null), 3500);

    // Avança para o próximo aluno
    if (nextStudent) {
      setSelectedStudentId(nextStudent.id);
    }

    // Limpa o resultado atual para ler a próxima folha
    setScanResult(null);
    handleUnfreeze();

    // Garante que a câmera esteja pronta
    if (!isCameraActive) {
      startCamera();
    }
  };

  /**
   * 2. Apenas gravar
   */
  const handleOnlySave = () => {
    if (!scanResult) return;

    const record = buildCorrectionRecord(scanResult);
    onSaveCorrection(record);

    setFeedbackToast(`Avaliação de ${scanResult.studentName} gravada com sucesso no boletim!`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  /**
   * 3. Descartar e prosseguir
   */
  const handleDiscardAndContinue = () => {
    setScanResult(null);
    handleUnfreeze();
    setFeedbackToast('Leitura descartada. Pronto para escanear novamente.');
    setTimeout(() => setFeedbackToast(null), 2500);
    if (!isCameraActive) {
      startCamera();
    }
  };

  /**
   * 4. Ou apenas descartar e voltar à página inicial
   */
  const handleDiscardAndGoHome = () => {
    setScanResult(null);
    handleUnfreeze();
    stopCamera();
    if (onNavigate) {
      onNavigate('inicio');
    }
  };

  // Checa se o aluno já tem correção cadastrada para esta avaliação
  const existingCorrection = useMemo(() => {
    if (!selectedAssessment || !selectedStudent) return null;
    return corrections.find(
      (c) => c.assessmentId === selectedAssessment.id && c.studentId === selectedStudent.id
    );
  }, [corrections, selectedAssessment, selectedStudent]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-700 text-white font-medium rounded-xl shadow-xl border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Header com Rótulo e Versão */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Camera className="w-3.5 h-3.5" />
              <span>Leitor Óptico & Scanner de Provas</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <span>{storageService.getVersion()}</span>
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Escanear Folhas de Resposta
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione o teste e o aluno, aponte a câmera com foco nítido e acione a leitura rápida.
          </p>
        </div>

        {/* Status rápido do Aluno atual e Ações de Compartilhamento */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedStudent && (
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/70 text-xs">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 line-clamp-1">{selectedStudent.name}</p>
                <p className="text-slate-500">
                  Matrícula: {selectedStudent.enrollmentNumber || 'S/N'} • {selectedStudent.active !== false ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              {existingCorrection && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px] whitespace-nowrap">
                  Nota: {existingCorrection.score}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (onOpenShareModal) {
                onOpenShareModal();
              } else {
                setIsShareModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
            title="Gerar link funcional para compartilhar este site com outros professores ou no celular"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar Site</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE CONTROLES: Teste, Aluno, Qualidade e Motor */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção 1: Escolher Teste a ser escaneado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Teste / Avaliação a ser Escaneada
            </label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                setScanResult(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden transition-all"
            >
              {assessments.length === 0 ? (
                <option value="">Nenhuma avaliação cadastrada</option>
              ) : (
                assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.turmaName} • {a.totalQuestions} questões)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Opção 2: Escolher Aluno a ser escaneado */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Aluno a ser Escaneado
              </label>
              <div className="flex items-center gap-1">
                {/* Navegação Rápida entre Alunos */}
                <button
                  type="button"
                  title="Aluno anterior"
                  disabled={turmaStudents.length <= 1}
                  onClick={() => {
                    const idx = turmaStudents.findIndex((s) => s.id === selectedStudentId);
                    if (idx > 0) {
                      setSelectedStudentId(turmaStudents[idx - 1].id);
                      setScanResult(null);
                    }
                  }}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Próximo aluno"
                  disabled={turmaStudents.length <= 1}
                  onClick={() => {
                    const idx = turmaStudents.findIndex((s) => s.id === selectedStudentId);
                    if (idx !== -1 && idx < turmaStudents.length - 1) {
                      setSelectedStudentId(turmaStudents[idx + 1].id);
                      setScanResult(null);
                    }
                  }}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setScanResult(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-hidden transition-all"
            >
              {turmaStudents.length === 0 ? (
                <option value="">Nenhum aluno nesta turma</option>
              ) : (
                turmaStudents.map((s) => {
                  const isGraded = corrections.some(
                    (c) => c.assessmentId === selectedAssessmentId && c.studentId === s.id
                  );
                  return (
                    <option key={s.id} value={s.id}>
                      {s.enrollmentNumber ? `[Nº ${s.enrollmentNumber}] ` : ''}{s.name}
                      {s.active === false ? ' (Inativo)' : ''}
                      {isGraded ? ' ✓ Já Corrigido' : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>

        {/* Banner com as Opções Sugeridas pelo Usuário */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-950">
                  Opções Sugeridas para o Scanner:
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                  720p HD • Padrão • Limpo • Gemini • Congelamento Desligado
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Alta velocidade de leitura, foco contínuo em tempo real e máxima compatibilidade com celulares e notebooks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplySuggestedOptions}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-all shrink-0 active:scale-95"
            title="Aplica 720p HD, Nitidez Padrão, Retículo Limpo, Motor Gemini e Congelamento Desligado"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplicar Opções Sugeridas</span>
          </button>
        </div>

        {/* SELETORES: Qualidade de Imagem, Motor OMR, Nitidez Industrial, Retículo e Congelamento */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Opção 1: Qualidade da imagem */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Resolução:</span>
              </span>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => handleQualityChange('720p')}
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-1 ${
                    quality === '720p'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>720p HD</span>
                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">★</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQualityChange('1080p')}
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    quality === '1080p'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  1080p FHD
                </button>
              </div>
            </div>

            {/* Opção 2: Filtro de Nitidez Industrial */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Focus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nitidez:</span>
              </span>
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setSharpnessMode('ultra_sharp')}
                  title="Unsharp Masking + Contraste Dinâmico Laplaciano"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    sharpnessMode === 'ultra_sharp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ultra
                </button>
                <button
                  type="button"
                  onClick={() => setSharpnessMode('sharp')}
                  title="Filtro de nitidez padrão sugerido"
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-1 ${
                    sharpnessMode === 'sharp'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Padrão</span>
                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">★</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSharpnessMode('none')}
                  title="Sem realce de nitidez"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    sharpnessMode === 'none'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Deslig.
                </button>
              </div>
            </div>

            {/* Opção 3: Retículo do Visor */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
                <span>Retículo:</span>
              </span>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setViewfinderStyle('industrial')}
                  title="Visor com trilhas de sincronismo timing tracks e miras industriais"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    viewfinderStyle === 'industrial'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  OMR Ind.
                </button>
                <button
                  type="button"
                  onClick={() => setViewfinderStyle('clean')}
                  title="Visor minimalista limpo sugerido"
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-1 ${
                    viewfinderStyle === 'clean'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Limpo</span>
                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">★</span>
                </button>
              </div>
            </div>

            {/* Opção 4: Três tipos de motores OMR */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Motor:</span>
              </span>
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => handleEngineChange('hybrid')}
                  title="Combinação balanceada de IA com contingência local"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    engine === 'hybrid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Híbrido
                </button>

                <button
                  type="button"
                  onClick={() => handleEngineChange('gemini_vision')}
                  title="Motor de Visão Neural do Google Gemini sugerido"
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-1 ${
                    engine === 'gemini_vision'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Gemini</span>
                  <span className="text-[8.5px] font-bold text-indigo-100 bg-indigo-700/60 px-1 py-0.2 rounded">★</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEngineChange('pure_omr')}
                  title="Detecção geométrica matemática ultrarrápida no navegador"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    engine === 'pure_omr'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Local
                </button>
              </div>
            </div>

            {/* Opção 5: Ligar / Desligar Congelamento sob Nitidez Ideal */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Congelamento:</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  autoFreezeEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {autoFreezeEnabled ? 'Ligado' : 'Deslig.'}
                </span>
              </span>
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleAutoFreeze(true)}
                  title="Ligar congelamento automático ao atingir nitidez ideal"
                  className={`py-1.5 rounded-lg font-semibold text-center transition-all ${
                    autoFreezeEnabled
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ligado
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAutoFreeze(false)}
                  title="Desligar congelamento automático sugerido: câmera com vídeo sempre ao vivo"
                  className={`py-1.5 px-1 rounded-lg font-semibold text-center transition-all flex items-center justify-center gap-1 ${
                    !autoFreezeEnabled
                      ? 'bg-slate-800 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Deslig.</span>
                  <span className="text-[8.5px] font-bold text-emerald-400 bg-slate-950 px-1 py-0.2 rounded">★</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE TELEMETRIA ÓPTICA EXTERNA (NITIDEZ, LUZ E NÍVEL NÃO POLUEM O VISOR OMR) */}
      {isCameraActive && (
        <div className="max-w-[335px] sm:max-w-[360px] mx-auto mb-2 flex items-center justify-between gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
          {/* Badge de Nitidez */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
              realtimeSharpness && realtimeSharpness.score >= 75
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : realtimeSharpness && realtimeSharpness.score >= 45
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-red-950/80 border-red-500/50 text-red-300'
            }`}
            title="Índice de nitidez Laplaciana calculada em tempo real"
          >
            <Focus className="w-3.5 h-3.5 shrink-0" />
            <span>{realtimeSharpness ? `Nitidez ${realtimeSharpness.score}%` : 'Nitidez --%'}</span>
          </div>

          {/* Badge de Iluminação */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
              realtimeSharpness && realtimeSharpness.lightingStatus === 'OPTIMAL'
                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}
            title="Nível de luminosidade e reflexo na folha de respostas"
          >
            <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{realtimeSharpness ? realtimeSharpness.lightingLabel.split('•')[0].trim() : 'Luz OK'}</span>
          </div>

          {/* Badge de Nível Óptico */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
              isLevel
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}
            title="Nível e alinhamento do dispositivo com a folha"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>{isLevel ? 'Nível OK' : `${tiltAngle > 0 ? '+' : ''}${tiltAngle}°`}</span>
          </div>
        </div>
      )}

      {/* ÁREA DE VISOR DE OMR VERTICAL E MAIS ESTREITA (SISTEMA INDUSTRIAL DE LEITURA OMR) */}
      <div className="relative max-w-[335px] sm:max-w-[360px] mx-auto w-full bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl ring-1 ring-white/10">
        {/* Frame do Visor Vertical Estreito (Proporção 9:16 OMR) */}
        <div className="relative aspect-[9/16] w-full min-h-[500px] max-h-[630px] flex items-center justify-center bg-slate-950 overflow-hidden select-none">
          {/* Elemento de Vídeo com Foco Contínuo */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          />

          {/* Imagem Congelada quando Foco e Enquadramento Ideais são Detectados */}
          {isCameraActive && isFrameFrozen && frozenFrame && (
            <div className="absolute inset-0 z-15 overflow-hidden select-none">
              <img
                src={frozenFrame.dataUrl}
                alt="Quadro congelado no enquadramento e foco ideais"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-emerald-500/10 ring-4 ring-emerald-400 pointer-events-none" />

              {/* Badge indicativo no topo do visor */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/95 text-white border border-emerald-300 text-[11px] font-bold shadow-lg animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Enquadramento & Foco Ideais! (Congelado)</span>
                </span>
                <button
                  type="button"
                  onClick={handleUnfreeze}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-[10px] font-semibold border border-slate-600 shadow-md cursor-pointer transition-all active:scale-95"
                  title="Descongelar imagem e retomar câmera ao vivo"
                >
                  <RotateCw className="w-3 h-3 text-emerald-400" />
                  <span>Retomar</span>
                </button>
              </div>
            </div>
          )}

          {/* Estado de Standby quando a câmera está desativada */}
          {!isCameraActive && (
            <div className="text-center p-6 max-w-xs space-y-3 z-10 text-white">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto shadow-inner">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Visor OMR Industrial
              </h3>
              <p className="text-xs text-slate-400">
                Visor vertical com alinhamento por marcos laterais e estabilização de imagem.
              </p>
              <button
                type="button"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Ativar Câmera Vertical</span>
              </button>
            </div>
          )}

          {/* RETÍCULO INDUSTRIAL OMR (MARCOS LATERAIS, MIRAS DE CANTO E CANAIS DE BOLHAS) */}
          {viewfinderStyle === 'industrial' ? (
            <div className="absolute inset-3 sm:inset-4 pointer-events-none z-20 flex flex-col justify-between">
              {/* TRILHA DE SINCRONISMO OMR INDUSTRIAL (MARCOS LATERAIS DE TEMPORIZAÇÃO ESQUERDA) */}
              <div className="absolute left-0 top-3 bottom-14 w-4 flex flex-col justify-between items-center py-1 opacity-90">
                {[
                  '01', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50'
                ].map((trackLabel, idx) => (
                  <div key={trackLabel} className="w-full flex items-center gap-0.5">
                    {/* Marca de sincronismo óptico */}
                    <div className="w-2.5 h-1.5 bg-emerald-400 rounded-2xs shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                    {idx % 2 === 0 && (
                      <span className="text-[7px] font-mono font-bold text-emerald-300 leading-none">
                        {trackLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* TRILHA DE SINCRONISMO OMR LATERAL DIREITA (MARCOS DE ALINHAMENTO) */}
              <div className="absolute right-0 top-3 bottom-14 w-3 flex flex-col justify-between items-end py-1 opacity-90">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-2 h-1.5 bg-emerald-400/90 rounded-2xs shadow-[0_0_3px_rgba(52,211,153,0.6)]"
                  />
                ))}
              </div>

              {/* MIRAS FIDUCIAIS DE CANTO OMR */}
              {/* Canto Superior Esquerdo com Marca Fiducial */}
              <div className="absolute top-0 left-0 flex flex-col">
                <div className="w-9 h-9 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-start justify-start p-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-xs" />
                </div>
                <span className="text-[8px] font-mono font-bold text-emerald-400/90 bg-black/60 px-1 py-0.5 rounded-xs mt-0.5 ml-1">
                  TL-FID
                </span>
              </div>

              {/* Canto Superior Direito com Marca Fiducial */}
              <div className="absolute top-0 right-0 flex flex-col items-end">
                <div className="w-9 h-9 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-start justify-end p-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-xs" />
                </div>
                <span className="text-[8px] font-mono font-bold text-emerald-400/90 bg-black/60 px-1 py-0.5 rounded-xs mt-0.5 mr-1">
                  TR-FID
                </span>
              </div>

              {/* Canto Inferior Esquerdo com Marca Fiducial */}
              <div className="absolute bottom-0 left-0 flex flex-col">
                <span className="text-[8px] font-mono font-bold text-emerald-400/90 bg-black/60 px-1 py-0.5 rounded-xs mb-0.5 ml-1">
                  BL-FID
                </span>
                <div className="w-9 h-9 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-end justify-start p-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-xs" />
                </div>
              </div>

              {/* Canto Inferior Direito com Marca Fiducial */}
              <div className="absolute bottom-0 right-0 flex flex-col items-end">
                <span className="text-[8px] font-mono font-bold text-emerald-400/90 bg-black/60 px-1 py-0.5 rounded-xs mb-0.5 mr-1">
                  BR-FID
                </span>
                <div className="w-9 h-9 border-b-3 border-r-3 border-emerald-400 rounded-br-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)] flex items-end justify-end p-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-xs" />
                </div>
              </div>

              {/* ZONA CENTRAL DE LEITURA FOCADA NAS BOLHAS E MARCOS LATERAIS */}
              <div className="flex-1 my-2 mx-5 border border-white/15 rounded-lg relative overflow-hidden flex flex-col justify-between py-1.5">
                {/* Indicadores de Coluna */}
                <div className="grid grid-cols-5 text-center px-2 text-[8px] font-mono font-bold text-emerald-400/80 border-b border-white/10 pb-0.5">
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                  <span>D</span>
                  <span>E</span>
                </div>

                {/* Canais Dotted de Alinhamento das Bolhas */}
                <div className="absolute inset-x-2 top-6 bottom-2 grid grid-cols-5 pointer-events-none opacity-20">
                  <div className="border-r border-dashed border-white" />
                  <div className="border-r border-dashed border-white" />
                  <div className="border-r border-dashed border-white" />
                  <div className="border-r border-dashed border-white" />
                  <div />
                </div>

                {/* Horizonte Óptico Central de Nivelamento */}
                <div className="relative flex items-center justify-center my-auto">
                  <div
                    className={`w-3/4 h-[1px] transition-transform duration-150 ${
                      isLevel ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    }`}
                    style={{ transform: `rotate(${-tiltAngle}deg)` }}
                  />
                  <div className={`w-2 h-2 rounded-full absolute ${isLevel ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>

                {/* Rótulo de Instrução OMR */}
                <div className="text-center px-1">
                  <span className="text-[8px] font-mono text-white/50 bg-black/60 px-2 py-0.5 rounded-full">
                    Alinhe as bolhas pelos marcos laterais da folha
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* VISOR MINIMALISTA LIMPO COM MARCADORES DE CANTO */
            <div className="absolute inset-4 sm:inset-5 pointer-events-none z-20">
              {/* Canto Superior Esquerdo */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {/* Canto Superior Direito */}
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {/* Canto Inferior Esquerdo */}
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {/* Canto Inferior Direito */}
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

              {/* Guia Central */}
              <div className="absolute inset-3 border border-white/15 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-mono font-medium tracking-wide text-white/60 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                  Enquadre a folha nos cantos
                </span>
              </div>
            </div>
          )}

          {/* Animação de Varredura / Scanning Line durante a leitura */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-center items-center bg-black/40 backdrop-blur-[2px]">
              <div className="w-full h-1 bg-emerald-400 shadow-[0_0_18px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2" />
              <div className="px-4 py-2 rounded-full bg-slate-900/95 text-white border border-emerald-500/60 shadow-2xl flex items-center gap-2 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Estabilizando & lendo marcas OMR...</span>
              </div>
            </div>
          )}

          {/* BOTÃO DE LEITURA (ACIONAR LEITURA AGORA) */}
          {isCameraActive && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 w-full max-w-[280px] px-2 pointer-events-auto">
              <button
                type="button"
                disabled={isScanning}
                onClick={() => handleTriggerImmediateScan()}
                className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs shadow-xl transition-all cursor-pointer disabled:opacity-50 ${
                  isFrameFrozen
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-400/60 shadow-emerald-500/50 scale-105 active:scale-95 animate-pulse'
                    : 'bg-slate-900/85 hover:bg-slate-900 text-emerald-300 hover:text-white border border-emerald-400/60 backdrop-blur-xs'
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processando Leitura Óptica...</span>
                  </>
                ) : (
                  <>
                    <Camera className={`w-4 h-4 ${isFrameFrozen ? 'text-white' : 'text-emerald-300'}`} />
                    <span>Acionar Leitura Agora</span>
                  </>
                )}
              </button>
              {isFrameFrozen && (
                <span className="text-[10px] font-semibold text-emerald-200 bg-slate-950/90 px-3 py-0.5 rounded-full border border-emerald-500/40 shadow-sm text-center">
                  Quadro travado no foco ideal • Pressione para ler
                </span>
              )}
            </div>
          )}
        </div>

        {/* Informação Técnica de Rodapé do Visor Industrial */}
        <div className="bg-slate-900/90 px-3 py-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{sharpnessMode === 'ultra_sharp' ? 'Filtro: Ultra-Nítido' : sharpnessMode === 'sharp' ? 'Filtro: Nítido' : 'Filtro: Desligado'}</span>
          </span>
          <span>{viewfinderStyle === 'industrial' ? 'OMR Industrial Ativo' : 'Visor Limpo'}</span>
        </div>

        {/* Mensagem de Erro de Câmera */}
        {cameraError && (
          <div className="p-3 bg-red-900/80 text-red-200 text-xs flex items-center gap-2 border-t border-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* BOTÕES FORA DO VISOR: Ativar Câmera, Alternar Lente e Upload de Arquivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Ativar / Desativar Câmera fora do visor */}
          {isCameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all active:scale-95 border border-slate-300"
            >
              <CameraOff className="w-4 h-4 text-slate-600" />
              <span>Desativar Câmera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Ativar Câmera (Foco Nítido Automático)</span>
            </button>
          )}

          {/* Alternar Câmera Frontal / Traseira se houver dispositivos */}
          {isCameraActive && videoDevices.length > 1 && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              title="Alternar entre câmera frontal e traseira"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Alternar Câmera</span>
            </button>
          )}
        </div>

        {/* Ações de Importação e Teste */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Teste Rápido com Gabarito Sintético */}
          <button
            type="button"
            onClick={handleTestSyntheticSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-xl border border-amber-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Gera um gabarito de teste de alta fidelidade e executa a leitura OMR instantaneamente"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Testar Leitura Instantânea</span>
          </button>

          {/* Upload de Arquivo / Foto da Folha */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Carregar Foto / Arquivo</span>
            </button>
          </div>
        </div>
      </div>

      {/* APRESENTAR LOGO APÓS UM RESUMO CLARO DAS QUESTÕES LIDAS E AVALIADAS */}
      {scanResult && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-fadeIn space-y-6 p-6">
          {/* Cabeçalho do Resumo com Aluno, Prova e Nota */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Resumo da Leitura Óptica
                </span>
                <button
                  type="button"
                  onClick={handleUnfreeze}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Limpar leitura anterior e retomar câmera"
                >
                  <RotateCw className="w-3 h-3 text-emerald-600" />
                  <span>Retomar Câmera (Limpar Leitura)</span>
                </button>
                <span className="text-xs text-slate-500">
                  Processado em {scanResult.executionTimeMs}ms ({scanResult.engineUsed})
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {scanResult.studentName}
              </h2>
              <p className="text-xs text-slate-500">
                {scanResult.assessmentTitle} • Turma: {scanResult.turmaName}
              </p>
            </div>

            {/* Placar de Pontuação e Aproveitamento */}
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pontuação</p>
                <p className="text-2xl font-black text-slate-900">
                  {scanResult.score} <span className="text-sm font-semibold text-slate-400">/ {scanResult.maxScore}</span>
                </p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl font-bold text-sm ${
                  scanResult.percentage >= 60
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {scanResult.percentage}%
              </div>
            </div>
          </div>

          {/* 4 Indicadores de Checagem: Corretas, Erradas, Rasuradas e Em Branco */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Corretas */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase">Corretas</p>
                <p className="text-xl font-black text-emerald-900">{scanResult.correctCount}</p>
              </div>
            </div>

            {/* Erradas */}
            <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-red-700 uppercase">Erradas</p>
                <p className="text-xl font-black text-red-900">{scanResult.wrongCount}</p>
              </div>
            </div>

            {/* Rasuradas / Mais de uma marcação */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-700 uppercase">Rasuradas / Duplas</p>
                <p className="text-xl font-black text-amber-900">{scanResult.erasedCount}</p>
              </div>
            </div>

            {/* Em Branco / Nulas */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <MinusCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-600 uppercase">Em Branco</p>
                <p className="text-xl font-black text-slate-900">{scanResult.blankCount}</p>
              </div>
            </div>
          </div>

          {/* GRADE DETALHADA DE QUESTÕES LIDAS E AVALIADAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Detalhamento Questão por Questão
              </h4>
              <span className="text-[11px] text-slate-400">
                Clique nas opções de uma questão para retificar pontualmente caso necessário
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {scanResult.answers.map((item, idx) => {
                const isCorrect = item.status === 'CORRETA';
                const isWrong = item.status === 'ERRADA';
                const isErased = item.status === 'RASURADA';
                const isBlank = item.status === 'NULA';

                return (
                  <div
                    key={item.questionNumber}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isWrong
                        ? 'bg-red-50/50 border-red-200'
                        : isErased
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-700">
                        Q.{String(item.questionNumber).padStart(2, '0')}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isWrong
                            ? 'bg-red-100 text-red-800'
                            : isErased
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCorrect && <CheckCircle2 className="w-3 h-3" />}
                        {isWrong && <XCircle className="w-3 h-3" />}
                        {isErased && <AlertTriangle className="w-3 h-3" />}
                        {isBlank && <MinusCircle className="w-3 h-3" />}
                        <span>
                          {isCorrect
                            ? 'Correta'
                            : isWrong
                            ? 'Errada'
                            : isErased
                            ? 'Rasurada'
                            : 'Em Branco'}
                        </span>
                      </span>
                    </div>

                    {/* Resposta Lida vs Gabarito */}
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Lido:</span>
                        <span className="font-black text-sm text-slate-900">
                          {item.markedAlternative === 'MULTIPLE'
                            ? 'Rasura'
                            : item.markedAlternative === 'BLANK'
                            ? 'Branco'
                            : item.markedAlternative}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Gabarito:</span>
                        <span className="font-bold text-sm text-indigo-700">
                          {item.officialAlternative}
                        </span>
                      </div>
                    </div>

                    {/* Seletor rápido de retificação manual se o professor desejar mudar */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-1">
                      {(['A', 'B', 'C', 'D', 'E'] as Alternative[]).map((letter) => (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleManualToggleQuestionAnswer(idx, letter)}
                          className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                            item.markedAlternative === letter
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white/80 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {letter}
                        </button>
                      ))}
                      <button
                        type="button"
                        title="Marcar como Rasurada / Mais de uma marcação"
                        onClick={() => handleManualToggleQuestionAnswer(idx, 'MULTIPLE')}
                        className={`px-1.5 h-6 rounded-md text-[9px] font-bold transition-all ${
                          item.markedAlternative === 'MULTIPLE'
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/80 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Rasura
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTÕES DE OPÇÃO LOGO APÓS O RESUMO */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Botões de Ação de Retomada e Descarte */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão: Retomar e limpar leitura anterior */}
              <button
                type="button"
                onClick={handleUnfreeze}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Limpa a leitura anterior e retoma a transmissão contínua da câmera"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Retomar (Limpar Leitura)</span>
              </button>

              {/* Botão: Descartar e prosseguir */}
              <button
                type="button"
                onClick={handleDiscardAndContinue}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Descartar e Prosseguir</span>
              </button>

              {/* Botão: Ou apenas descartar e voltar à página inicial */}
              <button
                type="button"
                onClick={handleDiscardAndGoHome}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Descartar e Voltar à Página Inicial</span>
              </button>
            </div>

            {/* Botões de Ação de Gravação */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botão: Apenas gravar */}
              <button
                type="button"
                onClick={handleOnlySave}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apenas Gravar</span>
              </button>

              {/* Botão: Gravar e avançar para o próximo aluno ativo */}
              <button
                type="button"
                onClick={handleSaveAndAdvanceNextActive}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Gravar e Avançar para o Próximo Aluno Ativo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento do Site */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
