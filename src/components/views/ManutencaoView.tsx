import React, { useState, useRef } from 'react';
import { 
  Wrench, 
  Database, 
  Download, 
  Upload, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  Cpu, 
  ShieldCheck,
  Trash2,
  School,
  GraduationCap,
  FileCheck2,
  CheckSquare,
  Sliders,
  X,
  FileJson,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Turma, Student, Assessment, CorrectionRecord, SystemSettings } from '../../types';
import { storageService } from '../../services/storage';

interface ManutencaoViewProps {
  turmas: Turma[];
  students: Student[];
  assessments: Assessment[];
  corrections: CorrectionRecord[];
  settings: SystemSettings;
  onClearTurmas: () => void;
  onClearStudents: () => void;
  onClearAssessments: () => void;
  onClearCorrections: () => void;
  onClearSettings: () => void;
  onClearAll: () => void;
  onResetData: () => void;
  onRestoreData: (data: any) => void;
  onImportFile: (fileKey: 'turmas' | 'students' | 'assessments' | 'corrections', data: any[]) => void;
}

type FileKey = 'turmas' | 'students' | 'assessments' | 'corrections' | 'settings' | 'all';

interface ConfirmClearState {
  isOpen: boolean;
  fileKey: FileKey | null;
  fileName: string;
  count: number;
}

