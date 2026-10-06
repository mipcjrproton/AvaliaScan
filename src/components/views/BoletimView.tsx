import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Users, 
  Printer, 
  Eye, 
  GraduationCap, 
  Check, 
  X, 
  Sparkles, 
  HelpCircle,
  Clock,
  Award,
  MinusCircle
} from 'lucide-react';
import { Assessment, Student, Turma, CorrectionRecord, Alternative, StudentAnswer } from '../../types';

interface BoletimViewProps {
  assessments: Assessment[];
  turmas: Turma[];
  students: Student[];
  corrections: CorrectionRecord[];
  initialAssessmentId?: string;
  onOpenCorrectionDetail?: (record: CorrectionRecord) => void;
  onNavigateToScanner?: (assessmentId: string, studentId: string) => void;
}

export const BoletimView: React.FC<BoletimViewProps> = ({
  assessments,
  turmas,
  students,
  corrections,
  initialAssessmentId,
  onOpenCorrectionDetail,
  onNavigateToScanner,
}) => {
  // Selected Assessment state
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    initialAssessmentId || assessments[0]?.id || ''
  );

  React.useEffect(() => {
    if (initialAssessmentId) {
      setSelectedAssessmentId(initialAssessmentId);
    }
  }, [initialAssessmentId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'corrigido' | 'pendente'>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<{
    student: Student;
    correction?: CorrectionRecord;
    auditedAnswers: (StudentAnswer & { officialCorrect: Alternative; verifiedCorrect: boolean })[];
    auditedScore: number;
    auditedCorrectCount: number;
  } | null>(null);

  // Active assessment and its official answer key
  const currentAssessment = useMemo(() => {
    return assessments.find((a) => a.id === selectedAssessmentId) || assessments[0];
  }, [assessments, selectedAssessmentId]);

  // Students enrolled in this assessment's turma
  const turmaStudents = useMemo(() => {
    if (!currentAssessment) return [];
    return students
      .filter((s) => s.turmaId === currentAssessment.turmaId && s.active !== false)
      .sort((a, b) => {
        const numA = parseInt(a.enrollmentNumber, 10);
        const numB = parseInt(b.enrollmentNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [students, currentAssessment]);

  // Map corrections by studentId for the selected assessment
  const correctionsByStudent = useMemo(() => {
    if (!currentAssessment) return new Map<string, CorrectionRecord>();
    const map = new Map<string, CorrectionRecord>();
    corrections
      .filter((c) => c.assessmentId === currentAssessment.id)
      .forEach((c) => {
        map.set(c.studentId, c);
      });
    return map;
  }, [corrections, currentAssessment]);

  /**
   * CRITICAL REQUIREMENT IMPLEMENTATION:
   * "Para poder considerar a avaliação do aluno corrigida, é preciso que o sistema leia o gabarito
   *  que esta definido na avaliação, e cheque a letra marcada pelo aluno em cada questão e a letra
   *  definida no gabarito original da avaliação no item avaliação. desta forma sim, se define se a
   *  questão foi marcada corretamente ou não, e então estabelecer se esta questão é avaliada como certa."
   */
  const studentsWithAudit = useMemo(() => {
    if (!currentAssessment) return [];

    const answerKeyMap = new Map<number, Alternative>();
    currentAssessment.answerKey.forEach((q) => {
      answerKeyMap.set(q.number, q.correctAlternative);
    });

    return turmaStudents.map((student) => {
      const correction = correctionsByStudent.get(student.id);

      if (!correction) {
        return {
          student,
          correction: undefined,
          isCorrected: false,
          auditedCorrectCount: 0,
          auditedScore: 0,
          scorePercentage: 0,
          auditedAnswers: [],
        };
      }

      // Check each student marked alternative against the assessment's original official answer key
      const auditedAnswers = currentAssessment.answerKey.map((q) => {
        const stAns = correction.answers.find((a) => a.questionNumber === q.number);
        const marked = stAns?.markedAlternative || 'BLANK';
        const official = q.correctAlternative;
        
        // Strict match check according to user instructions:
        // - Marked equal to official key: CORRETA
        // - Marked different from official key: ERRADA
        // - No bubble marked (BLANK): NULA
        let status: 'CORRETA' | 'ERRADA' | 'NULA';
        let verifiedCorrect = false;

        if (marked === 'BLANK') {
          status = 'NULA';
          verifiedCorrect = false;
        } else if (marked === official) {
          status = 'CORRETA';
          verifiedCorrect = true;
        } else {
          status = 'ERRADA';
          verifiedCorrect = false;
        }

        return {
          questionNumber: q.number,
          markedAlternative: marked,
          isCorrect: verifiedCorrect,
          status,
          confidence: stAns?.confidence ?? 100,
          officialCorrect: official,
          verifiedCorrect,
        };
      });

      const auditedCorrectCount = auditedAnswers.filter((a) => a.status === 'CORRETA').length;
      const auditedWrongCount = auditedAnswers.filter((a) => a.status === 'ERRADA').length;
      const auditedBlankCount = auditedAnswers.filter((a) => a.status === 'NULA').length;
      const totalQuestions = currentAssessment.totalQuestions || 1;
      const maxScore = currentAssessment.maxScore || 10;
      const auditedScore = Number(((auditedCorrectCount / totalQuestions) * maxScore).toFixed(1));
      const scorePercentage = Math.round((auditedCorrectCount / totalQuestions) * 100);

      return {
        student,
        correction,
        isCorrected: true,
        auditedCorrectCount,
        auditedWrongCount,
        auditedBlankCount,
        auditedScore,
        scorePercentage,
        auditedAnswers,
      };
    });
  }, [currentAssessment, turmaStudents, correctionsByStudent]);

  // Filtered rows for display
  const filteredStudents = useMemo(() => {
    return studentsWithAudit.filter((item) => {
      const matchesSearch = 
        item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.student.enrollmentNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      if (statusFilter === 'corrigido') return item.isCorrected;
      if (statusFilter === 'pendente') return !item.isCorrected;
      return true;
    });
  }, [studentsWithAudit, searchTerm, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = studentsWithAudit.length;
    const corrected = studentsWithAudit.filter((s) => s.isCorrected).length;
    const pending = total - corrected;
    const scores = studentsWithAudit.filter((s) => s.isCorrected).map((s) => s.auditedScore);
    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const approved = scores.filter((s) => s >= 6.0).length;
    const approvalRate = scores.length > 0 ? Math.round((approved / scores.length) * 100) : 0;

    return { total, corrected, pending, average, approved, approvalRate };
  }, [studentsWithAudit]);

  const handlePrintBoletim = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Boletim Escolar & Verificação Rigorosa</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Boletim de Avaliação
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Notas consolidadas com checagem obrigatória da marcação da folha do aluno contra o gabarito oficial da avaliação
          </p>
        </div>

        {/* Assessment Selector & Print */}
        <div className="flex flex-wrap items-center gap-2">
          {assessments.length > 0 ? (
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-hidden bg-slate-50 font-bold text-slate-800"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {a.turmaName} ({a.totalQuestions} Questões)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 font-medium">
              Nenhuma avaliação cadastrada ainda
            </span>
          )}

          <button
            type="button"
            onClick={handlePrintBoletim}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
            title="Imprimir boletim da turma"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Boletim</span>
          </button>
        </div>
      </div>

      {currentAssessment ? (
        <>
          {/* Assessment Info & Rigorous Check Banner */}
          <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-semibold">
                  Gabarito Oficial Vinculado à Avaliação
                </span>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>{currentAssessment.title}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200 mt-1">
                  <span>Turma: <strong>{currentAssessment.turmaName}</strong></span>
                  <span>•</span>
                  <span>Disciplina: <strong>{currentAssessment.subject}</strong></span>
                  <span>•</span>
                  <span>Questões: <strong>{currentAssessment.totalQuestions}</strong></span>
                  <span>•</span>
                  <span>Nota Máxima: <strong>{currentAssessment.maxScore.toFixed(1)}</strong></span>
                </div>
              </div>

              {/* Status pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/90 text-emerald-200 border border-emerald-700/60 rounded-xl text-xs font-semibold self-start md:self-auto">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Auditoria Automática de Gabarito Ativa</span>
              </div>
            </div>

            {/* Official Answer Key Strip */}
            <div>
              <div className="text-[11px] font-bold text-emerald-300 mb-2 flex items-center justify-between">
                <span>GABARITO OFICIAL DO ITEM AVALIAÇÃO (PADRÃO DE CORREÇÃO):</span>
                <span className="text-[10px] font-normal text-emerald-400">
                  {currentAssessment.answerKey.length} questões cadastradas
                </span>
              </div>
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                {currentAssessment.answerKey.map((q) => (
                  <div
                    key={q.number}
                    className="flex flex-col items-center bg-emerald-900/60 border border-emerald-700/70 rounded-lg px-2.5 py-1 min-w-[42px]"
                  >
                    <span className="text-[9px] font-mono text-emerald-300 font-black">
                      {String(q.number).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-black text-amber-300">
                      {q.correctAlternative}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total de Alunos
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {stats.total}
              </div>
              <span className="text-[11px] text-slate-500">
                Turma {currentAssessment.turmaName}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Corrigidos / Validados
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {stats.corrected}
              </div>
              <span className="text-[11px] text-slate-500">
                {stats.pending > 0 ? `${stats.pending} aguardando escaneamento` : 'Todos corrigidos'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Média da Turma
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {stats.average}
              </div>
              <span className="text-[11px] text-slate-500">
                Escala de 0.0 a {currentAssessment.maxScore.toFixed(1)}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                Taxa de Aprovação (≥ 6.0)
              </span>
              <div className="text-2xl font-black text-teal-700 mt-1">
                {stats.approvalRate}%
              </div>
              <span className="text-[11px] text-slate-500">
                {stats.approved} de {stats.corrected} aprovados
              </span>
            </div>
          </div>

          {/* Search, Filter & List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Table Filters Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar aluno por nome ou nº de chamada..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-hidden bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Todos ({studentsWithAudit.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('corrigido')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'corrigido'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Corrigidos ({stats.corrected})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pendente')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'pendente'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Pendentes ({stats.pending})
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Nº</th>
                    <th className="px-4 py-3">Nome do Aluno</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Acertos Verificados</th>
                    <th className="px-4 py-3 text-center">Nota Final</th>
                    <th className="px-4 py-3 text-center">Aproveitamento</th>
                    <th className="px-4 py-3 text-center">Espelho Respostas vs Gabarito</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((item) => {
                      const isHigh = item.auditedScore >= 7.0;
                      const isMid = item.auditedScore >= 5.0 && item.auditedScore < 7.0;

                      return (
                        <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                            {item.student.enrollmentNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{item.student.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Matrícula: {item.student.enrollmentNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isCorrected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Corrigida</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pendente</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {item.isCorrected ? (
                              <span className="text-slate-800">
                                {item.auditedCorrectCount}{' '}
                                <span className="text-slate-400 font-normal">
                                  / {currentAssessment.totalQuestions}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isCorrected ? (
                              <span
                                className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                                  isHigh
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isMid
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {item.auditedScore.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isCorrected ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-700">{item.scorePercentage}%</span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div
                                    className={`h-full rounded-full ${
                                      isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${item.scorePercentage}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isCorrected ? (
                              <div className="flex items-center justify-center gap-1 max-w-[200px] mx-auto overflow-x-auto py-1">
                                {item.auditedAnswers.slice(0, 10).map((ans) => (
                                  <span
                                    key={ans.questionNumber}
                                    title={`Questão ${ans.questionNumber}: Marcado [${ans.markedAlternative}] | Gabarito [${ans.officialCorrect}] — ${ans.verifiedCorrect ? 'CERTA' : 'ERRADA'}`}
                                    className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold ${
                                      ans.verifiedCorrect
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {ans.markedAlternative === 'BLANK' ? '-' : ans.markedAlternative === 'MULTIPLE' ? '*' : ans.markedAlternative}
                                  </span>
                                ))}
                                {item.auditedAnswers.length > 10 && (
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">
                                    +{item.auditedAnswers.length - 10}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Aguardando scan</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.isCorrected ? (
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Detalhe</span>
                              </button>
                            ) : (
                              onNavigateToScanner && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToScanner(currentAssessment.id, item.student.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <span>Escanear Agora</span>
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhum aluno encontrado para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                Exibindo <strong>{filteredStudents.length}</strong> de <strong>{studentsWithAudit.length}</strong> alunos da turma.
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Acerto (Marcação = Gabarito Oficial)
                </span>
                <span className="flex items-center gap-1 text-rose-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Erro / Em Branco / Rasura
                </span>
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">Nenhuma Avaliação Selecionada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crie primeiro uma avaliação com o gabarito oficial na aba <strong>Avaliações</strong> para gerar e consultar o boletim dos alunos.
          </p>
        </div>
      )}

      {/* MODAL: Detailed Question-by-Question Verification against Official Answer Key */}
      {selectedStudentForModal && currentAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-150 my-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
                  {selectedStudentForModal.student.enrollmentNumber}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedStudentForModal.student.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Boletim Auditado • {currentAssessment.title} ({currentAssessment.turmaName})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score & Audit Badge */}
            <div className="grid grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Nota do Aluno
                </span>
                <div className="text-xl font-black text-emerald-900">
                  {selectedStudentForModal.auditedScore.toFixed(1)}
                  <span className="text-xs font-normal text-emerald-700">/{currentAssessment.maxScore}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  Corretas
                </span>
                <div className="text-xl font-black text-emerald-800">
                  {selectedStudentForModal.auditedCorrectCount}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-600">
                  Erradas
                </span>
                <div className="text-xl font-black text-rose-700">
                  {selectedStudentForModal.auditedWrongCount}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Nulas
                </span>
                <div className="text-xl font-black text-slate-700">
                  {selectedStudentForModal.auditedBlankCount}
                </div>
              </div>
            </div>

            {/* Rigorous Comparison Table: Student Answer vs Official Answer Key */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                <span>CONFERÊNCIA DETALHADA: RESPOSTA DO ALUNO vs GABARITO OFICIAL</span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {selectedStudentForModal.auditedAnswers.length} Questões Analisadas
                </span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-center w-16">Questão</th>
                      <th className="px-3 py-2 text-center">Marcado pelo Aluno</th>
                      <th className="px-3 py-2 text-center">Gabarito da Avaliação</th>
                      <th className="px-3 py-2 text-center">Validação</th>
                      <th className="px-3 py-2 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedStudentForModal.auditedAnswers.map((item) => {
                      const isBlank = item.markedAlternative === 'BLANK';
                      return (
                        <tr
                          key={item.questionNumber}
                          className={
                            item.status === 'CORRETA'
                              ? 'bg-emerald-50/40'
                              : item.status === 'NULA'
                              ? 'bg-slate-50/70'
                              : 'bg-rose-50/40'
                          }
                        >
                          <td className="px-3 py-2 text-center font-mono font-black text-slate-800">
                            {String(item.questionNumber).padStart(2, '0')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-6 h-6 rounded-md font-bold font-mono leading-6 text-center text-xs ${
                                isBlank
                                  ? 'bg-slate-200 text-slate-500'
                                  : item.markedAlternative === 'MULTIPLE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.status === 'CORRETA'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              {isBlank ? '—' : item.markedAlternative === 'MULTIPLE' ? 'Rasura' : item.markedAlternative}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block w-6 h-6 rounded-md font-bold font-mono leading-6 text-center text-xs bg-slate-900 text-amber-300 shadow-2xs">
                              {item.officialCorrect}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-[11px]">
                            {item.status === 'CORRETA' ? (
                              <span className="text-emerald-700 font-bold">Coincide com Gabarito</span>
                            ) : item.status === 'NULA' ? (
                              <span className="text-slate-500 font-medium">Nenhuma bolha preenchida</span>
                            ) : item.markedAlternative === 'MULTIPLE' ? (
                              <span className="text-amber-700 font-bold">Múltipla / Rasurada</span>
                            ) : (
                              <span className="text-rose-600 font-bold">Divergente do Gabarito</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.status === 'CORRETA' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-black text-xs bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>CORRETA</span>
                              </span>
                            ) : item.status === 'NULA' ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-xs bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                                <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                                <span>NULA</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-black text-xs bg-rose-100/70 border border-rose-300 px-2 py-0.5 rounded">
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>ERRADA</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[11px] text-slate-500">
                Escaneado em: <strong>{selectedStudentForModal.correction?.scannedAt || 'Data registrada'}</strong>
              </div>

              <div className="flex items-center gap-2">
                {selectedStudentForModal.correction && onOpenCorrectionDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      const rec = selectedStudentForModal.correction;
                      setSelectedStudentForModal(null);
                      if (rec) onOpenCorrectionDetail(rec);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Editar Folha / Marcações
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedStudentForModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
