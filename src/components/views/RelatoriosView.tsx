import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Download,
  Filter,
  GraduationCap
} from 'lucide-react';
import { Assessment, Turma, Student, CorrectionRecord } from '../../types';

interface RelatoriosViewProps {
  assessments: Assessment[];
  turmas: Turma[];
  students: Student[];
  corrections: CorrectionRecord[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  assessments,
  turmas,
  students,
  corrections,
}) => {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    assessments[0]?.id || ''
  );

  React.useEffect(() => {
    if (assessments.length > 0 && (!selectedAssessmentId || !assessments.some((a) => a.id === selectedAssessmentId))) {
      setSelectedAssessmentId(assessments[0].id);
    }
  }, [assessments, selectedAssessmentId]);

  const currentAssessment = assessments.find((a) => a.id === selectedAssessmentId) || assessments[0];
  const assessmentCorrections = corrections.filter((c) => c.assessmentId === currentAssessment?.id);

  // Compute metrics
  const totalScanned = assessmentCorrections.length;
  const scores = assessmentCorrections.map((c) => c.score);
  const averageScore = totalScanned > 0 
    ? scores.reduce((acc, curr) => acc + curr, 0) / totalScanned 
    : 0;
  const maxScore = totalScanned > 0 ? Math.max(...scores) : 0;
  const minScore = totalScanned > 0 ? Math.min(...scores) : 0;
  const passCount = scores.filter((s) => s >= 6.0).length;
  const passRate = totalScanned > 0 ? (passCount / totalScanned) * 100 : 0;

  // Question hit rates
  const questionStats = (currentAssessment?.answerKey || []).map((q) => {
    if (totalScanned === 0) return { question: q.number, rate: 0, topic: q.topic || `Questão ${q.number}` };
    const correctForQ = assessmentCorrections.filter((c) => {
      const studentAns = c.answers.find((a) => a.questionNumber === q.number);
      return studentAns?.isCorrect;
    }).length;
    return {
      question: q.number,
      rate: Math.round((correctForQ / totalScanned) * 100),
      topic: q.topic || `Questão ${q.number}`,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Diagnóstico e Desempenho</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Relatórios e Estatísticas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe as médias, análise de questões críticas e curva de aprendizagem das turmas
          </p>
        </div>

        {/* Assessment selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-hidden bg-slate-50"
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.turmaName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards in pastel tones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Média da Turma</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {averageScore.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 10.0</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Baseado em {totalScanned} provas corrigidas
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Taxa de Aprovação</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {passRate.toFixed(0)}%
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">
            {passCount} alunos acima da média (6.0)
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Maior Nota</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {maxScore.toFixed(1)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Excelente aproveitamento
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Provas Pendentes</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {Math.max(0, 5 - totalScanned)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Restantes para escanear
          </p>
        </div>

      </div>

      {/* Question Accuracy Chart (Taxa de Acertos por Questão) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Índice de Acertos por Questão
            </h3>
            <p className="text-xs text-slate-500">
              Identifique quais conteúdos exigem revisão pedagógica antes do próximo ciclo
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {questionStats.length} Questões Analisadas
          </span>
        </div>

        <div className="space-y-2.5 pt-2">
          {questionStats.map((item) => (
            <div key={item.question} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  Questão {item.question} — <span className="text-slate-400 font-normal">{item.topic}</span>
                </span>
                <span className={`font-bold ${
                  item.rate >= 80 ? 'text-emerald-700' : item.rate >= 60 ? 'text-amber-700' : 'text-rose-600'
                }`}>
                  {item.rate}% de acerto
                </span>
              </div>
              {/* Progress bar in pastel tones */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.rate >= 80
                      ? 'bg-emerald-500'
                      : item.rate >= 60
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${item.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table of corrected students */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Alunos Avaliados Nesta Prova
          </h3>
          <p className="text-xs text-slate-500">
            Resultados individuais obtidos através do escaneamento do cartão-resposta
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-6">Aluno(a)</th>
                <th className="py-3 px-6">Turma</th>
                <th className="py-3 px-6">Acertos</th>
                <th className="py-3 px-6">Nota Final</th>
                <th className="py-3 px-6">Data de Leitura</th>
                <th className="py-3 px-6">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assessmentCorrections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-slate-400">
                    Nenhum cartão escaneado para esta avaliação ainda.
                  </td>
                </tr>
              ) : (
                assessmentCorrections.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      {record.studentName}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {record.turmaName}
                    </td>
                    <td className="py-3.5 px-6">
                      {record.correctCount} / {record.totalQuestions}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
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
                    <td className="py-3.5 px-6">
                      <span className="capitalize text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {record.deviceType}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
