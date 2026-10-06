/**
 * OMR Image Processor Utility (src/utils/omrProcessor.ts)
 *
 * Implementa a lógica central de processamento de imagem utilizando OpenCV.js e Canvas:
 * - Conversão para Escala de Cinza (applyGrayscale / cv.cvtColor)
 * - Aumento de Contraste Óptico (applyContrast / Normalização dinâmica)
 * - Limiar Adaptativo (adaptiveThresholding / cv.adaptiveThreshold)
 * - Detecção de Contornos e Fiduciárias (findContours / cv.findContours)
 * - Correção de Perspectiva (warpPerspective / cv.warpPerspective)
 *
 * Suporta quadros de câmera (HTMLVideoElement), imagens (HTMLImageElement),
 * Canvas (HTMLCanvasElement), ImageData e URLs base64.
 */

import jsQR from 'jsqr';

export type ImageSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData | string;

export interface Point2D {
  x: number;
  y: number;
}

export interface FiducialCorners {
  tl: Point2D; // Top-Left
  tr: Point2D; // Top-Right
  br: Point2D; // Bottom-Right
  bl: Point2D; // Bottom-Left
  foundCount: number;
  confidence: number;
}

export interface AdaptiveThresholdOptions {
  blockSize?: number;
  c?: number;
  applyContrast?: boolean;
  contrastFactor?: number;
}

export interface OmrPreprocessOptions {
  applyGrayscale?: boolean;
  applyContrast?: boolean;
  applyAdaptiveThreshold?: boolean;
  contrastFactor?: number;
  adaptiveWindowRatio?: number;
  adaptiveSensitivity?: number;
}

export interface OmrRectificationResult {
  success: boolean;
  rectifiedCanvas: HTMLCanvasElement;
  rectifiedDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  rectifiedWidth: number;
  rectifiedHeight: number;
  corners: FiducialCorners;
  skewAngleDegrees: number;
  engineUsed: 'opencv' | 'canvas_adaptive' | 'jsqr_assisted';
  confidence: number;
  message: string;
  qrPayload?: string;
}

// Cache global da instância do OpenCV.js
let cachedCvInstance: any = null;
let isCvLoading = false;

/**
 * Obtém a instância do OpenCV.js caso já esteja carregada e pronta em memória,
 * de forma 100% não-bloqueante (retorno instantâneo em 0ms).
 * Se não estiver pronta, retorna null imediatamente sem pausar ou congelar o navegador.
 */
export async function getOpenCv(): Promise<any> {
  if (cachedCvInstance && cachedCvInstance.Mat) {
    return cachedCvInstance;
  }

  if (typeof window !== 'undefined' && (window as any).cv && (window as any).cv.Mat) {
    cachedCvInstance = (window as any).cv;
    return cachedCvInstance;
  }

  return null;
}

/**
 * Converte qualquer fonte de imagem (HTMLImageElement, HTMLVideoElement, HTMLCanvasElement, ImageData ou URL)
 * para um elemento HTMLCanvasElement utilizável pela API do OpenCV e Canvas 2D.
 */
export async function toCanvas(source: ImageSource): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) {
    return source;
  }

  if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.putImageData(source, 0, 0);
    return canvas;
  }

  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    const width = source.videoWidth || source.clientWidth || 1280;
    const height = source.videoHeight || source.clientHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve();
        source.onerror = () => reject(new Error('Falha ao carregar imagem HTML.'));
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(source, 0, 0);
    return canvas;
  }

  if (typeof source === 'string') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao decodificar imagem a partir de URL/Base64.'));
      img.src = source;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);
    return canvas;
  }

  throw new Error('Tipo de fonte de imagem incompatível com processamento OMR.');
}

/**
 * Converte cor RGB para luminância perceptiva ITU-R BT.601.
 */
export function getLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 1. Filtro de Escala de Cinza (Grayscale)
 * Aplica conversão para monocromático em Canvas ou cv.cvtColor.
 */
