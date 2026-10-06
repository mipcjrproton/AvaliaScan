import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  User, 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  X,
  Printer,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';
import { CorrectionRecord, Student, Turma, Assessment, Alternative, StudentAnswer } from '../../types';

interface ConsultasViewProps {
  corrections: CorrectionRecord[];
  students: Student[];
  turmas: Turma[];
  assessments?: Assessment[];
  onDeleteCorrection?: (id: string) => void;
  onSaveCorrection?: (record: CorrectionRecord) => void;
}

export const ConsultasView: React.FC<ConsultasViewProps> = ({
  corrections,
  students,
  turmas,
  assessments = [],
  onDeleteCorrection,
  onSaveCorrection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<CorrectionRecord | null>(null);

  // State for editing answers inside the modal
  const [isEditing, setIsEditing] = useState(false);
  const [editableAnswers, setEditableAnswers] = useState<StudentAnswer[]>([]);
  const [saveToast, setSaveToast] = useState(false);

  const alternatives: Alternative[] = ['A', 'B', 'C', 'D', 'E'];

  // Current assessment matching selectedRecord for answer key check
  const currentAssessment = assessments.find((a) => a.id === selectedRecord?.assessmentId);

  const handleOpenRecord = (record: CorrectionRecord) => {
    setSelectedRecord(record);
    setEditableAnswers(JSON.parse(JSON.stringify(record.answers)));
    setIsEditing(false);
  };

  const handleManualOverride = (questionNum: number, alt: Alternative | 'BLANK' | 'MULTIPLE') => {
    if (!currentAssessment) return;
    const official = currentAssessment.answerKey.find((k) => k.number === questionNum);
    const correctAlt = official?.correctAlternative;

    let status: 'CORRETA' | 'ERRADA' | 'NULA';
    let isCorrect = false;

    if (alt === 'BLANK') {
      status = 'NULA';
      isCorrect = false;
    } else if (alt === correctAlt) {
      status = 'CORRETA';
      isCorrect = true;
    } else {
      status = 'ERRADA';
      isCorrect = false;
    }

    setEditableAnswers((prev) =>
      prev.map((a) => {
        if (a.questionNumber !== questionNum) return a;
        return {
          ...a,
          markedAlternative: alt,
          isCorrect,
          status,
          confidence: 100,
        };
      })
    );
  };

  const handleSaveEditedRecord = () => {
    if (!selectedRecord || !onSaveCorrection) return;

    const correctCount = editableAnswers.filter((a) => a.isCorrect).length;
    const blankCount = editableAnswers.filter((a) => a.markedAlternative === 'BLANK').length;
    const wrongCount = editableAnswers.length - correctCount - blankCount;
    const total = currentAssessment?.totalQuestions || selectedRecord.totalQuestions || editableAnswers.length || 1;
    const maxScore = currentAssessment?.maxScore || 10;
    const newScore = Number(((correctCount / total) * maxScore).toFixed(1));

    const updatedRecord: CorrectionRecord = {
      ...selectedRecord,
      answers: editableAnswers,
      correctCount,
      wrongCount,
      blankCount,
      score: newScore,
    };

    onSaveCorrection(updatedRecord);
    setSelectedRecord(updatedRecord);
    setIsEditing(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleDeleteRecord = (id: string, studentName: string, assessmentTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a leitura de correção do(a) aluno(a) "${studentName}" da avaliação "${assessmentTitle}"?`)) {
      if (onDeleteCorrection) {
        onDeleteCorrection(id);
      }
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  const filteredCorrections = corrections.filter((c) => {
    const matchesSearch = 
      c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.assessmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.turmaName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTurma = selectedTurmaFilter === 'all' || c.turmaId === selectedTurmaFilter;
    return matchesSearch && matchesTurma;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>Auditoria e Histórico</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Consultas de Avaliações Corrigidas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Localize gabaritos escaneados por aluno, turma ou data para conferência e esclarecimento de dúvidas
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome do aluno, avaliação ou turma..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-hidden bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTurmaFilter}
            onChange={(e) => setSelectedTurmaFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-hidden bg-slate-50/50"
          >
            <option value="all">Todas as Turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} • {t.shift || 'Manhã'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Aluno</th>
                <th className="py-3 px-6">Avaliação</th>
                <th className="py-3 px-6">Turma</th>
                <th className="py-3 px-6">Acertos</th>
                <th className="py-3 px-6">Nota</th>
                <th className="py-3 px-6">Data de Leitura</th>
                <th className="py-3 px-6 text-right">Espelho da Prova</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCorrections.length > 0 ? (
                filteredCorrections.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {record.studentName}
                    </td>
                    <td className="py-3.5 px-6 text-slate-700">
                      {record.assessmentTitle}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {record.turmaName}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium">
                      {record.correctCount}/{record.totalQuestions}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        record.score >= 8.0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : record.score >= 6.0
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {record.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {record.scannedAt}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenRecord(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          title="Visualizar e editar marcações do cartão"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver / Alterar</span>
                        </button>

                        {onDeleteCorrection && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record.id, record.studentName, record.assessmentTitle)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Excluir esta leitura de correção"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Espelho do Cartão-Resposta Escaneado com Edição e Exclusão */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-6 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Espelho Digital do Cartão de Respostas
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedRecord.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRecord.assessmentTitle} • {selectedRecord.turmaName}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {onDeleteCorrection && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(selectedRecord.id, selectedRecord.studentName, selectedRecord.assessmentTitle)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir esta leitura"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {saveToast && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Alterações salvas com sucesso no boletim do aluno!</span>
              </div>
            )}

            {/* Score header */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">
                  {isEditing ? 'Nova Nota Simulada' : 'Nota no Boletim'}
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {isEditing ? (
                    (() => {
                      const total = currentAssessment?.totalQuestions || editableAnswers.length || 1;
                      const correct = editableAnswers.filter((a) => a.isCorrect).length;
                      const maxScore = currentAssessment?.maxScore || 10;
                      return ((correct / total) * maxScore).toFixed(1);
                    })()
                  ) : (
                    selectedRecord.score.toFixed(1)
                  )}
                  <span className="text-xs text-slate-400 font-normal"> / {currentAssessment?.maxScore || 10}.0</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Acertos</div>
                <div className="text-sm font-bold text-emerald-700">
                  {isEditing 
                    ? `${editableAnswers.filter((a) => a.isCorrect).length} de ${editableAnswers.length}`
                    : `${selectedRecord.correctCount} de ${selectedRecord.totalQuestions}`
                  } questões
                </div>
              </div>
            </div>

            {/* Edit / Mode Toggle Header */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>
                  {isEditing
                    ? 'Clique nas letras abaixo para alterar a marcação do aluno'
                    : 'Modo de visualização do espelho escaneado'}
                </span>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Alterar Marcações</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditableAnswers(JSON.parse(JSON.stringify(selectedRecord.answers)));
                      setIsEditing(false);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedRecord}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              )}
            </div>

            {/* Detailed answers list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(isEditing ? editableAnswers : selectedRecord.answers).map((ans) => {
                const official = currentAssessment?.answerKey.find((k) => k.number === ans.questionNumber);
                const officialKey = official?.correctAlternative;

                return (
                  <div
                    key={ans.questionNumber}
                    className={`p-2.5 rounded-xl border transition-all ${
                      ans.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black w-7 text-center text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5">
                          {String(ans.questionNumber).padStart(2, '0')}
                        </span>
                        {ans.markedAlternative === 'BLANK' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-300">
                            <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Nula (Em Branco)</span>
                          </span>
                        ) : ans.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Correta</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100/70 px-1.5 py-0.5 rounded text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Errada</span>
                          </span>
                        )}
                        <span className="text-slate-600">
                          Marcada pelo aluno: <strong className="font-mono text-slate-900">{ans.markedAlternative === 'BLANK' ? 'Nenhuma (Nula)' : ans.markedAlternative}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>Gabarito oficial:</span>
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {officialKey || '—'}
                        </span>
                      </div>
                    </div>

                    {/* If editing mode is active, show selectable buttons */}
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 mr-1">
                          Corrigir para:
                        </span>
                        {alternatives.map((alt) => {
                          const isSelected = ans.markedAlternative === alt;
                          const isCorrectKey = officialKey === alt;
                          return (
                            <button
                              key={alt}
                              type="button"
                              onClick={() => handleManualOverride(ans.questionNumber, alt)}
                              className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'bg-slate-900 text-white shadow-xs scale-105 ring-2 ring-indigo-500'
                                  : isCorrectKey
                                  ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                              title={`Marcar opção ${alt}${isCorrectKey ? ' (Gabarito Oficial)' : ''}`}
                            >
                              {alt}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => handleManualOverride(ans.questionNumber, 'BLANK')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            ans.markedAlternative === 'BLANK'
                              ? 'bg-slate-800 text-white ring-2 ring-indigo-500'
                              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Em Branco
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManualOverride(ans.questionNumber, 'MULTIPLE')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                            ans.markedAlternative === 'MULTIPLE'
                              ? 'bg-rose-800 text-white ring-2 ring-rose-500'
                              : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          Rasura
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        Índice de certeza da leitura óptica: {ans.confidence}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div>
                {onDeleteCorrection && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(selectedRecord.id, selectedRecord.studentName, selectedRecord.assessmentTitle)}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Leitura</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleSaveEditedRecord}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Alterações no Boletim</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar Espelho
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
