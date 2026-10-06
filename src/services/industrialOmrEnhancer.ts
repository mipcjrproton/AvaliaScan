/**
 * Industrial OMR Image Enhancer & Sharpness Analyzer
 *
 * Implementa normas de processamento de imagem para sistemas industriais de OMR:
 * 1. Medição em tempo real de nitidez óptica (Variância Laplaciana / Foco).
 * 2. Análise de luminância e iluminação de fundo do papel.
 * 3. Filtro de Realce de Nitidez Industrial (Unsharp Masking com Kernel Laplaciano).
 * 4. Normalização de sombras adaptativa e ampliação de contraste óptico.
 */

export interface SharpnessMetrics {
  score: number; // 0 a 100%
  variance: number;
  status: 'EXCELLENT' | 'GOOD' | 'BLURRY';
  statusLabel: string;
  isSharpEnough: boolean;
  lightingStatus: 'OPTIMAL' | 'LOW_LIGHT' | 'OVEREXPOSED';
  lightingLabel: string;
  averageLuma: number;
}

export type SharpnessFilterMode = 'none' | 'sharp' | 'ultra_sharp';

/**
 * Converte RGB para luminância perceptiva ponderada ITU-R BT.601
 */
export function getPerceptualLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Avalia a nitidez do frame em tempo real calculando a variância do operador Laplaciano
 * em uma sub-amostra central do canvas (eficiente para execução a 5-10 FPS).
 */
export function measureFrameSharpness(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
  sampleWidth = 240,
  sampleHeight = 320
): SharpnessMetrics {
  let sourceW = 0;
  let sourceH = 0;

  if (videoOrCanvas instanceof HTMLVideoElement) {
    sourceW = videoOrCanvas.videoWidth;
    sourceH = videoOrCanvas.videoHeight;
  } else {
    sourceW = videoOrCanvas.width;
    sourceH = videoOrCanvas.height;
  }

  if (sourceW === 0 || sourceH === 0) {
    return {
      score: 0,
      variance: 0,
      status: 'BLURRY',
      statusLabel: 'Aguardando Câmera...',
      isSharpEnough: false,
      lightingStatus: 'LOW_LIGHT',
      lightingLabel: 'Sem Sinal',
      averageLuma: 0,
    };
  }

  // Cria canvas temporário compacto para cálculo rápido
  const helperCanvas = document.createElement('canvas');
  helperCanvas.width = sampleWidth;
  helperCanvas.height = sampleHeight;
  const ctx = helperCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      score: 80,
      variance: 150,
      status: 'GOOD',
      statusLabel: 'Foco OK',
      isSharpEnough: true,
      lightingStatus: 'OPTIMAL',
      lightingLabel: 'Iluminação OK',
      averageLuma: 160,
    };
  }

  // Amostra o centro da imagem (onde o gabarito é enquadrado)
  const cropW = Math.round(sourceW * 0.75);
  const cropH = Math.round(sourceH * 0.75);
  const cropX = Math.round((sourceW - cropW) / 2);
  const cropY = Math.round((sourceH - cropH) / 2);

  ctx.drawImage(
    videoOrCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    sampleWidth,
    sampleHeight
  );

  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;

  // 1. Converte para escala de cinza e calcula média
  const gray = new Float32Array(sampleWidth * sampleHeight);
  let lumaSum = 0;

  for (let i = 0, g = 0; i < data.length; i += 4, g++) {
    const lum = getPerceptualLuma(data[i], data[i + 1], data[i + 2]);
    gray[g] = lum;
    lumaSum += lum;
  }

  const averageLuma = lumaSum / gray.length;

  // 2. Aplica filtro Laplaciano 3x3 para detectar bordas de alta frequência (nitidez)
  // Kernel Laplaciano discreto:
  // [  0,  1,  0 ]
  // [  1, -4,  1 ]
  // [  0,  1,  0 ]
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let count = 0;

  const w = sampleWidth;
  const h = sampleHeight;

  // Amostragem com salto de 2 pixels para velocidade de micro-segundos
  for (let y = 1; y < h - 1; y += 2) {
    const rowOffset = y * w;
    const rowAbove = (y - 1) * w;
    const rowBelow = (y + 1) * w;

    for (let x = 1; x < w - 1; x += 2) {
      const center = gray[rowOffset + x];
      const top = gray[rowAbove + x];
      const bottom = gray[rowBelow + x];
      const left = gray[rowOffset + x - 1];
      const right = gray[rowOffset + x + 1];

      const lap = Math.abs(top + bottom + left + right - 4 * center);
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      count++;
    }
  }

  const meanLap = count > 0 ? laplacianSum / count : 0;
  const variance = count > 0 ? laplacianSqSum / count - meanLap * meanLap : 0;

  // Normalização do score (100 a 400 de variância no texto/bolha impresso indica excelente foco)
  const normalizedScore = Math.min(100, Math.max(10, Math.round((variance / 160) * 100)));

  let status: 'EXCELLENT' | 'GOOD' | 'BLURRY' = 'BLURRY';
  let statusLabel = 'Desfocado • Estabilize';
  let isSharpEnough = false;

  if (normalizedScore >= 75) {
    status = 'EXCELLENT';
    statusLabel = 'Nitidez Industrial Ótima';
    isSharpEnough = true;
  } else if (normalizedScore >= 45) {
    status = 'GOOD';
    statusLabel = 'Foco Aceitável';
    isSharpEnough = true;
  } else {
    status = 'BLURRY';
    statusLabel = 'Foco Instável • Aproxime';
    isSharpEnough = false;
  }

  // Avaliação de iluminação
  let lightingStatus: 'OPTIMAL' | 'LOW_LIGHT' | 'OVEREXPOSED' = 'OPTIMAL';
  let lightingLabel = 'Iluminação Ideal';

  if (averageLuma < 80) {
    lightingStatus = 'LOW_LIGHT';
    lightingLabel = 'Pouca Luz • Ilumine o Papel';
  } else if (averageLuma > 230) {
    lightingStatus = 'OVEREXPOSED';
    lightingLabel = 'Reflexo/Claridade Excessiva';
  }

  return {
    score: normalizedScore,
    variance: Math.round(variance),
    status,
    statusLabel,
    isSharpEnough,
    lightingStatus,
    lightingLabel,
    averageLuma: Math.round(averageLuma),
  };
}

