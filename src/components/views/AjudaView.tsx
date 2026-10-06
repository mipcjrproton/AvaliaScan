import React, { useState } from 'react';
import { 
  HelpCircle, 
  Smartphone, 
  Sun, 
  CheckCircle2, 
  Printer, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  QrCode,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Users,
  FileText,
  ScanLine,
  BarChart3,
  Search,
  Settings,
  Database,
  Send,
  Download,
  AlertCircle,
  ClipboardCheck,
  SlidersHorizontal,
  Layers,
  Focus,
  ShieldCheck,
  FolderArchive,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { Assessment } from '../../types';
import { storageService } from '../../services/storage';

interface AjudaViewProps {
  onOpenPrintModal: (assessment: Assessment) => void;
  assessments: Assessment[];
  onNavigateTab: (tab: any) => void;
}

export const AjudaView: React.FC<AjudaViewProps> = ({
  onOpenPrintModal,
  assessments,
  onNavigateTab,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [backupDownloadedToast, setBackupDownloadedToast] = useState<string | null>(null);

  const handleDownloadBackupNow = () => {
    try {
      const filename = storageService.downloadBackupFile();
      setBackupDownloadedToast(filename);
      setTimeout(() => setBackupDownloadedToast(null), 4000);
    } catch {
      setBackupDownloadedToast('Backup gerado com sucesso!');
      setTimeout(() => setBackupDownloadedToast(null), 4000);
    }
  };

  // Determinar a URL de compartilhamento do app
  const primaryShareUrl = 'https://ais-pre-wofi4dbetbf6n36zq5uht4-352276329851.us-west2.run.app';
  const shareUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : primaryShareUrl;

  const defaultShareMessage = `👋 Olá! Estou compartilhando com você o *AvaliaScan*, aplicativo de correção automática de provas e gabaritos escolares pelo celular e computador.\n\n✨ Principais recursos:\n• Gere folhas de respostas padrão A4 em PDF com o logotipo da escola\n• Correção instantânea pela câmera (OMR óptico de alta precisão)\n• Quantidade de questões de digitação livre (de 1 a 100)\n• Opções por questão configuráveis (de 2 a 5 alternativas: A-B, A-C, A-D, A-E)\n• Elaborador inteligente de provas com IA e habilidades da BNCC\n• Relatórios pedagógicos de notas, médias e ranking de alunos\n\nAcesse agora: ${shareUrl}`;

  const copyWithFallback = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    await copyWithFallback(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = async () => {
    await copyWithFallback(defaultShareMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleShareWhatsapp = () => {
    const cleanNumber = whatsappPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(defaultShareMessage);
    let targetUrl = '';

    if (cleanNumber.length >= 10) {
      // Se digitou número com DDD (ex: 11999998888 ou com 55)
      const fullPhone = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
      targetUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
    } else {
      // Abre o WhatsApp para escolher qualquer contato da lista
      targetUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    const anchor = document.createElement('a');
    anchor.href = targetUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Módulos do Sistema Completos e Revisados
  const featureModules = [
    {
      title: '1. Turmas & Alunos',
      tabKey: 'turmas',
      icon: Users,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      items: [
        'Cadastro, alteração e exclusão de salas de aula (ano letivo, turno matutino/vespertino/noturno e componente curricular).',
        'Ordenação automática e inteligente por número de chamada (1, 2, 3... 10) para facilitar conferência e chamada.',
        'Controle de alunos com número de chamada/matrícula e status Ativo ou Inativo.',
        'Importação inteligente em lote via arquivos Excel (.xlsx, .xls), CSV ou texto colado da lista de presença.',
        'Prevenção contra duplicidade de identificação e sincronização automática com avaliações, boletins e histórico de correção.'
      ]
    },
    {
      title: '2. Avaliações & Gabaritos (Opções de 2 a 5)',
      tabKey: 'avaliacoes',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      items: [
        'Digitação livre da quantidade de questões: digite livremente de 1 a 100 com controles -/+ e atalhos rápidos (5, 10, 15, 20, 25, 30, 50).',
        'Opções / Bolhas por Questão Configuráveis: selecione de 2 a 5 alternativas [2 (A-B para Verdadeiro/Falso), 3 (A-C), 4 (A-D) e 5 (A-E formato clássico)].',
        'Construtor de gabarito oficial dinâmico com preenchimento em lote (Todas A, B, C, D ou E) e preenchimento sequencial (A-E).',
        'Ajuste automático inteligente: ao modificar o número de opções, o gabarito e as folhas de respostas ajustam as alternativas permitidas.',
        'Identificador contínuo de versão no alto do painel principal (Versão 01.01.xx) para auditoria, controle e conformidade pedagógica.'
      ]
    },
    {
      title: '3. Elaborador de Provas com IA & BNCC (Módulo Gerar)',
      tabKey: 'gerar',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      items: [
        'Geração contextualizada de cadernos de prova completos utilizando Inteligência Artificial (Google Gemini) integrada à disciplina e turma.',
        'Suporte a Habilidades Curriculares da BNCC: sugestão rápida pré-formatada ("Contemple as seguintes Habilidades: EF05LP01, e EF35LP05, com formatação adequada.").',
        'Níveis de dificuldade pedagógica: Fácil, Médio e Difícil, com vocabulário e situações-problema adequados à faixa etária.',
        'Paginação Inteligente A4 (Continuidade sem Cortes): quando uma questão não couber inteira no espaço restante da página, ela inicia automaticamente no topo da próxima página (break-inside: avoid), evitando quebras indesejadas.',
        'Diagramação A4 em Coluna Única & Fonte Ampliada: opções de escala de texto (Normal, Grande e Extra Grande) para máxima legibilidade fotocopiada.',
        'Edição ao vivo: personalize e reescreva enunciados e alternativas diretamente na tela antes de imprimir.',
        'Modo "Única para Xerox" com folha separada de Gabarito Oficial sob confirmação vs. "Completa com todos os alunos ativos".'
      ]
    },
    {
      title: '4. Folha de Respostas OMR (Impressão & PDF A4)',
      tabKey: 'avaliacoes',
      icon: Printer,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      items: [
        'Geração e download do cartão de respostas em PDF de alta definição no padrão internacional A4.',
        'Marcadores ópticos nos 4 cantos para calibração de perspectiva e enquadramento imediato.',
        'Inclusão do logotipo oficial da escola no canto superior esquerdo do cabeçalho.',
        'Campos de identificação e data com dia, mês e ano em branco (___ / ___ / ______) para preenchimento manual no dia da aplicação.',
        'Grade de bolhas industriais compatível com o número configurado de alternativas (de 2 a 5 bolhas por questão).'
      ]
    },
    {
      title: '5. Scanner de Provas & Leitor Óptico (Correções)',
      tabKey: 'correcoes',
      icon: ScanLine,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      items: [
        'Opções Sugeridas pelo Sistema: Resolução 720p HD, Nitidez Padrão, Retículo Limpo, Motor Gemini e Congelamento Desligado (vídeo sempre contínuo em tempo real).',
        'Botão "Aplicar Opções Sugeridas": calibra instantaneamente todas as 5 opções do leitor para desempenho ótimo.',
        '4 Filtros de Nitidez Industrial: Padrão (equilibrado), Máxima (filtro passa-alta para luz fraca), Bordas (filtro Sobel para traços finos) e Desativado.',
        '4 Estilos de Retículo/Mira: Limpo (visão desobstruída), Industrial (cantos e retículo central), Técnico (eixos X/Y e nível) e Básico (mira simples).',
        'Três Motores de Reconhecimento: Gemini Vision (Neural IA), Híbrido e Motor Local no navegador (offline).',
        'Modo de Escaneamento Automático ao Detectar Folha vs Acionamento Manual com botão no visor.',
        'Fluxo Ágil de Correção: botão "Gravar e Avançar para o Próximo Aluno Ativo", salvando a nota e limpando a leitura anterior para a próxima prova.',
        'Detecção de marcas de caneta azul ou preta, rasuras, marcações duplas (nulas) e questões em branco.'
      ]
    },
    {
      title: '6. Boletim Escolar & Espelho da Prova',
      tabKey: 'boletim',
      icon: ClipboardCheck,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      items: [
        'Painel tabular de acompanhamento das notas de cada estudante em tempo real.',
        'Indicadores de status de correção (Corrigida com nota ou Pendente de escaneamento).',
        'Espelho Óptico da Prova: detalhamento questão por questão com status (Correta, Errada, Nula ou Rasurada).',
        'Atalho direto para a câmera para escanear a folha de qualquer aluno que ainda não realizou a prova.'
      ]
    },
    {
      title: '7. Relatórios & Estatísticas de Desempenho',
      tabKey: 'relatorios',
      icon: BarChart3,
      color: 'bg-violet-50 text-violet-700 border-violet-200',
      items: [
        'Média geral da turma, percentual de acertos, taxa de aprovação e distribuição de notas.',
        'Ranking de desempenho dos alunos da maior para a menor nota.',
        'Mapa de calor e índice de acertos por questão para diagnóstico de habilidades que necessitam de reforço pedagógico.',
        'Exportação das notas e resultados para planilhas em formato Excel e CSV.'
      ]
    },
    {
      title: '8. Consultas & Auditoria de Respostas',
      tabKey: 'consultas',
      icon: Search,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      items: [
        'Localização rápida de correções por aluno, matrícula, turma ou título da prova.',
        'Visualização do espelho óptico digitalizado para conferência em caso de revisões de nota solicitadas por alunos.',
        'Edição e recálculo transparente da pontuação final com histórico de alterações.'
      ]
    },
    {
      title: '9. Configurações da Escola, Autenticação & Versionamento',
      tabKey: 'configuracoes',
      icon: Settings,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      items: [
        'Upload do logotipo oficial da escola (PNG, JPG, SVG, WEBP) com exibição automática nas folhas de prova.',
        'Personalização institucional do nome da escola e dados do professor.',
        'Autenticação sem senhas via Biometria / Impressão Digital (Touch ID, Windows Hello, biometria sob a tela via WebAuthn), Conta Google ou E-mail.',
        'Calibração de sensibilidade de leitura das bolhas (Baixa, Média, Alta) e bip sonoro de confirmação.'
      ]
    },
    {
      title: '10. Compartilhamento do Aplicativo & Acesso Mobile',
      tabKey: 'ajuda',
      icon: Share2,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      items: [
        'Link Oficial Funcional: endereço público oficial do aplicativo para acesso imediato no computador ou celular.',
        'QR Code Dinâmico: basta apontar a câmera do smartphone para abrir o app diretamente no navegador móvel.',
        'Compartilhamento via WhatsApp com mensagem convite formatada ou número digitado com DDD.',
        'Botões dedicados de compartilhamento na barra superior (Navbar), na barra lateral e no leitor de provas.'
      ]
    },
    {
      title: '11. Backup Automático & Segurança dos Dados Locais (JSON)',
      tabKey: 'configuracoes',
      icon: Database,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      items: [
        'Função de Backup Automático dos Dados Locais (JSON) para download no próprio computador ou celular.',
        'Três opções de periodicidade: Ao concluir correções de provas (Recomendado), Diariamente ou Semanalmente.',
        'Download Imediato com 1 clique do backup completo a qualquer momento (nas Configurações, na Manutenção ou nesta Central de Ajuda).',
        'Restauração Segura com prévia dos dados: recupere turmas, alunos e notas em qualquer computador ou smartphone sem perdas.',
        'Privacidade Total: dados 100% locais no dispositivo, em formato JSON padronizado e aberto, sem dependência de nuvem externa.'
      ]
    }
  ];

  const scanTips = [
    {
      step: '01',
      title: 'Iluminação Uniforme',
      desc: 'Evite sombras fortes da sua própria mão ou do celular sobre o cartão. Iluminação natural ou luz de teto suave garante precisão máxima.',
      icon: Sun,
      pastelColor: 'bg-amber-100 text-amber-800',
    },
    {
      step: '02',
      title: 'Enquadramento dos 4 Cantos',
      desc: 'Mantenha a câmera paralela à mesa (em ângulo de 90°). Os 4 marcadores quadrados pretos dos cantos devem estar visíveis no visor.',
      icon: Smartphone,
      pastelColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      step: '03',
      title: 'Preenchimento Completo',
      desc: 'Oriente os estudantes a preencherem o círculo totalmente com caneta esferográfica preta ou azul escura, evitando traços finos.',
      icon: CheckCircle2,
      pastelColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      step: '04',
      title: 'Correção Instantânea',
      desc: 'O sistema reconhece as respostas em frações de segundo, calcula a nota automaticamente e salva no histórico com um bip de confirmação.',
      icon: Sparkles,
      pastelColor: 'bg-teal-100 text-teal-800',
    },
  ];

  const faqs = [
    {
      q: 'Como usar o elaborador de provas inteligente com IA e habilidades da BNCC na aba Gerar?',
      a: 'Acesse a aba "Gerar", selecione a avaliação e a turma desejada e clique em "Gerar Caderno com IA". Você pode utilizar as sugestões rápidas clicáveis (incluindo o exemplo: "Contemple as seguintes Habilidades: EF05LP01, e EF35LP05, com formatação adequada.") e escolher entre os níveis Fácil, Médio ou Difícil. O sistema cria os enunciados e alternativas sincronizados com o gabarito oficial da prova.',
    },
    {
      q: 'Como funciona a quebra de página automática no caderno de prova A4?',
      a: 'O sistema utiliza um algoritmo de diagramação inteligente com a regra "break-inside: avoid": quando uma questão não couber inteira no espaço restante da página A4, ela é iniciada automaticamente no topo da próxima página. Isso garante que nenhum enunciado ou alternativa seja partido ou cortado ao meio entre páginas.',
    },
    {
      q: 'Como configurar questões com 2, 3, 4 ou 5 opções / bolhas por questão?',
      a: 'Ao criar ou editar uma avaliação na aba "Avaliações", utilize o seletor "Opções / Bolhas por Questão". Você pode escolher entre 2 (A-B para Verdadeiro/Falso ou diagnóstica), 3 (A-C), 4 (A-D para vestibulares e ENEM) e 5 (A-E formato clássico). As bolhas da folha de respostas OMR e o construtor de gabarito se adaptam instantaneamente.',
    },
    {
      q: 'Quais são as opções sugeridas no scanner e por que usá-las?',
      a: 'A configuração sugerida no leitor é: Resolução 720p HD (foco rápido e sem sobrecarregar a memória do celular), Nitidez Padrão (filtro equilibrado de contornos), Retículo Limpo (mira limpa para enquadramento fácil), Motor Gemini (visão neural de alta acurácia) e Congelamento Desligado (vídeo sempre ao vivo, evitando congelamentos indesejados). No leitor, clique em "Aplicar Opções Sugeridas" para ativar esse perfil com 1 toque.',
    },
    {
      q: 'Como funciona o fluxo ágil de gravação e avanço no scanner?',
      a: 'Após apontar a câmera e validar o cartão-resposta, clique no botão "Gravar e Avançar para o Próximo Aluno Ativo". O sistema salva a nota no boletim, avança automaticamente o seletor para o próximo aluno da lista e limpa a leitura anterior para você escanear a próxima prova sem precisar tocar na tela.',
    },
    {
      q: 'O que é o Boletim Escolar e como consultar o espelho da prova?',
      a: 'Na aba "Boletim", você visualiza a relação completa dos estudantes com suas notas e status de correção. Clicando sobre um aluno corrigido, você tem acesso ao espelho da prova com o status individual de cada questão (Correta, Errada, Nula por estar em branco ou Rasurada por dupla marcação).',
    },
    {
      q: 'Como compartilhar o link funcional do site com outros professores ou abrir no celular?',
      a: 'Clique no botão "Compartilhar" presente no topo da tela (Navbar), na barra lateral, na tela inicial ou nesta página de ajuda. Uma janela se abrirá com o link funcional oficial (https://ais-pre-wofi4dbetbf6n36zq5uht4-352276329851.us-west2.run.app), atalho direto para o WhatsApp e um QR Code pronto para ser escaneado pela câmera de qualquer celular.',
    },
    {
      q: 'Como colocar o logotipo da minha escola no gabarito e nas provas?',
      a: 'Acesse a aba "Configurações", vá na seção "Logotipo da Instituição" e faça o upload da imagem da sua escola (PNG, JPG ou SVG). O logotipo aparecerá automaticamente no canto superior esquerdo do cabeçalho das folhas de gabarito A4, nos cadernos de prova e nos downloads em PDF.',
    },
    {
      q: 'A folha de respostas vem com a data em branco?',
      a: 'Sim! Por padrão pedagógico, a data é gerada como "___ / ___ / ______" em branco para que os estudantes ou aplicadores possam preenchê-la manualmente com caneta no dia exato de realização da prova.',
    },
    {
      q: 'Como funciona o login por digital ou biometria?',
      a: 'O sistema utiliza o padrão seguro WebAuthn/Passkeys. Ao clicar em "Digital / Biometria", o navegador solicita a confirmação pela digital cadastrada no seu aparelho (Touch ID no iPhone/Mac, leitor sob a tela no Android ou Windows Hello no notebook), sem necessidade de decorar senhas.',
    },
    {
      q: 'O que significa o indicador de versão no topo do painel principal de avaliações?',
      a: 'O indicador (ex: Versão 01.01.44) no topo da tela de Avaliações registra o controle contínuo de versão do sistema. Cada alteração realizada (criação de avaliação, ajuste de gabarito ou atualização da plataforma) incrementa o contador para assegurar total rastreabilidade pedagógica e conformidade institucional.',
    },
    {
      q: 'Como funciona o backup automático dos dados locais em formato JSON?',
      a: 'O sistema inclui uma rotina de segurança que empacota todas as suas turmas, alunos, avaliações, gabaritos oficiais, correções e notas em um arquivo padronizado .json. Na aba Configurações, você pode manter ativado o backup automático (recomendado ao concluir correções de provas, diariamente ou semanalmente) ou baixar cópias manuais a qualquer instante com 1 clique.',
    },
    {
      q: 'Como restaurar minhas turmas e provas em outro computador ou celular?',
      a: 'Basta acessar a aba "Configurações" ou "Manutenção", clicar em "Restaurar Backup (JSON)" e selecionar o arquivo .json baixado anteriormente. O sistema valida o conteúdo, exibe a contagem de turmas, alunos e provas encontradas e restaura todos os dados instantaneamente sem sobrescrever o que não for necessário.',
    },
    {
      q: 'Meus dados e notas dos estudantes são salvos na nuvem ou em servidores externos?',
      a: 'Não! Todo o armazenamento é estritamente local (no navegador do seu próprio aparelho). Isso assegura privacidade absoluta, conformidade com a LGPD escolar e autonomia total: ninguém além de você tem acesso aos dados dos seus estudantes.',
    },
    {
      q: 'Como ajustar o tamanho da fonte (Normal, Grande ou Extra Grande) no caderno de provas?',
      a: 'Na aba "Gerar", você encontra o seletor "Tamanho da Fonte da Prova". O modo Grande ou Extra Grande amplia a tipografia dos enunciados e das alternativas, facilitando a leitura de crianças, alunos com baixa visão ou garantindo nitidez impecável mesmo após fotocópias sucessivas (xerox).',
    },
    {
      q: 'O que é a modalidade "Única para Xerox" com folha separada de Gabarito Oficial?',
      a: 'Ao clicar em "Imprimir Caderno de Prova" no elaborador, você pode escolher "Única para Xerox". O sistema gera 1 única via do caderno para reprodução em copiadora escolar e anexa, mediante sua confirmação, uma folha destacada com o Gabarito Oficial com todas as respostas e resoluções para orientação do professor.',
    },
    {
      q: 'Como funciona a ordenação automática por número de chamada dos alunos?',
      a: 'A lista de estudantes é ordenada numericamente de forma inteligente (1, 2, 3... 10... 20) com base no número de chamada ou matrícula. Mesmo ao importar via Excel ou CSV com números desordenados, o sistema reorganiza a lista na ordem oficial da chamada escolar.',
    },
    {
      q: 'O que acontece se eu desligar o congelamento sob nitidez ideal no leitor?',
      a: 'Com o congelamento desligado (opção sugerida), a câmera transmite vídeo contínuo em tempo real sem travamentos. Você aponta para o cartão-resposta, o sistema valida as bolhas e, com o botão "Gravar e Avançar", você registra a nota e já parte imediatamente para a próxima prova com extrema fluidez.',
    },
  ];

  // URL para imagem do QR Code
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Central de Ajuda & Guia Completo</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <span>Manual do AvaliaScan</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              by MIPCJR®
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Consulte o guia detalhado de cada módulo, aprenda boas práticas para leitura óptica dos gabaritos e compartilhe o aplicativo com outros professores.
          </p>
        </div>

        {assessments[0] && (
          <button
            type="button"
            onClick={() => onOpenPrintModal(assessments[0])}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Ver Folha de Gabarito A4</span>
          </button>
        )}
      </div>

      {/* Banner / Card Interativo de Backup dos Dados Locais (JSON) */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 md:p-7 rounded-3xl shadow-lg border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Medida de Segurança Adicional</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Cópia de Segurança dos Seus Dados (JSON)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Baixe um arquivo compacto .json contendo todas as suas turmas ({storageService.getTurmas().length}), alunos ({storageService.getStudents().length}), gabaritos ({storageService.getAssessments().length}) e notas ({storageService.getCorrections().length}). Salve no seu computador, pendrive ou pasta na nuvem.
          </p>
          {backupDownloadedToast && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 pt-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{backupDownloadedToast.includes('.json') ? `Arquivo baixado: ${backupDownloadedToast}` : backupDownloadedToast}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBackupNow}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Backup Completo (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('configuracoes')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span>Configurar Rotina</span>
          </button>
        </div>
      </div>

      {/* Dicas Rápidas para Escaneamento Perfeito */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
          Recomendações para Leitura Óptica Precisa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scanTips.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 font-mono">
                    PASSO {item.step}
                  </span>
                  <div className={`p-2 rounded-xl ${item.pastelColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grade com Todas as Funcionalidades do Sistema */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Todas as Funcionalidades do Sistema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão completa de cada módulo e seus recursos disponíveis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureModules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${mod.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {mod.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTab(mod.tabKey)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Acessar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-600 pl-1">
                    {mod.items.map((itemText, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold leading-none mt-1">•</span>
                        <span className="leading-snug">{itemText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chamada para Modelo de Folha A4 */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50 rounded-2xl border border-teal-200/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-teal-700" />
            <span>Precisa da Folha de Gabarito em Branco para Imprimir ou Salvar em PDF?</span>
          </h3>
          <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
            Gere o cartão oficial padrão A4 com o logotipo da sua escola no topo esquerdo, marcadores ópticos de enquadramento e data em branco para preenchimento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('avaliacoes')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all shrink-0 active:scale-95"
        >
          <span>Ir para Avaliações</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Perguntas Frequentes (FAQ) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Perguntas Frequentes (FAQ)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {faqs.map((faq, index) => (
            <div key={index} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-start gap-1.5">
                <span className="text-indigo-600 font-bold">P:</span>
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-600 pl-4 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO AO FINAL: COMPARTILHAMENTO COM QR CODE E WHATSAPP */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-500/20 space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhe o Aplicativo</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Indique o AvaliaScan para outros Professores e Escolas
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Aponte a câmera do celular para o QR Code abaixo para abrir o app ou compartilhe diretamente com uma pessoa escolhida pelo WhatsApp.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Coluna do QR Code */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
            <div className="bg-white p-3 rounded-2xl shadow-lg inline-block">
              <img
                src={qrCodeImageUrl}
                alt="QR Code do AvaliaScan"
                className="w-48 h-48 md:w-52 md:h-52 object-contain rounded-lg"
                loading="lazy"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Escanear pelo Celular</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Abra a câmera do celular e aponte para acessar instantaneamente
              </p>
            </div>
          </div>

          {/* Coluna do WhatsApp e Link */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Bloco de Envio via WhatsApp com pessoa escolhida */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-white">
                  Compartilhar no WhatsApp com Pessoa Escolhida
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Digite o telefone da pessoa para enviar diretamente, ou clique no botão para abrir o WhatsApp e selecionar qualquer contato ou grupo da sua agenda:
              </p>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Número do WhatsApp da pessoa (opcional, com DDD):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="Ex: 11987654321 ou (11) 98765-4321"
                    className="flex-1 px-3 py-2 text-xs bg-slate-900/90 text-white placeholder-slate-400 border border-emerald-500/40 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleShareWhatsapp}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {whatsappPhone.trim() ? 'Enviar para este Número' : 'Escolher Contato no WhatsApp'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs rounded-lg transition-colors"
                  title="Copiar texto da mensagem pronta"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{copiedMessage ? 'Mensagem Copiada!' : 'Copiar Texto da Mensagem'}</span>
                </button>
              </div>
            </div>

            {/* Bloco de Copiar Link Direto */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Link direto do aplicativo:
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-900/80 rounded-xl border border-white/10 text-xs font-mono text-slate-300 truncate">
                  {shareUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Assinatura no rodapé da Ajuda */}
      <div className="pt-2 pb-4 text-center">
        <p className="text-xs text-slate-400">
          AvaliaScan <span className="font-bold text-slate-600">by MIPCJR®</span> • Todos os direitos reservados
        </p>
      </div>

    </div>
  );
};

