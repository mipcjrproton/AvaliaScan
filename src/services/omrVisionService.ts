import { Assessment, Student, Alternative, StudentAnswer } from '../types';

export interface OmrApiResponse {
  codigo_avaliacao?: string;
  nome_aluno?: string;
  total_questoes_detectadas?: number;
  respostas_aluno: Record<string, string>;
}

export interface OmrProcessingResult {
  codigoAvaliacaoDetectado?: string;
  nomeAlunoDetectado?: string;
  matchedStudent?: Student;
  assessmentMatched?: boolean;
  totalQuestoesDetectadas: number;
  answers: StudentAnswer[];
  rawResponse?: OmrApiResponse;
  isAiProcessed: boolean;
}

export const OMR_PROMPT_SYSTEM_RULES = `Você é um sistema de Visão Computacional OCR de altíssima precisão, especializado na leitura óptica de cartões-resposta (OMR - Optical Mark Recognition).
Sua tarefa é fazer a varredura metódica da folha enquadrada na imagem, examinando LINHA POR LINHA (QUESTÃO POR QUESTÃO), DA PRIMEIRA QUESTÃO (01) ATÉ A ÚLTIMA QUESTÃO da avaliação, identificando visualmente qual bolha de alternativa foi efetivamente preenchida e coberta, sem inferir ou adivinhar.

DIRETRIZES DE VARREDURA LINHA A LINHA (QUESTÃO A QUESTÃO):
1. Varredura Sequencial Linha a Linha:
◦ Localize a área da grade de respostas na folha enquadrada.
◦ Ajuste mentalmente a orientação se a folha estiver inclinada, de lado ou rotacionada.
◦ Inicie na PRIMEIRA QUESTÃO (Questão 01) e percorra sequencialmente, LINHA A LINHA, questão por questão (01, 02, 03... até a ÚLTIMA QUESTÃO da avaliação).
◦ DISPOSIÇÃO EM COLUNAS: Se as questões estiverem dispostas em colunas sequenciais (ex: Coluna 1 da 01 à 25; Coluna 2 da 26 à 50), leia do topo à base da Coluna 1 e depois do topo à base da Coluna 2. NUNCA faça leitura em zigue-zague horizontal entre colunas.
◦ REGRA DE CHAVES: Cada questão recebe estritamente um NÚMERO com dois dígitos (ex: "01", "02", "03"...). NUNCA utilize prefixos "Q", "Q1", "Q01" ou "Questão".

2. Critério Óptico de Preenchimento da Bolha (Diferenciação Estrita):
◦ Cada linha/questão contém 5 bolhas com as alternativas ("A", "B", "C", "D", "E").
◦ DIFERENÇA ENTRE BOLHA VAZIA E BOLHA PREENCHIDA:
  - Bolha Vazia: possui apenas o contorno circular externo e o fundo claro/branco no interior, com a letra impressa legível no centro. O interior NÃO está escurecido.
  - Bolha Preenchida/Coberta: o interior do círculo foi pintado, escurecido ou coberto com caneta (preta ou azul) ou grafite, tornando seu interior substancialmente escuro em relação às outras bolhas da mesma linha.
◦ COMPARE AS 5 BOLHAS DA MESMA LINHA:
  - Se UMA bolha foi preenchida e coberta: anote a letra correspondente ("A", "B", "C", "D" ou "E").
  - Se NENHUMA bolha estiver preenchida (as 5 bolhas estão com interior claro/em branco): anote estritamente como "NULA".
  - Se DUAS ou mais bolhas estiverem preenchidas (dupla marcação, duas bolhas escuras ou rasura): anote obrigatoriamente como "DUPLA_MARCACAO".
◦ REGRA DE DUPLA MARCAÇÃO: Se duas bolhas forem pintadas ou preenchidas pelo aluno na mesma questão, NUNCA escolha uma delas; declare "DUPLA_MARCACAO" para que o sistema aponte a questão como INCORRETA/ERRADA.

3. Varredura Completa até a Última Questão:
◦ Repita este procedimento linha a linha, da questão 01 até a última questão sem pular nenhuma.
◦ Não invente respostas para bolhas em branco. Se não houver preenchimento, anote sempre "NULA".

INSTRUÇÕES DE SAÍDA (EXCLUSIVAMENTE JSON VÁLIDO):
{
  "codigo_avaliacao": "extrair o código se visível (ex: av_mu5ftvf9)",
  "nome_aluno": "extrair nome manuscrito se legível",
  "total_questoes_detectadas": <número_inteiro>,
  "respostas_aluno": {
    "01": "opcao_marcada",
    "02": "opcao_marcada",
    "03": "opcao_marcada"
  }
}
Lembrete: Para cada questão em respostas_aluno, o valor deve ser "A", "B", "C", "D", "E", "NULA" (se vazia) ou "DUPLA_MARCACAO" (se 2 ou mais bolhas estiverem preenchidas).`;