export function applyGrayscale(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const luma = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = luma;
    d[i + 1] = luma;
    d[i + 2] = luma;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * 2. Aumento e Normalização de Contraste Óptico
 * Realiza o estiramento de contraste percentil (5% a 95%) eliminando sombras e clarões.
 */
export function applyContrastEnhancement(
  sourceCanvas: HTMLCanvasElement,
  boostFactor: number = 1.35
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const sampleStep = Math.max(1, Math.floor((w * h) / 3000));
  const lumas: number[] = [];
  for (let i = 0; i < d.length; i += sampleStep * 4) {
    lumas.push(getLuma(d[i], d[i + 1], d[i + 2]));
  }
  lumas.sort((a, b) => a - b);

  const blackPoint = lumas[Math.floor(lumas.length * 0.05)] || 30;
  const whitePoint = lumas[Math.floor(lumas.length * 0.95)] || 225;
  const range = Math.max(30, whitePoint - blackPoint);
  const factor = (255 / range) * boostFactor;

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
 * 3. Limiar Adaptativo Integral Image (Canvas Bradley-Roth)
 */
export function applyAdaptiveThresholding(
  sourceCanvas: HTMLCanvasElement,
  windowRatio: number = 0.08,
  sensitivityT: number = 0.14
): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const gray = new Uint8Array(w * h);
  for (let i = 0, g = 0; i < d.length; i += 4, g++) {
    gray[g] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  }

  const integral = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const rowOffset = y * w;
    const prevRowOffset = (y - 1) * w;
    for (let x = 0; x < w; x++) {
      sum += gray[rowOffset + x];
      integral[rowOffset + x] = sum + (y > 0 ? integral[prevRowOffset + x] : 0);
    }
  }

  const s = Math.max(7, Math.round(w * windowRatio));
  const sHalf = Math.floor(s / 2);

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - sHalf);
    const y2 = Math.min(h - 1, y + sHalf);
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - sHalf);
      const x2 = Math.min(w - 1, x + sHalf);
      const count = (x2 - x1) * (y2 - y1);

      const sum =
        integral[y2 * w + x2] -
        integral[y1 * w + x2] -
        integral[y2 * w + x1] +
        integral[y1 * w + x1];

      const val = gray[rowOffset + x];
      const isBlack = val * count < sum * (1.0 - sensitivityT);

      const outIdx = (rowOffset + x) * 4;
      const binColor = isBlack ? 0 : 255;
      d[outIdx] = binColor;
      d[outIdx + 1] = binColor;
      d[outIdx + 2] = binColor;
      d[outIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Pipeline unificado de pré-processamento de imagem usando Canvas
 */
export function preprocessOmrImage(
  sourceCanvas: HTMLCanvasElement,
  options: OmrPreprocessOptions = {}
): HTMLCanvasElement {
  const {
    applyGrayscale: doGray = true,
    applyContrast: doContrast = true,
    applyAdaptiveThreshold: doThresh = false,
    contrastFactor = 1.35,
    adaptiveWindowRatio = 0.08,
    adaptiveSensitivity = 0.14,
  } = options;

  let canvas = sourceCanvas;

  if (doGray) {
    canvas = applyGrayscale(canvas);
  }

  if (doContrast) {
    canvas = applyContrastEnhancement(canvas, contrastFactor);
  }

  if (doThresh) {
    canvas = applyAdaptiveThresholding(canvas, adaptiveWindowRatio, adaptiveSensitivity);
  }

  return canvas;
}

/**
 * Função central 'adaptiveThresholding' solicitada:
 * Recebe elemento de imagem, frame da câmera ou canvas, aplica filtro de escala de cinza,
 * aumento de contraste e limiar adaptativo (cv.adaptiveThreshold ou fallback Bradley-Roth).
 */
export async function adaptiveThresholding(
  source: ImageSource,
  options: AdaptiveThresholdOptions = {}
): Promise<HTMLCanvasElement> {
  const srcCanvas = await toCanvas(source);
  const cv = await getOpenCv();

  // Aplica aumento de contraste antes do limiar adaptativo
  const contrastFactor = options.contrastFactor ?? 1.35;
  const contrastCanvas = options.applyContrast !== false
    ? applyContrastEnhancement(srcCanvas, contrastFactor)
    : srcCanvas;

  if (cv && cv.Mat) {
    let src: any = null;
    let gray: any = null;
    let blurred: any = null;
    let thresh: any = null;
    try {
      src = cv.imread(contrastCanvas);
      gray = new cv.Mat();
      blurred = new cv.Mat();
      thresh = new cv.Mat();

      // Escala de cinza
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Redução de ruído com GaussianBlur
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0);

      // cv.adaptiveThreshold
      const w = contrastCanvas.width;
      const bSize = options.blockSize || Math.max(11, Math.round(w * 0.02) | 1);
      const cConstant = options.c ?? 4;

      cv.adaptiveThreshold(
        blurred,
        thresh,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        bSize,
        cConstant
      );

      const outCanvas = document.createElement('canvas');
      outCanvas.width = srcCanvas.width;
      outCanvas.height = srcCanvas.height;
      cv.imshow(outCanvas, thresh);
      return outCanvas;
    } catch (err) {
      console.warn('[omrProcessor] Fallback em adaptiveThresholding:', err);
    } finally {
      if (src) src.delete();
      if (gray) gray.delete();
      if (blurred) blurred.delete();
      if (thresh) thresh.delete();
    }
  }

  // Fallback nativo
  const grayCanvas = applyGrayscale(contrastCanvas);
  return applyAdaptiveThresholding(grayCanvas, 0.08, 0.14);
}

