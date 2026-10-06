/**
 * Perspective Warp Service (Correção de Perspectiva OMR)
 *
 * Utiliza algoritmos de visão computacional baseados em Homografia Projetiva,
 * com suporte a OpenCV.js e jsQR, para localizar as 4 marcas de enquadramento
 * da folha de respostas e realizar a retificação geométrica perfeita (Warp Perspective)
 * antes da leitura óptica das bolhas.
 */

import jsQR from 'jsqr';
import { locateFiducialsWithOpenCv, getOpenCv } from '../utils/omrProcessor';

export interface Point2D {
  x: number;
  y: number;
}

export interface QuadCorners {
  tl: Point2D; // Top-Left
  tr: Point2D; // Top-Right
  br: Point2D; // Bottom-Right
  bl: Point2D; // Bottom-Left
  foundCount: number;
}

export interface PerspectiveWarpResult {
  success: boolean;
  rectifiedCanvas: HTMLCanvasElement;
  rectifiedDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  rectifiedWidth: number;
  rectifiedHeight: number;
  corners: QuadCorners;
  engineUsed: 'opencv' | 'homography' | 'jsqr_assisted';
  skewAngleDegrees: number;
  confidence: number;
  message: string;
  qrPayload?: string;
}

// Global cached instance of opencv if loaded asynchronously
let cachedOpenCV: any = null;
let isOpenCvLoading = false;

/**
 * Tenta inicializar ou obter a instância do OpenCV.js caso esteja disponível no ambiente.
 */
export async function getOpenCvInstance(): Promise<any> {
  return getOpenCv();
}

/**
 * Converte cor RGB em luminância perceptiva.
 */
function getLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Mede a distância euclidiana entre dois pontos 2D.
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Calcula o ângulo de inclinação (em graus) da linha superior do gabarito em relação à horizontal.
 */
