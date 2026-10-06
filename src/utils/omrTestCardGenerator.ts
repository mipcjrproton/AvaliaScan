import { Assessment, Student, Alternative } from '../types';

/**
 * Generates an authentic, high-contrast digital OMR answer sheet image
 * adhering to the AvaliaScan layout rules (2 columns/pairs per row, corner calibration anchors,
 * assessment code, student name and darkened bubbles) for instant end-to-end OCR testing.
 */
export function generateSyntheticAnswerSheet(
  assessment: Assessment,
  student?: Student,
  options?: {
    simulateRotated?: boolean;
    simulateDoubleMarkQuestion?: number;
    simulateBlankQuestion?: number;
    simulateWrongQuestions?: number[];
  }
): string {
  const canvas = document.createElement('canvas');
  // High resolution portrait page
  const width = 1000;
  const height = 1400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background (clean white sheet, no outer page border)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('INSTITUIÇÃO DE ENSINO • SISTEMA AVALIASCAN OMR', 80, 80);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`FOLHA DE RESPOSTAS OFICIAL • ${assessment.title.toUpperCase()}`, 80, 110);
  ctx.fillText(`Turma: ${assessment.turmaName} | Disciplina: ${assessment.subject}`, 80, 135);

  // Assessment Code Box (Top right)
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(width - 290, 60, 210, 75);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 290, 60, 210, 75);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('CÓDIGO AVALIAÇÃO', width - 275, 80);
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(assessment.id, width - 275, 108);

  // Student Identification Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(80, 160, width - 160, 75);
  ctx.strokeRect(80, 160, width - 160, 75);

  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('NOME DO ALUNO:', 95, 190);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(student?.name || 'ALUNO DEMONSTRAÇÃO AVALIASCAN', 245, 190);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.fillText('MATRÍCULA / Nº:', 95, 220);
  ctx.font = 'bold 16px monospace';
  ctx.fillText(student?.enrollmentNumber || '01', 245, 220);

  // Instructions
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 12px sans-serif';
  ctx.fillText(
    'INSTRUÇÕES: Preencha totalmente a bolha com caneta preta ou azul. Não rasure. Duas marcações anulam a questão.',
    80,
    265
  );

  // Title above the optical frame
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`FOLHA DE RESPOSTAS (${assessment.totalQuestions} QUESTÕES)`, 80, 290);

  // Regra de Colunas: Mais de 20 questões (>20) -> estritamente 2 colunas; <= 20 -> 1 coluna centralizada
  const isTwoColumns = assessment.totalQuestions > 20;
  const halfCount = isTwoColumns ? Math.ceil(assessment.totalQuestions / 2) : assessment.totalQuestions;
  const col1Questions = assessment.answerKey.slice(0, halfCount);
  const col2Questions = isTwoColumns ? assessment.answerKey.slice(halfCount) : [];
  const columnLists = isTwoColumns ? [col1Questions, col2Questions] : [col1Questions];

  const alternatives: Alternative[] = ['A', 'B', 'C', 'D', 'E'];
  const wrongSet = new Set(options?.simulateWrongQuestions || [4]);
  const doubleMarkQ = options?.simulateDoubleMarkQuestion ?? 5;
  const blankQ = options?.simulateBlankQuestion ?? 8;

  const numColWidth = 50;
  const colTableWidth = isTwoColumns ? 360 : 440;
  const altColWidth = (colTableWidth - numColWidth) / alternatives.length;
  const maxRows = Math.max(col1Questions.length, col2Questions.length);
  const rowHeight = maxRows > 25 ? 32 : maxRows > 20 ? 36 : 40;
  const headerHeight = 32;
  const totalTableHeight = headerHeight + (maxRows * rowHeight);

  // Dimensões da caixa de marcas de canto (envolvendo ESTRITAMENTE as questões e bolhas com respiro seguro)
  const innerMarginTop = 45;
  const innerMarginX = 50;
  const anchorSize = 28;

  const gridWidth = isTwoColumns 
    ? (colTableWidth * 2) + 50 + (innerMarginX * 2) 
    : colTableWidth + (innerMarginX * 2);
  const gridX = (width - gridWidth) / 2;
  const gridY = 300;
  const gridHeight = totalTableHeight + (innerMarginTop * 2);

  // 4 Optical Corner Calibration Anchors APENAS em volta das questões e bolhas
  ctx.fillStyle = '#000000';
  ctx.fillRect(gridX, gridY, anchorSize, anchorSize); // Top-left
  ctx.fillRect(gridX + gridWidth - anchorSize, gridY, anchorSize, anchorSize); // Top-right
  ctx.fillRect(gridX, gridY + gridHeight - anchorSize, anchorSize, anchorSize); // Bottom-left
  ctx.fillRect(gridX + gridWidth - anchorSize, gridY + gridHeight - anchorSize, anchorSize, anchorSize); // Bottom-right

  const tableStartY = gridY + innerMarginTop;
  const colStartXList = isTwoColumns
    ? [gridX + innerMarginX, gridX + innerMarginX + colTableWidth + 50]
    : [gridX + innerMarginX];

  columnLists.forEach((colQuestions, colIdx) => {
    const tableX = colStartXList[colIdx];
    const totalTableHeight = headerHeight + (colQuestions.length * rowHeight);

    // 1. Cabeçalho da Grade Pontilhada (Nº, A, B, C, D, E)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(tableX, tableStartY, colTableWidth, headerHeight);

    // Linhas pontilhadas do cabeçalho
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);

    // Borda superior e inferior do cabeçalho
    ctx.beginPath();
    ctx.moveTo(tableX, tableStartY);
    ctx.lineTo(tableX + colTableWidth, tableStartY);
    ctx.moveTo(tableX, tableStartY + headerHeight);
    ctx.lineTo(tableX + colTableWidth, tableStartY + headerHeight);
    ctx.stroke();

    // Divisões verticais do cabeçalho
    ctx.beginPath();
    ctx.moveTo(tableX, tableStartY);
    ctx.lineTo(tableX, tableStartY + headerHeight);
    ctx.moveTo(tableX + numColWidth, tableStartY);
    ctx.lineTo(tableX + numColWidth, tableStartY + headerHeight);
    alternatives.forEach((_, aIdx) => {
      const lineX = tableX + numColWidth + ((aIdx + 1) * altColWidth);
      ctx.moveTo(lineX, tableStartY);
      ctx.lineTo(lineX, tableStartY + headerHeight);
    });
    ctx.stroke();

    // Textos do cabeçalho
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nº', tableX + (numColWidth / 2), tableStartY + (headerHeight / 2));

    alternatives.forEach((alt, aIdx) => {
      const altCenterX = tableX + numColWidth + (aIdx * altColWidth) + (altColWidth / 2);
      ctx.fillText(alt, altCenterX, tableStartY + (headerHeight / 2));
    });

    // 2. Linhas das Questões em Grade Pontilhada
    colQuestions.forEach((q, rowIdx) => {
      const rowY = tableStartY + headerHeight + (rowIdx * rowHeight);
      const isEven = q.number % 2 === 0;

      // Fundo da célula do número: Ímpar = sem fundo (#ffffff), Par = cinza discreto (#f1f5f9)
      ctx.fillStyle = isEven ? '#f1f5f9' : '#ffffff';
      ctx.fillRect(tableX, rowY, numColWidth, rowHeight);

      // Fundo das bolhas (branco)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tableX + numColWidth, rowY, colTableWidth - numColWidth, rowHeight);

      // Linha horizontal pontilhada inferior da linha
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + rowHeight);
      ctx.lineTo(tableX + colTableWidth, rowY + rowHeight);
      ctx.stroke();

      // Linhas verticais pontilhadas das células
      ctx.beginPath();
      ctx.moveTo(tableX, rowY);
      ctx.lineTo(tableX, rowY + rowHeight);
      ctx.moveTo(tableX + numColWidth, rowY);
      ctx.lineTo(tableX + numColWidth, rowY + rowHeight);
      alternatives.forEach((_, aIdx) => {
        const lineX = tableX + numColWidth + ((aIdx + 1) * altColWidth);
        ctx.moveTo(lineX, rowY);
        ctx.lineTo(lineX, rowY + rowHeight);
      });
      ctx.stroke();

      // Número da questão centralizado na célula
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(q.number).padStart(2, '0'), tableX + (numColWidth / 2), rowY + (rowHeight / 2));

      // Resposta simulada para teste OMR
      let markedAlt: Alternative | 'BLANK' | 'MULTIPLE' = q.correctAlternative;
      if (q.number === blankQ) {
        markedAlt = 'BLANK';
      } else if (q.number === doubleMarkQ) {
        markedAlt = 'MULTIPLE';
      } else if (wrongSet.has(q.number)) {
        markedAlt = q.correctAlternative === 'A' ? 'B' : 'A';
      }

      // Desenhar bolhas circulares dentro de cada célula da grade
      ctx.setLineDash([]); // Linha sólida para as bolhas
      const bubbleRadius = rowHeight <= 32 ? 11 : 13;

      alternatives.forEach((alt, aIdx) => {
        const bubbleCenterX = tableX + numColWidth + (aIdx * altColWidth) + (altColWidth / 2);
        const bubbleCenterY = rowY + (rowHeight / 2);
        const isMarked = markedAlt === 'MULTIPLE' ? (alt === 'A' || alt === 'B') : markedAlt === alt;

        if (isMarked) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(bubbleCenterX, bubbleCenterY, bubbleRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(alt, bubbleCenterX, bubbleCenterY);
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(bubbleCenterX, bubbleCenterY, bubbleRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(alt, bubbleCenterX, bubbleCenterY);
        }
      });
    });
  });

  // Rodapé: Código numérico serial de controle no canto inferior direito
  ctx.setLineDash([]);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('2133253997', gridX + gridWidth, height - 35);

  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AvaliaScan OMR • Folha Oficial de Respostas', width / 2, height - 35);

  return canvas.toDataURL('image/jpeg', 0.95);
}