/**
 * Função central 'findContours' solicitada:
 * Recebe elemento de imagem ou frame da câmera, executa pré-processamento (escala de cinza,
 * contraste, limiar adaptativo) e utiliza 'cv.findContours' para detectar contornos e isolar
 * as 4 marcas de enquadramento (fiduciárias) nos cantos da folha.
 */
export async function findContours(
  source: ImageSource
): Promise<{
  fiducials: FiducialCorners | null;
  candidateCount: number;
  preprocessedCanvas: HTMLCanvasElement;
}> {
  const srcCanvas = await toCanvas(source);
  const w = srcCanvas.width;
  const h = srcCanvas.height;

  // 1. Gera imagem binarizada com adaptiveThresholding
  const threshCanvas = await adaptiveThresholding(srcCanvas, { applyContrast: true });

  const cv = await getOpenCv();
  if (!cv || !cv.Mat) {
    // Análise de fiduciárias com varredura quadrante no Canvas
    const ctx = threshCanvas.getContext('2d');
    if (!ctx) return { fiducials: null, candidateCount: 0, preprocessedCanvas: threshCanvas };

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const marginX = Math.round(w * 0.28);
    const marginY = Math.round(h * 0.28);

    const findCorner = (sx: number, ex: number, sy: number, ey: number, tx: number, ty: number): Point2D | null => {
      let best: Point2D | null = null;
      let minD = Infinity;
      for (let y = sy; y < ey; y += 4) {
        for (let x = sx; x < ex; x += 4) {
          const idx = (y * w + x) * 4;
          // Se for pixel ativo da marca
          if (d[idx] > 128 || d[idx] === 0) {
            const dist = Math.hypot(x - tx, y - ty);
            if (dist < minD) {
              minD = dist;
              best = { x, y };
            }
          }
        }
      }
      return best;
    };

    const tl = findCorner(0, marginX, 0, marginY, 0, 0);
    const tr = findCorner(w - marginX, w, 0, marginY, w, 0);
    const br = findCorner(w - marginX, w, h - marginY, h, w, h);
    const bl = findCorner(0, marginX, h - marginY, h, 0, h);

    let count = 0;
    if (tl) count++;
    if (tr) count++;
    if (br) count++;
    if (bl) count++;

    if (count >= 3) {
      const fiducials: FiducialCorners = {
        tl: tl || { x: Math.round(w * 0.05), y: Math.round(h * 0.05) },
        tr: tr || { x: Math.round(w * 0.95), y: Math.round(h * 0.05) },
        br: br || { x: Math.round(w * 0.95), y: Math.round(h * 0.95) },
        bl: bl || { x: Math.round(w * 0.05), y: Math.round(h * 0.95) },
        foundCount: count,
        confidence: Math.round((count / 4) * 100),
      };
      return { fiducials, candidateCount: count, preprocessedCanvas: threshCanvas };
    }

    return { fiducials: null, candidateCount: count, preprocessedCanvas: threshCanvas };
  }

  let threshMat: any = null;
  let contoursVec: any = null;
  let hierarchyMat: any = null;

  try {
    threshMat = cv.imread(threshCanvas);
    const grayThresh = new cv.Mat();
    cv.cvtColor(threshMat, grayThresh, cv.COLOR_RGBA2GRAY);

    contoursVec = new cv.MatVector();
    hierarchyMat = new cv.Mat();
    // cv.findContours
    cv.findContours(grayThresh, contoursVec, hierarchyMat, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    grayThresh.delete();

    const minArea = (w * h) * 0.00008;
    const maxArea = (w * h) * 0.035;

    const candidates: Array<{ center: Point2D; score: number; rect: any }> = [];

    const maxInspect = Math.min(contoursVec.size(), 800);
    for (let i = 0; i < maxInspect; i++) {
      const cnt = contoursVec.get(i);
      try {
        const area = cv.contourArea(cnt);
        if (area < minArea || area > maxArea) {
          cnt.delete();
          continue;
        }

        const rect = cv.boundingRect(cnt);
        const aspect = rect.width / rect.height;
        if (aspect < 0.65 || aspect > 1.55) {
          cnt.delete();
          continue;
        }

        const rectArea = rect.width * rect.height;
        const solidity = area / rectArea;
        if (solidity < 0.58) {
          cnt.delete();
          continue;
        }

        candidates.push({
          center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
          score: solidity * 100 + (1 - Math.abs(1 - aspect)) * 50,
          rect,
        });
      } finally {
        try { cnt.delete(); } catch {}
      }
    }

    const halfW = w / 2;
    const halfH = h / 2;

    let bestTL: Point2D | null = null;
    let distTL = Infinity;
    let bestTR: Point2D | null = null;
    let distTR = Infinity;
    let bestBR: Point2D | null = null;
    let distBR = Infinity;
    let bestBL: Point2D | null = null;
    let distBL = Infinity;

    for (const cand of candidates) {
      const { x, y } = cand.center;
      if (x < halfW && y < halfH) {
        const d = Math.hypot(x, y);
        if (d < distTL) { distTL = d; bestTL = cand.center; }
      } else if (x >= halfW && y < halfH) {
        const d = Math.hypot(w - x, y);
        if (d < distTR) { distTR = d; bestTR = cand.center; }
      } else if (x >= halfW && y >= halfH) {
        const d = Math.hypot(w - x, h - y);
        if (d < distBR) { distBR = d; bestBR = cand.center; }
      } else {
        const d = Math.hypot(x, h - y);
        if (d < distBL) { distBL = d; bestBL = cand.center; }
      }
    }

    let foundCount = 0;
    if (bestTL) foundCount++;
    if (bestTR) foundCount++;
    if (bestBR) foundCount++;
    if (bestBL) foundCount++;

    if (foundCount >= 3) {
      if (!bestTL && bestTR && bestBR && bestBL) {
        bestTL = { x: bestTR.x + (bestBL.x - bestBR.x), y: bestTR.y + (bestBL.y - bestBR.y) };
      } else if (!bestTR && bestTL && bestBR && bestBL) {
        bestTR = { x: bestTL.x + (bestBR.x - bestBL.x), y: bestTL.y + (bestBR.y - bestBL.y) };
      } else if (!bestBR && bestTL && bestTR && bestBL) {
        bestBR = { x: bestTR.x + (bestBL.x - bestTL.x), y: bestTR.y + (bestBL.y - bestTL.y) };
      } else if (!bestBL && bestTL && bestTR && bestBR) {
        bestBL = { x: bestTL.x + (bestBR.x - bestTR.x), y: bestTL.y + (bestBR.y - bestTR.y) };
      }

      const fiducials: FiducialCorners = {
        tl: bestTL!,
        tr: bestTR!,
        br: bestBR!,
        bl: bestBL!,
        foundCount,
        confidence: Math.round((foundCount / 4) * 100),
      };

      return { fiducials, candidateCount: candidates.length, preprocessedCanvas: threshCanvas };
    }

    return { fiducials: null, candidateCount: candidates.length, preprocessedCanvas: threshCanvas };
  } catch (err) {
    console.warn('[omrProcessor] Erro em findContours:', err);
    return { fiducials: null, candidateCount: 0, preprocessedCanvas: threshCanvas };
  } finally {
    if (threshMat) threshMat.delete();
    if (contoursVec) contoursVec.delete();
    if (hierarchyMat) hierarchyMat.delete();
  }
}

/**
 * Função central 'warpPerspective' solicitada:
 * Realiza a transformação projetiva/retificação da folha de respostas com base nas 4 marcas fiduciárias.
 * Utiliza 'cv.getPerspectiveTransform' e 'cv.warpPerspective' do OpenCV.js com fallback homográfico Canvas DLT.
 */
export async function warpPerspective(
  source: ImageSource,
  corners?: FiducialCorners,
  targetWidth: number = 1000,
  targetHeight: number = 1414
): Promise<HTMLCanvasElement> {
  const srcCanvas = await toCanvas(source);

  // Se os cantos fiduciários não forem fornecidos, detecta via findContours
  let actualCorners = corners;
  if (!actualCorners) {
    const contourResult = await findContours(srcCanvas);
    if (contourResult.fiducials && contourResult.fiducials.foundCount >= 3) {
      actualCorners = contourResult.fiducials;
    }
  }

  // Se ainda não existirem cantos, usa margens padrão seguras
  if (!actualCorners) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    actualCorners = {
      tl: { x: Math.round(w * 0.04), y: Math.round(h * 0.04) },
      tr: { x: Math.round(w * 0.96), y: Math.round(h * 0.04) },
      br: { x: Math.round(w * 0.96), y: Math.round(h * 0.96) },
      bl: { x: Math.round(w * 0.04), y: Math.round(h * 0.96) },
      foundCount: 2,
      confidence: 60,
    };
  }

  // 1. Tenta Warp Perspective via OpenCV.js
  const cv = await getOpenCv();
  if (cv && cv.Mat) {
    let src: any = null;
    let dst: any = null;
    let srcCoords: any = null;
    let dstCoords: any = null;
    let M: any = null;
    try {
      src = cv.imread(srcCanvas);
      dst = new cv.Mat();

      srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
        actualCorners.tl.x, actualCorners.tl.y,
        actualCorners.tr.x, actualCorners.tr.y,
        actualCorners.br.x, actualCorners.br.y,
        actualCorners.bl.x, actualCorners.bl.y,
      ]);

      dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        targetWidth, 0,
        targetWidth, targetHeight,
        0, targetHeight,
      ]);

      M = cv.getPerspectiveTransform(srcCoords, dstCoords);
      const dsize = new cv.Size(targetWidth, targetHeight);
      cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));

      const rectifiedCanvas = document.createElement('canvas');
      rectifiedCanvas.width = targetWidth;
      rectifiedCanvas.height = targetHeight;
      cv.imshow(rectifiedCanvas, dst);
      return rectifiedCanvas;
    } catch (err) {
      console.warn('[omrProcessor] Erro em warpPerspective OpenCV:', err);
    } finally {
      if (src) src.delete();
      if (dst) dst.delete();
      if (srcCoords) srcCoords.delete();
      if (dstCoords) dstCoords.delete();
      if (M) M.delete();
    }
  }

  // 2. Fallback via Homografia DLT Canvas
  return warpPerspectiveCanvas(srcCanvas, actualCorners, targetWidth, targetHeight);
}