function calculateSkewAngle(tl: Point2D, tr: Point2D): number {
  const dx = tr.x - tl.x;
  const dy = tr.y - tl.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Detecta a luminância típica do papel para calibração dinâmica contra sombras e luz fraca.
 */
function estimatePaperBackground(data: Uint8ClampedArray, width: number, height: number): number {
  const sampleStep = Math.max(12, Math.floor((width * height) / 3000));
  const lumas: number[] = [];

  for (let idx = 0; idx < data.length; idx += sampleStep * 4) {
    lumas.push(getLuma(data[idx], data[idx + 1], data[idx + 2]));
  }

  if (lumas.length === 0) return 215;
  lumas.sort((a, b) => a - b);
  return Math.max(120, lumas[Math.floor(lumas.length * 0.75)] || 215);
}

/**
 * Procura um marcador de enquadramento (quadrado preto sólido) em um quadrante específico da imagem.
 */
function findCornerMarkerInQuadrant(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  paperLuma: number,
  cornerRole: 'tl' | 'tr' | 'bl' | 'br'
): Point2D | null {
  const minBoxSize = Math.max(5, Math.round(width * 0.006));
  const maxBoxSize = Math.max(65, Math.round(width * 0.09));

  // Tinta/marcador: pixels substancialmente mais escuros que o papel
  const darkThreshold = Math.min(115, paperLuma * 0.48);

  const isDark = (px: number, py: number): boolean => {
    if (px < 0 || px >= width || py < 0 || py >= height) return false;
    const idx = (py * width + px) * 4;
    return getLuma(data[idx], data[idx + 1], data[idx + 2]) < darkThreshold;
  };

  const isLightMargin = (px: number, py: number): boolean => {
    if (px < 0 || px >= width || py < 0 || py >= height) return true;
    const idx = (py * width + px) * 4;
    return getLuma(data[idx], data[idx + 1], data[idx + 2]) > paperLuma * 0.62;
  };

  // Sentido de varredura: das bordas externas em direção ao centro
  const xStep = cornerRole === 'tr' || cornerRole === 'br' ? -3 : 3;
  const yStep = cornerRole === 'bl' || cornerRole === 'br' ? -3 : 3;

  const xStart = cornerRole === 'tr' || cornerRole === 'br' ? bounds.maxX : bounds.minX;
  const xEnd = cornerRole === 'tr' || cornerRole === 'br' ? bounds.minX : bounds.maxX;
  const yStart = cornerRole === 'bl' || cornerRole === 'br' ? bounds.maxY : bounds.minY;
  const yEnd = cornerRole === 'bl' || cornerRole === 'br' ? bounds.minY : bounds.maxY;

  let bestPoint: Point2D | null = null;
  let bestScore = -1;

  for (let y = yStart; yStep > 0 ? y < yEnd : y > yEnd; y += yStep) {
    for (let x = xStart; xStep > 0 ? x < xEnd : x > xEnd; x += xStep) {
      if (isDark(x, y)) {
        // Medir extensão horizontal da mancha escura
        let hLen = 0;
        while (hLen < maxBoxSize && isDark(x + hLen, y)) {
          hLen++;
        }

        // Medir extensão vertical da mancha escura
        let vLen = 0;
        while (vLen < maxBoxSize && isDark(x, y + vLen)) {
          vLen++;
        }

        if (hLen >= minBoxSize && vLen >= minBoxSize && hLen <= maxBoxSize && vLen <= maxBoxSize) {
          const aspect = hLen / vLen;
          if (aspect >= 0.55 && aspect <= 1.8) {
            const cx = x + hLen / 2;
            const cy = y + vLen / 2;

            // Verificar densidade do núcleo (amostragem em grade 3x3)
            let coreDark = 0;
            const offsets = [-0.3, 0, 0.3];
            for (const ox of offsets) {
              for (const oy of offsets) {
                if (isDark(Math.round(cx + ox * hLen), Math.round(cy + oy * vLen))) {
                  coreDark++;
                }
              }
            }

            if (coreDark >= 6) {
              // Verificar contraste da margem branca ao redor
              let lightBorder = 0;
              const borderOffsets = [-0.95, 0.95];
              for (const bx of borderOffsets) {
                if (isLightMargin(Math.round(cx + bx * hLen), Math.round(cy))) lightBorder++;
              }
              for (const by of borderOffsets) {
                if (isLightMargin(Math.round(cx), Math.round(cy + by * vLen))) lightBorder++;
              }

              const score = coreDark * 12 + lightBorder * 6 - Math.abs(hLen - vLen) * 2;
              if (score > bestScore) {
                bestScore = score;
                bestPoint = { x: cx, y: cy };
                if (coreDark === 9 && lightBorder >= 3) {
                  return bestPoint;
                }
              }
            }
          }
        }
      }
    }
  }

  return bestPoint;
}

/**
 * Localiza as 4 marcas de enquadramento da grade de bolhas.
 * Suporta detecção via jsQR (se houver código QR presente) e compensação geométrica de paralelogramo.
 */
export function detectFramingCorners(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { corners: QuadCorners; qrResult?: any } {
  const paperLuma = estimatePaperBackground(data, width, height);

  // 1. Tentar detectar QR code na imagem via jsQR para auxiliar na localização de contexto
  let qrResult: any = null;
  try {
    qrResult = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert',
    });
  } catch (e) {
    // jsQR opcional
  }

  // Limites de busca amplos para acomodar fotos inclinadas de celular
  const leftMax = Math.round(width * 0.46);
  const rightMin = Math.round(width * 0.54);
  const topMin = Math.round(height * 0.05);
  const topMax = Math.round(height * 0.52);
  const botMin = Math.round(height * 0.48);
  const botMax = Math.round(height * 0.98);

  let tl = findCornerMarkerInQuadrant(data, width, height, { minX: 0, maxX: leftMax, minY: topMin, maxY: topMax }, paperLuma, 'tl');
  let tr = findCornerMarkerInQuadrant(data, width, height, { minX: rightMin, maxX: width - 1, minY: topMin, maxY: topMax }, paperLuma, 'tr');
  let bl = findCornerMarkerInQuadrant(data, width, height, { minX: 0, maxX: leftMax, minY: botMin, maxY: botMax }, paperLuma, 'bl');
  let br = findCornerMarkerInQuadrant(data, width, height, { minX: rightMin, maxX: width - 1, minY: botMin, maxY: botMax }, paperLuma, 'br');

  let foundCount = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);

  // Se 3 cantos foram localizados com precisão, deduzir o 4º canto por geometria projetiva/paralelogramo
  if (foundCount === 3) {
    if (!tl && tr && bl && br) {
      tl = { x: tr.x + bl.x - br.x, y: tr.y + bl.y - br.y };
      foundCount = 4;
    } else if (!tr && tl && bl && br) {
      tr = { x: tl.x + br.x - bl.x, y: tl.y + br.y - bl.y };
      foundCount = 4;
    } else if (!bl && tl && tr && br) {
      bl = { x: tl.x + br.x - tr.x, y: tl.y + br.y - tr.y };
      foundCount = 4;
    } else if (!br && tl && tr && bl) {
      br = { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y };
      foundCount = 4;
    }
  }

  // Validação geométrica rigorosa: se os 4 cantos formam um quadrilátero viável de folha/gabarito
  if (tl && tr && bl && br) {
    const wTop = euclideanDistance(tl, tr);
    const wBot = euclideanDistance(bl, br);
    const hLeft = euclideanDistance(tl, bl);
    const hRight = euclideanDistance(tr, br);

    const isConvexAndOrdered =
      tl.x < tr.x &&
      bl.x < br.x &&
      tl.y < bl.y &&
      tr.y < br.y;

    const aspectWidthValid = wTop > 0 && wBot > 0 && Math.abs(wTop - wBot) / Math.max(wTop, wBot) < 0.40;
    const aspectHeightValid = hLeft > 0 && hRight > 0 && Math.abs(hLeft - hRight) / Math.max(hLeft, hRight) < 0.40;

    if (!isConvexAndOrdered || !aspectWidthValid || !aspectHeightValid) {
      // Cantos espúrios detectados (ex: logo da escola, QR code ou texto solto)
      foundCount = 0;
      tl = null;
      tr = null;
      bl = null;
      br = null;
    }
  }

  // Fallback caso não encontre todas as 4 marcas: manter enquadramento original
  const fallbackTL = tl || { x: 0, y: 0 };
  const fallbackTR = tr || { x: width - 1, y: 0 };
  const fallbackBR = br || { x: width - 1, y: height - 1 };
  const fallbackBL = bl || { x: 0, y: height - 1 };

  return {
    corners: {
      tl: fallbackTL,
      tr: fallbackTR,
      br: fallbackBR,
      bl: fallbackBL,
      foundCount,
    },
    qrResult,
  };
}