/**
 * Normalizes raw string response from OCR into Alternative | 'BLANK' | 'MULTIPLE'
 */
export function normalizeMarkedOption(raw: string | undefined): Alternative | 'BLANK' | 'MULTIPLE' {
  if (!raw) return 'BLANK';
  const clean = raw.trim().toUpperCase();

  if (clean === 'A' || clean === 'B' || clean === 'C' || clean === 'D' || clean === 'E') {
    return clean as Alternative;
  }

  // Double marking / 2 or more filled bubbles detected
  if (
    clean.includes('DUPLA') ||
    clean.includes('MARCACAO') ||
    clean.includes('MARCAÇÃO') ||
    clean.includes('RASURA') ||
    clean.includes('MULTIPLE') ||
    clean.includes('DUAS') ||
    clean.includes('INCORRETA')
  ) {
    return 'MULTIPLE';
  }

  // Check if multiple alternative letters are listed (e.g. "A, B", "A B", "A/B", "AB", "B e C")
  const lettersFound = clean.match(/[A-E]/g);
  if (lettersFound && lettersFound.length > 1) {
    return 'MULTIPLE';
  }

  if (
    clean.includes('NULA') ||
    clean.includes('ANULADA') ||
    clean.includes('SEM_RESPOSTA') ||
    clean.includes('BRANCO') ||
    clean.includes('NONE') ||
    clean.includes('VAZIO') ||
    clean === '-' ||
    clean === ''
  ) {
    return 'BLANK';
  }

  // If a single letter was matched (e.g. "Opção A", "(C)", "Letra D")
  if (lettersFound && lettersFound.length === 1) {
    return lettersFound[0] as Alternative;
  }

  // Extract first letter if returned like "Opção A" or "(B)"
  const letterMatch = clean.match(/\b([A-E])\b/);
  if (letterMatch) {
    return letterMatch[1] as Alternative;
  }

  return 'BLANK';
}

/**
 * Calls server-side Gemini OCR Vision API with the prompt and image.
 */
export async function sendImageToOmrVisionApi(
  imageBase64: string,
  expectedQuestionsCount?: number
): Promise<OmrApiResponse> {
  const response = await fetch('/api/scan-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: 'image/jpeg',
      expectedQuestionsCount,
    }),
  });

  if (!response.ok) {
    let errorMsg = `Falha na requisição OCR (${response.status})`;
    let isHighDemand = response.status === 503;
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
      if (errorJson.isHighDemand) isHighDemand = true;
    } catch {
      // ignore
    }
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.isHighDemand = isHighDemand;
    throw err;
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Não foi possível extrair os dados do cartão-resposta.');
  }

  return json.data as OmrApiResponse;
}

/**
 * Matches extracted student name with the enrolled student list.
 */
function findBestStudentMatch(detectedName: string | undefined, students: Student[]): Student | undefined {
  if (!detectedName || !detectedName.trim()) return undefined;
  const cleanDetected = detectedName.toLowerCase().trim();

  // 1. Exact match
  const exact = students.find((s) => s.name.toLowerCase().trim() === cleanDetected);
  if (exact) return exact;

  // 2. Partial match (starts with or includes)
  const partial = students.find((s) => {
    const sName = s.name.toLowerCase().trim();
    return sName.includes(cleanDetected) || cleanDetected.includes(sName);
  });
  if (partial) return partial;

  // 3. First name + last name token match
  const detectedTokens = cleanDetected.split(/\s+/).filter((t) => t.length > 2);
  if (detectedTokens.length > 0) {
    const tokenMatch = students.find((s) => {
      const sName = s.name.toLowerCase();
      return detectedTokens.every((token) => sName.includes(token));
    });
    if (tokenMatch) return tokenMatch;
  }

  return undefined;
}

