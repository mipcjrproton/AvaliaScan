export type MenuTab = 
  | 'inicio'
  | 'configuracoes'
  | 'turmas'
  | 'avaliacoes'
  | 'gerar'
  | 'correcoes'
  | 'boletim'
  | 'relatorios'
  | 'consultas'
  | 'manutencao'
  | 'ajuda';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'professor' | 'coordenador' | 'administrador';
  authProvider: 'google' | 'biometric' | 'email';
  biometricRegistered: boolean;
  schoolName: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  enrollmentNumber: string; // Matrícula
  turmaId: string;
  email?: string;
  active?: boolean; // true = Ativo, false = Inativo (padrão true)
}

export type TurnoTurma = 'Manhã' | 'Tarde' | 'Noite' | 'Integral';

export interface Turma {
  id: string;
  name: string; // Ex: "9º Ano A"
  grade: string; // Ex: "Ensino Fundamental II"
  shift: TurnoTurma; // 'Manhã' | 'Tarde' | 'Noite' | 'Integral'
  year: number;
  subjectDefault?: string;
  studentCount: number;
  colorPastel: string;
  createdAt: string;
}

export type Alternative = 'A' | 'B' | 'C' | 'D' | 'E';

export interface AssessmentQuestion {
  number: number;
  correctAlternative: Alternative;
  weight: number;
  topic?: string;
}

export interface Assessment {
  id: string;
  title: string; // Ex: "Simulado 1 - Matemática e Lógica"
  subject: string;
  turmaId: string;
  turmaName: string;
  totalQuestions: number;
  optionsPerQuestion?: number; // Número de opções / bolhas por questão (mínimo 2, máximo 5)
  maxScore: number;
  date: string;
  answerKey: AssessmentQuestion[];
  instructions?: string;
  status: 'rascunho' | 'ativa' | 'concluida';
  createdAt: string;
}

export type QuestionEvaluationStatus = 'CORRETA' | 'ERRADA' | 'NULA' | 'RASURADA';

export interface StudentAnswer {
  questionNumber: number;
  markedAlternative: Alternative | 'BLANK' | 'MULTIPLE';
  isCorrect: boolean;
  status?: QuestionEvaluationStatus;
  confidence: number; // 0 a 100% da detecção óptica
  checkedAgainstKey?: boolean; // false se nenhuma bolha foi preenchida (Nula dispensada de checagem), true se verificada contra o gabarito
}

export interface CorrectionRecord {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  turmaId: string;
  turmaName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount?: number;
  blankCount?: number; // Questões nulas (nenhuma bolha preenchida)
  erasedCount?: number; // Questões rasuradas / com mais de uma marcação
  answers: StudentAnswer[];
  scannedAt: string;
  imageUrl?: string;
  deviceType: 'celular' | 'computador' | 'upload';
  status: 'confirmado' | 'revisao_necessaria';
}

export type AutoBackupFrequency = 'after_corrections' | 'daily' | 'weekly' | 'manual';

export interface SystemSettings {
  schoolName: string;
  teacherName?: string; // Nome do Professor / Gestor
  schoolLogo?: string; // Imagem/Logotipo da instituição (Data URL ou URL)
  cameraResolution: '720p' | '1080p' | 'auto';
  autoSaveScan: boolean;
  soundOnScan: boolean;
  autoScanOnDetection?: boolean; // Escanear automaticamente logo que a folha for detectada (sem precisar acionar o botão)
  omrSensitivity: 'baixa' | 'media' | 'alta';
  enableBiometrics: boolean;
  darkPastelMode: boolean;
  scanEngineMode?: 'hybrid' | 'gemini_vision' | 'pure_omr';
  autoFreezeOnSharpness?: boolean; // Ligar ou desligar o congelamento automático ao detectar nitidez ideal
  autoBackupEnabled?: boolean; // Ativação do backup automático de dados locais (JSON)
  autoBackupFrequency?: AutoBackupFrequency; // Frequência do backup automático
  lastBackupDate?: string; // Data e hora do último backup realizado
}

export interface BackupExportData {
  app: string;
  systemVersion: string;
  exportedAt: string;
  description: string;
  schoolName: string;
  teacherName: string;
  counts: {
    turmas: number;
    students: number;
    assessments: number;
    corrections: number;
    generatedExams: number;
  };
  turmas: Turma[];
  students: Student[];
  assessments: Assessment[];
  corrections: CorrectionRecord[];
  settings: SystemSettings;
  user: UserProfile;
  generatedExams: GeneratedExam[];
  versionCounter?: number;
}

export type ExamDifficulty = 'Fácil' | 'Médio' | 'Difícil';

export interface GeneratedOption {
  letter: Alternative;
  text: string;
}

export interface GeneratedQuestion {
  number: number;
  statement: string; // Enunciado da questão
  options: GeneratedOption[];
  correctAlternative: Alternative;
  explanation?: string; // Comentário pedagógico / resolução
  topic?: string;
}

export interface GeneratedExam {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  subject: string;
  turmaId: string;
  turmaName: string;
  applicationDate: string;
  totalQuestions: number;
  difficulty: ExamDifficulty;
  promptInfo: string; // Linha de digitação com orientações e tópicos para a IA
  questions: GeneratedQuestion[];
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}