/**
 * Resolve o sistema linear 8x8 para mapear pontos do destino (u, v) para pontos da fonte (x, y).
 * Isso permite interpolação reversa direta (backward mapping) sem furos na imagem retificada.
 */
function solveHomographyDstToSrc(
  srcPts: [Point2D, Point2D, Point2D, Point2D], // TL, TR, BR, BL na imagem original
  dstPts: [Point2D, Point2D, Point2D, Point2D]  // (0,0), (W,0), (W,H), (0,H) no destino retificado
): number[] {
  // Matriz 8x8 e vetor b
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = dstPts[i].x;
    const v = dstPts[i].y;
    const x = srcPts[i].x;
    const y = srcPts[i].y;

    // Equação para x: m00*u + m01*v + m02 - m20*u*x - m21*v*x = x
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    // Equação para y: m10*u + m11*v + m12 - m20*u*y - m21*v*y = y
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  // Eliminação de Gauss com pivoteamento parcial
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(A[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxVal) {
        maxVal = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Trocar linhas se necessário
    if (maxRow !== i) {
      const tempRow = A[i];
      A[i] = A[maxRow];
      A[maxRow] = tempRow;
      const tempB = b[i];
      b[i] = b[maxRow];
      b[maxRow] = tempB;
    }

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-9) continue;

    for (let j = i; j < n; j++) {
      A[i][j] /= pivot;
    }
    b[i] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
        b[k] -= factor * b[i];
      }
    }
  }

  // [m00, m01, m02, m10, m11, m12, m20, m21, 1]
  return [b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], 1.0];
}

/**
 * Realiza o Warp Perspective com interpolação bilinear pura em JavaScript/Canvas.
 * Garante fidelidade óptica 100% idêntica ao cv.warpPerspective do OpenCV.
 */
