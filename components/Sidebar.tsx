import React, { useState, useEffect } from 'react';
import {
  Home,
  Wrench,
  MessageSquare,
  Layout,
  Smartphone,
  HardDrive,
  Settings,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Scale,
  BarChart,
  Palette,
  Sparkles,
  LogOut,
  Lock,
  Clock,
  MessageCircle,
  Trash2,
  FolderOpen,
  Store,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Users,
  Plus,
  FileText,
} from 'lucide-react';
import { ViewState, NavItem, ToolId } from '../types';
import { chatStorage, ChatSession } from '../lib/chatStorage';
import { SettingsModal } from './SettingsModal';

interface SidebarProps {
  currentView: ViewState;
  activeTool: ToolId | null;
  userName: string;
  userPlan: string;
  onNavigate: (view: ViewState) => void;
  onNewInteraction?: () => void;
  onLoadSession?: (sessionId: string) => void;
  onLogout?: () => void;
  onBackToTools?: () => void;
  onTriggerUpsell: (feature: string) => void;
  onSetAssistantContext: (context: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  userPlan: string;
  collapsed: boolean;
  onNavigate: (view: ViewState) => void;
  onClickOverride?: () => void;
  onTriggerUpsell: (feature: string) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, userPlan, collapsed, onNavigate, onClickOverride, onTriggerUpsell }) => {
  const isFreePlan = userPlan === 'free';
  const lockedTools = ['ARC_BUILDER_PREMIUM', 'ARCCO_TALK_PREMIUM'];
  const isLocked = isFreePlan && lockedTools.includes(item.id);
  const isDisabled = !!item.disabled;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;

    if (isLocked) {
      onTriggerUpsell(item.label);
    } else if (onClickOverride) {
      onClickOverride();
    } else {
      onNavigate(item.id);
    }
  };

  return (
    <button
      title={collapsed ? item.label : undefined}
      onClick={handleClick}
      disabled={isDisabled}
      className={`group relative w-full flex items-center transition-all duration-200 outline-none rounded-xl
        ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
        ${isDisabled
          ? 'opacity-40 cursor-not-allowed text-neutral-500 border-l-2 border-transparent'
          : isActive
            ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
        } text-sm font-medium`}
    >
      <div className={`relative flex items-center justify-center transition-transform duration-300 ${isActive && !isDisabled ? 'scale-110' : !isDisabled ? 'group-hover:scale-110' : ''}`}>
        <item.icon
          size={20}
          className={`transition-colors duration-200 ${
            isDisabled
              ? 'text-neutral-600'
              : isActive
                ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                : isLocked
                  ? 'text-neutral-600'
                  : 'text-neutral-500 group-hover:text-neutral-200'
          }`}
        />
      </div>

      {!collapsed && (
        <span className="flex-1 text-left truncate relative z-10 flex items-center gap-2">
          {item.label}
        </span>
      )}

      {!collapsed && isDisabled && (
        <span className="text-[10px] bg-neutral-800 text-neutral-600 px-1.5 py-0.5 rounded-full leading-none">
          Em breve
        </span>
      )}

      {!collapsed && !isDisabled && isLocked && (
        <Lock size={14} className="text-neutral-600 group-hover:text-neutral-400" />
      )}
    </button>
  );
};

