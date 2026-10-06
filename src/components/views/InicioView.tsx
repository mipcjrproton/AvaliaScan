import React from 'react';
import {
  Users,
  FileText,
  ScanLine,
  ClipboardCheck,
  BarChart3,
  Search,
  Settings,
  Wrench,
  HelpCircle,
  Home,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  School,
  GraduationCap,
  Sparkles,
  Play,
  Share2
} from 'lucide-react';
import { MenuTab, Turma, Student, Assessment, CorrectionRecord, UserProfile, SystemSettings } from '../../types';
import { storageService } from '../../services/storage';

interface InicioViewProps {
  turmas: Turma[];
  students: Student[];
  assessments: Assessment[];
  corrections: CorrectionRecord[];
  user: UserProfile | null;
  settings: SystemSettings;
  systemVersion?: string;
  onNavigate: (tab: MenuTab) => void;
  onOpenShareModal?: () => void;
}

interface MenuModuleItem {
  id: MenuTab;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  buttonLabel: string;
  buttonColor: string;
}

export const InicioView: React.FC<InicioViewProps> = ({
  turmas,
  students,
  assessments,
  corrections,
  user,
  settings,
  systemVersion,
  onNavigate,
  onOpenShareModal,
}) => {
  const displayVersion = systemVersion || storageService.getVersion();
  const activeStudentsCount = students.filter((s) => s.active !== false).length;
  const professorName = settings.teacherName || user?.name || 'Professor(a)';
  const schoolName = settings.schoolName || user?.schoolName || 'Escola Padrão';

  // All menu modules with their metadata and navigation triggers
  const modules: MenuModuleItem[] = [
    {
      id: 'turmas',
      title: 'Turmas & Alunos',
      subtitle: 'Enturmação e Matrículas',
      description: 'Cadastre salas de aula, organize alunos por número de matrícula, controle status ativo/inativo e importe listas completas.',
      icon: Users,
      badge: `${turmas.length} turmas • ${activeStudentsCount} alunos`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      bgGradient: 'from-emerald-50/70 to-teal-50/40',
      iconBg: 'bg-emerald-100 text-emerald-700',
      iconColor: 'text-emerald-700',
      borderColor: 'border-emerald-200/80 hover:border-emerald-400',
      buttonLabel: 'Gerenciar Turmas',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    {
      id: 'avaliacoes',
      title: 'Avaliações',
      subtitle: 'Provas e Matriz Curricular',
      description: 'Configure avaliações com questões de A a E, defina o gabarito oficial, pesos de pontuação e gere folhas de resposta para impressão.',
      icon: FileText,
      badge: `${assessments.length} avaliações`,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      bgGradient: 'from-indigo-50/70 to-blue-50/40',
      iconBg: 'bg-indigo-100 text-indigo-700',
      iconColor: 'text-indigo-700',
      borderColor: 'border-indigo-200/80 hover:border-indigo-400',
      buttonLabel: 'Acessar Avaliações',
      buttonColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    {
      id: 'gerar',
      title: 'Gerar Provas com IA',
      subtitle: 'Elaboração & Impressão',
      description: 'Gere avaliações contextualizadas com IA a partir de avaliações cadastradas, com seleção de dificuldade, linha de digitação pedagógica e impressão para xerox ou nominal.',
      icon: Sparkles,
      badge: 'IA Integrada',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      bgGradient: 'from-purple-50/70 to-indigo-50/40',
      iconBg: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-700',
      borderColor: 'border-purple-200/80 hover:border-purple-400',
      buttonLabel: 'Gerar com IA',
      buttonColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      id: 'correcoes',
      title: 'Escanear Provas & Leitor OMR',
      subtitle: 'Visão Limpa & 3 Motores',
      description: 'Leitor óptico com visualizador limpo, marcadores de canto, foco automático, 720p/1080p, motores Híbrido, Gemini e Local, com checagem de corretas, erradas e rasuras.',
      icon: ScanLine,
      badge: corrections.length > 0 ? `${corrections.length} corrigidas` : 'Leitor Pronto',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      bgGradient: 'from-emerald-50/70 to-teal-50/40',
      iconBg: 'bg-emerald-100 text-emerald-700',
      iconColor: 'text-emerald-700',
      borderColor: 'border-emerald-200/80 hover:border-emerald-400',
      buttonLabel: 'Abrir Leitor de Provas',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    {
      id: 'boletim',
      title: 'Boletim Escolar',
      subtitle: 'Notas e Folhas Registradas',
      description: 'Painel tabular com as notas apuradas de cada estudante, percentuais de acerto, situação de aprovação e acesso ao espelho da prova.',
      icon: ClipboardCheck,
      badge: 'Visualização Direta',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      bgGradient: 'from-teal-50/70 to-emerald-50/40',
      iconBg: 'bg-teal-100 text-teal-700',
      iconColor: 'text-teal-700',
      borderColor: 'border-teal-200/80 hover:border-teal-400',
      buttonLabel: 'Visualizar Boletim',
      buttonColor: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
    {
      id: 'relatorios',
      title: 'Relatórios & Estatísticas',
      subtitle: 'Gráficos e Análise Pedagógica',
      description: 'Estatísticas de desempenho por turma, distribuição de notas, ranking da turma e índice de acerto por questão para diagnóstico da aprendizagem.',
      icon: BarChart3,
      badge: 'Gráficos & Médias',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      bgGradient: 'from-sky-50/70 to-blue-50/40',
      iconBg: 'bg-sky-100 text-sky-700',
      iconColor: 'text-sky-700',
      borderColor: 'border-sky-200/80 hover:border-sky-400',
      buttonLabel: 'Ver Relatórios',
      buttonColor: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
    {
      id: 'consultas',
      title: 'Consultas & Histórico',
      subtitle: 'Busca Detalhada por Aluno',
      description: 'Consulte o histórico de qualquer estudante, filtre por matrícula ou nome, revise respostas assinaladas e reimprima comprovantes individuais.',
      icon: Search,
      badge: 'Busca Rápida',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      bgGradient: 'from-purple-50/70 to-fuchsia-50/40',
      iconBg: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-700',
      borderColor: 'border-purple-200/80 hover:border-purple-400',
      buttonLabel: 'Consultar Histórico',
      buttonColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      id: 'configuracoes',
      title: 'Configurações',
      subtitle: 'Personalização & Calibração',
      description: 'Ajuste os dados da escola e professor, selecione a sensibilidade do OMR, ative auto-scan na detecção da folha e configure o som dos bips.',
      icon: Settings,
      badge: 'Preferências',
      badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
      bgGradient: 'from-slate-50 to-zinc-50/50',
      iconBg: 'bg-slate-200 text-slate-700',
      iconColor: 'text-slate-700',
      borderColor: 'border-slate-200/90 hover:border-slate-400',
      buttonLabel: 'Abrir Configurações',
      buttonColor: 'bg-slate-700 hover:bg-slate-800 text-white',
    },
    {
      id: 'manutencao',
      title: 'Manutenção & Backup',
      subtitle: 'Segurança & Integridade de Dados',
      description: 'Exporte todos os registros em arquivo JSON de segurança, restaure dados, faça calibração técnica dos sensores e limpe dados temporários.',
      icon: Wrench,
      badge: 'Cópia de Segurança',
      badgeColor: 'bg-zinc-200 text-zinc-800 border-zinc-300',
      bgGradient: 'from-zinc-50 to-stone-50/50',
      iconBg: 'bg-zinc-200 text-zinc-700',
      iconColor: 'text-zinc-700',
      borderColor: 'border-zinc-200/90 hover:border-zinc-400',
      buttonLabel: 'Acessar Manutenção',
      buttonColor: 'bg-zinc-700 hover:bg-zinc-800 text-white',
    },
    {
      id: 'ajuda',
      title: 'Ajuda & Guia OMR',
      subtitle: 'Modelos e Orientações',
      description: 'Aprenda as regras de preenchimento, veja dicas de iluminação para escanear sem sombras e baixe a folha de respostas padrão para impressão.',
      icon: HelpCircle,
      badge: 'Manual & Dicas',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      bgGradient: 'from-teal-50/60 to-cyan-50/30',
      iconBg: 'bg-teal-100 text-teal-700',
      iconColor: 'text-teal-700',
      borderColor: 'border-teal-200/80 hover:border-teal-400',
      buttonLabel: 'Abrir Ajuda',
      buttonColor: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
  ];

  return (
    <div id="inicio-view" className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Welcome Banner */}
      <section 
        id="inicio-banner"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 md:p-10 shadow-xl border border-slate-800"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>
                AvaliaScan by Milton (MIPCJR®) • Leitor Óptico Inteligente
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span>Painel Principal de Avaliações</span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-300 border border-slate-700 shadow-xs">
                {displayVersion}
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Bem-vindo(a), <span className="font-bold text-white">{professorName}</span>! Gerencie suas turmas da{' '}
              <span className="font-medium text-emerald-300">{schoolName}</span>, crie avaliações e realize a correção automática de gabaritos com confirmação sonora de 3 bips.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Correção Óptica OMR por Celular</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sinal Sonoro de Detecção & Validação</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Boletim Automático Integrado</span>
              </div>
            </div>
          </div>

          {/* Quick Scanner Action in Banner */}
          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
            <button
              id="btn-banner-scanner"
              type="button"
              onClick={() => onNavigate('correcoes')}
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-5 h-5" />
              <span>Iniciar Scanner de Provas</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="btn-banner-turmas"
              type="button"
              onClick={() => onNavigate('turmas')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>Ver Turmas & Alunos</span>
            </button>

            {onOpenShareModal && (
              <button
                id="btn-banner-share"
                type="button"
                onClick={onOpenShareModal}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold text-xs border border-emerald-400/30 transition-all cursor-pointer backdrop-blur-xs"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Compartilhar Site</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Quick Metrics Bar */}
      <section id="inicio-kpis" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => onNavigate('turmas')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Turmas Cadastradas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{turmas.length}</span>
            <span className="text-xs text-slate-600">salas ativas</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('turmas')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Alunos Ativos</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{activeStudentsCount}</span>
            <span className="text-xs text-slate-600">de {students.length} matriculados</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('avaliacoes')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Avaliações Criadas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{assessments.length}</span>
            <span className="text-xs text-slate-600">gabaritos oficiais</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('boletim')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Provas Corrigidas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ScanLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{corrections.length}</span>
            <span className="text-xs text-slate-600">no boletim</span>
          </div>
        </div>

      </section>

      {/* Main Hub: Grid of all Menu Items with Buttons */}
      <section id="inicio-modulos" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Home className="w-5 h-5 text-indigo-600" />
              <span>Módulos do Sistema</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Acesse qualquer funcionalidade através dos atalhos diretos abaixo:
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {modules.length} seções disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                id={`card-modulo-${mod.id}`}
                className={`relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br ${mod.bgGradient} border ${mod.borderColor} shadow-2xs hover:shadow-md transition-all duration-200 group`}
              >
                <div className="space-y-3">
                  {/* Top: Icon + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-xl ${mod.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {mod.badge && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-900 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {mod.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                {/* Direct Action Button */}
                <div className="pt-4 mt-4 border-t border-slate-200/60">
                  <button
                    id={`btn-nav-${mod.id}`}
                    type="button"
                    onClick={() => onNavigate(mod.id)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${mod.buttonColor}`}
                  >
                    <span>{mod.buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step by Step Workflow Guide */}
      <section 
        id="inicio-workflow"
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              <span>Fluxo de Correção Rápida em 3 Passos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Como utilizar o leitor de gabaritos óptico com máxima precisão
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ajuda')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Instruções Detalhadas</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900">Cadastre a Turma e a Prova</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Registre a turma com seus alunos e cadastre a avaliação definindo o gabarito oficial com as alternativas corretas (A a E).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900">Imprima as Folhas de Respostas</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Distribua as folhas aos estudantes com as 4 marcas pretas nos cantos bem nítidas para preenchimento a caneta escura.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900">Aponte a Câmera e Ouça os 3 Bips</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Abra o Scanner OMR, enquadre o cartão na mira: ao detectar a folha, o sistema emite o som, realiza a leitura óptica e grava a nota no boletim.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