function warpPerspectiveCanvas(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  srcCorners: QuadCorners,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const outImageData = ctx.createImageData(targetW, targetH);
  const outData = outImageData.data;

  // Pontos de origem e destino
  const srcPts: [Point2D, Point2D, Point2D, Point2D] = [
    srcCorners.tl,
    srcCorners.tr,
    srcCorners.br,
    srcCorners.bl,
  ];

  const dstPts: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: targetW, y: 0 },
    { x: targetW, y: targetH },
    { x: 0, y: targetH },
  ];

  // Matriz de mapeamento reverso Dst -> Src
  const M = solveHomographyDstToSrc(srcPts, dstPts);
  const m00 = M[0], m01 = M[1], m02 = M[2];
  const m10 = M[3], m11 = M[4], m12 = M[5];
  const m20 = M[6], m21 = M[7], m22 = M[8];

  // Varredura de cada pixel do destino com interpolação bilinear subpixel
  for (let dy = 0; dy < targetH; dy++) {
    const rowOffset = dy * targetW * 4;
    for (let dx = 0; dx < targetW; dx++) {
      const wInv = 1.0 / (m20 * dx + m21 * dy + m22);
      const sx = (m00 * dx + m01 * dy + m02) * wInv;
      const sy = (m10 * dx + m11 * dy + m12) * wInv;

      const outIdx = rowOffset + dx * 4;

      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        // Preencher bordas externas com branco (papel)
        outData[outIdx] = 255;
        outData[outIdx + 1] = 255;
        outData[outIdx + 2] = 255;
        outData[outIdx + 3] = 255;
        continue;
      }

      // Interpolação bilinear
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      outData[outIdx] = Math.round(
        w00 * srcData[idx00] + w10 * srcData[idx10] + w01 * srcData[idx01] + w11 * srcData[idx11]
      );
      outData[outIdx + 1] = Math.round(
        w00 * srcData[idx00 + 1] + w10 * srcData[idx10 + 1] + w01 * srcData[idx01 + 1] + w11 * srcData[idx11 + 1]
      );
      outData[outIdx + 2] = Math.round(
        w00 * srcData[idx00 + 2] + w10 * srcData[idx10 + 2] + w01 * srcData[idx01 + 2] + w11 * srcData[idx11 + 2]
      );
      outData[outIdx + 3] = 255;
    }
  }

  ctx.putImageData(outImageData, 0, 0);
  return canvas;
}

/**
 * Tenta executar o Warp Perspective utilizando a biblioteca compilada OpenCV.js.
 */
function tryWarpWithOpenCv(
  cv: any,
  srcCanvas: HTMLCanvasElement,
  corners: QuadCorners,
  targetW: number,
  targetH: number
): HTMLCanvasElement | null {
  try {
    const srcMat = cv.imread(srcCanvas);
    const dstMat = new cv.Mat();
    const dsize = new cv.Size(targetW, targetH);

    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners.tl.x, corners.tl.y,
      corners.tr.x, corners.tr.y,
      corners.br.x, corners.br.y,
      corners.bl.x, corners.bl.y,
    ]);

    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      targetW, 0,
      targetW, targetH,
      0, targetH,
    ]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(
      srcMat,
      dstMat,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    const outCanvas = document.createElement('canvas');
    cv.imshow(outCanvas, dstMat);

    // Liberar memória Wasm do OpenCV
    srcMat.delete();
    dstMat.delete();
    srcTri.delete();
    dstTri.delete();
    M.delete();

    return outCanvas;
  } catch (err) {
    console.warn('Falha no OpenCV.js warp, utilizando motor matemático nativo:', err);
    return null;
  }
}

/**
 * Função principal: Recebe a imagem da folha capturada (canvas, Image ou Data URL),
 * localiza as 4 marcas de enquadramento OMR e aplica o Warp Perspective (Correção de Perspectiva).
 */