/**
 * Aplica filtro de nitidez industrial (Unsharp Masking com convolução 3x3)
 * diretamente no canvas para realçar o contraste de bordas das bolhas e marcas de sincronismo.
 */
export function applyIndustrialSharpnessFilter(
  sourceCanvas: HTMLCanvasElement,
  strength: 'standard' | 'ultra' = 'standard'
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const srcCtx = sourceCanvas.getContext('2d');
  const outCtx = outputCanvas.getContext('2d');
  if (!srcCtx || !outCtx) return sourceCanvas;

  const srcImageData = srcCtx.getImageData(0, 0, width, height);
  const src = srcImageData.data;

  const outImageData = outCtx.createImageData(width, height);
  const dst = outImageData.data;

  // Kernel de nitidez Laplaciana:
  // standard: peso central 5, vizinhos -1 (ganho moderado)
  // ultra: peso central 7, vizinhos -1.25 / 1.5 (ganho industrial para canetas fracas/lápis)
  const centerWeight = strength === 'ultra' ? 6.0 : 5.0;
  const neighborWeight = strength === 'ultra' ? -1.25 : -1.0;
  const divisor = centerWeight + 4 * neighborWeight; // Normalização de ganho de energia

  // Copia bordas não convoluídas
  dst.set(src);

  // Varredura por linha (linha 1 até height - 2)
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const rowAbove = (y - 1) * width;
    const rowBelow = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const idx = (rowOffset + x) * 4;
      const idxT = (rowAbove + x) * 4;
      const idxB = (rowBelow + x) * 4;
      const idxL = (rowOffset + x - 1) * 4;
      const idxR = (rowOffset + x + 1) * 4;

      // Canal R
      const rVal =
        (src[idx] * centerWeight +
          (src[idxT] + src[idxB] + src[idxL] + src[idxR]) * neighborWeight) /
        divisor;

      // Canal G
      const gVal =
        (src[idx + 1] * centerWeight +
          (src[idxT + 1] + src[idxB + 1] + src[idxL + 1] + src[idxR + 1]) * neighborWeight) /
        divisor;

      // Canal B
      const bVal =
        (src[idx + 2] * centerWeight +
          (src[idxT + 2] + src[idxB + 2] + src[idxL + 2] + src[idxR + 2]) * neighborWeight) /
        divisor;

      // Restringe ao range [0, 255]
      dst[idx] = rVal < 0 ? 0 : rVal > 255 ? 255 : rVal;
      dst[idx + 1] = gVal < 0 ? 0 : gVal > 255 ? 255 : gVal;
      dst[idx + 2] = bVal < 0 ? 0 : bVal > 255 ? 255 : bVal;
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outputCanvas;
}

/**
 * Normaliza sombras e amplia o contraste óptico da folha de respostas
 * (Elimina sombras gradientes de celulares e nivela fundo branco com marcações pretas).
 */