/**
 * Homografia pura em Canvas 2D (Algoritmo Direct Linear Transformation)
 * Fallback matemático robusto e instantâneo sem depender de WASM.
 */
export function warpPerspectiveCanvas(
  sourceCanvas: HTMLCanvasElement,
  corners: FiducialCorners,
  targetW: number = 1000,
  targetH: number = 1414
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const ctxSrc = sourceCanvas.getContext('2d');
  if (!ctxSrc) return sourceCanvas;

  const srcImageData = ctxSrc.getImageData(0, 0, srcW, srcH);
  const srcData = srcImageData.data;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctxDst = canvas.getContext('2d');
  if (!ctxDst) return canvas;

  const outImageData = ctxDst.createImageData(targetW, targetH);
  const outData = outImageData.data;

  const srcPts = [corners.tl, corners.tr, corners.br, corners.bl];
  const dstPts = [
    { x: 0, y: 0 },
    { x: targetW, y: 0 },
    { x: targetW, y: targetH },
    { x: 0, y: targetH },
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcPts[i].x;
    const sy = srcPts[i].y;
    const dx = dstPts[i].x;
    const dy = dstPts[i].y;

    A.push([dx, dy, 1, 0, 0, 0, -dx * sx, -dy * sx]);
    b.push(sx);

    A.push([0, 0, 0, dx, dy, 1, -dx * sy, -dy * sy]);
    b.push(sy);
  }

  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const tmpA = A[i]; A[i] = A[maxRow]; A[maxRow] = tmpA;
    const tmpB = b[i]; b[i] = b[maxRow]; b[maxRow] = tmpB;

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-9) continue;
    for (let j = i; j < n; j++) A[i][j] /= pivot;
    b[i] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j < n; j++) A[k][j] -= factor * A[i][j];
        b[k] -= factor * b[i];
      }
    }
  }

  const m00 = b[0], m01 = b[1], m02 = b[2];
  const m10 = b[3], m11 = b[4], m12 = b[5];
  const m20 = b[6], m21 = b[7], m22 = 1.0;

  for (let dy = 0; dy < targetH; dy++) {
    const rowOffset = dy * targetW * 4;
    for (let dx = 0; dx < targetW; dx++) {
      const wInv = 1.0 / (m20 * dx + m21 * dy + m22);
      const sx = (m00 * dx + m01 * dy + m02) * wInv;
      const sy = (m10 * dx + m11 * dy + m12) * wInv;
      const outIdx = rowOffset + dx * 4;

      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        outData[outIdx] = 255;
        outData[outIdx + 1] = 255;
        outData[outIdx + 2] = 255;
        outData[outIdx + 3] = 255;
        continue;
      }

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const p00 = (y0 * srcW + x0) * 4;
      const p10 = (y0 * srcW + (x0 + 1)) * 4;
      const p01 = ((y0 + 1) * srcW + x0) * 4;
      const p11 = ((y0 + 1) * srcW + (x0 + 1)) * 4;

      outData[outIdx] = Math.round(srcData[p00] * w00 + srcData[p10] * w10 + srcData[p01] * w01 + srcData[p11] * w11);
      outData[outIdx + 1] = Math.round(srcData[p00 + 1] * w00 + srcData[p10 + 1] * w10 + srcData[p01 + 1] * w01 + srcData[p11 + 1] * w11);
      outData[outIdx + 2] = Math.round(srcData[p00 + 2] * w00 + srcData[p10 + 2] * w10 + srcData[p01 + 2] * w01 + srcData[p11 + 2] * w11);
      outData[outIdx + 3] = 255;
    }
  }

  ctxDst.putImageData(outImageData, 0, 0);
  return canvas;
}

