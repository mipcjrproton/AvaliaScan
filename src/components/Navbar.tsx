import React from 'react';
import { 
  Camera, 
  Fingerprint, 
  LogOut, 
  User, 
  Sparkles, 
  Menu, 
  Bell, 
  CheckCircle2, 
  Smartphone,
  Share2
} from 'lucide-react';
import { UserProfile, MenuTab } from '../types';
import { storageService } from '../services/storage';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: MenuTab) => void;
  onToggleMobileMenu: () => void;
  onOpenShareModal?: () => void;
  activeTab: MenuTab;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onNavigateTab,
  onToggleMobileMenu,
  onOpenShareModal,
  activeTab
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Mobile Toggle & Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={() => onNavigateTab('inicio')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 via-teal-100 to-indigo-100 border border-emerald-200/60 flex items-center justify-center shadow-xs text-emerald-800 transition-transform group-hover:scale-105">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Avalia<span className="text-emerald-700">Scan</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Mobile OMR
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-bold text-slate-600 tracking-wide">
                  by MIPCJR®
                </span>
                <span className="text-[10px] text-slate-300 hidden sm:inline">•</span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 hidden sm:inline">
                  {storageService.getVersion()}
                </span>
                <span className="text-[10px] text-slate-300 hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Avaliações & Correção Inteligente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Quick Action / Mobile Scanner Callout & Compartilhar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('correcoes')}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 font-medium text-xs shadow-xs transition-all active:scale-[0.98]"
          >
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span>Escanear no Celular</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </button>

          {onOpenShareModal && (
            <button
              type="button"
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-semibold text-xs shadow-xs transition-all active:scale-[0.98]"
              title="Gerar link funcional para compartilhamento deste site"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Compartilhar</span>
            </button>
          )}
        </div>

        {/* Right: User & Auth Badges */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* Auth provider pastel badge */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                {user.authProvider === 'google' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Google Conectado</span>
                  </>
                )}
                {user.authProvider === 'biometric' && (
                  <>
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Digital Ativa</span>
                  </>
                )}
                {user.authProvider === 'email' && (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Conta E-mail</span>
                  </>
                )}
              </div>

              {/* Bloco à direita: Botão de saída e, logo abaixo, o nome de quem está logado */}
              <div className="flex flex-col items-end pl-2">
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair ou trocar de conta"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 transition-all active:scale-95 shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sair</span>
                </button>
                <div 
                  onClick={() => onNavigateTab('configuracoes')}
                  title={`Usuário conectado: ${user.name} (${user.role})`}
                  className="flex items-center gap-1.5 mt-1 cursor-pointer group text-right"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-4 h-4 rounded-full object-cover border border-slate-300 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[160px] leading-none">
                    {user.name}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-all active:scale-95"
            >
              <User className="w-4 h-4" />
              <span>Acessar / Cadastrar</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
