import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Fingerprint, 
  Camera, 
  Sliders, 
  Volume2, 
  Save, 
  ShieldCheck, 
  School, 
  User, 
  Mail,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileCheck,
  ScanLine,
  X,
  Database,
  Download,
  FileJson,
  RotateCcw,
  Clock,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { SystemSettings, UserProfile, AutoBackupFrequency } from '../../types';
import { storageService } from '../../services/storage';

interface ConfiguracoesViewProps {
  user: UserProfile | null;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onUpdateUser: (newUser: UserProfile) => void;
  onOpenAuth: () => void;
  onRestoreData?: (data: any) => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  user,
  settings,
  onUpdateSettings,
  onUpdateUser,
  onOpenAuth,
}) => {
  const [schoolName, setSchoolName] = useState(settings.schoolName || user?.schoolName || '');
  const [schoolLogo, setSchoolLogo] = useState<string>(settings.schoolLogo || '');
  const [userName, setUserName] = useState(settings.teacherName || user?.name || '');
  const [omrSensitivity, setOmrSensitivity] = useState(settings.omrSensitivity);
  const [soundOnScan, setSoundOnScan] = useState(settings.soundOnScan);
  const [autoScanOnDetection, setAutoScanOnDetection] = useState(Boolean(settings.autoScanOnDetection));
  const [cameraResolution, setCameraResolution] = useState(settings.cameraResolution || '720p');
  const [scanEngineMode, setScanEngineMode] = useState(settings.scanEngineMode || 'gemini_vision');
  const [autoFreezeOnSharpness, setAutoFreezeOnSharpness] = useState<boolean>(settings.autoFreezeOnSharpness !== false);
  const [enableBiometrics, setEnableBiometrics] = useState(settings.enableBiometrics);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(settings.autoBackupEnabled !== false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<AutoBackupFrequency>(settings.autoBackupFrequency || 'after_corrections');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(settings.lastBackupDate || storageService.getLastBackupDate());
  const [backupToastMessage, setBackupToastMessage] = useState<string | null>(null);
  const [backupDownloadSuccess, setBackupDownloadSuccess] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [bioTestSuccess, setBioTestSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever props update
  useEffect(() => {
    if (settings.schoolName || user?.schoolName) {
      setSchoolName(settings.schoolName || user?.schoolName || '');
    }
    if (settings.teacherName || user?.name) {
      setUserName(settings.teacherName || user?.name || '');
    }
    if (settings.schoolLogo !== undefined) {
      setSchoolLogo(settings.schoolLogo || '');
    }
    setOmrSensitivity(settings.omrSensitivity);
    setSoundOnScan(settings.soundOnScan);
    setAutoScanOnDetection(Boolean(settings.autoScanOnDetection));
    setCameraResolution(settings.cameraResolution || '720p');
    setScanEngineMode(settings.scanEngineMode || 'gemini_vision');
    setAutoFreezeOnSharpness(settings.autoFreezeOnSharpness !== false);
    setEnableBiometrics(settings.enableBiometrics);
    setAutoBackupEnabled(settings.autoBackupEnabled !== false);
    setAutoBackupFrequency(settings.autoBackupFrequency || 'after_corrections');
    setLastBackupDate(settings.lastBackupDate || storageService.getLastBackupDate());
  }, [settings, user]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackupNow = () => {
    try {
      const filename = storageService.downloadBackupFile(undefined, false);
      const nowStr = new Date().toISOString();
      setLastBackupDate(nowStr);
      setBackupDownloadSuccess(true);
      setBackupToastMessage(`Backup salvo com sucesso: ${filename}`);
      setTimeout(() => {
        setBackupToastMessage(null);
        setBackupDownloadSuccess(false);
      }, 4000);
    } catch {
      setBackupToastMessage('Não foi possível gerar o arquivo de backup.');
      setTimeout(() => setBackupToastMessage(null), 4000);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          setPendingRestoreData(parsed);
        } else {
          setBackupToastMessage('Formato de arquivo JSON inválido.');
          setTimeout(() => setBackupToastMessage(null), 3500);
        }
      } catch {
        setBackupToastMessage('Erro ao interpretar o arquivo JSON.');
        setTimeout(() => setBackupToastMessage(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    try {
      if (onRestoreData) {
        onRestoreData(pendingRestoreData);
      }
      if (pendingRestoreData.settings) {
        onUpdateSettings(pendingRestoreData.settings);
        storageService.setSettings(pendingRestoreData.settings);
      }
      if (pendingRestoreData.user) {
        onUpdateUser(pendingRestoreData.user);
        storageService.setUser(pendingRestoreData.user);
      }
      setPendingRestoreData(null);
      setBackupToastMessage('Backup restaurado com sucesso no dispositivo!');
      setTimeout(() => setBackupToastMessage(null), 4000);
    } catch {
      setBackupToastMessage('Falha ao restaurar dados do arquivo.');
      setTimeout(() => setBackupToastMessage(null), 4000);
    }
  };

  const handleProcessLogoFile = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG ou WEBP).');
      return;
    }
    // Limit to 3MB
    if (file.size > 3 * 1024 * 1024) {
      setLogoError('A imagem é muito grande. Escolha uma imagem de até 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setSchoolLogo(event.target.result);
        setLogoError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessLogoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessLogoFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setSchoolLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSchoolName = schoolName.trim();
    const cleanTeacherName = userName.trim();

    localStorage.setItem('avaliascan_resolution_customized', 'true');
    localStorage.setItem('avaliascan_scan_mode_customized', 'true');

    const updatedSettings: SystemSettings = {
      ...settings,
      schoolName: cleanSchoolName,
      teacherName: cleanTeacherName,
      schoolLogo: schoolLogo.trim() || undefined,
      omrSensitivity,
      soundOnScan,
      autoScanOnDetection,
      cameraResolution,
      scanEngineMode,
      autoFreezeOnSharpness,
      enableBiometrics,
      autoBackupEnabled,
      autoBackupFrequency,
      lastBackupDate: lastBackupDate || undefined,
    };

    onUpdateSettings(updatedSettings);
    storageService.setSettings(updatedSettings);

    const updatedUser: UserProfile = user ? {
      ...user,
      name: cleanTeacherName || user.name,
      schoolName: cleanSchoolName || user.schoolName,
      biometricRegistered: enableBiometrics,
    } : {
      id: 'usr_default',
      name: cleanTeacherName || 'Professor',
      email: 'professor@escola.local',
      role: 'professor',
      authProvider: 'email',
      biometricRegistered: enableBiometrics,
      schoolName: cleanSchoolName || 'Instituição de Ensino',
      createdAt: new Date().toISOString(),
    };

    onUpdateUser(updatedUser);
    storageService.setUser(updatedUser);

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleTestBiometric = () => {
    setBioTestSuccess(false);
    // Simulate biometric check
    setTimeout(() => {
      setBioTestSuccess(true);
      setTimeout(() => setBioTestSuccess(false), 3000);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Painel de Ajustes</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Configurações do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personalize credenciais de login (Google, Digital, E-mail), instituição e calibração do scanner mobile
          </p>
        </div>

        {savedToast && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: User & Institution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-600" />
            <span>Dados da Instituição e Usuário</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Professor / Gestor</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Colégio / Escola</label>
              <div className="relative">
                <School className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Logotipo da Escola / Instituição */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-800">
                Logotipo Oficial da Escola (Cabeçalho do Gabarito)
              </label>
              <span className="text-[11px] text-slate-500">
                Aparece no topo esquerdo do cartão-resposta oficial
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Preview Box */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[110px]">
                {schoolLogo ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="h-16 w-full flex items-center justify-center bg-white rounded-lg border border-slate-200 p-1.5 shadow-2xs">
                      <img 
                        src={schoolLogo} 
                        alt="Logotipo da Escola" 
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover Logotipo</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-2">
                    <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Nenhum logo cadastrado</span>
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="sm:col-span-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="school-logo-input"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/60'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Clique para selecionar ou arraste o arquivo do logotipo
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formatos suportados: PNG, JPG, SVG ou WEBP (até 3MB). Fundo transparente recomendado.
                  </p>
                </div>
                {logoError && (
                  <p className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                    <span>{logoError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Authentication & Biometrics */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Acesso Seguro (Google, Digital & E-mail)</span>
            </h3>
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Trocar de Conta / Novo Login
            </button>
          </div>

          <div className="space-y-3">
            {/* Google Status */}
            <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50/50 text-xs">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <div>
                  <div className="font-semibold text-slate-800">Conta Google Vinculada</div>
                  <div className="text-slate-500 text-[11px]">{user?.email || 'mipcjr@gmail.com'}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Ativo
              </span>
            </div>

            {/* Biometrics Status */}
            <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Leitor de Digital / Biometria do Dispositivo</div>
                  <div className="text-slate-500 text-[11px]">
                    {enableBiometrics 
                      ? 'Biometria habilitada para login instantâneo pelo celular' 
                      : 'Biometria desativada'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestBiometric}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-medium transition-colors"
                >
                  {bioTestSuccess ? '✓ Digital Reconhecida' : 'Testar Sensor'}
                </button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBiometrics}
                    onChange={(e) => setEnableBiometrics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Camera & OMR Calibration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-600" />
            <span>Parâmetros de Escaneamento OMR</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sensibilidade de Leitura das Bolhas
              </label>
              <select
                value={omrSensitivity}
                onChange={(e: any) => setOmrSensitivity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden"
              >
                <option value="baixa">Baixa (Aceita apenas bolhas muito escuras)</option>
                <option value="media">Média (Recomendado para caneta azul/preta)</option>
                <option value="alta">Alta (Detecta traços leves de grafite)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Ajuste se seus alunos utilizam lápis ou canetas de ponta fina.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Modo Padrão do Leitor de Gabaritos
              </label>
              <select
                value={scanEngineMode}
                onChange={(e: any) => setScanEngineMode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden font-medium"
              >
                <option value="hybrid">Híbrido Inteligente (Padrão Recomendado - Local + IA)</option>
                <option value="gemini_vision">Visão IA Gemini 3.8 Flash (Multimodal Profundo)</option>
                <option value="pure_omr">OMR Local (Offline / Ultrarrápido)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Combina o processamento imediato em milissegundos com validação de IA quando necessário.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resolução da Câmera do Celular
              </label>
              <select
                value={cameraResolution}
                onChange={(e: any) => setCameraResolution(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden font-medium"
              >
                <option value="720p">HD (720p - Padrão Recomendado / Mais Rápido)</option>
                <option value="1080p">Full HD (1080p - Alta Nitidez)</option>
                <option value="auto">Automático (Adaptativo)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                720p HD oferece velocidade instantânea de captura e foco preciso no navegador móvel.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-700">Emitir sinal sonoro (bip) após leitura confirmada</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundOnScan}
                onChange={(e) => setSoundOnScan(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Opção solicitada: Escanear logo que detectada vs Acionar botão manual */}
          <div className="pt-3 border-t border-slate-100 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Escanear automaticamente ao detectar folha resposta
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {autoScanOnDetection
                  ? 'Ativado: O botão de escaneamento é ocultado no visor. Assim que a folha for detectada na mira, o sistema emite o sinal sonoro, escaneia imediatamente e apresenta a opção de salvamento no boletim.'
                  : 'Desativado: Exibe o botão de escaneamento no visor da câmera para acionamento manual após enquadrar a folha.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={autoScanOnDetection}
                onChange={(e) => setAutoScanOnDetection(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Opção solicitada pelo usuário: Ligar ou desligar o Congelamento sob Nitidez Ideal */}
          <div className="pt-3 border-t border-slate-100 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Congelamento Automático da Imagem (Nitidez Ideal)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  autoFreezeOnSharpness 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {autoFreezeOnSharpness ? 'Ligado' : 'Desligado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {autoFreezeOnSharpness
                  ? 'Ligado: Quando a câmera detecta enquadramento e foco com nitidez óptica ideal (score ≥ 75%), emite um bipe longo e congela a imagem no visor para permitir acionar a leitura sem tremulações.'
                  : 'Desligado: O visor da câmera permanece sempre transmitindo vídeo contínuo em tempo real, sem congelamento automático.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoFreezeOnSharpness;
                  setAutoFreezeOnSharpness(nextVal);
                  const updatedSettings: SystemSettings = {
                    ...settings,
                    autoFreezeOnSharpness: nextVal,
                  };
                  onUpdateSettings(updatedSettings);
                  storageService.setSettings(updatedSettings);
                  setSavedToast(true);
                  setTimeout(() => setSavedToast(false), 2200);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 ${
                  autoFreezeOnSharpness
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title="Clique para ligar ou desligar o congelamento de imagem"
              >
                {autoFreezeOnSharpness ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Congelamento Ligado</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 text-slate-600" />
                    <span>Congelamento Desligado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Backup Automático & Segurança dos Dados Locais (JSON) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Backup Automático & Cópia de Segurança (JSON)</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Segurança Adicional
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proteja suas turmas, alunos, avaliações, gabaritos e notas salvando periodicamente arquivos JSON no dispositivo.
                </p>
              </div>
            </div>

            {/* Status do Último Backup */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70 shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {lastBackupDate
                  ? `Último backup: ${new Date(lastBackupDate).toLocaleDateString('pt-BR')} às ${new Date(lastBackupDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Nenhum backup realizado ainda'}
              </span>
            </div>
          </div>

          {/* Cards de Resumo dos Dados Locais Prontos para Download */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 block">Turmas</span>
              <span className="text-lg font-black text-slate-800">
                {storageService.getTurmas().length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 block">Alunos</span>
              <span className="text-lg font-black text-slate-800">
                {storageService.getStudents().length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 block">Avaliações</span>
              <span className="text-lg font-black text-slate-800">
                {storageService.getAssessments().length}
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500 block">Correções OMR</span>
              <span className="text-lg font-black text-slate-800">
                {storageService.getCorrections().length}
              </span>
            </div>
          </div>

          {/* Opções de Ativação e Periodicidade */}
          <div className="space-y-4 pt-1">
            {/* Switch de Ativação do Backup Automático */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Ativar Rotina de Backup Automático para Download
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    autoBackupEnabled 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {autoBackupEnabled ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Gera e baixa periodicamente um arquivo compactado JSON com todas as suas informações locais diretamente na pasta Downloads do computador ou celular, prevenindo perda de dados acidental.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Frequência do Backup */}
            {autoBackupEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  autoBackupFrequency === 'after_corrections'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="backupFrequency"
                    value="after_corrections"
                    checked={autoBackupFrequency === 'after_corrections'}
                    onChange={() => setAutoBackupFrequency('after_corrections')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">Ao Concluir Correções</span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Sugerido
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Salva automaticamente após registrar folhas no leitor de provas.
                  </p>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  autoBackupFrequency === 'daily'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="backupFrequency"
                    value="daily"
                    checked={autoBackupFrequency === 'daily'}
                    onChange={() => setAutoBackupFrequency('daily')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">Diariamente</span>
                    <span className="text-[10px] font-medium text-slate-500">
                      1x por dia
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Verifica no início de cada jornada de trabalho e baixa se houver dados novos.
                  </p>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  autoBackupFrequency === 'weekly'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="backupFrequency"
                    value="weekly"
                    checked={autoBackupFrequency === 'weekly'}
                    onChange={() => setAutoBackupFrequency('weekly')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">Semanalmente</span>
                    <span className="text-[10px] font-medium text-slate-500">
                      A cada 7 dias
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Cria cópias periódicas regulares de fechamento de semana.
                  </p>
                </label>
              </div>
            )}

            {/* Ações de Download Imediato e Restauração de Arquivo */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadBackupNow}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo Agora (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => restoreFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-xs transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Restaurar Backup (JSON)</span>
              </button>

              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleSelectRestoreFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Feedback Toast de Backup */}
          {backupToastMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupToastMessage}</span>
            </div>
          )}

          {/* Modal / Card de Confirmação de Restauração */}
          {pendingRestoreData && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900">
                    Confirmar Restauração de Dados a partir do Arquivo JSON?
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    O arquivo selecionado contém: 
                    {pendingRestoreData.turmas?.length ? ` ${pendingRestoreData.turmas.length} turma(s)` : ''}
                    {pendingRestoreData.students?.length ? `, ${pendingRestoreData.students.length} aluno(s)` : ''}
                    {pendingRestoreData.assessments?.length ? `, ${pendingRestoreData.assessments.length} avaliação(ões)` : ''}
                    {pendingRestoreData.corrections?.length ? `, ${pendingRestoreData.corrections.length} correção(ões)` : ''}.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingRestoreData(null)}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95"
                >
                  Restaurar Dados Agora
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>

      </form>

    </div>
  );
};