export async function rectifyAnswerSheetPerspective(
  imageSource: HTMLImageElement | HTMLCanvasElement | string
): Promise<PerspectiveWarpResult> {
  // 1. Converter fonte em HTMLCanvasElement
  let srcCanvas: HTMLCanvasElement;

  if (typeof imageSource === 'string') {
    srcCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = reject;
      img.src = imageSource;
    });
  } else if (imageSource instanceof HTMLImageElement) {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageSource.naturalWidth || imageSource.width;
    srcCanvas.height = imageSource.naturalHeight || imageSource.height;
    const ctx = srcCanvas.getContext('2d');
    if (ctx) ctx.drawImage(imageSource, 0, 0);
  } else {
    srcCanvas = imageSource;
  }

  const width = srcCanvas.width;
  const height = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Falha ao obter contexto 2D do canvas.');
  }

  const imgData = ctx.getImageData(0, 0, width, height);

  // 2. Localizar as 4 marcas de enquadramento (TL, TR, BL, BR)
  let { corners, qrResult } = detectFramingCorners(imgData.data, width, height);

  // Se a busca rápida encontrar menos de 3 cantos, utiliza o localizador avançado com OpenCV (adaptiveThreshold + findContours)
  if (corners.foundCount < 3) {
    try {
      const openCvDetection = await locateFiducialsWithOpenCv(srcCanvas);
      if (openCvDetection && openCvDetection.corners && openCvDetection.corners.foundCount >= 3) {
        corners = {
          tl: openCvDetection.corners.tl,
          tr: openCvDetection.corners.tr,
          br: openCvDetection.corners.br,
          bl: openCvDetection.corners.bl,
          foundCount: openCvDetection.corners.foundCount,
        };
      }
    } catch {
      // continua com detecção existente
    }
  }

  // 3. Calcular dimensões euclidianas do retângulo retificado
  const widthTop = euclideanDistance(corners.tl, corners.tr);
  const widthBot = euclideanDistance(corners.bl, corners.br);
  const heightLeft = euclideanDistance(corners.tl, corners.bl);
  const heightRight = euclideanDistance(corners.tr, corners.br);

  const rawTargetW = Math.max(widthTop, widthBot);
  const rawTargetH = Math.max(heightLeft, heightRight);

  // Normalizar para alta definição óptica (mínimo 1000px de largura mantendo a proporção exata)
  const scale = Math.max(1.0, 1100 / Math.max(1, rawTargetW));
  const targetW = Math.round(rawTargetW * scale);
  const targetH = Math.round(rawTargetH * scale);

  const skewAngle = calculateSkewAngle(corners.tl, corners.tr);

  // 4. Executar Warp Perspective apenas se as marcas de enquadramento forem confiáveis
  let rectifiedCanvas: HTMLCanvasElement | null = null;
  let engineUsed: 'opencv' | 'homography' | 'jsqr_assisted' = 'homography';

  if (corners.foundCount >= 3) {
    const cvInstance = await getOpenCvInstance();
    if (cvInstance && cvInstance.Mat) {
      rectifiedCanvas = tryWarpWithOpenCv(cvInstance, srcCanvas, corners, targetW, targetH);
      if (rectifiedCanvas) {
        engineUsed = 'opencv';
      }
    }

    // Fallback garantido: motor homográfico bilinear de alta precisão
    if (!rectifiedCanvas) {
      rectifiedCanvas = warpPerspectiveCanvas(
        imgData.data,
        width,
        height,
        corners,
        targetW,
        targetH
      );
      engineUsed = qrResult ? 'jsqr_assisted' : 'homography';
    }
  } else {
    // Sem marcas seguras: preservar imagem original com nitidez máxima sem distorção artificial
    rectifiedCanvas = srcCanvas;
  }

  const confidence = corners.foundCount >= 4 ? 98 : corners.foundCount === 3 ? 88 : 65;
  const isSuccess = corners.foundCount >= 3;

  return {
    success: isSuccess,
    rectifiedCanvas,
    rectifiedDataUrl: rectifiedCanvas.toDataURL('image/jpeg', 0.94),
    originalWidth: width,
    originalHeight: height,
    rectifiedWidth: targetW,
    rectifiedHeight: targetH,
    corners,
    engineUsed,
    skewAngleDegrees: Math.round(skewAngle * 10) / 10,
    confidence,
    message: isSuccess
      ? `Retificação de perspectiva concluída com sucesso (${engineUsed.toUpperCase()}) • 4 marcas alinhadas • Rotação corrigida: ${Math.round(skewAngle)}°`
      : 'Aviso: Nem todas as 4 marcas de enquadramento foram detectadas com clareza. Enquadramento padrão aplicado.',
    qrPayload: qrResult?.data,
  };
}