export const ManutencaoView: React.FC<ManutencaoViewProps> = ({
  turmas,
  students,
  assessments,
  corrections,
  settings,
  onClearTurmas,
  onClearStudents,
  onClearAssessments,
  onClearCorrections,
  onClearSettings,
  onClearAll,
  onResetData,
  onRestoreData,
  onImportFile,
}) => {
  const [calibrating, setCalibrating] = useState(false);
  const [calibratedSuccess, setCalibratedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal confirmation state
  const [confirmClear, setConfirmClear] = useState<ConfirmClearState>({
    isOpen: false,
    fileKey: null,
    fileName: '',
    count: 0,
  });

  // Hidden file inputs references for individual file imports
  const fileInputRefTurmas = useRef<HTMLInputElement>(null);
  const fileInputRefStudents = useRef<HTMLInputElement>(null);
  const fileInputRefAssessments = useRef<HTMLInputElement>(null);
  const fileInputRefCorrections = useRef<HTMLInputElement>(null);
  const fileInputRefUnified = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to trigger JSON download for a specific file
  const exportJsonFile = (filename: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Arquivo "${filename}" exportado com sucesso!`);
  };

  // Helper to handle JSON file upload and parsing
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileKey: 'turmas' | 'students' | 'assessments' | 'corrections' | 'unified'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (fileKey === 'unified') {
          onRestoreData(parsed);
          showToast('Backup unificado restaurado com sucesso!');
        } else {
          const items = Array.isArray(parsed) ? parsed : parsed[fileKey] || [];
          onImportFile(fileKey, items);
          showToast(`Arquivo de ${fileKey} importado com sucesso! (${items.length} itens)`);
        }
      } catch (err) {
        showToast('Erro ao ler arquivo JSON. Certifique-se de que é um formato válido.');
      }
    };
    reader.readAsText(file);
    // reset value so same file can be chosen again
    e.target.value = '';
  };

  // Trigger modal for clear confirmation
  const requestClear = (fileKey: FileKey, fileName: string, count: number) => {
    setConfirmClear({
      isOpen: true,
      fileKey,
      fileName,
      count,
    });
  };

  // Execute clear confirmed
  const executeClear = () => {
    if (!confirmClear.fileKey) return;

    switch (confirmClear.fileKey) {
      case 'turmas':
        onClearTurmas();
        showToast('Arquivo de Turmas zerado (0 registros).');
        break;
      case 'students':
        onClearStudents();
        showToast('Arquivo de Alunos zerado (0 registros).');
        break;
      case 'assessments':
        onClearAssessments();
        showToast('Arquivo de Avaliações zerado (0 registros).');
        break;
      case 'corrections':
        onClearCorrections();
        showToast('Arquivo de Correções OMR zerado (0 registros).');
        break;
      case 'settings':
        onClearSettings();
        showToast('Configurações redefinidas para o padrão.');
        break;
      case 'all':
        onClearAll();
        showToast('Todos os arquivos foram zerados com sucesso!');
        break;
    }

    setConfirmClear({ isOpen: false, fileKey: null, fileName: '', count: 0 });
  };

  // Export Unified JSON Backup
  const handleExportUnifiedBackup = () => {
    const filename = storageService.downloadBackupFile({
      app: 'AvaliaScan',
      systemVersion: storageService.getVersion(),
      exportDate: new Date().toISOString(),
      schoolName: settings.schoolName,
      turmas,
      students,
      assessments,
      corrections,
      settings,
      generatedExams: storageService.getGeneratedExams(),
    }, false);
    showToast(`Backup completo "${filename}" exportado com sucesso!`);
  };

  // Recalibrate OMR Sensor
  const handleRecalibrate = () => {
    setCalibrating(true);
    setCalibratedSuccess(false);
    setTimeout(() => {
      setCalibrating(false);
      setCalibratedSuccess(true);
      setTimeout(() => setCalibratedSuccess(false), 3500);
    }, 1400);
  };

  const fileList = [
    {
      id: 'turmas' as const,
      name: 'Arquivo de Turmas',
      filename: 'avaliascan_turmas.json',
      icon: School,
      count: turmas.length,
      unit: 'turma(s)',
      description: 'Salas de aula, níveis de ensino, turnos e cores de identificação visual.',
      data: turmas,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-600',
      inputRef: fileInputRefTurmas,
    },
    {
      id: 'students' as const,
      name: 'Arquivo de Alunos',
      filename: 'avaliascan_alunos.json',
      icon: GraduationCap,
      count: students.length,
      unit: 'aluno(s)',
      description: 'Nomes completos, números de chamada/matrícula e vínculo com suas turmas.',
      data: students,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      iconColor: 'text-indigo-600',
      inputRef: fileInputRefStudents,
    },
    {
      id: 'assessments' as const,
      name: 'Arquivo de Avaliações & Gabaritos',
      filename: 'avaliascan_avaliacoes.json',
      icon: FileCheck2,
      count: assessments.length,
      unit: 'avaliação(ões)',
      description: 'Provas cadastradas, disciplinas, total de questões e gabaritos oficiais preenchidos.',
      data: assessments,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-600',
      inputRef: fileInputRefAssessments,
    },
    {
      id: 'corrections' as const,
      name: 'Arquivo de Correções & Espelhos OMR',
      filename: 'avaliascan_correcoes.json',
      icon: CheckSquare,
      count: corrections.length,
      unit: 'folha(s) corrigida(s)',
      description: 'Histórico de leitura das câmeras, notas calculadas, acertos por questão e espelhos.',
      data: corrections,
      color: 'bg-teal-50 text-teal-800 border-teal-200',
      iconColor: 'text-teal-600',
      inputRef: fileInputRefCorrections,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 mb-2">
            <Wrench className="w-3.5 h-3.5" />
            <span>Infraestrutura & Banco de Dados</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Manutenção do Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento granular de cada arquivo de dados, possibilidade de zerar tabelas individualmente e cópias de segurança
          </p>
        </div>

        {toastMessage && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Turmas</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{turmas.length}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${turmas.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {turmas.length > 0 ? 'Ativo' : 'Zerado'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Alunos</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{students.length}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${students.length > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
            {students.length > 0 ? 'Ativo' : 'Zerado'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avaliações</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{assessments.length}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${assessments.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            {assessments.length > 0 ? 'Ativo' : 'Zerado'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Correções</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{corrections.length}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${corrections.length > 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
            {corrections.length > 0 ? 'Ativo' : 'Zerado'}
          </span>
        </div>
      </div>

      {/* SECTION 1: CADA ARQUIVO SEPARADO COM OPÇÃO DE ZERAR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Arquivos Individuais de Dados</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada arquivo abaixo opera de maneira independente. Você pode fazer backup, restaurar ou <strong>zerar individualmente</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {fileList.map((f) => {
            const IconComponent = f.icon;
            const isZero = f.count === 0;

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${f.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{f.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {f.filename}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isZero 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isZero ? '0 registros (Zerado)' : `${f.count} ${f.unit}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        {f.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this file */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    {/* Hidden file input for import */}
                    <input
                      type="file"
                      ref={f.inputRef}
                      onChange={(e) => handleFileChange(e, f.id)}
                      accept=".json"
                      className="hidden"
                    />

                    {/* Button: Export individual file */}
                    <button
                      type="button"
                      onClick={() => exportJsonFile(f.filename, f.data)}
                      title={`Exportar apenas ${f.filename}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Exportar</span>
                    </button>

                    {/* Button: Import individual file */}
                    <button
                      type="button"
                      onClick={() => f.inputRef.current?.click()}
                      title={`Importar registros para ${f.name}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Importar</span>
                    </button>

                    {/* Button: ZERAR ESTE ARQUIVO */}
                    <button
                      type="button"
                      onClick={() => requestClear(f.id, f.name, f.count)}
                      disabled={isZero}
                      title={`Zerar e apagar todos os registros de ${f.name}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isZero
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 active:scale-95 shadow-2xs'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Zerar {f.name.replace('Arquivo de ', '')}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}

          {/* Configurações & Preferências */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all hover:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl border shrink-0 bg-slate-100 text-slate-800 border-slate-200">
                  <Sliders className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">Arquivo de Configurações & Ajustes OMR</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      avaliascan_configuracoes.json
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Parâmetros Ativos
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Sensibilidade de detecção de grafite/caneta, resolução da câmera, bipes sonoros e nome da instituição.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => exportJsonFile('avaliascan_configuracoes.json', settings)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exportar</span>
                </button>

                <button
                  type="button"
                  onClick={() => requestClear('settings', 'Configurações do Sistema', 1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Resetar Ajustes</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: AÇÕES GLOBAIS E BACKUP COMPLETO */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-600" />
          <span>Backup Global & Limpeza Completa</span>
        </h3>
        <p className="text-xs text-slate-500">
          Você pode gerar um arquivo único com todos os dados consolidados para arquivamento ou iniciar um novo ano letivo limpando todas as tabelas de uma só vez.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export full backup */}
          <button
            type="button"
            onClick={handleExportUnifiedBackup}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup Completo (JSON Único)</span>
          </button>

          {/* Import full backup */}
          <input
            type="file"
            ref={fileInputRefUnified}
            onChange={(e) => handleFileChange(e, 'unified')}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRefUnified.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Restaurar Backup Completo</span>
          </button>

          {/* ZERAR TUDO (Limpeza total) */}
          <button
            type="button"
            onClick={() => requestClear('all', 'Todos os Arquivos do Sistema', turmas.length + students.length + assessments.length + corrections.length)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-semibold transition-all active:scale-98 ml-auto"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Zerar Todos os Arquivos (Limpeza Geral)</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: CALIBRAÇÃO E RESTAURAÇÃO DE EXEMPLOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recalibrate Sensor */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-amber-600" />
              <span>Calibração Óptica da Câmera</span>
            </h3>
            {calibratedSuccess && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ✓ Recalibrado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Reajusta a matriz de contraste, balanço de branco e limiar de binarização (Otsu Thresholding) para otimizar leitura em celulares.
          </p>

          <button
            type="button"
            onClick={handleRecalibrate}
            disabled={calibrating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin text-amber-600' : ''}`} />
            <span>{calibrating ? 'Recalibrando matrizes...' : 'Executar Calibração Óptica'}</span>
          </button>
        </div>

        {/* Restaurar Turma Padrão */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Restaurar Turma Base (5º Ano B)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Restaura a turma do 5º Ano B e seus 35 alunos cadastrados, sem carregar turmas fictícias de exemplo e sem alterar suas avaliações existentes.
          </p>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Deseja restaurar a turma 5º Ano B e seus 35 alunos? Suas avaliações cadastradas serão preservadas intactas.')) {
                onResetData();
                showToast('Turma 5º Ano B e 35 alunos restaurados com sucesso!');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            <span>Restaurar Turma 5º Ano B</span>
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO PARA ZERAR ARQUIVO */}
      {confirmClear.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setConfirmClear({ isOpen: false, fileKey: null, fileName: '', count: 0 })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Limpeza: {confirmClear.fileName}?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você está prestes a <strong>zerar todos os {confirmClear.count} registros</strong> deste arquivo.
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 leading-relaxed">
                ⚠️ <strong>Atenção:</strong> Os dados deste arquivo serão apagados da memória local. Caso necessite deles no futuro, certifique-se de ter feito o download do arquivo JSON antes de confirmar.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmClear({ isOpen: false, fileKey: null, fileName: '', count: 0 })}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeClear}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-98"
              >
                Sim, Zerar Arquivo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
