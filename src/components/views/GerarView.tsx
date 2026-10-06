import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  GraduationCap, 
  Calendar, 
  Hash, 
  Save, 
  Trash2, 
  Edit3, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Layers, 
  BookOpen, 
  Copy, 
  HelpCircle,
  Pencil,
  Eye,
  Sliders,
  Users
} from 'lucide-react';
import { Assessment, Turma, Student, GeneratedExam, ExamDifficulty, GeneratedQuestion, Alternative } from '../../types';
import { storageService } from '../../services/storage';
import { examGeneratorService } from '../../services/examGeneratorService';
import { PrintableExamModal } from '../PrintableExamModal';

interface GerarViewProps {
  assessments: Assessment[];
  turmas: Turma[];
  students: Student[];
  schoolName: string;
  schoolLogo?: string;
  onUpdateSchoolLogo?: (logo: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const GerarView: React.FC<GerarViewProps> = ({
  assessments,
  turmas,
  students,
  schoolName,
  schoolLogo,
  onUpdateSchoolLogo,
  onNavigateTab,
}) => {
  // Assessment Selection
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(() => {
    return assessments[0]?.id || '';
  });

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  // Difficulty selection
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Médio');

  // "Linha de digitação que conterá informações para a IA gerar a avaliação"
  const [promptInfo, setPromptInfo] = useState<string>('');

  // Loading & Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Generated Exam state
  const [currentExam, setCurrentExam] = useState<GeneratedExam | null>(null);

  // Editing mode for Generated Exam
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingQuestions, setEditingQuestions] = useState<GeneratedQuestion[]>([]);

  // Print Mode Options requested by user:
  // "Unica para xerox (sem ou com data de avaliação) e sem nome de alunos, ou completa com todos os alunos ativos"
  const [printOption, setPrintOption] = useState<'xerox' | 'all_active'>('xerox');
  const [includeDateInXerox, setIncludeDateInXerox] = useState<boolean>(true);
  const [includeOfficialKeyInXerox, setIncludeOfficialKeyInXerox] = useState<boolean>(false);

  // Modal for Printing / PDF
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Load existing generated exam when assessment changes
  useEffect(() => {
    if (selectedAssessmentId) {
      const saved = storageService.getGeneratedExamByAssessmentId(selectedAssessmentId);
      if (saved) {
        setCurrentExam(saved);
        setDifficulty(saved.difficulty);
        setPromptInfo(saved.promptInfo);
        setEditingQuestions(saved.questions);
      } else {
        setCurrentExam(null);
        setEditingQuestions([]);
      }
    } else {
      setCurrentExam(null);
      setEditingQuestions([]);
    }
  }, [selectedAssessmentId]);

  // Update editing state whenever currentExam changes
  useEffect(() => {
    if (currentExam) {
      setEditingQuestions(JSON.parse(JSON.stringify(currentExam.questions)));
    }
  }, [currentExam]);

  // Active students count for the selected assessment's turma
  const activeStudentsInTurma = selectedAssessment
    ? students.filter((s) => s.turmaId === selectedAssessment.turmaId && s.active !== false)
    : [];

  // Generate Exam with AI
  const handleGenerateExam = async () => {
    if (!selectedAssessment) {
      setFeedbackMessage({ type: 'error', text: 'Por favor, selecione uma avaliação primeiro.' });
      return;
    }

    setIsGenerating(true);
    setFeedbackMessage({ type: 'info', text: 'A Inteligência Artificial está elaborando as questões contextualizadas...' });

    try {
      const questions = await examGeneratorService.generateExamQuestions({
        assessment: selectedAssessment,
        difficulty,
        promptInfo: promptInfo.trim(),
      });

      const newExam: GeneratedExam = {
        id: `exam_gen_${Date.now().toString(36)}`,
        assessmentId: selectedAssessment.id,
        assessmentTitle: selectedAssessment.title,
        subject: selectedAssessment.subject,
        turmaId: selectedAssessment.turmaId,
        turmaName: selectedAssessment.turmaName,
        applicationDate: selectedAssessment.date,
        totalQuestions: selectedAssessment.totalQuestions,
        difficulty,
        promptInfo: promptInfo.trim(),
        questions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCurrentExam(newExam);
      setEditingQuestions(JSON.parse(JSON.stringify(questions)));
      setIsEditing(false);

      // Auto-save to storage as requested
      storageService.saveGeneratedExam(newExam);
      storageService.incrementVersion();

      setFeedbackMessage({ 
        type: 'success', 
        text: `Avaliação gerada com sucesso! ${questions.length} questões estruturadas com IA.` 
      });
    } catch (error: any) {
      setFeedbackMessage({ 
        type: 'error', 
        text: error?.message || 'Ocorreu um erro ao gerar a avaliação.' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 1. Armazenar (Salvar)
  const handleSaveExam = () => {
    if (!currentExam) return;

    const examToSave: GeneratedExam = {
      ...currentExam,
      difficulty,
      promptInfo: promptInfo.trim(),
      questions: editingQuestions.length > 0 ? editingQuestions : currentExam.questions,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveGeneratedExam(examToSave);
    setCurrentExam(examToSave);
    setIsEditing(false);
    storageService.incrementVersion();

    setFeedbackMessage({ 
      type: 'success', 
      text: 'Avaliação armazenada com sucesso no sistema!' 
    });
  };

  // 2. Excluir
  const handleDeleteExam = () => {
    if (!currentExam && !selectedAssessmentId) return;

    if (window.confirm('Tem certeza de que deseja excluir a avaliação gerada para esta prova?')) {
      if (currentExam) {
        storageService.deleteGeneratedExam(currentExam.id);
      }
      if (selectedAssessmentId) {
        storageService.deleteGeneratedExam(selectedAssessmentId);
      }
      setCurrentExam(null);
      setEditingQuestions([]);
      setIsEditing(false);
      storageService.incrementVersion();

      setFeedbackMessage({ 
        type: 'info', 
        text: 'Avaliação gerada excluída.' 
      });
    }
  };

  // 3. Alterar (Habilitar / Desabilitar modo edição)
  const handleToggleEdit = () => {
    if (isEditing) {
      // Save changes made in edit mode
      handleSaveExam();
    } else {
      setIsEditing(true);
    }
  };

  // Update question field in edit mode
  const handleUpdateQuestionStatement = (qIndex: number, newStatement: string) => {
    setEditingQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, statement: newStatement } : q))
    );
  };

  const handleUpdateOptionText = (qIndex: number, optLetter: Alternative, newText: string) => {
    setEditingQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOptions = q.options.map((opt) =>
          opt.letter === optLetter ? { ...opt, text: newText } : opt
        );
        return { ...q, options: newOptions };
      })
    );
  };

