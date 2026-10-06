import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Download, 
  Upload, 
  FileText, 
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ExternalLink,
  Loader2,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Assessment, Alternative, Student, AssessmentQuestion } from '../types';
import { sortStudentsByNumber } from '../utils/studentSort';

interface PrintableAnswerSheetModalProps {
  assessment: Assessment | null;
  isOpen: boolean;
  onClose: () => void;
  schoolName: string;
  schoolLogo?: string;
  onUpdateSchoolLogo?: (newLogo: string) => void;
  students?: Student[];
}

interface AnswerSheetCardProps {
  student: Student | null;
  pageIndex: number;
  totalPages: number;
  isMasterKey: boolean;
  assessment: Assessment;
  schoolName: string;
  schoolLogo?: string;
  includeLogo: boolean;
  dateMode: 'auto' | 'blank';
  formattedAutoDate: string;
  questionsToRender: AssessmentQuestion[];
  sheetLayoutType?: 'industrial' | 'classico';
}

/**
 * Pure, isolated OMR Answer Sheet Card Component.
 * Used for both the on-screen preview and the pixel-perfect A4 print engine.
 */
const AnswerSheetCard: React.FC<AnswerSheetCardProps> = ({
  student,
  pageIndex,
  totalPages,
  isMasterKey,
  assessment,
  schoolName,
  schoolLogo,
  includeLogo,
  dateMode,
  formattedAutoDate,
  questionsToRender,
  sheetLayoutType = 'industrial',
}) => {
  const optionsCount = Math.max(2, Math.min(5, assessment.optionsPerQuestion || 5));
  const alternatives: Alternative[] = (['A', 'B', 'C', 'D', 'E'] as Alternative[]).slice(0, optionsCount);
  const isNominal = !!student && !isMasterKey;

  // Se houver mais de 20 questões (>20), dispor estritamente em duas colunas; se <= 20, dispor em 1 coluna
  const isMultiColumn = questionsToRender.length > 20;
  const columns: AssessmentQuestion[][] = [];
  if (isMultiColumn) {
    const half = Math.ceil(questionsToRender.length / 2);
    columns.push(questionsToRender.slice(0, half));
    columns.push(questionsToRender.slice(half));
  } else {
    columns.push(questionsToRender);
  }

  // Dimensionamento dinâmico e refinado para encaixar perfeitamente em 1 página A4
  const maxRows = Math.max(...columns.map((c) => c.length));
  let rowHeight = '23px';
  let cellPadding = '2px 1px';
  let bubbleSizeClass = 'w-4.5 h-4.5 sm:w-5 sm:h-5 text-[9px] sm:text-[10px]';

  if (maxRows <= 10) {
    rowHeight = '32px';
    cellPadding = '3px 1px';
    bubbleSizeClass = 'w-6 h-6 text-[11px] sm:text-[12px]';
  } else if (maxRows <= 15) {
    rowHeight = '27px';
    cellPadding = '2.5px 1px';
    bubbleSizeClass = 'w-5 h-5 sm:w-5.5 sm:h-5.5 text-[10px] sm:text-[11px]';
  } else if (maxRows <= 20) {
    rowHeight = '23px';
    cellPadding = '2px 1px';
    bubbleSizeClass = 'w-4.5 h-4.5 sm:w-5 sm:h-5 text-[9px] sm:text-[10px]';
  } else if (maxRows <= 25) {
    rowHeight = '20.5px';
    cellPadding = '1.5px 0.5px';
    bubbleSizeClass = 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-[9px] sm:text-[9.5px]';
  } else {
    rowHeight = '18px';
    cellPadding = '1px 0.5px';
    bubbleSizeClass = 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8.5px] sm:text-[9px]';
  }

  return (
    <div className="relative w-full h-full bg-white text-slate-900 p-3 sm:p-4 box-border flex flex-col justify-between overflow-hidden">
      {/* Top Content: Header, Identification, Instructions, Bubble Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* Header Section: LOGO STRICTLY ON THE LEFT SIDE */}
        <div className="border-b-2 border-slate-900 pb-2 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            
            {/* School Logo - Placed on the LEFT of the header */}
            {schoolLogo && includeLogo ? (
              <div className="shrink-0 flex items-center justify-center p-1 border border-slate-300 rounded bg-white w-20 h-13 sm:w-24 sm:h-14">
                <img 
                  src={schoolLogo} 
                  alt="Logotipo Oficial" 
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}

            {/* Institution & Assessment Metadata - Left aligned next to logo */}
            <div className="flex-1 text-left min-w-0">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 leading-tight truncate">
                {schoolName || 'Instituição de Ensino'}
              </h1>
              <h2 className="text-[11px] sm:text-xs font-extrabold text-slate-800 mt-0.5 tracking-wide flex items-center gap-1.5">
                {isMasterKey ? (
                  <span className="bg-slate-950 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                    ★ GABARITO OFICIAL PREENCHIDO (CHAVE MESTRA)
                  </span>
                ) : (
                  <span>FOLHA DE RESPOSTAS OFICIAL • SISTEMA AVALIASCAN OMR</span>
                )}
              </h2>
              <div className="text-[10.5px] text-slate-700 mt-0.5 font-bold truncate">
                {assessment.title} • {assessment.turmaName} • {assessment.subject}
              </div>
            </div>

            {/* Optical Assessment Code & Date Box */}
            <div className="shrink-0 flex flex-col items-end text-right font-mono">
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-tighter">CÓDIGO AVALIAÇÃO</span>
              <span className="text-[11px] font-black text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-400">
                {assessment.id}
              </span>
              <span className="text-[9.5px] text-slate-800 font-bold mt-0.5">
                {dateMode === 'auto' ? `DATA: ${formattedAutoDate}` : 'DATA: ____/____/________'}
              </span>
              <span className="text-[9px] text-indigo-800 font-bold mt-0.5">
                Folha {pageIndex + 1} de {totalPages}
              </span>

              {/* Optical QR Tag for Industrial Standard */}
              {sheetLayoutType === 'industrial' && (
                <div className="mt-1 flex items-center gap-1.5 p-1 bg-white border border-slate-900 rounded-xs shadow-2xs">
                  <svg width="26" height="26" viewBox="0 0 21 21" className="shrink-0">
                    {/* Finder Patterns */}
                    <rect x="0" y="0" width="7" height="7" fill="black" />
                    <rect x="1" y="1" width="5" height="5" fill="white" />
                    <rect x="2" y="2" width="3" height="3" fill="black" />
                    <rect x="14" y="0" width="7" height="7" fill="black" />
                    <rect x="15" y="1" width="5" height="5" fill="white" />
                    <rect x="16" y="2" width="3" height="3" fill="black" />
                    <rect x="0" y="14" width="7" height="7" fill="black" />
                    <rect x="1" y="15" width="5" height="5" fill="white" />
                    <rect x="2" y="16" width="3" height="3" fill="black" />
                    {/* Alignment & Data cells */}
                    <rect x="8" y="6" width="1" height="1" fill="black" />
                    <rect x="10" y="6" width="1" height="1" fill="black" />
                    <rect x="12" y="6" width="1" height="1" fill="black" />
                    <rect x="6" y="8" width="1" height="1" fill="black" />
                    <rect x="6" y="10" width="1" height="1" fill="black" />
                    <rect x="6" y="12" width="1" height="1" fill="black" />
                    <rect x="8" y="8" width="2" height="2" fill="black" />
                    <rect x="11" y="9" width="1" height="2" fill="black" />
                    <rect x="9" y="12" width="2" height="1" fill="black" />
                    <rect x="12" y="13" width="2" height="2" fill="black" />
                    <rect x="8" y="15" width="2" height="2" fill="black" />
                    <rect x="15" y="8" width="2" height="2" fill="black" />
                    <rect x="17" y="11" width="2" height="2" fill="black" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="text-[6.5px] font-black uppercase text-slate-900 leading-none">OMR INDUSTRIAL</span>
                    <span className="text-[6px] font-mono font-bold text-slate-600 leading-none mt-0.5">SINCRONISMO ATIVO</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Identification Box */}
        <div className="border border-slate-400 bg-slate-50/90 p-2 rounded mb-2 text-[11px] shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
            
            {/* Student Name */}
            <div className="sm:col-span-7">
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                  Nome do Aluno:
                </span>
                {isMasterKey ? (
                  <span className="font-black text-indigo-950 uppercase border-b-2 border-slate-800 flex-1 px-1 tracking-wider text-[11px]">
                    GABARITO OFICIAL / CHAVE MESTRA
                  </span>
                ) : isNominal ? (
                  <span className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-800 flex-1 px-1 tracking-wide truncate">
                    {student.name}
                  </span>
                ) : (
                  <div className="border-b-2 border-slate-500 flex-1 h-3.5 flex items-end">
                    <span className="text-[9px] text-slate-400 select-none">________________________________________________</span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Enrollment Number */}
            <div className="sm:col-span-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                  Nº / Matrícula:
                </span>
                {isMasterKey ? (
                  <span className="font-mono font-black text-indigo-950 border-b-2 border-slate-800 flex-1 px-1 text-center text-[10.5px]">
                    CHAVE-MESTRA
                  </span>
                ) : isNominal ? (
                  <span className="font-mono font-black text-slate-950 border-b-2 border-slate-800 flex-1 px-1 text-center text-[11px]">
                    {student.enrollmentNumber}
                  </span>
                ) : (
                  <div className="border-b-2 border-slate-500 flex-1 h-3.5 flex items-end">
                    <span className="text-[9px] text-slate-400 select-none">____________</span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Field in Student Box */}
            <div className="sm:col-span-2">
              <div className="flex items-baseline gap-1">
                <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                  Data:
                </span>
                {dateMode === 'auto' ? (
                  <span className="font-mono font-bold text-slate-900 border-b-2 border-slate-800 flex-1 px-0.5 text-center text-[10.5px]">
                    {formattedAutoDate}
                  </span>
                ) : (
                  <span className="font-mono text-slate-600 border-b-2 border-slate-500 flex-1 px-0.5 text-center text-[9.5px] font-bold">
                    ____/____/____
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Exam Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 pt-1 border-t border-slate-300 text-[10px] text-slate-800 font-semibold">
            <div>
              <span className="font-bold text-slate-950">Turma:</span> {assessment.turmaName}
            </div>
            <div>
              <span className="font-bold text-slate-950">Disciplina:</span> {assessment.subject}
            </div>
            <div>
              <span className="font-bold text-slate-950">Total Questões:</span> {questionsToRender.length}
            </div>
            <div>
              <span className="font-bold text-slate-950">Pontuação Máx:</span> {assessment.maxScore || questionsToRender.length} pts
            </div>
          </div>
        </div>

        {/* Instructions Bar */}
        <div className="mb-2 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded flex items-center justify-between text-[9.5px] text-slate-900 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="font-black uppercase text-slate-950">INSTRUÇÕES:</span>
            <span>Use caneta esferográfica preta ou azul. Preencha completamente a bolha da opção correta. Não rasure.</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 font-bold shrink-0">
            <span>Correto:</span>
            <span className="w-4 h-4 rounded-full bg-black text-white text-[8.5px] flex items-center justify-center font-bold">
              A
            </span>
            <span className="text-slate-400 ml-1">Incorreto: ✕ ⭘ ✓</span>
          </div>
        </div>

        {/* Title Bar outside the optical frame */}
        <div className="flex items-center justify-between pb-1 mb-1 shrink-0 px-1">
          <h3 className="text-[10.5px] font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
            <span>FOLHA DE RESPOSTAS</span>
            <span className="text-[9.5px] text-slate-600 font-bold">({questionsToRender.length} QUESTÕES)</span>
          </h3>
          {isMasterKey ? (
            <span className="text-[9.5px] font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              ★ RESPOSTAS OFICIAIS PREENCHIDAS
            </span>
          ) : (
            <span className="text-[9.5px] text-slate-600 font-bold uppercase">
              Cada questão possui apenas 1 alternativa correta
            </span>
          )}
        </div>

        {/* Response Bubbles Grid Section */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-1">
          {/* BUBBLE GRID CONTAINER - Envolve ESTRITAMENTE as questões e suas bolhas */}
          <div 
            className={`relative mx-auto bg-transparent ${
              isMultiColumn ? 'w-full max-w-[720px]' : 'w-full max-w-[340px] sm:max-w-[360px]'
            }`}
          >
            {/* 4 Optical Corner Calibration Anchors (Marcas de canto) APENAS em volta das questões e bolhas */}
            {/* Canto Superior Esquerdo (TL) */}
            <div 
              className="absolute top-0 left-0 w-5 h-5 sm:w-5.5 sm:h-5.5 bg-black z-20 pointer-events-none select-none rounded-none" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              title="Marca OMR Canto Superior Esquerdo" 
            />
            {/* Canto Superior Direito (TR) */}
            <div 
              className="absolute top-0 right-0 w-5 h-5 sm:w-5.5 sm:h-5.5 bg-black z-20 pointer-events-none select-none rounded-none" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              title="Marca OMR Canto Superior Direito" 
            />
            {/* Canto Inferior Esquerdo (BL) */}
            <div 
              className="absolute bottom-0 left-0 w-5 h-5 sm:w-5.5 sm:h-5.5 bg-black z-20 pointer-events-none select-none rounded-none" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              title="Marca OMR Canto Inferior Esquerdo" 
            />
            {/* Canto Inferior Direito (BR) */}
            <div 
              className="absolute bottom-0 right-0 w-5 h-5 sm:w-5.5 sm:h-5.5 bg-black z-20 pointer-events-none select-none rounded-none" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              title="Marca OMR Canto Inferior Direito" 
            />

            {/* Conteúdo interno da grade: com distâncias superior, inferior e laterais seguras para não interferir nas marcas */}
            <div className="py-6 px-7 sm:py-7 sm:px-8">
              <div className={`flex items-start ${
                isMultiColumn ? 'justify-between gap-6 sm:gap-10' : 'justify-center w-full'
              }`}>
                {columns.map((colQuestions, colIdx) => (
                  <div key={colIdx} className="flex-1 min-w-0">
                    <table 
                      className="w-full border-collapse select-none omr-dotted-grid"
                      style={{
                        borderCollapse: 'collapse',
                        border: '1px dotted #94a3b8',
                        tableLayout: 'fixed',
                        printColorAdjust: 'exact',
                        WebkitPrintColorAdjust: 'exact',
                      }}
                    >
                      <thead>
                        <tr className="bg-slate-50/90">
                          {/* Célula do cabeçalho da Questão */}
                          <th 
                            style={{
                              border: '1px dotted #94a3b8',
                              width: isMultiColumn ? '38px' : '44px',
                              padding: '4px 2px',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              printColorAdjust: 'exact',
                              WebkitPrintColorAdjust: 'exact',
                            }}
                            className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-tighter"
                          >
                            Nº
                          </th>
                          {/* Células de cada opção A, B, C, D, E */}
                          {alternatives.map((alt) => (
                            <th 
                              key={alt}
                              style={{
                                border: '1px dotted #94a3b8',
                                padding: '4px 2px',
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                printColorAdjust: 'exact',
                                WebkitPrintColorAdjust: 'exact',
                              }}
                              className="text-[11px] sm:text-[12px] font-black text-slate-900"
                            >
                              {alt}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colQuestions.map((q) => {
                          const isEven = q.number % 2 === 0;

                          return (
                            <tr key={q.number} style={{ height: rowHeight }}>
                              {/* Caixa do número da questão: 
                                  - Se ímpar: dentro de uma caixa sem fundo algum (#ffffff / transparent)
                                  - Se par: dentro de uma caixinha com fundo cinza discreto (#f1f5f9)
                                  - NÃO colocar P1 após a questão!
                              */}
                              <td 
                                style={{
                                  border: '1px dotted #94a3b8',
                                  backgroundColor: isEven ? '#f1f5f9' : '#ffffff',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  padding: '2px 1px',
                                  printColorAdjust: 'exact',
                                  WebkitPrintColorAdjust: 'exact',
                                }}
                                className="font-mono font-black text-[11px] sm:text-[12px] text-slate-950"
                              >
                                <span>{String(q.number).padStart(2, '0')}</span>
                              </td>

                              {/* Células das Bolhas de Opção com borda pontilhada */}
                              {alternatives.map((alt) => {
                                const isCorrect = q.correctAlternative === alt;
                                const isMarked = isMasterKey && isCorrect;

                                return (
                                  <td 
                                    key={alt}
                                    style={{
                                      border: '1px dotted #94a3b8',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      padding: cellPadding,
                                      printColorAdjust: 'exact',
                                      WebkitPrintColorAdjust: 'exact',
                                    }}
                                  >
                                    <div className="flex items-center justify-center">
                                      <div 
                                        className={`rounded-full flex items-center justify-center transition-all ${bubbleSizeClass} ${
                                          isMarked 
                                            ? 'bg-black text-white font-black' 
                                            : 'border border-slate-950 text-slate-900 bg-white font-bold'
                                        }`}
                                        style={{
                                          borderWidth: isMarked ? '0' : '1.5px',
                                          borderColor: '#0f172a',
                                          printColorAdjust: 'exact',
                                          WebkitPrintColorAdjust: 'exact',
                                        }}
                                      >
                                        {alt}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Signatures & Calibration Line */}
      <div className="mt-2 pt-1.5 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[9.5px] text-slate-700 gap-1 shrink-0">
        <span className="font-mono font-medium">
          AvaliaScan OMR • Folha Oficial de Respostas
        </span>
        <span className="font-sans font-medium hidden sm:inline">
          Assinatura do Aluno: __________________________________________________
        </span>
        <span className="font-mono font-bold text-slate-900 text-[10.5px] tracking-wider">
          {assessment.id.replace(/\D/g, '').padEnd(10, '2133253997').slice(0, 10)}
        </span>
      </div>
    </div>
  );
};

export const PrintableAnswerSheetModal: React.FC<PrintableAnswerSheetModalProps> = ({
  assessment,
  isOpen,
  onClose,
  schoolName,
  schoolLogo,
  onUpdateSchoolLogo,
  students = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration options
  const [includeLogo, setIncludeLogo] = useState(true);
  const [sheetMode, setSheetMode] = useState<'aluno' | 'gabarito_oficial'>('aluno');
  
  // Sheet Layout: Industrial OMR (Timing Tracks + Master Anchors - Recommended) vs Classic
  const [sheetLayoutType, setSheetLayoutType] = useState<'industrial' | 'classico'>('industrial');

  // Date Mode: Automatic (e.g. 17/09/2026) vs Blank Space (____/____/________)
  const [dateMode, setDateMode] = useState<'auto' | 'blank'>('auto');

  // Print Scope: All registered students (default) vs Single standard blank sheet for xerox
  const [printScope, setPrintScope] = useState<'all_registered' | 'single_standard'>('all_registered');

  // Option to include the Official Master Key sheet at the end of the batch PDF
  const [includeOfficialKeyInBatch, setIncludeOfficialKeyInBatch] = useState<boolean>(true);

  // Preview index for students batch
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // PDF Generation loading state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);

  // Include ALL registered students from this assessment's turma in strict numerical order
  const registeredStudents = useMemo(() => {
    if (!assessment) return [];
    let list = students.filter(
      (s) => (s.turmaId === assessment.turmaId || s.turmaId === assessment.turmaName) && s.active !== false
    );
    // Fallback if no specific turma matched
    if (list.length === 0) {
      list = students.filter((s) => s.active !== false);
    }
    return sortStudentsByNumber(list);
  }, [students, assessment]);

  const totalPagesToPrint = useMemo(() => {
    if (printScope === 'single_standard') return 1;
    return registeredStudents.length + (includeOfficialKeyInBatch ? 1 : 0);
  }, [printScope, registeredStudents.length, includeOfficialKeyInBatch]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset preview index when modal opens or assessment changes
  useEffect(() => {
    setPreviewIndex(0);
  }, [assessment?.id, isOpen]);

  if (!isOpen || !assessment) return null;

  const optionsCount = Math.max(2, Math.min(5, assessment.optionsPerQuestion || 5));
  const alternatives: Alternative[] = (['A', 'B', 'C', 'D', 'E'] as Alternative[]).slice(0, optionsCount);

  // Format date helper
  const formatDateBr = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formattedAutoDate = formatDateBr(assessment.date);

  // Guarantee all questions from 1 to totalQuestions are accounted for
  const totalQ = Math.max(1, assessment.totalQuestions || (assessment.answerKey ? assessment.answerKey.length : 10));
  const questionsToRender: AssessmentQuestion[] = Array.from({ length: totalQ }, (_, i) => {
    const qNum = i + 1;
    const existing = assessment.answerKey?.find((q) => q.number === qNum);
    return existing || {
      number: qNum,
      correctAlternative: alternatives[(qNum - 1) % alternatives.length],
      weight: 1,
      topic: `Questão ${qNum}`,
    };
  });

  // Isolated print trigger that guarantees zero browser interface pollution
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanTurma = (assessment.turmaName || 'Turma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanTitle = (assessment.title || 'Avaliacao').replace(/[^a-zA-Z0-9_-]/g, '_');
    const scopeLabel = printScope === 'all_registered' 
      ? `Caderno_${registeredStudents.length}_Alunos` 
      : 'Folha_Padrao_Xerox';
    const keyLabel = includeOfficialKeyInBatch && printScope === 'all_registered' ? '_com_Gabarito' : '';
    const newDocTitle = `Cartao_Resposta_${scopeLabel}${keyLabel}_${cleanTurma}_${cleanTitle}`;
    document.title = newDocTitle;

    // Check if the print portal exists
    const printPortal = document.getElementById('omr-print-portal');
    if (printPortal) {
      let iframe = document.getElementById('omr-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'omr-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map((el) => el.outerHTML)
          .join('\n');

        const portalHtml = printPortal.innerHTML;

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <title>${newDocTitle}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              ${styleTags}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 0 !important;
                }
                *, *::before, *::after {
                  box-sizing: border-box !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  width: 210mm !important;
                  overflow: visible !important;
                }
                .a4-print-sheet {
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  min-height: 297mm !important;
                  max-height: 297mm !important;
                  box-sizing: border-box !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  page-break-before: auto !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                  background: #ffffff !important;
                }
                .a4-print-sheet:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                  margin-bottom: 0 !important;
                }
                table.omr-dotted-grid {
                  border-collapse: collapse !important;
                  width: 100% !important;
                }
                table.omr-dotted-grid th,
                table.omr-dotted-grid td {
                  border: 1px dotted #94a3b8 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              </style>
            </head>
            <body>
              ${portalHtml}
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            // Fallback to window.print() if blocked by iframe sandbox
            window.focus();
            window.print();
          }
          setTimeout(() => {
            document.title = originalTitle;
          }, 2000);
        }, 350);
        return;
      }
    }

    // Direct fallback
    window.focus();
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  // Open standalone clean print tab helper
  const handleOpenSeparateWindow = () => {
    const printPortal = document.getElementById('omr-print-portal');
    if (!printPortal) return;

    const newWin = window.open('', '_blank');
    if (!newWin) {
      // Popups may be blocked in iframe environment; fallback seamlessly to direct print
      handlePrint();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    const cleanTurma = (assessment.turmaName || 'Turma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanTitle = (assessment.title || 'Avaliacao').replace(/[^a-zA-Z0-9_-]/g, '_');
    const docTitle = `Cartao_Resposta_${cleanTurma}_${cleanTitle}`;

    newWin.document.open();
    newWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>${docTitle}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #f1f5f9;
              width: 100%;
            }
            @media print {
              body {
                background: #fff !important;
                width: 210mm !important;
              }
              .no-print-bar {
                display: none !important;
              }
            }
            .a4-print-sheet {
              width: 210mm;
              height: 297mm;
              margin: 15px auto;
              padding: 0;
              box-sizing: border-box;
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            @media print {
              .a4-print-sheet {
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              .a4-print-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              table.omr-dotted-grid {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              table.omr-dotted-grid th,
              table.omr-dotted-grid td {
                border: 1px dotted #94a3b8 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar" style="background: #1e1b4b; color: #fff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; font-family: sans-serif; position: sticky; top: 0; z-index: 999;">
            <div>
              <strong>${assessment.title} - ${assessment.turmaName}</strong>
              <div style="font-size: 12px; opacity: 0.8;">${totalPagesToPrint} folhas A4 prontas para impressão e PDF</div>
            </div>
            <button onclick="window.print()" style="background: #4f46e5; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">
              Imprimir / Salvar PDF
            </button>
          </div>
          ${printPortal.innerHTML}
        </body>
      </html>
    `);
    newWin.document.close();
  };

  const handleQuickLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateSchoolLogo) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onUpdateSchoolLogo(event.target.result);
          setIncludeLogo(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Dedicated Print Portal Content: Direct child of document.body via createPortal
  const printPortalContent = (
    <div id="omr-print-portal" className="omr-print-only">
      {printScope === 'single_standard' ? (
        <div className="a4-print-sheet">
          <AnswerSheetCard
            student={null}
            pageIndex={0}
            totalPages={1}
            isMasterKey={sheetMode === 'gabarito_oficial'}
            assessment={assessment}
            schoolName={schoolName}
            schoolLogo={schoolLogo}
            includeLogo={includeLogo}
            dateMode={dateMode}
            formattedAutoDate={formattedAutoDate}
            questionsToRender={questionsToRender}
            sheetLayoutType={sheetLayoutType}
          />
        </div>
      ) : (
        <>
          {registeredStudents.map((student, idx) => (
            <div key={student.id} className="a4-print-sheet">
              <AnswerSheetCard
                student={student}
                pageIndex={idx}
                totalPages={totalPagesToPrint}
                isMasterKey={false}
                assessment={assessment}
                schoolName={schoolName}
                schoolLogo={schoolLogo}
                includeLogo={includeLogo}
                dateMode={dateMode}
                formattedAutoDate={formattedAutoDate}
                questionsToRender={questionsToRender}
                sheetLayoutType={sheetLayoutType}
              />
            </div>
          ))}
          {includeOfficialKeyInBatch && (
            <div key="master-key-sheet" className="a4-print-sheet">
              <AnswerSheetCard
                student={null}
                pageIndex={registeredStudents.length}
                totalPages={totalPagesToPrint}
                isMasterKey={true}
                assessment={assessment}
                schoolName={schoolName}
                schoolLogo={schoolLogo}
                includeLogo={includeLogo}
                dateMode={dateMode}
                formattedAutoDate={formattedAutoDate}
                questionsToRender={questionsToRender}
                sheetLayoutType={sheetLayoutType}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* 1. React Portal for Print Execution: Mounted directly under document.body */}
      {createPortal(printPortalContent, document.body)}

      {/* 2. Interactive Modal UI for User Preview & Configuration */}
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="print-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto no-print"
        title="Pressione ESC ou clique fora para fechar"
      >
        <div className="print-modal-card relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[96vh]">
          
          {/* Header bar with controls */}
          <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col gap-3 shrink-0">
            
            {/* Top row: Title and primary Print / PDF buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <FileText className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Gerador de Folha de Gabarito & Cartão-Resposta OMR
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {assessment.title} • {assessment.turmaName} • {assessment.totalQuestions} questões • Garantido rigorosamente em 1 folha A4 por aluno
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Salvar como arquivo PDF (Apenas as folhas de resposta, sem telas do sistema)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Salvar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Imprimir folha A4 física"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSeparateWindow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="Abrir todas as folhas em uma nova aba limpa para conferência e impressão"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Abrir em Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Fechar janela (ESC)"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>
            </div>

            {/* Selector de Padrão OMR: Padrão Industrial (Recomendado) vs Clássico */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 font-black" />
                  Modelo da Folha OMR:
                </span>
                <div className="flex items-center gap-1 bg-slate-200/90 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSheetLayoutType('industrial')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      sheetLayoutType === 'industrial'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <span>★ OMR Padrão Industrial (ZipGrade / ENEM)</span>
                    <span className="text-[10px] bg-emerald-800 text-emerald-100 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                      Recomendado
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetLayoutType('classico')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      sheetLayoutType === 'classico'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>OMR Padrão Clássico</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 hidden md:flex items-center gap-1">
                {sheetLayoutType === 'industrial' ? (
                  <span className="text-emerald-700 font-medium">
                    ✓ 4 Âncoras Mestras (10mm) + Pistas de Sincronismo (Timing Tracks) linha a linha p/ alta precisão no celular
                  </span>
                ) : (
                  <span>Formato clássico com 4 pontos de canto</span>
                )}
              </div>
            </div>

            {/* Main Mode Row 1: Escolha do Formato e Inclusão do Gabarito Oficial */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700">
                  Formato de Impressão:
                </span>

                {/* Botão Principal: Caderno com TODOS os Alunos Cadastrados */}
                <button
                  type="button"
                  onClick={() => setPrintScope('all_registered')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    printScope === 'all_registered'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Caderno com TODOS os Alunos Cadastrados ({registeredStudents.length} alunos)</span>
                </button>

                {/* Botão Secundário: 1 Folha Padrão Avulsa */}
                <button
                  type="button"
                  onClick={() => setPrintScope('single_standard')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    printScope === 'single_standard'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1 Folha Padrão Avulsa (Xerox)</span>
                </button>
              </div>

              {/* Inclusão do Gabarito Oficial no Caderno */}
              <div className="flex items-center gap-2">
                {printScope === 'all_registered' ? (
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 cursor-pointer hover:bg-amber-100 transition-colors shadow-2xs">
                    <input
                      type="checkbox"
                      checked={includeOfficialKeyInBatch}
                      onChange={(e) => setIncludeOfficialKeyInBatch(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                    <span>Incluir Gabarito Oficial (Chave Mestra) no PDF</span>
                  </label>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSheetMode('aluno')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        sheetMode === 'aluno'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📝 Cartão do Aluno
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetMode('gabarito_oficial')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        sheetMode === 'gabarito_oficial'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🔑 Gabarito Oficial
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Main Mode Row 2: Escolha da Data e Logotipo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
              
              {/* Escolha da Data */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Preenchimento da Data:
                </span>

                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDateMode('auto')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      dateMode === 'auto'
                        ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Escreve a data da avaliação automaticamente no cabeçalho"
                  >
                    ✓ Automática ({formattedAutoDate})
                  </button>

                  <button
                    type="button"
                    onClick={() => setDateMode('blank')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      dateMode === 'blank'
                        ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Deixa espaço em branco para preenchimento manual: ____/____/________"
                  >
                    ✍️ Espaço em Branco (____ / ____ / ________)
                  </button>
                </div>
              </div>

              {/* Controle do Logotipo no cabeçalho (Lado Esquerdo) */}
              <div className="flex items-center gap-2">
                {schoolLogo ? (
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Logotipo no Cabeçalho (Lado Esquerdo)</span>
                  </label>
                ) : onUpdateSchoolLogo ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleQuickLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carregar Logotipo (Lado Esquerdo)</span>
                    </button>
                  </div>
                ) : null}
              </div>

            </div>

            {/* Navegação de pré-visualização quando estiver no modo "Todos os Alunos Cadastrados" */}
            {printScope === 'all_registered' && registeredStudents.length > 0 && (
              <div className="flex items-center justify-between bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900">
                    Pré-visualização na tela:
                  </span>
                  {previewIndex < registeredStudents.length ? (
                    <>
                      <span className="text-indigo-700 font-medium">
                        Folha {previewIndex + 1} de {totalPagesToPrint}:
                      </span>
                      <strong className="text-slate-900">
                        Nº {registeredStudents[previewIndex]?.enrollmentNumber} - {registeredStudents[previewIndex]?.name}
                      </strong>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-800 font-medium">
                        Folha {previewIndex + 1} de {totalPagesToPrint}:
                      </span>
                      <strong className="text-amber-950 font-black">
                        ★ GABARITO OFICIAL PREENCHIDO (CHAVE MESTRA)
                      </strong>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={previewIndex <= 0}
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Folha anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={previewIndex >= totalPagesToPrint - 1}
                    onClick={() => setPreviewIndex((prev) => Math.min(totalPagesToPrint - 1, prev + 1))}
                    className="p-1 rounded bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Próxima folha"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Printable Viewport & Screen Preview */}
          <div className="bg-slate-200/90 p-3 sm:p-6 overflow-y-auto max-h-[calc(92vh-175px)] flex justify-center items-start">
            
            {/* Visual Container mimicking real A4 sheet with 100% fidelity */}
            <div 
              className="w-full max-w-[210mm] mx-auto bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-slate-300 box-border flex flex-col justify-between"
              style={{
                minHeight: '820px',
                aspectRatio: '210 / 297',
              }}
            >
              {printScope === 'single_standard' ? (
                <AnswerSheetCard
                  student={null}
                  pageIndex={0}
                  totalPages={1}
                  isMasterKey={sheetMode === 'gabarito_oficial'}
                  assessment={assessment}
                  schoolName={schoolName}
                  schoolLogo={schoolLogo}
                  includeLogo={includeLogo}
                  dateMode={dateMode}
                  formattedAutoDate={formattedAutoDate}
                  questionsToRender={questionsToRender}
                  sheetLayoutType={sheetLayoutType}
                />
              ) : registeredStudents.length > 0 ? (
                previewIndex < registeredStudents.length ? (
                  <AnswerSheetCard
                    student={registeredStudents[previewIndex]}
                    pageIndex={previewIndex}
                    totalPages={totalPagesToPrint}
                    isMasterKey={false}
                    assessment={assessment}
                    schoolName={schoolName}
                    schoolLogo={schoolLogo}
                    includeLogo={includeLogo}
                    dateMode={dateMode}
                    formattedAutoDate={formattedAutoDate}
                    questionsToRender={questionsToRender}
                    sheetLayoutType={sheetLayoutType}
                  />
                ) : (
                  <AnswerSheetCard
                    student={null}
                    pageIndex={registeredStudents.length}
                    totalPages={totalPagesToPrint}
                    isMasterKey={true}
                    assessment={assessment}
                    schoolName={schoolName}
                    schoolLogo={schoolLogo}
                    includeLogo={includeLogo}
                    dateMode={dateMode}
                    formattedAutoDate={formattedAutoDate}
                    questionsToRender={questionsToRender}
                    sheetLayoutType={sheetLayoutType}
                  />
                )
              ) : (
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-300 text-center my-auto">
                  <p className="text-sm font-bold text-slate-800">
                    Nenhum aluno cadastrado nesta turma ({assessment.turmaName}).
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Alterne para o modo de "Folha Padrão Avulsa (Xerox)" para gerar uma folha em branco com cabeçalho.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPrintScope('single_standard')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
                  >
                    Mudar para Folha Padrão Avulsa
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Footer info bar */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 shrink-0 gap-2">
            <div>
              📄 <strong>Formato A4 Rigoroso</strong>: Cada aluno ocupa rigorosamente 1 única página, perfeitamente centralizada e pronta para leitura por câmera/escâner OMR.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {printScope === 'all_registered' 
                    ? `Imprimir / PDF (${registeredStudents.length} Alunos Cadastrados${includeOfficialKeyInBatch ? ' + Gabarito' : ''})` 
                    : 'Imprimir 1 Folha Padrão'}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