const SectionHeader: React.FC<{ label: string; icon?: React.ReactNode; collapsed: boolean }> = ({ label, icon, collapsed }) => {
  if (collapsed) return null;
  return (
    <div className="px-4 mt-6 mb-2 flex items-center gap-2">
      {icon}
      <h3 className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold">{label}</h3>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeTool,
  userName,
  userPlan,
  onNavigate,
  onNewInteraction,
  onLoadSession,
  onLogout,
  onBackToTools,
  onTriggerUpsell,
  onSetAssistantContext,
  onCollapsedChange
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchSessions = () => {
      setRecentSessions(chatStorage.getSessions());
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    onCollapsedChange?.(collapsed);
    if (collapsed) {
      setToolsOpen(false);
      setBuilderOpen(false);
    }
  }, [collapsed]);

  const appTools: NavItem[] = [
    { id: 'ARCCO_DRIVE', label: 'Arcco Drive', icon: HardDrive },
    { id: 'ARCCO_TALK', label: 'Ollivia', icon: Smartphone },
  ];

  const isToolsActive = currentView === 'TOOLS_MY' || currentView === 'TOOLS_STORE';
  const isBuilderActive = currentView === 'ARCCO_PAGES' || currentView === 'MY_PAGES';

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    chatStorage.deleteSession(id);
    setRecentSessions(chatStorage.getSessions());
  };

  return (
    <aside
      className={`h-screen bg-[#111113] border-r border-[#262629] flex flex-col fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}`}
    >

      {/* 1. Logo + botão colapsar */}
      <div className={`flex items-center shrink-0 pt-5 pb-6 ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('ARCCO_CHAT')}>
            <img
              src="https://qscezcbpwvnkqoevulbw.supabase.co/storage/v1/object/public/Chipro%20calculadora/arcco%20(1).png"
              alt="Arcco Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        )}

        {collapsed && (
          <div className="cursor-pointer" onClick={() => onNavigate('ARCCO_CHAT')}>
            <img
              src="https://qscezcbpwvnkqoevulbw.supabase.co/storage/v1/object/public/Chipro%20calculadora/arcco%20(1).png"
              alt="Arcco Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-2 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04] rounded-lg transition-colors"
            title="Recolher menu"
          >
            <ChevronsLeft size={18} />
          </button>
        )}
      </div>

      {/* Botão expandir — só aparece quando colapsado */}
      {collapsed && (
        <div className="flex justify-center pb-1 shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04] rounded-lg transition-colors"
            title="Expandir menu"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      )}

      {/* 2. Nova Interação + Projetos + Tools */}
      <div className={`pb-2 shrink-0 space-y-0.5 ${collapsed ? 'px-1' : 'px-2'}`}>
        <NavButton
          item={{ id: 'ARCCO_CHAT', label: 'Nova Interação', icon: MessageSquare }}
          isActive={currentView === 'ARCCO_CHAT'}
          userPlan={userPlan}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onClickOverride={onNewInteraction}
          onTriggerUpsell={onTriggerUpsell}
        />
        <NavButton
          item={{ id: 'ESPECIALISTAS', label: 'Especialistas', icon: Users, disabled: true }}
          isActive={false}
          userPlan={userPlan}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onTriggerUpsell={onTriggerUpsell}
        />
        <NavButton
          item={{ id: 'PROJETOS', label: 'Projetos', icon: FolderOpen }}
          isActive={currentView === 'PROJETOS'}
          userPlan={userPlan}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onTriggerUpsell={onTriggerUpsell}
        />

        {/* Tools com sub-menu */}
        <div>
          <button
            title={collapsed ? 'Tools' : undefined}
            onClick={() => {
              if (collapsed) return;
              setToolsOpen(!toolsOpen);
            }}
            className={`group relative w-full flex items-center transition-all duration-200 outline-none rounded-xl text-sm font-medium
              ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
              ${isToolsActive
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
              }`}
          >
            <div className={`relative flex items-center justify-center transition-transform duration-300 ${isToolsActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              <Wrench
                size={20}
                className={`transition-colors duration-200 ${isToolsActive
                  ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                  : 'text-neutral-500 group-hover:text-neutral-200'
                  }`}
              />
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Tools</span>
                {toolsOpen
                  ? <ChevronDown size={14} className="text-neutral-500" />
                  : <ChevronRight size={14} className="text-neutral-500" />
                }
              </>
            )}
          </button>

          {toolsOpen && !collapsed && (
            <div className="mt-0.5 ml-3 border-l border-[#313134] pl-3 space-y-0.5">
              <button
                onClick={() => onNavigate('TOOLS_MY')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors
                  ${currentView === 'TOOLS_MY'
                    ? 'text-white bg-white/[0.05]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <Wrench size={15} className="text-neutral-500 flex-shrink-0" />
                Minhas Tools
              </button>
              <button
                onClick={() => onNavigate('TOOLS_STORE')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors
                  ${currentView === 'TOOLS_STORE'
                    ? 'text-white bg-white/[0.05]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <Store size={15} className="text-neutral-500 flex-shrink-0" />
                Loja
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sessões recentes — rolável (só no expandido) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 min-h-0">
        {!collapsed && recentSessions.length > 0 && (
          <div className="pt-1 border-t border-[#262629]">
            <SectionHeader collapsed={collapsed} label="Recentes" icon={<Clock size={10} className="text-neutral-600" />} />
            <div className="space-y-0.5 px-2">
              {recentSessions.map((session) => (
                <div key={session.id} className="relative group w-full flex items-center">
                  <button
                    onClick={() => { if (onLoadSession) onLoadSession(session.id); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <MessageCircle size={16} className="text-neutral-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                    <span className="truncate pr-6 text-left w-full">{session.title}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all rounded hover:bg-[#3b3b3e]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Apps */}
      <div className={`pt-2 pb-1 border-t border-[#262629] shrink-0 ${collapsed ? 'px-1' : 'px-2'}`}>
        <SectionHeader collapsed={collapsed} label="APPS" />
        {appTools.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={currentView === item.id}
            userPlan={userPlan}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onTriggerUpsell={onTriggerUpsell}
          />
        ))}

        {/* Arc Builder — expansível */}
        <div>
          <button
            title={collapsed ? 'Arc Builder' : undefined}
            onClick={() => {
              if (collapsed) return;
              setBuilderOpen(!builderOpen);
            }}
            className={`group relative w-full flex items-center transition-all duration-200 outline-none rounded-xl text-sm font-medium
              ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
              ${isBuilderActive
                ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
              }`}
          >
            <div className={`relative flex items-center justify-center transition-transform duration-300 ${isBuilderActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              <Layout
                size={20}
                className={`transition-colors duration-200 ${isBuilderActive
                  ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                  : 'text-neutral-500 group-hover:text-neutral-200'
                }`}
              />
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Arc Builder</span>
                {builderOpen
                  ? <ChevronDown size={14} className="text-neutral-500" />
                  : <ChevronRight size={14} className="text-neutral-500" />
                }
              </>
            )}
          </button>

          {builderOpen && !collapsed && (
            <div className="mt-0.5 ml-3 border-l border-[#313134] pl-3 space-y-0.5">
              <button
                onClick={() => onNavigate('ARCCO_PAGES')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors
                  ${currentView === 'ARCCO_PAGES'
                    ? 'text-white bg-white/[0.05]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <Plus size={15} className="text-neutral-500 flex-shrink-0" />
                Nova
              </button>
              <button
                onClick={() => onNavigate('MY_PAGES')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors
                  ${currentView === 'MY_PAGES'
                    ? 'text-white bg-white/[0.05]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
              >
                <FileText size={15} className="text-neutral-500 flex-shrink-0" />
                Minhas Páginas
              </button>
            </div>
          )}
        </div>
        <NavButton
          item={{ id: 'SETTINGS', label: 'Configurações', icon: Settings }}
          isActive={false}
          userPlan={userPlan}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onClickOverride={() => setShowSettings(true)}
          onTriggerUpsell={onTriggerUpsell}
        />
      </div>

      {/* 5. Conta */}
      <div className={`border-t border-[#262629] shrink-0 ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center rounded-xl hover:bg-neutral-900/50 cursor-pointer transition-colors group ${collapsed ? 'justify-center p-1' : 'gap-3 p-2'}`}>
          <div
            title={collapsed ? `${userName} · ${userPlan}` : undefined}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          >
            {userName.charAt(0)}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-neutral-500 capitalize">{userPlan}</p>
              </div>
              {onLogout && (
                <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="text-neutral-600 hover:text-red-400 transition-colors">
                  <LogOut size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Configurações */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userName={userName}
        userPlan={userPlan}
      />

    </aside>
  );
};