  const handleUpdateCorrectAlternative = (qIndex: number, correctAlt: Alternative) => {
    setEditingQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, correctAlternative: correctAlt } : q))
    );
  };

  // Quick prompt suggestions
  const promptSuggestions = [
    'Contemple as seguintes Habilidades: EF05LP01, e EF35LP05, com formatação adequada.',
    'Questões com situações-problema do cotidiano e interpretação',
    'Foco em cálculo, raciocínio lógico e análise de dados',
    'Revisão bimestral dos principais conteúdos curriculares',
    'Questões contextualizadas no modelo ENEM e vestibulares',
    'Ênfase em conceitos fundamentais, definições e exemplos práticos',
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gerador Inteligente</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{storageService.getVersion()}</span>
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Gerar Avaliação com IA</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Elabore provas escolares completas a partir da avaliação cadastrada, com seleção de dificuldade, linha de digitação para a IA e impressão em folha única para xerox ou nominal por aluno.
          </p>
        </div>

        {/* Action Header Button if exam is ready */}
        {currentExam && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
          feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
          feedbackMessage.type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-300' :
          'bg-indigo-50 text-indigo-900 border-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> :
             feedbackMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> :
             <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Form Configuration Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
        
        {/* Step 1: Escolha da Avaliação Cadastrada */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>1. Escolha a Avaliação Cadastrada Anteriormente</span>
          </label>

          {assessments.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span>Nenhuma avaliação cadastrada ainda. Cadastre uma avaliação no menu "Avaliações" primeiro.</span>
              <button
                onClick={() => onNavigateTab('avaliacoes')}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
              >
                Ir para Avaliações
              </button>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} • {a.subject} • {a.turmaName} ({a.totalQuestions} questões)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Step 2: Informações Trazidas Automaticamente da Avaliação */}
        {selectedAssessment && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            
            {/* Turma */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Turma</span>
                <span className="text-xs font-bold text-slate-900">{selectedAssessment.turmaName}</span>
                <span className="text-[10px] text-slate-500 block">
                  {activeStudentsInTurma.length} alunos ativos
                </span>
              </div>
            </div>

            {/* Data da Aplicação */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-sky-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Data da Aplicação</span>
                <span className="text-xs font-bold text-slate-900">
                  {selectedAssessment.date ? new Date(selectedAssessment.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
                </span>
                <span className="text-[10px] text-slate-500 block">Oficial da Prova</span>
              </div>
            </div>

            {/* Número de Questões */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100/70 text-indigo-800 flex items-center justify-center shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Número de Questões</span>
                <span className="text-xs font-bold text-slate-900">
                  {selectedAssessment.totalQuestions} Questões
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedAssessment.optionsPerQuestion ? `${selectedAssessment.optionsPerQuestion} Opções (A a ${String.fromCharCode(64 + selectedAssessment.optionsPerQuestion)})` : '5 Opções (A a E)'}
                </span>
              </div>
            </div>

            {/* Disciplina & Título */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100/70 text-purple-800 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Disciplina</span>
                <span className="text-xs font-bold text-slate-900 truncate block max-w-[150px]">
                  {selectedAssessment.subject}
                </span>
                <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                  {selectedAssessment.title}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Step 3: Botão de Seleção de Fácil, Médio e Difícil */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>2. Nível de Dificuldade da Avaliação</span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            
            {/* Fácil */}
            <button
              type="button"
              onClick={() => setDifficulty('Fácil')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                difficulty === 'Fácil'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-extrabold text-sm">Fácil</span>
              </div>
              <span className="text-[10px] text-slate-500 text-center">
                Conceitos diretos e situações básicas
              </span>
            </button>

            {/* Médio */}
            <button
              type="button"
              onClick={() => setDifficulty('Médio')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                difficulty === 'Médio'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-extrabold text-sm">Médio</span>
              </div>
              <span className="text-[10px] text-slate-500 text-center">
                Contextualizada e raciocínio prático
              </span>
            </button>

            {/* Difícil */}
            <button
              type="button"
              onClick={() => setDifficulty('Difícil')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                difficulty === 'Difícil'
                  ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="font-extrabold text-sm">Difícil</span>
              </div>
              <span className="text-[10px] text-slate-500 text-center">
                Análise crítica, inferência e problemas complexos
              </span>
            </button>

          </div>
        </div>

        {/* Step 4: Linha de Digitação de Informações para a IA */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Pencil className="w-4 h-4 text-indigo-600" />
              <span>3. Linha de Digitação de Informações para a IA Gerar a Avaliação</span>
            </span>
            <span className="text-[10px] font-normal text-slate-400">
              Temas, habilidades, tópicos ou orientações específicas
            </span>
          </label>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={promptInfo}
              onChange={(e) => setPromptInfo(e.target.value)}
              placeholder="Digite aqui as instruções para a IA. Ex: Prova sobre Funções do 1º Grau, Geometria e Estatística Básica, com problemas do cotidiano, contextualização e gráficos conceituais..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />

            {/* Quick Sugestões Cliváveis */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10.5px] font-bold text-slate-500">Sugestões rápidas:</span>
              {promptSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptInfo((prev) => (prev ? `${prev}. ${sug}` : sug))}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Botão de Disparo para Gerar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {currentExam ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Esta avaliação já possui questões geradas pela IA. Você pode alterá-las, imprimir ou gerar novas.
              </span>
            ) : (
              <span>Clique no botão para que a IA elabore todas as {selectedAssessment?.totalQuestions || 10} questões.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateExam}
            disabled={isGenerating || !selectedAssessment}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{currentExam ? 'Gerar Novamente com IA' : 'Gerar Avaliação com IA'}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Step 5: Possibilidades de Armazenar, Excluir e Alterar + Opção de Impressão */}
      {currentExam && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          
          {/* Header of Generated Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Avaliação Gerada pela IA ({currentExam.questions.length} Questões)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentExam.difficulty}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Você pode armazenar, excluir ou alterar os enunciados e alternativas livremente antes da impressão.
              </p>
            </div>

            {/* The 3 Actions explicitly requested: Armazenar, Alterar, Excluir */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Alterar (Modo Edição) */}
              <button
                type="button"
                onClick={handleToggleEdit}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isEditing 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {isEditing ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Concluir Alterações</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Alterar Questões</span>
                  </>
                )}
              </button>

              {/* Armazenar */}
              <button
                type="button"
                onClick={handleSaveExam}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all"
                title="Armazenar no sistema"
              >
                <Save className="w-3.5 h-3.5 text-indigo-700" />
                <span>Armazenar</span>
              </button>

              {/* Excluir */}
              <button
                type="button"
                onClick={handleDeleteExam}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                title="Excluir prova gerada"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                <span>Excluir</span>
              </button>

            </div>
          </div>

          {/* Opções de Impressão: Única para Xerox vs Completa com Todos os Alunos Ativos */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>Opções de Impressão & Formato do Cabeçalho</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Opção 1: Única para Xerox */}
              <div 
                onClick={() => setPrintOption('xerox')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  printOption === 'xerox'
                    ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="printOption"
                    checked={printOption === 'xerox'}
                    onChange={() => setPrintOption('xerox')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs text-slate-900 block">
                      Única para Xerox (Sem Nome de Alunos)
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Gera 1 exemplar matriz para fotocópia com linha pontilhada/contínua para preenchimento manual do nome do aluno.
                    </span>

                    {/* Sub-opções exclusivas para Xerox */}
                    <div className="pt-2 space-y-2">
                      <label 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={includeDateInXerox}
                          onChange={(e) => setIncludeDateInXerox(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{includeDateInXerox ? 'Com data da avaliação no cabeçalho' : 'Sem data (deixar campo DATA em branco)'}</span>
                      </label>

                      {/* Gabarito oficial: somente se confirmada a opção, em folha a parte e apenas na opção para xerox */}
                      <label 
                        onClick={(e) => e.stopPropagation()} 
                        className={`flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg border text-[11px] font-bold select-none transition-all ${
                          includeOfficialKeyInXerox
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={includeOfficialKeyInXerox}
                          onChange={(e) => setIncludeOfficialKeyInXerox(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span>Incluir Gabarito Oficial (Anexo do Professor) em folha à parte</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opção 2: Completa com todos os alunos ativos */}
              <div 
                onClick={() => setPrintOption('all_active')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  printOption === 'all_active'
                    ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="printOption"
                    checked={printOption === 'all_active'}
                    onChange={() => setPrintOption('all_active')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900 block">
                        Completa com Todos os Alunos Ativos
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                        {activeStudentsInTurma.length} Alunos
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Gera um caderno nominal individual para cada aluno ativo da turma {selectedAssessment?.turmaName}, com o mesmo modelo de cabeçalho do gabarito oficial.
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Botão de Disparo do Modal de Impressão */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Visualizar e Imprimir Avaliação (PDF)</span>
              </button>
            </div>

          </div>

          {/* Question List (Visualização e Edição) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isEditing ? '✏️ Modo Edição Ativo - Altere qualquer enunciado ou alternativa:' : '📋 Questões Elaboradas:'}
              </span>
              {isEditing && (
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Edição liberada. Clique em "Concluir Alterações" ou "Armazenar" ao terminar.
                </span>
              )}
            </div>

            <div className="space-y-4">
              {editingQuestions.map((q, qIdx) => (
                <div
                  key={q.number}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                >
                  {/* Question Number & Statement */}
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center font-mono">
                      {q.number}
                    </span>

                    <div className="flex-1">
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={q.statement}
                          onChange={(e) => handleUpdateQuestionStatement(qIdx, e.target.value)}
                          className="w-full p-2.5 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-sm sm:text-[15px] font-bold text-slate-900 leading-relaxed">
                          {q.statement}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Alternatives */}
                  <div className="space-y-2 pl-9">
                    {q.options.map((opt) => (
                      <div key={opt.letter} className="flex items-center gap-2.5">
                        <button
                          type="button"
                          disabled={!isEditing}
                          onClick={() => handleUpdateCorrectAlternative(qIdx, opt.letter)}
                          title={isEditing ? 'Marcar como alternativa correta' : undefined}
                          className={`w-6 h-6 rounded-full text-xs font-black font-mono flex items-center justify-center transition-all ${
                            q.correctAlternative === opt.letter
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {opt.letter}
                        </button>

                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleUpdateOptionText(qIdx, opt.letter, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className={`text-xs sm:text-[13.5px] ${q.correctAlternative === opt.letter ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                              {opt.text}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explanation / Justificativa pedagógica */}
                  {q.explanation && (
                    <div className="pl-9 pt-1">
                      <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong className="text-slate-700 not-italic font-semibold">Resolução pedagógica:</strong> {q.explanation}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* Printable Exam Modal */}
      <PrintableExamModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={currentExam}
        students={students}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        printMode={printOption}
        includeDateInXerox={includeDateInXerox}
        includeOfficialKey={printOption === 'xerox' && includeOfficialKeyInXerox}
        onUpdateSchoolLogo={onUpdateSchoolLogo}
      />

    </div>
  );
};
