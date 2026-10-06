import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  QrCode, 
  Sparkles, 
  Smartphone, 
  Send,
  ShieldCheck
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [phoneRecipient, setPhoneRecipient] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'qrcode' | 'whatsapp'>('link');

  if (!isOpen) return null;

  // URL funcional de compartilhamento público do aplicativo
  const primaryShareUrl = 'https://ais-pre-wofi4dbetbf6n36zq5uht4-352276329851.us-west2.run.app';
  const shareUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : primaryShareUrl;

  const defaultShareMessage = `👋 Olá! Estou compartilhando com você o *AvaliaScan*, aplicativo de correção automática de provas e gabaritos escolares pelo celular e computador.\n\n✨ Principais recursos:\n• Gere folhas de respostas padrão A4 em PDF com o logotipo da escola\n• Correção instantânea pela câmera do celular (OMR óptico de alta precisão)\n• Quantidade de questões de digitação livre (de 1 a 100)\n• Opções por questão configuráveis (de 2 a 5 alternativas)\n• Relatórios pedagógicos de notas, médias e ranking de alunos\n\nAcesse agora pelo link: ${shareUrl}`;

  const copyText = async (text: string, type: 'link' | 'message') => {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // fallback
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = phoneRecipient.replace(/\D/g, '');
    const encoded = encodeURIComponent(defaultShareMessage);
    let target = '';

    if (cleanPhone.length >= 10) {
      const full = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      target = `https://api.whatsapp.com/send?phone=${full}&text=${encoded}`;
    } else {
      target = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    const a = document.createElement('a');
    a.href = target;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'AvaliaScan - Correção Automática de Provas',
          text: defaultShareMessage,
          url: shareUrl,
        });
      } catch {
        // Ignora se o usuário cancelou o compartilhamento nativo
      }
    } else {
      copyText(shareUrl, 'link');
    }
  };

  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shareUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 transition-all">
        
        {/* Header com gradiente sutil */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Compartilhar o AvaliaScan</h2>
              <p className="text-xs text-emerald-100/90">
                Link oficial e funcional para celular e computador
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegação do modal */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'link'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Link Direto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'qrcode'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 space-y-5">

          {/* TAB 1: Link Direto */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link Oficial do Site para Compartilhamento
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
                    {shareUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(shareUrl, 'link')}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                  <span>Abrir em Nova Aba</span>
                </a>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-[0.98]"
                  >
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Compartilhar no Celular</span>
                  </button>
                )}
              </div>

              {/* Card explicativo com dicas */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Acesso Seguro e Imediato</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-emerald-800">
                  Qualquer professor, coordenador ou gestor com este link poderá acessar o sistema, gerar folhas de gabarito e escanear respostas diretamente pela câmera do celular ou notebook.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Compartilhar no WhatsApp */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Número de WhatsApp (Opcional - com DDD)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phoneRecipient}
                    onChange={(e) => setPhoneRecipient(e.target.value)}
                    placeholder="Ex: 11 99999-8888 (ou deixe vazio para escolher o contato)"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs shrink-0 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Se você não preencher o número, o WhatsApp abrirá diretamente para você selecionar qualquer amigo ou grupo.
                </p>
              </div>

              {/* Prévia da Mensagem */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prévia da Mensagem Formatada
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(defaultShareMessage, 'message')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMessage ? 'Copiada!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-700 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {defaultShareMessage}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code para Celular */}
          {activeTab === 'qrcode' && (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-3xl shadow-md inline-block">
                <img
                  src={qrCodeApiUrl}
                  alt="QR Code do AvaliaScan"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl object-contain"
                  loading="lazy"
                />
              </div>

              <div className="max-w-sm space-y-1">
                <p className="text-xs font-bold text-slate-900">
                  Aponte a câmera do seu smartphone
                </p>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  Escaneie este código para abrir o AvaliaScan instantaneamente no navegador do seu celular sem precisar digitar o endereço.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyText(shareUrl, 'link')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do QR'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé com botão de fechar */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AvaliaScan • Link funcional de compartilhamento</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
