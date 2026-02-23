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
  Trash2
} from 'lucide-react';
import { ViewState, NavItem, ToolId } from '../types';
import { chatStorage, ChatSession } from '../lib/chatStorage';

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
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  userPlan: string;
  onNavigate: (view: ViewState) => void;
  onClickOverride?: () => void;
  onTriggerUpsell: (feature: string) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, userPlan, onNavigate, onClickOverride, onTriggerUpsell }) => {
  const isFreePlan = userPlan === 'free';
  const lockedTools = ['ARC_BUILDER_PREMIUM', 'ARCCO_TALK_PREMIUM'];
  const isLocked = isFreePlan && lockedTools.includes(item.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      onClick={handleClick}
      className={`group relative w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 outline-none
        ${isActive
          ? 'bg-gradient-to-r from-indigo-500/10 to-transparent border-l-2 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
        }`}
    >
      <div className={`relative flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        <item.icon
          size={20}
          className={`transition-colors duration-200 ${isActive
            ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
            : isLocked
              ? 'text-neutral-600'
              : 'text-neutral-500 group-hover:text-neutral-200'
            }`}
        />
      </div>

      <span className="flex-1 text-left truncate relative z-10 flex items-center gap-2">
        {item.label}
      </span>

      {isLocked && <Lock size={14} className="text-neutral-600 group-hover:text-neutral-400" />}

    </button>
  );
};

const SectionHeader: React.FC<{ label: string; icon?: React.ReactNode }> = ({ label, icon }) => (
  <div className="px-4 mt-6 mb-2 flex items-center gap-2">
    {icon}
    <h3 className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold">{label}</h3>
  </div>
);

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
  onSetAssistantContext
}) => {
  const [assistantsOpen, setAssistantsOpen] = useState(true);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const fetchSessions = () => {
      setRecentSessions(chatStorage.getSessions());
    };
    fetchSessions(); // load immediately
    const interval = setInterval(fetchSessions, 2000); // poll for updates
    return () => clearInterval(interval);
  }, []);

  const appTools: NavItem[] = [
    { id: 'ARCCO_DRIVE', label: 'Arcco Drive', icon: HardDrive },
    { id: 'ARCCO_PAGES', label: 'Arc Builder', icon: Layout },
    { id: 'ARCCO_TALK', label: 'Arc Talk', icon: Smartphone },
  ];

  // These will be fetched from Supabase / Backend in the future
  const assistants: any[] = [];

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    chatStorage.deleteSession(id);
    setRecentSessions(chatStorage.getSessions());
  };

  return (
    <aside className="w-64 h-screen bg-[#050505] border-r border-neutral-900 flex flex-col fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">

      {/* 1. Logo — fixo */}
      <div className="flex flex-row items-center justify-start pt-6 pb-2 px-6 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('ARCCO_CHAT')}>
          <img
            src="https://qscezcbpwvnkqoevulbw.supabase.co/storage/v1/object/public/Chipro%20calculadora/arcco%20(1).png"
            alt="Arcco Logo"
            className="h-8 w-auto object-contain"
          />
        </div>
      </div>

      {/* 2. Nova Interação — fixo */}
      <div className="px-2 pb-2 shrink-0">
        <NavButton
          item={{ id: 'ARCCO_CHAT', label: 'Nova Interação', icon: MessageSquare }}
          isActive={currentView === 'ARCCO_CHAT'}
          userPlan={userPlan}
          onNavigate={onNavigate}
          onClickOverride={onNewInteraction}
          onTriggerUpsell={onTriggerUpsell}
        />
      </div>

      {/* 3. Sessões recentes + Assistentes — rolável */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 min-h-0">

        {recentSessions.length > 0 && (
          <div className="pt-1 border-t border-[#1a1a1a]">
            <SectionHeader label="Recentes" icon={<Clock size={10} className="text-neutral-600" />} />
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
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all rounded hover:bg-[#333]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => setAssistantsOpen(!assistantsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-300 uppercase tracking-wider"
          >
            Assistentes
            {assistantsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {assistantsOpen && (
            <div className="space-y-0.5 mt-1 pl-2">
              {assistants.map(ast => (
                <button
                  key={ast.id}
                  onClick={() => {
                    if (onNewInteraction) onNewInteraction();
                    onSetAssistantContext(ast.label);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                >
                  <ast.icon size={16} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                  <span>{ast.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Apps — fixo */}
      <div className="px-2 pt-2 pb-1 border-t border-[#1a1a1a] shrink-0">
        <SectionHeader label="APPS" />
        {appTools.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={currentView === item.id}
            userPlan={userPlan}
            onNavigate={onNavigate}
            onTriggerUpsell={onTriggerUpsell}
          />
        ))}
      </div>

      {/* 5. Conta — fixo */}
      <div className="p-4 border-t border-neutral-900 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-900/50 cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-neutral-500 capitalize">{userPlan}</p>
          </div>
          {onLogout && (
            <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="text-neutral-600 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

    </aside>
  );
};
