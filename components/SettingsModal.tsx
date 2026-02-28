import React, { useState } from 'react';
import {
  X,
  Settings,
  User,
  CreditCard,
  BarChart3,
  Globe,
  Bell,
  Volume2,
  Check,
  AlertCircle,
} from 'lucide-react';

type Tab = 'geral' | 'conta' | 'plano' | 'uso';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userPlan: string;
}

// ── Toggle helper ────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${value ? 'bg-indigo-500' : 'bg-neutral-700'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

// ── Tab: Geral ────────────────────────────────────────────
const GeralTab: React.FC<{ userName: string }> = ({ userName }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Geral</h3>
        <p className="text-neutral-500 text-sm">Informações básicas e aparência.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Nome completo</label>
          <input type="text" defaultValue={userName} className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Como a Arcco deveria te chamar</label>
          <input type="text" placeholder="Seu apelido ou nome curto" className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">O que descreve melhor o seu trabalho</label>
          <input type="text" placeholder="Ex: Designer, Desenvolvedor, Marketer..." className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50" />
        </div>
      </div>

      <div className="pt-4 border-t border-[#1e1e21]">
        <h3 className="text-white font-semibold mb-3">Aparência</h3>
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Cor do tema</label>
          <select className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 cursor-pointer">
            <option value="dark">Padrão (Dark)</option>
            <option value="system">System (Clara)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ── Tab: Conta ────────────────────────────────────────────
const ContaTab: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-white font-semibold mb-1">Informações de Login</h3>
      <p className="text-neutral-500 text-sm">Gerencie seu acesso à plataforma.</p>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">E-mail de Login</label>
        <input type="email" placeholder="seu@email.com" className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 cursor-not-allowed opacity-70" disabled />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Senha Atual</label>
        <input type="password" placeholder="••••••••" className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50" />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Nova Senha</label>
        <input type="password" placeholder="••••••••" className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50" />
      </div>
    </div>

    <div className="pt-4 border-t border-[#1e1e21] flex justify-between items-center">
      <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Resgate de senha (Esqueci minha senha)</button>
      <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">Atualizar Senha</button>
    </div>
  </div>
);

// ── Tab: Plano ────────────────────────────────────────────
const PlanoTab: React.FC<{ userPlan: string }> = ({ userPlan }) => {
  const plans = [
    { id: 'free', label: 'Free', price: 'R$ 0/mês' },
    { id: 'starter', label: 'Starter', price: 'R$ 129/mês' },
    { id: 'ultra', label: 'Ultra', price: 'R$ 547/mês' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Seu Plano</h3>
        <p className="text-neutral-500 text-sm">
          Plano atual: <span className="text-indigo-400 font-medium capitalize">{userPlan}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === userPlan.toLowerCase();
          return (
            <div key={plan.id} className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${isCurrent ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-[#2a2a2d] bg-[#1a1a1d]'}`}>
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">{plan.label}</span>
                {isCurrent && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Atual</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-neutral-300 font-medium">{plan.price}</span>
                {!isCurrent && <button className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Assinar</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Tab: Uso ──────────────────────────────────────────────
const UsoTab: React.FC = () => {
  const used = 47;
  const total = 100;
  const pct = Math.round((used / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Uso da Plataforma</h3>
        <p className="text-neutral-500 text-sm">Acompanhe seu limite de uso mensal.</p>
      </div>

      <div className="pt-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-neutral-300 font-medium">Uso atual ({pct}%)</span>
        </div>
        <div className="h-4 bg-[#262629] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

// ── Modal Principal ───────────────────────────────────────
export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, userName, userPlan }) => {
  const [activeTab, setActiveTab] = useState<Tab>('geral');

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'geral', label: 'Geral', icon: <Settings size={15} /> },
    { id: 'conta', label: 'Conta', icon: <User size={15} /> },
    { id: 'plano', label: 'Plano', icon: <CreditCard size={15} /> },
    { id: 'uso', label: 'Uso', icon: <BarChart3 size={15} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#111113] border border-[#262629] rounded-2xl shadow-2xl w-[680px] max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262629] shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings size={17} className="text-indigo-400" />
            <h2 className="text-white font-semibold text-base">Configurações</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tabs laterais */}
          <div className="w-44 border-r border-[#262629] p-3 flex flex-col gap-1 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left border ${activeTab === tab.id
                    ? 'bg-indigo-500/10 text-white border-indigo-500/20'
                    : 'text-neutral-500 hover:text-white hover:bg-white/[0.04] border-transparent'
                  }`}
              >
                <span className={activeTab === tab.id ? 'text-indigo-400' : ''}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {activeTab === 'geral' && <GeralTab userName={userName} />}
            {activeTab === 'conta' && <ContaTab />}
            {activeTab === 'plano' && <PlanoTab userPlan={userPlan} />}
            {activeTab === 'uso' && <UsoTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
