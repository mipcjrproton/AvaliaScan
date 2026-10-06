import React from 'react';
import { X, Cpu, Eye, CheckCircle2, ShieldCheck, FileJson, Copy, Check } from 'lucide-react';
import { OMR_PROMPT_SYSTEM_RULES } from '../services/omrVisionService';

interface OmrRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawJsonResponse?: any;
}

export const OmrRulesModal: React.FC<OmrRulesModalProps> = ({
  isOpen,
  onClose,
  rawJsonResponse,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(OMR_PROMPT_SYSTEM_RULES);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <span>Sistema OMR 100% Eficiente • Leitura Direta da Grade de Questões</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Regras de Leitura Óptica OMR de Alta Eficiência
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Rules Card */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Eye className="w-4 h-4 text-indigo-700" />
              <span>Diretrizes Ativas de Leitura Visual OMR</span>
            </h4>
            <ul className="space-y-2 text-indigo-900 leading-relaxed list-disc list-inside">
              <li>
                <strong>1. Enquadramento e Marcas de Canto:</strong> As 4 marcas de enquadramento estão presentes exclusivamente na área da grade de bolhas/questões a serem escaneadas. O sistema localiza a grade e percorre sequencialmente questão por questão (01 até N).
              </li>
              <li>
                <strong>2. Identificação de Bolha Coberta:</strong> Para cada questão, identifica qual das letras em bolha (A, B, C, D ou E) foi preenchida e portanto coberta com caneta ou lápis.
              </li>
              <li>
                <strong>3. Checagem no Gabarito Oficial (Avaliação):</strong> Se uma letra estiver preenchida, checa a mesma questão no gabarito oficial da seção Avaliação:
                <div className="ml-5 mt-1 text-[11px] space-y-0.5">
                  <div>• <strong>Mesma letra:</strong> anota como resposta <strong>CORRETA</strong> (pontua no boletim).</div>
                  <div>• <strong>Outra letra:</strong> anota como resposta <strong>ERRADA</strong> (não pontua).</div>
                </div>
              </li>
              <li>
                <strong>4. Questão Nula (Sem Preenchimento):</strong> Se nenhuma bolha estiver preenchida, anota a questão estritamente como <strong>NULA</strong> e nem é necessário checar no gabarito da seção Avaliações até que a leitura seja alterada manualmente pelo professor.
              </li>
            </ul>
          </div>

          {/* Full System Prompt View */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Prompt de Sistema Enviado ao Gemini:
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Prompt'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-52 border border-slate-800">
              {OMR_PROMPT_SYSTEM_RULES}
            </pre>
          </div>

          {/* Last Raw JSON Response if available */}
          {rawJsonResponse && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-amber-600" />
                Última Resposta JSON Extraída da Folha:
              </span>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-44 border border-slate-800">
                {JSON.stringify(rawJsonResponse, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
