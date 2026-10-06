import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Printer, 
  ScanLine, 
  CheckCircle2, 
  Calendar, 
  GraduationCap, 
  Sparkles, 
  HelpCircle, 
  Copy, 
  ChevronRight, 
  BookOpen, 
  Trash2, 
  AlertTriangle, 
  X, 
  Hash, 
  Wand2, 
  Pencil,
  ClipboardCheck
} from 'lucide-react';
import { Assessment, Turma, Alternative, AssessmentQuestion } from '../../types';
import { storageService } from '../../services/storage';

interface AvaliacoesViewProps {
  assessments: Assessment[];
  turmas: Turma[];
  systemVersion?: string;
  onAddAssessment: (newAssessment: Assessment) => void;
  onUpdateAssessment?: (updatedAssessment: Assessment) => void;
  onDeleteAssessment?: (assessmentId: string) => void;
  onSelectScanAssessment: (assessmentId: string) => void;
  onPrintAssessment: (assessment: Assessment) => void;
  onOpenBoletim?: (assessmentId: string) => void;
  onNavigateToGerar?: (assessmentId: string) => void;
}

export const AvaliacoesView: React.FC<AvaliacoesViewProps> = ({
  assessments,
  turmas,
  systemVersion,
  onAddAssessment,
  onUpdateAssessment,
  onDeleteAssessment,
  onSelectScanAssessment,
  onPrintAssessment,
  onOpenBoletim,
  onNavigateToGerar,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  
  // New Assessment form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [turmaId, setTurmaId] = useState(turmas[0]?.id || '');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [questionsInput, setQuestionsInput] = useState('10');
  const [optionsPerQuestion, setOptionsPerQuestion] = useState<number>(5); // 2 a 5 opções
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [instructions, setInstructions] = useState('Preencha a bolha totalmente com caneta esferográfica preta ou azul.');

  // Editing Assessment form state
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editTurmaId, setEditTurmaId] = useState('');
  const [editTotalQuestions, setEditTotalQuestions] = useState(10);
  const [editQuestionsInput, setEditQuestionsInput] = useState('10');
  const [editOptionsPerQuestion, setEditOptionsPerQuestion] = useState<number>(5); // 2 a 5 opções
  const [editDate, setEditDate] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editStatus, setEditStatus] = useState<'rascunho' | 'ativa' | 'concluida'>('ativa');
  const [editAnswerKeyMap, setEditAnswerKeyMap] = useState<Record<number, Alternative>>({});
  
  const ALL_ALTERNATIVES: Alternative[] = ['A', 'B', 'C', 'D', 'E'];
  const currentAlternatives = ALL_ALTERNATIVES.slice(0, optionsPerQuestion);
  const editCurrentAlternatives = ALL_ALTERNATIVES.slice(0, editOptionsPerQuestion);

  // Answer Key Builder
  const [answerKeyMap, setAnswerKeyMap] = useState<Record<number, Alternative>>(() => {
    const initialMap: Record<number, Alternative> = {};
    const defaultAnswers: Alternative[] = ['A', 'C', 'B', 'D', 'E', 'B', 'A', 'C', 'D', 'E'];
    for (let i = 1; i <= 10; i++) {
      initialMap[i] = defaultAnswers[(i - 1) % defaultAnswers.length];
    }
    return initialMap;
  });

  // Handler para alteração de número de opções/bolhas por questão (2 a 5)
  const handleOptionsPerQuestionChange = (count: number) => {
    const validCount = Math.max(2, Math.min(5, Math.floor(count) || 5));
    setOptionsPerQuestion(validCount);
    const validAlts = ALL_ALTERNATIVES.slice(0, validCount);
    const maxAlt = validAlts[validAlts.length - 1];

    setAnswerKeyMap((prev) => {
      const nextMap: Record<number, Alternative> = { ...prev };
      for (const [k, v] of Object.entries(nextMap)) {
        if (!validAlts.includes(v)) {
          nextMap[Number(k)] = maxAlt;
        }
      }
      return nextMap;
    });
  };

  const handleEditOptionsPerQuestionChange = (count: number) => {
    const validCount = Math.max(2, Math.min(5, Math.floor(count) || 5));
    setEditOptionsPerQuestion(validCount);
    const validAlts = ALL_ALTERNATIVES.slice(0, validCount);
    const maxAlt = validAlts[validAlts.length - 1];

    setEditAnswerKeyMap((prev) => {
      const nextMap: Record<number, Alternative> = { ...prev };
      for (const [k, v] of Object.entries(nextMap)) {
        if (!validAlts.includes(v)) {
          nextMap[Number(k)] = maxAlt;
        }
      }
      return nextMap;
    });
  };

  // Update total questions with sync to input and answer key
  const handleQuestionCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(100, Math.floor(count) || 1));
    setTotalQuestions(validCount);
    setQuestionsInput(String(validCount));
    setAnswerKeyMap((prev) => {
      const nextMap: Record<number, Alternative> = { ...prev };
      for (let i = 1; i <= validCount; i++) {
        if (!nextMap[i]) {
          nextMap[i] = currentAlternatives[(i - 1) % currentAlternatives.length];
        }
      }
      return nextMap;
    });
  };

  // Allow free typing in input field
  const handleQuestionsInputChange = (rawVal: string) => {
    setQuestionsInput(rawVal);
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(Math.max(1, parsed), 100);
      setTotalQuestions(clamped);
      setAnswerKeyMap((prev) => {
        const nextMap: Record<number, Alternative> = { ...prev };
        for (let i = 1; i <= clamped; i++) {
          if (!nextMap[i]) {
            nextMap[i] = currentAlternatives[(i - 1) % currentAlternatives.length];
          }
        }
        return nextMap;
      });
    }
  };

  // Re-clamp on blur if input was empty or out of bounds
  const handleQuestionsInputBlur = () => {
    const parsed = parseInt(questionsInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      handleQuestionCountChange(1);
    } else if (parsed > 100) {
      handleQuestionCountChange(100);
    } else {
      handleQuestionCountChange(parsed);
    }
  };

  // Quick fill all with specific alternative
  const handleFillAllWith = (alt: Alternative) => {
    setAnswerKeyMap(() => {
      const newMap: Record<number, Alternative> = {};
      for (let i = 1; i <= totalQuestions; i++) {
        newMap[i] = alt;
      }
      return newMap;
    });
  };

  // Quick fill alternating with available alternatives
  const handleFillSequential = () => {
    setAnswerKeyMap(() => {
      const newMap: Record<number, Alternative> = {};
      for (let i = 1; i <= totalQuestions; i++) {
        newMap[i] = currentAlternatives[(i - 1) % currentAlternatives.length];
      }
      return newMap;
    });
  };

  const handleSelectAlternative = (questionNum: number, alt: Alternative) => {
    setAnswerKeyMap((prev) => ({
      ...prev,
      [questionNum]: alt,
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedTurma = turmas.find((t) => t.id === turmaId) || turmas[0];
    const finalQuestionCount = Math.max(1, Math.min(100, totalQuestions));

    const questionsList: AssessmentQuestion[] = [];
    for (let i = 1; i <= finalQuestionCount; i++) {
      questionsList.push({
        number: i,
        correctAlternative: answerKeyMap[i] || 'A',
        weight: 1,
        topic: `Questão ${i}`,
      });
    }

    const newAss: Assessment = {
      id: `av_${Date.now().toString(36)}`,
      title: title.trim(),
      subject: subject.trim() || selectedTurma.subjectDefault || 'Avaliação Geral',
      turmaId: selectedTurma.id,
      turmaName: selectedTurma.name,
      totalQuestions: finalQuestionCount,
      optionsPerQuestion: optionsPerQuestion,
      maxScore: finalQuestionCount,
      date,
      instructions,
      answerKey: questionsList,
      status: 'ativa',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddAssessment(newAss);
    setIsCreating(false);
    setTitle('');
    setSubject('');
  };

  // Open edit modal for an assessment
  const handleOpenEditModal = (ass: Assessment) => {
    setEditingAssessment(ass);
    setEditTitle(ass.title);
    setEditSubject(ass.subject);
    setEditTurmaId(ass.turmaId);
    setEditTotalQuestions(ass.totalQuestions);
    setEditQuestionsInput(String(ass.totalQuestions));
    setEditOptionsPerQuestion(ass.optionsPerQuestion || 5);
    setEditDate(ass.date);
    setEditInstructions(ass.instructions || 'Preencha a bolha totalmente com caneta esferográfica preta ou azul.');
    setEditStatus(ass.status || 'ativa');

    // Build map from existing answerKey
    const map: Record<number, Alternative> = {};
    ass.answerKey.forEach((q) => {
      map[q.number] = q.correctAlternative;
    });
    for (let i = 1; i <= ass.totalQuestions; i++) {
      if (!map[i]) map[i] = 'A';
    }
    setEditAnswerKeyMap(map);
  };

  const handleEditQuestionCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(100, Math.floor(count) || 1));
    setEditTotalQuestions(validCount);
    setEditQuestionsInput(String(validCount));
    setEditAnswerKeyMap((prev) => {
      const nextMap: Record<number, Alternative> = { ...prev };
      for (let i = 1; i <= validCount; i++) {
        if (!nextMap[i]) {
          nextMap[i] = editCurrentAlternatives[(i - 1) % editCurrentAlternatives.length];
        }
      }
      return nextMap;
    });
  };

  const handleEditQuestionsInputChange = (rawVal: string) => {
    setEditQuestionsInput(rawVal);
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(Math.max(1, parsed), 100);
      setEditTotalQuestions(clamped);
      setEditAnswerKeyMap((prev) => {
        const nextMap: Record<number, Alternative> = { ...prev };
        for (let i = 1; i <= clamped; i++) {
          if (!nextMap[i]) {
            nextMap[i] = editCurrentAlternatives[(i - 1) % editCurrentAlternatives.length];
          }
        }
        return nextMap;
      });
    }
  };

  const handleEditQuestionsInputBlur = () => {
    const parsed = parseInt(editQuestionsInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      handleEditQuestionCountChange(1);
    } else if (parsed > 100) {
      handleEditQuestionCountChange(100);
    } else {
      handleEditQuestionCountChange(parsed);
    }
  };

  const handleEditFillAllWith = (alt: Alternative) => {
    setEditAnswerKeyMap(() => {
      const newMap: Record<number, Alternative> = {};
      for (let i = 1; i <= editTotalQuestions; i++) {
        newMap[i] = alt;
      }
      return newMap;
    });
  };

  const handleEditFillSequential = () => {
    setEditAnswerKeyMap(() => {
      const newMap: Record<number, Alternative> = {};
      for (let i = 1; i <= editTotalQuestions; i++) {
        newMap[i] = editCurrentAlternatives[(i - 1) % editCurrentAlternatives.length];
      }
      return newMap;
    });
  };

  const handleEditSelectAlternative = (questionNum: number, alt: Alternative) => {
    setEditAnswerKeyMap((prev) => ({
      ...prev,
      [questionNum]: alt,
    }));
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment || !editTitle.trim()) return;

    const selectedTurma = turmas.find((t) => t.id === editTurmaId) || turmas[0];
    const finalQuestionCount = Math.max(1, Math.min(100, editTotalQuestions));

    const questionsList: AssessmentQuestion[] = [];
    for (let i = 1; i <= finalQuestionCount; i++) {
      const existingQ = editingAssessment.answerKey.find((q) => q.number === i);
      questionsList.push({
        number: i,
        correctAlternative: editAnswerKeyMap[i] || 'A',
        weight: existingQ?.weight || 1,
        topic: existingQ?.topic || `Questão ${i}`,
      });
    }

    const updatedAss: Assessment = {
      ...editingAssessment,
      title: editTitle.trim(),
      subject: editSubject.trim() || selectedTurma.subjectDefault || 'Avaliação Geral',
      turmaId: selectedTurma.id,
      turmaName: selectedTurma.name,
      totalQuestions: finalQuestionCount,
      optionsPerQuestion: editOptionsPerQuestion,
      maxScore: finalQuestionCount,
      date: editDate,
      instructions: editInstructions,
      status: editStatus,
      answerKey: questionsList,
    };

    if (onUpdateAssessment) {
      onUpdateAssessment(updatedAss);
    }
    setEditingAssessment(null);
  };

  const currentVersion = systemVersion || storageService.getVersion();

  return (
    <div className="space-y-6 no-print">
      
      {/* Versão no alto da tela do painel principal de avaliações */}
      <div 
        id="painel-principal-avaliacoes-version-banner"
        className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-800 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/50" />
          <span className="font-mono font-black text-sm tracking-wider text-emerald-300">
            {currentVersion}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">
            Painel Principal de Avaliações
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
          AvaliaScan
        </span>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              <FileText className="w-3.5 h-3.5" />
              <span>Gabaritos e Provas</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{currentVersion}</span>
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Avaliações Cadastradas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Defina o gabarito oficial com questões de múltipla escolha (A-E) e imprima a folha de respostas OMR
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Avaliação & Gabarito</span>
        </button>
      </div>

      {/* Assessment Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {assessments.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {item.subject}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {item.turmaName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {item.totalQuestions} Questões
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {item.optionsPerQuestion || 5} Opções (A-{String.fromCharCode(64 + (item.optionsPerQuestion || 5))})
                </span>
              </div>
            </div>

            {/* Answer key preview pills */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
                <span>Gabarito Oficial (Resumo • {item.optionsPerQuestion || 5} opções):</span>
                <span className="text-slate-400 font-normal">
                  {ALL_ALTERNATIVES.slice(0, item.optionsPerQuestion || 5).join(', ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.answerKey.slice(0, 15).map((q) => (
                  <div
                    key={q.number}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px]"
                  >
                    <span className="text-slate-400 font-mono text-[10px]">{q.number}:</span>
                    <span className="font-bold text-slate-900">{q.correctAlternative}</span>
                  </div>
                ))}
                {item.answerKey.length > 15 && (
                  <span className="text-[10px] text-slate-400 self-center">
                    +{item.answerKey.length - 15} questões
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onPrintAssessment(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-all"
                  title="Imprimir folha de resposta OMR"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Imprimir Folha OMR</span>
                </button>

                {onOpenBoletim && (
                  <button
                    type="button"
                    onClick={() => onOpenBoletim(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-all"
                    title="Abrir o boletim com checagem rigorosa de respostas e gabarito"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ver Boletim</span>
                  </button>
                )}

                {onNavigateToGerar && (
                  <button
                    type="button"
                    onClick={() => onNavigateToGerar(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition-all"
                    title="Gerar caderno de prova com IA para esta avaliação"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Gerar com IA</span>
                  </button>
                )}

                {onUpdateAssessment && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-medium transition-all"
                    title="Alterar dados e gabarito desta avaliação"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Alterar</span>
                  </button>
                )}

                {onDeleteAssessment && (
                  <button
                    type="button"
                    onClick={() => setAssessmentToDelete(item)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                    title="Excluir esta avaliação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectScanAssessment(item.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-xs shadow-xs transition-all active:scale-[0.98]"
              >
                <ScanLine className="w-4 h-4" />
                <span>Escanear Provas desta Avaliação</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Confirmação de Exclusão de Avaliação */}
      {assessmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Excluir Avaliação?</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está prestes a excluir a avaliação <strong className="text-slate-900">{assessmentToDelete.title}</strong> com {assessmentToDelete.totalQuestions} questões da turma <strong>{assessmentToDelete.turmaName}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAssessment) {
                    onDeleteAssessment(assessmentToDelete.id);
                  }
                  setAssessmentToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Form: Criar Nova Avaliação com Construtor de Gabarito */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 my-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Criar Nova Avaliação e Definir Gabarito
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure os dados da prova e digite livremente o total de questões desejadas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título da Avaliação</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Prova Bimestral de Física"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Disciplina / Matéria</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Física e Eletricidade"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Turma Destino</label>
                  <select
                    value={turmaId}
                    onChange={(e) => setTurmaId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden bg-white"
                  >
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} • Turno {t.shift || 'Manhã'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Data de Aplicação</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                  />
                </div>

                {/* QUANTIDADE DE QUESTÕES - DIGITAÇÃO LIVRE */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Qtd. de Questões
                    </label>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      Digitação Livre
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuestionCountChange(Math.max(1, totalQuestions - 1))}
                      className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shrink-0 active:scale-95"
                      title="Diminuir 1 questão"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={questionsInput}
                      onChange={(e) => handleQuestionsInputChange(e.target.value)}
                      onBlur={handleQuestionsInputBlur}
                      placeholder="Ex: 12"
                      className="w-full px-2.5 py-2 text-xs font-bold text-center text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden font-mono bg-white shadow-2xs"
                    />

                    <button
                      type="button"
                      onClick={() => handleQuestionCountChange(Math.min(100, totalQuestions + 1))}
                      className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all shrink-0 active:scale-95"
                      title="Aumentar 1 questão"
                    >
                      +
                    </button>
                  </div>

                  {/* Atalhos Rápidos para facilidade */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Atalhos:</span>
                    {[5, 10, 15, 20, 25, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleQuestionCountChange(num)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          totalQuestions === num
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NÚMERO DE OPÇÕES / BOLHAS POR QUESTÃO (MÍNIMO 2, MÁXIMO 5) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Opções / Bolhas p/ Questão
                    </label>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      Mín 2 • Máx 5
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOptionsPerQuestionChange(optionsPerQuestion - 1)}
                      disabled={optionsPerQuestion <= 2}
                      className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition-all shrink-0 active:scale-95"
                      title="Diminuir opções (Mínimo 2)"
                    >
                      -
                    </button>

                    <div className="w-full px-2 py-2 text-xs font-bold text-center text-slate-900 border border-slate-200 rounded-xl bg-white shadow-2xs font-mono">
                      {optionsPerQuestion} ({currentAlternatives[0]}-{currentAlternatives[currentAlternatives.length - 1]})
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOptionsPerQuestionChange(optionsPerQuestion + 1)}
                      disabled={optionsPerQuestion >= 5}
                      className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition-all shrink-0 active:scale-95"
                      title="Aumentar opções (Máximo 5)"
                    >
                      +
                    </button>
                  </div>

                  {/* Atalhos Rápidos para 2, 3, 4, 5 opções */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[2, 3, 4, 5].map((optNum) => (
                      <button
                        key={optNum}
                        type="button"
                        onClick={() => handleOptionsPerQuestionChange(optNum)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          optionsPerQuestion === optNum
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {optNum === 2 ? '2 (A-B)' : optNum === 3 ? '3 (A-C)' : optNum === 4 ? '4 (A-D)' : '5 (A-E)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Answer Key Selector Grid */}
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Gabarito Oficial ({totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'} • {optionsPerQuestion} opções):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Clique na letra correta para cada questão
                    </span>
                  </div>

                  {/* Batch Tools for quick answer key filling */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Preenchimento Rápido:</span>
                    <button
                      type="button"
                      onClick={handleFillSequential}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition-all"
                      title={`Preenche sequencialmente ${currentAlternatives.join(', ')}`}
                    >
                      {currentAlternatives[0]}-{currentAlternatives[currentAlternatives.length - 1]} Sequencial
                    </button>
                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 px-1">Todas:</span>
                      {currentAlternatives.map((alt) => (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => handleFillAllWith(alt)}
                          className="w-5 h-5 rounded text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center"
                          title={`Marcar todas as ${totalQuestions} questões como ${alt}`}
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => (
                    <div
                      key={qNum}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <span className="text-xs font-black text-slate-800 font-mono w-7 text-center">
                        {String(qNum).padStart(2, '0')}
                      </span>

                      <div className="flex items-center gap-1">
                        {currentAlternatives.map((alt) => {
                          const isSelected = answerKeyMap[qNum] === alt;
                          return (
                            <button
                              key={alt}
                              type="button"
                              onClick={() => handleSelectAlternative(qNum, alt)}
                              className={`w-6 h-6 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs scale-105'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {alt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-[0.98]"
                >
                  Salvar Avaliação & Gabarito ({totalQuestions} Questões)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Alteração de Avaliação Existente */}
      {editingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold mb-1">
                  <Pencil className="w-3 h-3" />
                  <span>Editar Avaliação</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Alterar Avaliação & Gabarito</h3>
                <p className="text-xs text-slate-500">
                  Modifique o título, disciplina, turma, quantidade de questões e as alternativas do gabarito
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssessment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título da Prova *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Ex: Simulado Bimestral de Exatas"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Disciplina</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Ex: Matemática e Física"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Turma Destino</label>
                  <select
                    value={editTurmaId}
                    onChange={(e) => setEditTurmaId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden"
                  >
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Data da Aplicação</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status da Avaliação</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 outline-hidden"
                  >
                    <option value="ativa">Ativa (Pronta p/ escanear)</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              </div>

              {/* Quantidade Livre de Questões e Opções por Questão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Quantidade de Questões */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-800">
                        Quantidade de Questões (Digitação Livre)
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Digite qualquer quantidade (ex: 7, 12, 25, 40, até 100)
                      </span>
                    </div>

                    {/* Input direto com botões de ajuste */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleEditQuestionCountChange(editTotalQuestions - 1)}
                        disabled={editTotalQuestions <= 1}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Diminuir 1 questão"
                      >
                        -
                      </button>

                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editQuestionsInput}
                          onChange={(e) => handleEditQuestionsInputChange(e.target.value)}
                          onBlur={handleEditQuestionsInputBlur}
                          className="w-16 h-8 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditQuestionCountChange(editTotalQuestions + 1)}
                        disabled={editTotalQuestions >= 100}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Aumentar 1 questão"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-medium uppercase mr-1">Atalhos:</span>
                    {[5, 10, 15, 20, 25, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleEditQuestionCountChange(num)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all ${
                          editTotalQuestions === num
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opções / Bolhas por Questão (Mínimo 2 e Máximo 5) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="block text-xs font-bold text-slate-800">
                          Opções / Bolhas por Questão
                        </label>
                        <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Mín 2 • Máx 5
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Quantidade de alternativas ({editCurrentAlternatives[0]}-{editCurrentAlternatives[editCurrentAlternatives.length - 1]})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleEditOptionsPerQuestionChange(editOptionsPerQuestion - 1)}
                        disabled={editOptionsPerQuestion <= 2}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Diminuir opções (Mínimo 2)"
                      >
                        -
                      </button>

                      <div className="w-16 h-8 flex items-center justify-center font-bold text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono">
                        {editOptionsPerQuestion}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditOptionsPerQuestionChange(editOptionsPerQuestion + 1)}
                        disabled={editOptionsPerQuestion >= 5}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Aumentar opções (Máximo 5)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Atalhos de opções */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-medium uppercase mr-1">Opções:</span>
                    {[2, 3, 4, 5].map((optNum) => (
                      <button
                        key={optNum}
                        type="button"
                        onClick={() => handleEditOptionsPerQuestionChange(optNum)}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all ${
                          editOptionsPerQuestion === optNum
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {optNum === 2 ? '2 (A-B)' : optNum === 3 ? '3 (A-C)' : optNum === 4 ? '4 (A-D)' : '5 (A-E)'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Construtor do Gabarito Interativo */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Gabarito Oficial ({editTotalQuestions} {editTotalQuestions === 1 ? 'Questão' : 'Questões'} • {editOptionsPerQuestion} opções)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Clique na letra correta ({editCurrentAlternatives.join(', ')}) para cada questão
                    </p>
                  </div>

                  {/* Ferramentas de preenchimento rápido */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleEditFillSequential}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                      title={`Preencher alternadamente: ${editCurrentAlternatives.join(', ')}`}
                    >
                      {editCurrentAlternatives[0]}-{editCurrentAlternatives[editCurrentAlternatives.length - 1]} Sequencial
                    </button>
                    <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 px-1">Todas:</span>
                      {editCurrentAlternatives.map((alt) => (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => handleEditFillAllWith(alt)}
                          className="w-5 h-5 rounded text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center"
                          title={`Marcar todas as ${editTotalQuestions} questões como ${alt}`}
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {Array.from({ length: editTotalQuestions }, (_, i) => i + 1).map((qNum) => (
                    <div
                      key={qNum}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <span className="text-xs font-black text-slate-800 font-mono w-7 text-center">
                        {String(qNum).padStart(2, '0')}
                      </span>

                      <div className="flex items-center gap-1">
                        {editCurrentAlternatives.map((alt) => {
                          const isSelected = editAnswerKeyMap[qNum] === alt;
                          return (
                            <button
                              key={alt}
                              type="button"
                              onClick={() => handleEditSelectAlternative(qNum, alt)}
                              className={`w-6 h-6 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs scale-105'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {alt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAssessment(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-[0.98]"
                >
                  Salvar Alterações da Avaliação
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
