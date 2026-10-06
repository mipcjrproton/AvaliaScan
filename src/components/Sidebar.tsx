import React from 'react';
import { 
  Settings, 
  Users, 
  FileText, 
  ScanLine, 
  BarChart3, 
  Search, 
  Wrench, 
  HelpCircle,
  Smartphone,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  Home,
  Share2
} from 'lucide-react';
import { MenuTab } from '../types';
import { storageService } from '../services/storage';

interface SidebarProps {
  activeTab: MenuTab;
  onSelectTab: (tab: MenuTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  turmasCount: number;
  avaliacoesCount: number;
  correcoesCount: number;
  onOpenShareModal?: () => void;
}

interface MenuItemConfig {
  id: MenuTab;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: number | string;
  pastelBg: string;
  pastelText: string;
  pastelBorder: string;
  activeBg: string;
  activeText: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  turmasCount,
  avaliacoesCount,
  correcoesCount,
  onOpenShareModal,
}) => {

  // The 8 items explicitly specified in the user prompt:
  // "Configurações, Turmas, Avaliações, Correções, Relatórios, Consultas, Manutenção e Ajuda"
  const menuItems: MenuItemConfig[] = [
    {
      id: 'inicio',
      label: 'Página Inicial',
      description: 'Painel principal e atalhos',
      icon: Home,
      pastelBg: 'bg-emerald-50/70',
      pastelText: 'text-emerald-800',
      pastelBorder: 'border-emerald-200/70',
      activeBg: 'bg-emerald-100/70',
      activeText: 'text-emerald-900',
    },
    {
      id: 'turmas',
      label: 'Turmas & Alunos',
      description: 'Gestão de salas e alunos',
      icon: Users,
      badge: turmasCount,
      pastelBg: 'bg-emerald-50/70',
      pastelText: 'text-emerald-800',
      pastelBorder: 'border-emerald-200/70',
      activeBg: 'bg-emerald-100/70',
      activeText: 'text-emerald-900',
    },
    {
      id: 'avaliacoes',
      label: 'Avaliações',
      description: 'Provas e gabaritos oficiais',
      icon: FileText,
      badge: avaliacoesCount,
      pastelBg: 'bg-indigo-50/70',
      pastelText: 'text-indigo-800',
      pastelBorder: 'border-indigo-200/70',
      activeBg: 'bg-indigo-100/70',
      activeText: 'text-indigo-900',
    },
    {
      id: 'gerar',
      label: 'Gerar',
      description: 'Elaborador de provas com IA',
      icon: Sparkles,
      pastelBg: 'bg-purple-50/80',
      pastelText: 'text-purple-900',
      pastelBorder: 'border-purple-200/80',
      activeBg: 'bg-purple-100/80',
      activeText: 'text-purple-950',
    },
    {
      id: 'correcoes',
      label: 'Escanear Provas',
      description: 'Leitor OMR & Foco Nítido',
      icon: ScanLine,
      badge: correcoesCount > 0 ? `${correcoesCount}` : 'Novo',
      pastelBg: 'bg-emerald-50/80',
      pastelText: 'text-emerald-900',
      pastelBorder: 'border-emerald-200/80',
      activeBg: 'bg-emerald-100/80',
      activeText: 'text-emerald-950',
    },
    {
      id: 'boletim',
      label: 'Boletim',
      description: 'Notas e gabaritos conferidos',
      icon: ClipboardCheck,
      pastelBg: 'bg-emerald-50/80',
      pastelText: 'text-emerald-900',
      pastelBorder: 'border-emerald-200/80',
      activeBg: 'bg-emerald-100/80',
      activeText: 'text-emerald-950',
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      description: 'Desempenho e estatísticas',
      icon: BarChart3,
      pastelBg: 'bg-sky-50/70',
      pastelText: 'text-sky-800',
      pastelBorder: 'border-sky-200/70',
      activeBg: 'bg-sky-100/70',
      activeText: 'text-sky-900',
    },
    {
      id: 'consultas',
      label: 'Consultas',
      description: 'Histórico e busca por aluno',
      icon: Search,
      pastelBg: 'bg-purple-50/70',
      pastelText: 'text-purple-800',
      pastelBorder: 'border-purple-200/70',
      activeBg: 'bg-purple-100/70',
      activeText: 'text-purple-900',
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      description: 'Perfil e parâmetros do leitor',
      icon: Settings,
      pastelBg: 'bg-slate-100/70',
      pastelText: 'text-slate-800',
      pastelBorder: 'border-slate-200/70',
      activeBg: 'bg-slate-200/70',
      activeText: 'text-slate-900',
    },
    {
      id: 'manutencao',
      label: 'Manutenção',
      description: 'Backups, calibração e saúde',
      icon: Wrench,
      pastelBg: 'bg-zinc-100/70',
      pastelText: 'text-zinc-800',
      pastelBorder: 'border-zinc-200/70',
      activeBg: 'bg-zinc-200/70',
      activeText: 'text-zinc-900',
    },
    {
      id: 'ajuda',
      label: 'Ajuda',
      description: 'Guia de escaneamento & modelo',
      icon: HelpCircle,
      pastelBg: 'bg-teal-50/70',
      pastelText: 'text-teal-800',
      pastelBorder: 'border-teal-200/70',
      activeBg: 'bg-teal-100/70',
      activeText: 'text-teal-900',
    },
  ];

  const handleSelect = (tab: MenuTab) => {
    onSelectTab(tab);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              AS
            </div>
            <div>
              <span className="font-bold text-sm text-slate-800 block leading-tight">AvaliaScan</span>
              <span className="text-[10px] font-bold text-slate-500 block">by MIPCJR® • {storageService.getVersion()}</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Fechar
          </button>
        </div>

        {/* Section title */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Navegação Principal
          </p>
        </div>

        {/* Menu list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? `${item.activeBg} ${item.activeText} font-semibold shadow-xs border ${item.pastelBorder}`
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? `${item.pastelBg} ${item.pastelText}`
                        : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs tracking-tight">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate font-normal">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/80 text-slate-800'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile scanning callout box at bottom of sidebar */}
        <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-indigo-50/60 border border-amber-200/60">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800">Scanner no Celular</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Aponte a câmera para os cantos guia do cartão-resposta para leitura instantânea.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleSelect('correcoes')}
                  className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 group/btn"
                >
                  <span>Abrir leitor</span>
                  <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                </button>

                {onOpenShareModal && (
                  <button
                    type="button"
                    onClick={onOpenShareModal}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 ml-auto"
                  >
                    <Share2 className="w-3 h-3 text-emerald-600" />
                    <span>Compartilhar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assinatura no rodapé da Sidebar */}
        <div className="px-4 pb-4 pt-1 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            AvaliaScan <span className="font-bold text-slate-500">by MIPCJR®</span> • <span className="font-mono font-semibold text-slate-500">{storageService.getVersion()}</span>
          </p>
        </div>

      </aside>
    </>
  );
};
