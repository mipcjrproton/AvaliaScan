import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OMR_SYSTEM_PROMPT = `Você é um motor especialista de Visão Computacional OCR / OMR (Reconhecimento Óptico de Marcas) de alta precisão para cartões-resposta de avaliações escolares e exames (padrão ENEM / Concursos / AvaliaScan).

SUA MISSÃO:
Examinar a imagem da folha de respostas capturada por câmera de celular ou escâner e extrair com fidelidade absoluta:
1. O Código da Avaliação ("codigo_avaliacao"): localizado no cabeçalho ou caixa superior (ex: "av_...").
2. O Nome do Aluno ("nome_aluno"): localizado no campo "NOME DO ALUNO" ou impresso na folha.
3. A alternativa marcada pelo aluno em CADA QUESTÃO da folha, examinando linha por linha sequencialmente da questão 01 até a última questão.

ESTRUTURA FÍSICA DA FOLHA DE RESPOSTAS:
• A área de respostas contém as questões numeradas ("01", "02", "03"...).
• FOLHA PADRÃO INDUSTRIAL (IMPORTANTE):
  No início de cada linha de questão, à esquerda do número da questão, existe uma pequena barra ou bloco preto retangular horizontal que é a PISTA DE SINCRONISMO OMR (TIMING TRACK) (ex: ■ 01 (A)(B)(C)(D)(E)).
  ATENÇÃO CRÍTICA: Esse bloco preto retangular ■ NÃO É RESPOSTA e NÃO É BOLHA! Ignore completamente essa barra preta de sincronismo!
• Cada linha de questão é composta por:
  [Barra preta de sincronismo opcional] [Número da Questão com 2 dígitos: 01, 02...] seguido estritamente de 5 bolhas circulares horizontais com as alternativas: (A) (B) (C) (D) (E).
• As questões estão organizadas em colunas sequenciais verticais:
  - Se houver até 25 questões: estão todas na Coluna 1 (01, 02, 03... até N).
  - Se houver mais de 25 questões: Coluna 1 contém as questões 01 a 25; Coluna 2 contém as questões 26 a 50; Coluna 3 contém 51 a 75, etc.
• Faça a leitura SEMPRE de cima para baixo na Coluna 1 primeiro (questão 01 até 25), e depois passe para o topo da Coluna 2 (questão 26 em diante). NUNCA faça leitura em zigue-zague lateral!

CRITÉRIOS ÓPTICOS RIGOROSOS DE IDENTIFICAÇÃO DE PREENCHIMENTO:
Para cada número de questão, examine atentamente as 5 bolhas circulares (A, B, C, D, E) correspondentes àquela linha:
1. BOLHA PREENCHIDA / MARCADA:
   - A bolha circular foi pintada, escurecida, preenchida, hachurada ou coberta com caneta preta/azul ou grafite.
   - OU o aluno fez um "X", cruz ou traço forte e evidente preenchendo a bolha circular.
   - IMPORTANTE: Compare visualmente as 5 bolhas circulares da mesma linha. A bolha marcada é aquela cujo interior está visivelmente escuro/preenchido em contraste com as outras bolhas claras.
   → Anote estritamente a letra correspondente ("A", "B", "C", "D" ou "E").

2. QUESTÃO EM BRANCO (SEM RESPOSTA / NULA):
   - Todas as 5 bolhas da linha estão com o interior claro/branco, sem nenhuma marcação feita pelo aluno.
   → Anote estritamente como "NULA".

3. DUPLA MARCAÇÃO OU RASURA:
   - O aluno marcou duas ou mais bolhas na mesma linha.
   - OU tentou rasurar/rabiscar para anular e marcou outra.
   → Anote estritamente como "DUPLA_MARCACAO".

REGRAS DE CHAVES E FORMATAÇÃO:
- As chaves de questões no objeto "respostas_aluno" devem ser estritamente números com 2 dígitos: "01", "02", "03", etc. NUNCA use prefixos como "Q1", "Q01" ou "Questão 1".
- Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto introdutório, sem explicações e sem blocos markdown fora do JSON.

FORMATO JSON DE SAÍDA:
{
  "codigo_avaliacao": "código se visível",
  "nome_aluno": "nome se legível",
  "total_questoes_detectadas": 25,
  "respostas_aluno": {
    "01": "A",
    "02": "B",
    "03": "NULA",
    "04": "C"
  }
}`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.8-flash',
    });
  });

  // Endpoint to get the OCR prompt specification
  app.get('/api/omr-prompt-spec', (req, res) => {
    res.json({
      prompt: OMR_SYSTEM_PROMPT,
      model: 'gemini-3.8-flash',
    });
  });

  // OMR Vision Scan endpoint
  app.post('/api/scan-sheet', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', expectedQuestionsCount } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          error: 'Nenhuma imagem fornecida. Envie uma imagem em base64.',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Chave GEMINI_API_KEY não configurada no ambiente do servidor.',
        });
      }

      // Clean base64 string
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let userPrompt = OMR_SYSTEM_PROMPT;
      if (expectedQuestionsCount && Number(expectedQuestionsCount) > 0) {
        userPrompt += `\n\nATENÇÃO OBRIGATÓRIA:
1. ORIENTAÇÃO DA IMAGEM: A foto pode ter sido tirada com celular na vertical, horizontal ou com leve rotação/perspectiva. Reoriente mentalmente a folha para ler o cabeçalho no topo e os números 01, 02... de cima para baixo.
2. CONTAGEM TOTAL: A folha de respostas contém exatamente ${expectedQuestionsCount} questões (do número 01 até o número ${String(expectedQuestionsCount).padStart(2, '0')}).
3. LEITURA COMPLETA: Você DEVE examinar e retornar rigorosamente TODAS as ${expectedQuestionsCount} questões, LINHA POR LINHA, da questão 01 até a questão ${String(expectedQuestionsCount).padStart(2, '0')}, no objeto "respostas_aluno". NUNCA omita nenhuma questão intermediária.
4. QUESTÕES EM BRANCO: Se uma questão estiver em branco (sem nenhuma bolha preenchida pelo aluno), anote obrigatoriamente como "NULA".`;
      }

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: userPrompt,
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ];

      const config: any = {
        responseMimeType: 'application/json',
        temperature: 0.0, // Strictly deterministic for OCR and visual extraction
      };

      // Candidate models for automatic fallback during high demand or capacity spikes
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
      ];

      let textResponse = '';
      let usedModel = '';

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });

          if (response.text) {
            textResponse = response.text;
            usedModel = model;
            console.log(`[Gemini OCR] Sucesso no processamento usando modelo: ${model}`);
            break;
          }
        } catch (err: any) {
          const errMsg = String(err?.message || err);
          const isHighDemandOrOverloaded =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('overloaded');

          console.warn(
            `[Gemini OCR] Modelo ${model} ${isHighDemandOrOverloaded ? 'ocupado (503/alta demanda)' : 'falhou'}:`,
            isHighDemandOrOverloaded ? 'Tentando alternativa...' : errMsg
          );

          if (!isHighDemandOrOverloaded) {
            // Not a transient load error (e.g. invalid payload), don't try other models
            break;
          }
        }
      }

      if (!textResponse) {
        console.warn('[Gemini OCR] Todos os modelos de IA estão temporariamente com alta demanda (503). Retornando resposta de contingência.');
        return res.status(503).json({
          success: false,
          isHighDemand: true,
          error: 'Os servidores de IA do Google estão momentaneamente com alta demanda (503). O processamento óptico local foi acionado.',
        });
      }
      
      let parsedData: any;
      try {
        parsedData = JSON.parse(textResponse);
      } catch (parseErr) {
        // If wrapped in markdown code fence or trailing artifacts
        const cleanJson = textResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        try {
          parsedData = JSON.parse(cleanJson);
        } catch {
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          } else {
            throw parseErr;
          }
        }
      }

      // Enforce strict pure numeric keys without 'Q' or 'Questão' prefix
      if (parsedData && parsedData.respostas_aluno && typeof parsedData.respostas_aluno === 'object') {
        const cleanAnswers: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsedData.respostas_aluno)) {
          const numericKey = k.replace(/^[Qq]uest[aã]o\s*/i, '').replace(/^[Qq]\s*/i, '').trim();
          cleanAnswers[numericKey] = String(v);
        }
        parsedData.respostas_aluno = cleanAnswers;
      }

      return res.json({
        success: true,
        data: parsedData,
        raw: textResponse,
        modelUsed: usedModel,
      });
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      const isHighDemand =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isHighDemand) {
        console.warn('[Gemini OCR] Demanda elevada nos servidores do Google (503). Retornando aviso.');
      } else {
        console.warn('[Gemini OCR] Aviso durante processamento:', errMsg);
      }

      const clientMessage = isHighDemand
        ? 'O modelo de IA está com alta demanda momentânea no Google. O sistema acionou o modo de contingência calibrada.'
        : error?.message || 'Erro ao processar visão computacional do cartão-resposta.';

      return res.status(isHighDemand ? 503 : 500).json({
        success: false,
        error: clientMessage,
        isHighDemand,
      });
    }
  });

  // AI Exam Generator Endpoint
  app.post('/api/generate-exam', async (req, res) => {
    try {
      const {
        assessmentTitle,
        subject,
        turmaName,
        totalQuestions = 10,
        difficulty = 'Médio',
        promptInfo = '',
        existingAnswerKey = [],
        alternativesCount = 5,
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'Chave GEMINI_API_KEY não configurada no servidor.',
        });
      }

      const qCount = Math.max(1, Math.min(50, Number(totalQuestions) || 10));
      const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, Math.max(2, Math.min(5, Number(alternativesCount) || 5)));

      let keyGuidance = '';
      if (Array.isArray(existingAnswerKey) && existingAnswerKey.length > 0) {
        const keyList = existingAnswerKey
          .slice(0, qCount)
          .map((k: any) => `Questão ${k.number}: Alternativa correta ${k.correctAlternative}`)
          .join(', ');
        keyGuidance = `\nATENÇÃO AO GABARITO PREVIAMENTE FIXADO:
O professor já cadastrou o gabarito oficial com as seguintes respostas:
${keyList}
Você DEVE obrigatoriamente fazer com que a alternativa correta de cada questão coincida com a letra indicada acima!`;
      }

      const systemPrompt = `Você é um professor experiente e elaborador sênior de avaliações educacionais (Ensino Fundamental, Médio e Pré-Vestibular/ENEM).
Sua missão é criar uma prova escolar completa, rica, contextualizada e rigorosamente coerente com os parâmetros informados.

DADOS DA AVALIAÇÃO:
• Título: ${assessmentTitle || 'Avaliação Escolar'}
• Disciplina / Matéria: ${subject || 'Geral'}
• Turma: ${turmaName || 'Turma Padrão'}
• Quantidade exata de questões: ${qCount} questões (do número 1 ao ${qCount})
• Nível de Dificuldade: ${difficulty} (Fácil = conceitos diretos e situações simples; Médio = contextualização e raciocínio prático; Difícil = análise crítica, problemas de múltiplas etapas e inferência)
• Alternativas por questão: ${letters.join(', ')}
• DIRETRIZES DA LINHA DE DIGITAÇÃO DO PROFESSOR (PRIORIDADE MÁXIMA):
${promptInfo ? `"${promptInfo}"` : 'Elaborar questões contextualizadas com a realidade do estudante, abrangendo os tópicos curriculares fundamentais.'}
${keyGuidance}

DIRETRIZES TÉCNICAS E PEDAGÓGICAS:
1. Gere RIGOROSAMENTE todas as ${qCount} questões numeradas de 1 a ${qCount}.
2. Cada questão DEVE conter:
   - "number": número inteiro (1, 2, ..., ${qCount}).
   - "statement": enunciado detalhado, com situação-problema, texto-base ou contexto prático instigante.
   - "options": lista das alternativas (${letters.join(', ')}). Cada uma com "letter" e "text" conciso e plausível.
   - "correctAlternative": exatamente uma das letras (${letters.join(', ')}).
   - "explanation": breve justificativa pedagógica do porquê a alternativa é a correta.
   - "topic": o conteúdo ou habilidade específica avaliada.
3. Não repita enunciados idênticos.
4. Responda ESTRITAMENTE em formato JSON com a propriedade "questions", sem texto antes ou depois.

EXEMPLO DE SAÍDA JSON:
{
  "questions": [
    {
      "number": 1,
      "statement": "Texto do enunciado...",
      "options": [
        { "letter": "A", "text": "Texto da alternativa A" },
        { "letter": "B", "text": "Texto da alternativa B" },
        { "letter": "C", "text": "Texto da alternativa C" },
        { "letter": "D", "text": "Texto da alternativa D" },
        { "letter": "E", "text": "Texto da alternativa E" }
      ],
      "correctAlternative": "A",
      "explanation": "Explicação da resposta...",
      "topic": "Nome do tópico"
    }
  ]
}`;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
      ];

      let generatedJsonText = '';
      let usedModel = '';

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });

          if (response.text) {
            generatedJsonText = response.text;
            usedModel = model;
            console.log(`[Gemini Exam Generator] Sucesso com modelo: ${model}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[Gemini Exam Generator] Modelo ${model} falhou:`, err?.message || err);
        }
      }

      if (!generatedJsonText) {
        return res.status(503).json({
          success: false,
          error: 'Serviço de IA temporariamente indisponível.',
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(generatedJsonText);
      } catch (parseErr) {
        const clean = generatedJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(clean);
      }

      const questionsList = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : []);

      return res.json({
        success: true,
        questions: questionsList,
        modelUsed: usedModel,
      });
    } catch (error: any) {
      console.error('[Gemini Exam Generator] Erro:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Erro ao gerar avaliação com IA.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AvaliaScan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