/**
 * Localiza marcas de enquadramento (fiduciárias) e contornos utilizando OpenCV.js
 */
export async function locateFiducialsWithOpenCv(
  sourceCanvas: HTMLCanvasElement
): Promise<{ corners: FiducialCorners; rectifiedCanvas?: HTMLCanvasElement } | null> {
  const result = await findContours(sourceCanvas);
  if (result.fiducials && result.fiducials.foundCount >= 3) {
    return { corners: result.fiducials };
  }
  return null;
}

/**
 * Warp perspective direto via OpenCV com fallback
 */
export async function warpPerspectiveWithOpenCv(
  sourceCanvas: HTMLCanvasElement,
  corners: FiducialCorners,
  targetW: number = 1000,
  targetH: number = 1414
): Promise<HTMLCanvasElement | null> {
  return warpPerspective(sourceCanvas, corners, targetW, targetH);
}

/**
 * Utilitário Principal de Correção e Retificação de Gabaritos OMR (rectifyOmrSheet)
 * Executa o fluxo completo: Grayscale -> Contraste -> Limiar Adaptativo -> Detecção de Fiduciárias
 * (findContours / jsQR) -> Warp Perspective antes da extração e leitura de bolhas.
 */
export async function rectifyOmrSheet(
  source: ImageSource,
  targetWidth: number = 1000,
  targetHeight: number = 1414
): Promise<OmrRectificationResult> {
  const srcCanvas = await toCanvas(source);
  const w = srcCanvas.width;
  const h = srcCanvas.height;

  // 1. Tenta leitura opcional de QR Code auxiliar com jsQR
  let qrPayload: string | undefined = undefined;
  try {
    const ctx = srcCanvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const qr = jsQR(imgData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (qr) {
        qrPayload = qr.data;
      }
    }
  } catch {
    // jsQR opcional
  }

  // 2. Detecção de contornos e marcas fiduciárias
  const contourResult = await findContours(srcCanvas);
  let corners = contourResult.fiducials;
  let engineUsed: 'opencv' | 'canvas_adaptive' | 'jsqr_assisted' = 'opencv';

  const cv = await getOpenCv();
  if (!cv || !cv.Mat) {
    engineUsed = qrPayload ? 'jsqr_assisted' : 'canvas_adaptive';
  }

  if (!corners) {
    corners = {
      tl: { x: Math.round(w * 0.04), y: Math.round(h * 0.04) },
      tr: { x: Math.round(w * 0.96), y: Math.round(h * 0.04) },
      br: { x: Math.round(w * 0.96), y: Math.round(h * 0.96) },
      bl: { x: Math.round(w * 0.04), y: Math.round(h * 0.96) },
      foundCount: 2,
      confidence: 60,
    };
  }

  // 3. Executa retificação geométrica (Warp Perspective)
  const rectifiedCanvas = await warpPerspective(srcCanvas, corners, targetWidth, targetHeight);

  const dx = corners.tr.x - corners.tl.x;
  const dy = corners.tr.y - corners.tl.y;
  const skewAngleDegrees = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  const rectifiedDataUrl = rectifiedCanvas.toDataURL('image/jpeg', 0.94);

  return {
    success: true,
    rectifiedCanvas,
    rectifiedDataUrl,
    originalWidth: w,
    originalHeight: h,
    rectifiedWidth: targetWidth,
    rectifiedHeight: targetHeight,
    corners,
    skewAngleDegrees,
    engineUsed,
    confidence: corners.confidence,
    message: `Retificação OMR concluída via ${engineUsed} (${corners.foundCount}/4 marcas detectadas).`,
    qrPayload,
  };
}
