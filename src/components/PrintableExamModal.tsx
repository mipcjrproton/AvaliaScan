import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, 
  X, 
  ExternalLink, 
  FileText, 
  Users, 
  Image as ImageIcon,
  Key,
  ChevronLeft,
  ChevronRight,
  Type,
  FileCheck
} from 'lucide-react';
import { GeneratedExam, Student, GeneratedQuestion } from '../types';

export type ExamFontScale = 'normal' | 'large' | 'extralarge';

interface PrintableExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: GeneratedExam | null;
  students: Student[];
  schoolName: string;
  schoolLogo?: string;
  printMode: 'xerox' | 'all_active';
  includeDateInXerox: boolean;
  includeOfficialKey?: boolean;
  onUpdateSchoolLogo?: (logo: string) => void;
}

/**
 * Dynamic A4 pagination algorithm:
 * "quando uma questão não couber inteira em uma página, inicie essa questão na próxima página"
 * Calculates question heights based on statement character length, number of alternatives, and font scale.
 * If adding the question would exceed the available vertical printable space on the current A4 page,
 * it immediately moves the question to begin at the top of the next A4 sheet.
 */
function paginateQuestionsForA4Dynamic(
  questions: GeneratedQuestion[],
  hasPromptInfo: boolean,
  fontScale: ExamFontScale = 'large'
): GeneratedQuestion[][] {
  if (!questions || questions.length === 0) return [];
  const pages: GeneratedQuestion[][] = [];

  // Font scale parameters
  const fontMultiplier = fontScale === 'extralarge' ? 1.25 : fontScale === 'large' ? 1.08 : 0.92;
  const charsPerLine = fontScale === 'extralarge' ? 56 : fontScale === 'large' ? 66 : 76;

  // Function to estimate the physical height (in mm) of a single question
  const estimateQuestionHeightMm = (q: GeneratedQuestion): number => {
    // Base: question number badge + top margin
    let h = 12;

    // Statement text lines (Single column: full width ~170mm printable text)
    const stmtChars = (q.statement || '').length;
    const stmtLines = Math.max(1, Math.ceil(stmtChars / charsPerLine));
    h += stmtLines * (6.2 * fontMultiplier);

    // Alternatives
    if (q.options && q.options.length > 0) {
      for (const opt of q.options) {
        const optChars = (opt.text || '').length;
        const optLines = Math.max(1, Math.ceil(optChars / (charsPerLine - 8)));
        // Text height + spacing between alternatives
        h += optLines * (5.6 * fontMultiplier) + 3.0;
      }
    } else {
      h += 24;
    }

    // Card divider / bottom margin
    h += 6;
    return h;
  };

  // Usable height inside A4 sheet (297mm total - 24mm sheet padding - 12mm footer) = ~261mm max
  // Page 1 has Institution Header (~32mm) + Student Identification Box (~28mm) + Orientations (~10mm if promptInfo)
  const page1MaxHeight = hasPromptInfo ? 176 : 188;
  // Subsequent pages have compact continuation header (~16mm)
  const subsequentPageMaxHeight = 236;

  let currentPage: GeneratedQuestion[] = [];
  let currentUsedHeight = 0;
  let isFirstPage = true;

  for (const q of questions) {
    const qHeight = estimateQuestionHeightMm(q);
    const maxAllowedHeight = isFirstPage ? page1MaxHeight : subsequentPageMaxHeight;

    // REGRA DE OURO: "quando uma questão não couber inteira em uma página, inicie essa questão na próxima página"
    if (currentPage.length > 0 && (currentUsedHeight + qHeight > maxAllowedHeight)) {
      pages.push(currentPage);
      currentPage = [q];
      currentUsedHeight = qHeight;
      isFirstPage = false;
    } else {
      currentPage.push(q);
      currentUsedHeight += qHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

export const PrintableExamModal: React.FC<PrintableExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  students,
  schoolName,
  schoolLogo,
  printMode,
  includeDateInXerox,
  includeOfficialKey = false,
  onUpdateSchoolLogo,
}) => {
  // Somente incluir gabarito oficial se confirmada a opção, em folha a parte e APENAS na opção para xerox
  const [includeOfficialKeyAtEnd, setIncludeOfficialKeyAtEnd] = useState<boolean>(() => {
    return Boolean(printMode === 'xerox' && includeOfficialKey);
  });

  // Tamanho de fonte configurável (Padrão Ampliado 'large' por padrão como solicitado)
  const [fontScale, setFontScale] = useState<ExamFontScale>('large');

  const [selectedStudentPreviewIdx, setSelectedStudentPreviewIdx] = useState(0);
  const [previewPageSheetIdx, setPreviewPageSheetIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever props change
  useEffect(() => {
    if (printMode === 'xerox') {
      setIncludeOfficialKeyAtEnd(Boolean(includeOfficialKey));
    } else {
      setIncludeOfficialKeyAtEnd(false);
    }
  }, [includeOfficialKey, printMode]);

  // Active students from the selected turma
  const activeStudents = useMemo(() => {
    if (!exam) return [];
    return students
      .filter((s) => s.turmaId === exam.turmaId && s.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [students, exam]);

  // Paginate questions dynamically according to A4 rules
  const questionPages = useMemo(() => {
    if (!exam) return [];
    return paginateQuestionsForA4Dynamic(exam.questions, Boolean(exam.promptInfo), fontScale);
  }, [exam, fontScale]);

  // Reset preview page if out of bounds after font size change
  useEffect(() => {
    if (previewPageSheetIdx >= questionPages.length && questionPages.length > 0) {
      setPreviewPageSheetIdx(0);
    }
  }, [questionPages.length, previewPageSheetIdx]);

  if (!isOpen || !exam) return null;

  // If "all_active", generate list for each active student; if "xerox", 1 single master sheet
  const studentsToPrint: (Student | null)[] = printMode === 'all_active' && activeStudents.length > 0
    ? activeStudents
    : [null];

  const currentPreviewStudent = studentsToPrint[selectedStudentPreviewIdx] || null;

  // Date formatting
  const formattedDate = exam.applicationDate
    ? new Date(exam.applicationDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : '____/____/________';

  const displayDate = printMode === 'xerox'
    ? (includeDateInXerox ? formattedDate : '____/____/________')
    : formattedDate;

  const totalExamSheets = questionPages.length;

  // Should we show official key? Strictly when confirmed AND in xerox mode!
  const shouldPrintOfficialKey = printMode === 'xerox' && includeOfficialKeyAtEnd;

  // Print execution via isolated iframe with STRICT A4 CSS
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanTurma = (exam.turmaName || 'Turma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanTitle = (exam.assessmentTitle || 'Avaliacao').replace(/[^a-zA-Z0-9_-]/g, '_');
    const modeLabel = printMode === 'all_active' ? `Alunos_Ativos_${activeStudents.length}` : 'Xerox_Matriz';
    const keyLabel = shouldPrintOfficialKey ? '_com_Gabarito_A4' : '';
    const newDocTitle = `Avaliacao_A4_${modeLabel}${keyLabel}_${cleanTurma}_${cleanTitle}`;
    document.title = newDocTitle;

    const printPortal = document.getElementById('exam-print-portal');
    if (printPortal) {
      let iframe = document.getElementById('exam-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'exam-print-frame';
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
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                  overflow: visible !important;
                }
                .a4-exam-sheet {
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  min-height: 297mm !important;
                  max-height: 297mm !important;
                  box-sizing: border-box !important;
                  margin: 0 !important;
                  padding: 12mm 14mm !important;
                  page-break-before: auto !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                  background: #ffffff !important;
                }
                .a4-exam-sheet:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
                .a4-official-key-sheet {
                  page-break-before: always !important;
                  break-before: page !important;
                }
                .question-card {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  break-inside: avoid-page !important;
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
          } catch {
            window.print();
          } finally {
            document.title = originalTitle;
          }
        }, 500);
      } else {
        window.print();
        document.title = originalTitle;
      }
    } else {
      window.print();
      document.title = originalTitle;
    }
  };

  // Open in standalone window with strict A4 styling
  const handleOpenSeparateWindow = () => {
    const printPortal = document.getElementById('exam-print-portal');
    if (!printPortal) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Por favor, permita pop-ups para abrir a versão de impressão.');
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>AvaliaScan - Padrão A4 - ${exam.assessmentTitle}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              background: #0f172a;
              margin: 0;
              padding: 25px 0;
              color: #0f172a;
              font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            }
            .a4-exam-sheet {
              background: #ffffff;
              width: 210mm;
              height: 297mm;
              min-height: 297mm;
              max-height: 297mm;
              margin: 0 auto 30px auto;
              padding: 12mm 14mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border-radius: 4px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .a4-official-key-sheet {
              page-break-before: always;
              break-before: page;
            }
            .question-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            @media print {
              body {
                background: #ffffff !important;
                padding: 0 !important;
              }
              .a4-exam-sheet {
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
              }
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 20px;" class="no-print">
            <button onclick="window.print()" style="padding: 12px 28px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
              🖨️ Imprimir / Salvar em PDF (Padrão A4)
            </button>
          </div>
          ${printPortal.innerHTML}
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  // Upload School Logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateSchoolLogo) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (base64) onUpdateSchoolLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Floating Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-md shrink-0 flex flex-wrap items-center justify-between gap-3 z-10">
        
        {/* Left: Metadata info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                {exam.assessmentTitle}
              </h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-900 border-emerald-300">
                PADRÃO A4 (210mm × 297mm)
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-blue-50 text-blue-900 border-blue-200">
                1 COLUNA
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                exam.difficulty === 'Fácil' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                exam.difficulty === 'Médio' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                Nível {exam.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{exam.subject}</span>
              <span>•</span>
              <span>{exam.turmaName}</span>
              <span>•</span>
              <span>{exam.totalQuestions} Questões</span>
              <span>•</span>
              <span className="font-semibold text-emerald-800">
                {totalExamSheets} {totalExamSheets === 1 ? 'folha A4' : 'folhas A4'}{shouldPrintOfficialKey ? ' + 1 folha A4 de Gabarito' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Font Size (Aumentar Fonte) & Gabarito Option */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          
          {/* Seletor de Tamanho da Fonte (Aumentar Fonte) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <span>Fonte:</span>
            </span>
            <button
              onClick={() => setFontScale('normal')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                fontScale === 'normal' 
                  ? 'bg-white shadow-xs text-slate-900 font-black' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tamanho Normal (13.5px)"
            >
              Normal
            </button>
            <button
              onClick={() => setFontScale('large')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                fontScale === 'large' 
                  ? 'bg-emerald-700 shadow-xs text-white font-black' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fonte Ampliada Padrão (15.5px) - Recomendado"
            >
              Grande ★
            </button>
            <button
              onClick={() => setFontScale('extralarge')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                fontScale === 'extralarge' 
                  ? 'bg-emerald-700 shadow-xs text-white font-black' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fonte Extra Grande (17px)"
            >
              Extra Grande
            </button>
          </div>

          {/* Toggle Official Key: SOMENTE na opção para xerox e se confirmada */}
          {printMode === 'xerox' ? (
            <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg border text-xs font-bold select-none transition-all ${
              includeOfficialKeyAtEnd
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={includeOfficialKeyAtEnd}
                onChange={(e) => setIncludeOfficialKeyAtEnd(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gabarito Oficial em Folha A4 à Parte</span>
            </label>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              (Gabarito desativado na impressão nominal dos alunos)
            </span>
          )}

          {/* Change School Logo */}
          {onUpdateSchoolLogo && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Alterar Logo da Escola"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </>
          )}

        </div>

        {/* Right: Print Actions & Close */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handleOpenSeparateWindow}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors"
            title="Abrir em Nova Janela"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Aba</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF (A4)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors ml-1"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

      </div>

      {/* Sub-header navigation: When multiple nominal students or multiple A4 sheets */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shrink-0">
        
        {/* Student selector if nominal */}
        {printMode === 'all_active' && activeStudents.length > 1 ? (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              Aluno ({selectedStudentPreviewIdx + 1} de {activeStudents.length}):
            </span>
            <span className="font-bold bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-700">
              {currentPreviewStudent?.name}
            </span>
            <button
              onClick={() => setSelectedStudentPreviewIdx((p) => Math.max(0, p - 1))}
              disabled={selectedStudentPreviewIdx === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedStudentPreviewIdx((p) => Math.min(activeStudents.length - 1, p + 1))}
              disabled={selectedStudentPreviewIdx === activeStudents.length - 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <FileCheck className="w-4 h-4" />
            <span>Matriz para Fotocópia (Xerox) • 1 Coluna • Formato Padrão A4</span>
          </div>
        )}

        {/* Sheet page tabs selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">Visualizar Folha A4:</span>
          {questionPages.map((pageQ, sIdx) => (
            <button
              key={sIdx}
              onClick={() => setPreviewPageSheetIdx(sIdx)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                previewPageSheetIdx === sIdx
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Folha {sIdx + 1} ({pageQ.length} {pageQ.length === 1 ? 'questão' : 'questões'})
            </button>
          ))}

          {shouldPrintOfficialKey && (
            <button
              onClick={() => setPreviewPageSheetIdx(questionPages.length)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                previewPageSheetIdx === questionPages.length
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-indigo-300 hover:bg-slate-700'
              }`}
            >
              Folha Gabarito (À Parte)
            </button>
          )}
        </div>

      </div>

      {/* Main Preview Container (Scrollable viewport displaying strict A4 Sheet) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center">
        
        {/* Visual Container mimicking real A4 sheet with 100% fidelity */}
        {previewPageSheetIdx < questionPages.length ? (
          <div className="w-[210mm] max-w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-slate-900 rounded-sm shadow-2xl p-[12mm_14mm] border border-slate-400 box-border flex flex-col justify-between overflow-hidden">
            <SingleA4SheetContent
              exam={exam}
              student={currentPreviewStudent}
              schoolName={schoolName}
              schoolLogo={schoolLogo}
              displayDate={displayDate}
              questions={questionPages[previewPageSheetIdx]}
              sheetIndex={previewPageSheetIdx}
              totalSheets={totalExamSheets}
              isFirstSheet={previewPageSheetIdx === 0}
              fontScale={fontScale}
            />
          </div>
        ) : shouldPrintOfficialKey ? (
          <div className="w-[210mm] max-w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-slate-900 rounded-sm shadow-2xl p-[12mm_14mm] border-2 border-indigo-500 box-border flex flex-col justify-between overflow-hidden">
            <OfficialKeyA4SheetContent
              exam={exam}
              schoolName={schoolName}
              schoolLogo={schoolLogo}
              displayDate={displayDate}
            />
          </div>
        ) : null}

      </div>

      {/* Hidden DOM Portal used strictly for clean iframe printing of ALL sheets with 100% A4 fidelity */}
      <div id="exam-print-portal" className="hidden">
        {studentsToPrint.map((student, sIdx) => {
          return questionPages.map((pageQuestions, pageIdx) => (
            <div 
              key={`stu_${sIdx}_sheet_${pageIdx}`} 
              className="a4-exam-sheet"
            >
              <SingleA4SheetContent
                exam={exam}
                student={student}
                schoolName={schoolName}
                schoolLogo={schoolLogo}
                displayDate={displayDate}
                questions={pageQuestions}
                sheetIndex={pageIdx}
                totalSheets={totalExamSheets}
                isFirstSheet={pageIdx === 0}
                fontScale={fontScale}
              />
            </div>
          ));
        })}

        {/* Página em FOLHA À PARTE com Gabarito Oficial: SOMENTE para Xerox e se confirmado */}
        {shouldPrintOfficialKey && (
          <div className="a4-exam-sheet a4-official-key-sheet">
            <OfficialKeyA4SheetContent
              exam={exam}
              schoolName={schoolName}
              schoolLogo={schoolLogo}
              displayDate={displayDate}
            />
          </div>
        )}
      </div>

    </div>
  );
};

// ========================================================
// SINGLE A4 SHEET COMPONENT (210mm × 297mm)
// ========================================================
interface SingleA4SheetContentProps {
  exam: GeneratedExam;
  student: Student | null;
  schoolName: string;
  schoolLogo?: string;
  displayDate: string;
  questions: GeneratedQuestion[];
  sheetIndex: number;
  totalSheets: number;
  isFirstSheet: boolean;
  fontScale: ExamFontScale;
}

const SingleA4SheetContent: React.FC<SingleA4SheetContentProps> = ({
  exam,
  student,
  schoolName,
  schoolLogo,
  displayDate,
  questions,
  sheetIndex,
  totalSheets,
  isFirstSheet,
  fontScale,
}) => {
  // Font scale class maps for single column questions
  const stmtFontClass = {
    normal: 'text-[13.5px] leading-normal font-bold',
    large: 'text-[15px] sm:text-[15.5px] leading-relaxed font-bold',
    extralarge: 'text-[16.5px] sm:text-[17px] leading-relaxed font-extrabold',
  }[fontScale];

  const optFontClass = {
    normal: 'text-[12.5px] leading-snug font-medium',
    large: 'text-[13.5px] sm:text-[14px] leading-snug font-medium',
    extralarge: 'text-[15px] sm:text-[15.5px] leading-snug font-semibold',
  }[fontScale];

  const optLetterClass = {
    normal: 'text-xs sm:text-[13px] font-black font-mono',
    large: 'text-[13.5px] sm:text-[14.5px] font-black font-mono',
    extralarge: 'text-[15px] sm:text-[16px] font-black font-mono',
  }[fontScale];

  const badgeSizeClass = {
    normal: 'w-6 h-6 text-xs',
    large: 'w-7 h-7 text-xs sm:text-sm',
    extralarge: 'w-8 h-8 text-sm sm:text-base',
  }[fontScale];

  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-900 box-border">
      
      {/* Top Section: Header & Identification (or continuation header) */}
      <div className="shrink-0">
        
        {isFirstSheet ? (
          <>
            {/* Cabeçalho Principal (Página 1) - Mesmo Modelo do Gabarito */}
            <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5">
              <div className="flex items-center gap-3">
                
                {/* School Logo */}
                {schoolLogo ? (
                  <div className="shrink-0 flex items-center justify-center p-1 border border-slate-400 rounded bg-white w-20 h-13">
                    <img 
                      src={schoolLogo} 
                      alt="Logo da Escola" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                ) : null}

                {/* Institution & Exam Info */}
                <div className="flex-1 text-left min-w-0">
                  <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 leading-tight">
                    {schoolName || 'Instituição de Ensino'}
                  </h1>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 tracking-wide">
                    CADERNO DE QUESTÕES • AVALIAÇÃO OFICIAL
                  </h2>
                  <div className="text-xs text-slate-700 mt-0.5 font-bold">
                    {exam.assessmentTitle} • {exam.turmaName} • {exam.subject}
                  </div>
                </div>

                {/* Right Metadata */}
                <div className="shrink-0 flex flex-col items-end text-right font-mono">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-tighter">CÓDIGO AVALIAÇÃO</span>
                  <span className="text-[11px] font-black text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-400">
                    {exam.assessmentId}
                  </span>
                  <span className="text-[9.5px] text-slate-800 font-bold mt-0.5">
                    DATA: {displayDate}
                  </span>
                  <span className="text-[9px] text-emerald-800 font-bold mt-0.5">
                    Folha {sheetIndex + 1} de {totalSheets} • Padrão A4
                  </span>
                </div>

              </div>
            </div>

            {/* Box de Identificação do Aluno (Página 1) - Mesmo Modelo do Gabarito */}
            <div className="border border-slate-400 bg-slate-50/90 p-2 rounded mb-3 text-[11px]">
              <div className="grid grid-cols-12 gap-2 items-center">
                
                {/* Nome do Aluno */}
                <div className="col-span-7">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                      Nome do Aluno:
                    </span>
                    {student ? (
                      <span className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-800 flex-1 px-1 tracking-wide truncate text-[11px]">
                        {student.name}
                      </span>
                    ) : (
                      <div className="border-b-2 border-slate-500 flex-1 h-3 flex items-end">
                        <span className="text-[9px] text-slate-400 select-none">________________________________________________</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nº / Matrícula */}
                <div className="col-span-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                      Nº / Matrícula:
                    </span>
                    {student ? (
                      <span className="font-mono font-black text-slate-950 border-b-2 border-slate-800 flex-1 px-1 text-center text-[10.5px]">
                        {student.enrollmentNumber}
                      </span>
                    ) : (
                      <div className="border-b-2 border-slate-500 flex-1 h-3 flex items-end">
                        <span className="text-[9px] text-slate-400 select-none">____________</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Turma */}
                <div className="col-span-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-slate-950 uppercase text-[10px] shrink-0">
                      Turma:
                    </span>
                    <span className="font-bold text-slate-950 border-b-2 border-slate-800 flex-1 px-1 text-center text-[10px]">
                      {exam.turmaName}
                    </span>
                  </div>
                </div>

              </div>

              {/* Instruções Rápidas */}
              <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[9.5px] text-slate-600 font-medium">
                <span>
                  ✍️ Leia atentamente cada enunciado. Preencha sua resposta com caneta azul ou preta.
                </span>
                <span className="font-bold text-slate-800 font-mono text-[10px]">
                  [ NOTA: _____ / VISTO: _____ ]
                </span>
              </div>
            </div>

            {/* Linha de Digitação Pedagógica (Orientações da Prova) */}
            {exam.promptInfo && (
              <div className="mb-2.5 px-3 py-1.5 rounded bg-slate-100 border-l-4 border-emerald-700 text-[10.5px] text-slate-800 italic">
                <span className="font-bold not-italic text-slate-900">Orientações do Conteúdo: </span>
                {exam.promptInfo}
              </div>
            )}
          </>
        ) : (
          /* Cabeçalho Compacto de Continuação (Páginas 2+) */
          <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase text-slate-950 text-xs tracking-wider">
                {schoolName || 'Instituição de Ensino'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-800 text-xs">
                {exam.assessmentTitle} ({exam.turmaName})
              </span>
            </div>

            <div className="text-right font-mono text-[10px] flex items-center gap-3">
              <span className="font-bold text-slate-900">
                {student ? `Aluno: ${student.name}` : 'Aluno: _______________________________'}
              </span>
              <span className="bg-slate-100 text-slate-950 px-2 py-0.5 rounded border border-slate-400 font-black">
                Folha {sheetIndex + 1} de {totalSheets} (A4)
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Middle Section: Questions Block (Strictly 1 column with ENLARGED FONT) */}
      {/* "quando uma questão não couber inteira em uma página, inicie essa questão na próxima página" */}
      <div className="flex-1 flex flex-col justify-start space-y-4 min-h-0">
        {questions.map((q) => (
          <div 
            key={q.number} 
            className="question-card border-b border-slate-300 pb-3 space-y-2 break-inside-avoid"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            
            {/* Question Header & Statement (Fonte ampliada e nítida em 1 coluna) */}
            <div className="flex items-start gap-2.5">
              <span className={`shrink-0 ${badgeSizeClass} rounded bg-slate-950 text-white font-black flex items-center justify-center font-mono mt-0.5 shadow-2xs`}>
                {q.number}
              </span>
              <div className={`${stmtFontClass} text-slate-950 text-justify flex-1`}>
                {q.statement}
              </div>
            </div>

            {/* Alternatives List (Fonte ampliada e espaçamento generoso em 1 coluna) */}
            <div className="space-y-1.5 pl-8 sm:pl-9 pt-0.5">
              {q.options.map((opt) => (
                <div key={opt.letter} className="flex items-start gap-2.5 text-slate-900">
                  <span className={`${optLetterClass} shrink-0 leading-normal`}>
                    ({opt.letter})
                  </span>
                  <span className={`${optFontClass} flex-1`}>
                    {opt.text}
                  </span>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* Bottom Section: Official A4 Footer */}
      <div className="shrink-0 pt-2 border-t border-slate-400 flex items-center justify-between text-[9px] text-slate-600 font-mono">
        <span>AvaliaScan • Avaliação Escolar Oficial (Padrão A4: 210mm × 297mm • 1 Coluna)</span>
        <span>Código {exam.assessmentId} • Folha {sheetIndex + 1} de {totalSheets}</span>
      </div>

    </div>
  );
};

// ========================================================
// OFFICIAL KEY A4 SHEET (FOLHA À PARTE EXCLUSIVA PARA XEROX)
// ========================================================
interface OfficialKeyA4SheetContentProps {
  exam: GeneratedExam;
  schoolName: string;
  schoolLogo?: string;
  displayDate: string;
}

const OfficialKeyA4SheetContent: React.FC<OfficialKeyA4SheetContentProps> = ({
  exam,
  schoolName,
  schoolLogo,
  displayDate,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-900 box-border">
      
      {/* Top Header of Key */}
      <div className="shrink-0">
        <div className="border-b-2 border-slate-900 pb-2.5 mb-3">
          <div className="flex items-center gap-3">
            
            {schoolLogo ? (
              <div className="shrink-0 flex items-center justify-center p-1 border border-slate-400 rounded bg-white w-20 h-13">
                <img 
                  src={schoolLogo} 
                  alt="Logo da Escola" 
                  className="max-h-full max-w-full object-contain" 
                />
              </div>
            ) : null}

            <div className="flex-1 text-left min-w-0">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 leading-tight">
                {schoolName || 'Instituição de Ensino'}
              </h1>
              <h2 className="text-xs sm:text-sm font-black text-indigo-950 mt-0.5 tracking-wide">
                ★ GABARITO OFICIAL & JUSTIFICATIVAS (FOLHA À PARTE)
              </h2>
              <div className="text-xs text-slate-700 mt-0.5 font-bold">
                {exam.assessmentTitle} • {exam.turmaName} • {exam.subject} • Nível {exam.difficulty}
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end text-right font-mono">
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-tighter">CÓDIGO AVALIAÇÃO</span>
              <span className="text-[11px] font-black text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-400">
                {exam.assessmentId}
              </span>
              <span className="text-[9.5px] text-slate-800 font-bold mt-0.5">
                DATA: {displayDate}
              </span>
              <span className="text-[9px] text-emerald-800 font-bold mt-0.5">
                FOLHA ANEXA • PADRÃO A4
              </span>
            </div>

          </div>

          {/* Warning Banner */}
          <div className="mt-2 px-3 py-1 bg-rose-50 border border-rose-300 rounded text-[9.5px] text-rose-900 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>⚠️ DOCUMENTO CONFIDENCIAL DO PROFESSOR (ANEXO DE XEROX)</span>
            <span>NÃO FOTOCOPIAR JUNTO COM O CADERNO DOS ALUNOS</span>
          </div>
        </div>

        {/* Quick Answer Key Matrix */}
        <div className="mb-3.5 p-3 rounded-lg bg-slate-50 border border-slate-300">
          <h3 className="text-[11px] font-black uppercase text-slate-800 mb-2 tracking-wider">
            Chave Mestra Oficial das Respostas ({exam.questions.length} Questões):
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {exam.questions.map((q) => (
              <div key={q.number} className="bg-white border border-slate-300 rounded p-1 text-center shadow-2xs">
                <div className="text-[9px] font-bold text-slate-500 font-mono">Q{q.number}</div>
                <div className="text-xs font-black text-indigo-950 bg-indigo-50 rounded mt-0.5">
                  {q.correctAlternative}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: Pedagogical Resolutions Details */}
      <div className="flex-1 overflow-hidden space-y-2.5 min-h-0">
        <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
          Resoluções & Justificativas Pedagógicas da IA:
        </h3>

        <div className="space-y-2">
          {exam.questions.slice(0, 10).map((q) => (
            <div key={q.number} className="p-2 bg-slate-50 rounded border border-slate-200 text-[10.5px] space-y-1 break-inside-avoid">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-4 h-4 rounded bg-indigo-950 text-white font-mono text-[9px] flex items-center justify-center">
                  {q.number}
                </span>
                <span className="text-emerald-800 font-black">
                  Gabarito: ({q.correctAlternative})
                </span>
                {q.topic && (
                  <span className="text-slate-500 font-normal text-[10px] ml-auto">
                    {q.topic}
                  </span>
                )}
              </div>

              {q.explanation && (
                <div className="text-slate-700 italic bg-white p-1.5 rounded border border-slate-200 leading-snug">
                  <strong className="not-italic font-bold text-indigo-950">Comentário: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="shrink-0 pt-2 border-t border-slate-400 flex items-center justify-between text-[9px] text-slate-600 font-mono">
        <span>AvaliaScan • Folha de Gabarito Oficial (Anexo do Professor • Padrão A4)</span>
        <span>Avaliação {exam.assessmentId} • {exam.turmaName}</span>
      </div>

    </div>
  );
};