/**
 * Transforms the raw OCR API output into structured StudentAnswer[] compared with the official key,
 * applying rigid criteria:
 * - Each question has a number (compared with the question number in the stored assessment)
 * - Each question has a letter bubble filled (compared with the official correct letter in the stored assessment)
 * - If the filled letter is the same as the stored key: mark as CORRETA
 * - If the filled letter is different from the stored key: mark as ERRADA
 * - If no bubble is filled: mark as NULA
 * - Question identification must NEVER be annotated with "Q", only the pure question number
 */
export function processOmrDetection(
  raw: OmrApiResponse,
  assessment: Assessment,
  turmaStudents: Student[]
): OmrProcessingResult {
  const originalAnswersMap = raw.respostas_aluno || {};

  // Rigid rule: strip any accidental "Q" or "Questão" prefix so keys are strictly pure question numbers
  const answersMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(originalAnswersMap)) {
    const cleanNum = k.replace(/^[Qq]uest[aã]o\s*/i, '').replace(/^[Qq]\s*/i, '').trim();
    answersMap[cleanNum] = v;
  }

  const matchedStudent = findBestStudentMatch(raw.nome_aluno, turmaStudents);

  const assessmentMatched =
    raw.codigo_avaliacao && assessment.id
      ? raw.codigo_avaliacao.toLowerCase().includes(assessment.id.toLowerCase()) ||
        assessment.id.toLowerCase().includes(raw.codigo_avaliacao.toLowerCase())
      : undefined;

  const answers: StudentAnswer[] = assessment.answerKey.map((q) => {
    const qNum = q.number;
    const keyPadded = String(qNum).padStart(2, '0');
    const keySimple = String(qNum);
    const rawVal =
      answersMap[keyPadded] ??
      answersMap[keySimple] ??
      originalAnswersMap[`Q${keyPadded}`] ??
      originalAnswersMap[`Q${keySimple}`];
    const marked = normalizeMarkedOption(rawVal);
    const official = (q.correctAlternative || '').trim().toUpperCase();

    // Critérios estritos de avaliação solicitados:
    // 1. Se nenhuma bolha estiver preenchida: anotar a questão como NULA e nem é necessário
    //    checar no gabarito da seção avaliações até que seja alterada manualmente a leitura.
    // 2. Se uma letra em bolha foi preenchida e coberta: checar a mesma questão no gabarito oficial
    //    na seção avaliação:
    //    ◦ Se for a mesma letra: anotar como resposta CORRETA
    //    ◦ Se for outra letra: anotar como resposta ERRADA
    let status: 'CORRETA' | 'ERRADA' | 'NULA';
    let isCorrect = false;
    let checkedAgainstKey = false;

    const cleanMarked = marked.trim().toUpperCase();

    if (marked === 'BLANK') {
      status = 'NULA';
      isCorrect = false;
      checkedAgainstKey = false; // Não necessita checar gabarito enquanto for nula
    } else if (marked === 'MULTIPLE') {
      status = 'ERRADA';
      isCorrect = false;
      checkedAgainstKey = true;
    } else if (cleanMarked === official) {
      status = 'CORRETA';
      isCorrect = true;
      checkedAgainstKey = true;
    } else {
      status = 'ERRADA';
      isCorrect = false;
      checkedAgainstKey = true;
    }

    // Confidence estimation
    let confidence = 95;
    if (marked === 'BLANK') confidence = 98;
    else if (marked === 'MULTIPLE') confidence = 85;

    return {
      questionNumber: q.number,
      markedAlternative: marked,
      isCorrect,
      status,
      confidence,
      checkedAgainstKey,
    };
  });

  // Rebuild sanitized rawResponse with pure numeric keys (never "Q")
  const sanitizedRaw: OmrApiResponse = {
    ...raw,
    respostas_aluno: answersMap,
  };

  return {
    codigoAvaliacaoDetectado: raw.codigo_avaliacao,
    nomeAlunoDetectado: raw.nome_aluno,
    matchedStudent,
    assessmentMatched,
    totalQuestoesDetectadas: raw.total_questoes_detectadas || Object.keys(answersMap).length,
    answers,
    rawResponse: sanitizedRaw,
    isAiProcessed: true,
  };
}