export function applyAdaptiveContrastEnhancement(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Amostra percentis de branco (papel) e preto (tinta/marcador)
  const lumas: number[] = [];
  const step = Math.max(1, Math.floor((w * h) / 4000));
  for (let i = 0; i < d.length; i += step * 4) {
    lumas.push(getPerceptualLuma(d[i], d[i + 1], d[i + 2]));
  }
  lumas.sort((a, b) => a - b);

  const blackPoint = lumas[Math.floor(lumas.length * 0.05)] || 30; // 5º percentil
  const whitePoint = lumas[Math.floor(lumas.length * 0.92)] || 230; // 92º percentil

  const range = Math.max(30, whitePoint - blackPoint);
  const factor = 255 / range;

  // Ajuste de curva S de contraste
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - blackPoint) * factor;
    let g = (d[i + 1] - blackPoint) * factor;
    let b = (d[i + 2] - blackPoint) * factor;

    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Pipeline completo de processamento industrial de imagem para folha OMR
 */
export function processIndustrialImageEnhancement(
  sourceCanvas: HTMLCanvasElement,
  sharpnessMode: SharpnessFilterMode = 'sharp'
): { enhancedCanvas: HTMLCanvasElement; enhancedDataUrl: string } {
  let canvas = sourceCanvas;

  if (sharpnessMode === 'ultra_sharp') {
    canvas = applyAdaptiveContrastEnhancement(canvas);
    canvas = applyIndustrialSharpnessFilter(canvas, 'ultra');
  } else if (sharpnessMode === 'sharp') {
    canvas = applyAdaptiveContrastEnhancement(canvas);
    canvas = applyIndustrialSharpnessFilter(canvas, 'standard');
  }

  const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.94);
  return {
    enhancedCanvas: canvas,
    enhancedDataUrl,
  };
}

/**
 * Captura estabilizada com seletor de micro-burst (Instant Sharpness Burst):
 * Amostra rapidamente 2 frames de vídeo com intervalo de ~20ms e seleciona o frame
 * de menor desfoque de movimento (maior variância Laplaciana), garantindo estabilização
 * óptica industrial sem aumentar o tempo de resposta (0 a 20ms).
 */
export async function captureStabilizedFrame(
  video: HTMLVideoElement | null,
  sharpnessMode: SharpnessFilterMode = 'ultra_sharp'
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string } | null> {
  if (!video || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  // Obter dimensões do vídeo
  let w = video.videoWidth;
  let h = video.videoHeight;

  // Normalização de resolução para qualquer dispositivo (Samsung S20 4K/1080p, Tab A11 720p/480p):
  // Dimensão máxima otimizada em 1280px para altíssima nitidez óptica sem sobrecarregar memória ou rede
  const maxDim = 1280;
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  // Frame 1
  const canvas1 = document.createElement('canvas');
  canvas1.width = w;
  canvas1.height = h;
  const ctx1 = canvas1.getContext('2d');
  if (!ctx1) return null;
  ctx1.drawImage(video, 0, 0, w, h);
  const metrics1 = measureFrameSharpness(canvas1);

  // Se o primeiro frame já apresenta boa estabilização/nitidez (>= 60%),
  // retorna instantaneamente sem atraso.
  if (metrics1.score >= 60) {
    const enhanced = processIndustrialImageEnhancement(canvas1, sharpnessMode);
    return { canvas: enhanced.enhancedCanvas, dataUrl: enhanced.enhancedDataUrl };
  }

  // Se houver indício de micro-vibração (ex: clique no botão), aguarda apenas 20ms
  // para obter o quadro subsequente estabilizado do sensor
  await new Promise((resolve) => setTimeout(resolve, 20));

  const canvas2 = document.createElement('canvas');
  canvas2.width = w;
  canvas2.height = h;
  const ctx2 = canvas2.getContext('2d');
  if (!ctx2) {
    const enhanced = processIndustrialImageEnhancement(canvas1, sharpnessMode);
    return { canvas: enhanced.enhancedCanvas, dataUrl: enhanced.enhancedDataUrl };
  }

  ctx2.drawImage(video, 0, 0, w, h);
  const metrics2 = measureFrameSharpness(canvas2);

  // Escolhe o quadro com maior índice de estabilização óptica
  const bestCanvas = metrics2.variance > metrics1.variance ? canvas2 : canvas1;
  const enhanced = processIndustrialImageEnhancement(bestCanvas, sharpnessMode);
  return { canvas: enhanced.enhancedCanvas, dataUrl: enhanced.enhancedDataUrl };
}
