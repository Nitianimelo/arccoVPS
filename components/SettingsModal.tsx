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
const GeralTab: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Preferências</h3>
        <p className="text-neutral-500 text-sm">Personalize sua experiência na plataforma.</p>
      </div>

      {/* Idioma */}
      <div>
        <label className="flex items-center gap-2 text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">
          <Globe size={13} /> Idioma
        </label>
        <select className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer">
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      {/* Notificações */}
      <div className="space-y-0">
        <div className="flex items-center justify-between py-3 border-b border-[#1e1e21]">
          <div className="flex items-center gap-3">
            <Bell size={15} className="text-neutral-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-200 font-medium">Notificações</p>
              <p className="text-xs text-neutral-600">Receber alertas da plataforma</p>
            </div>
          </div>
          <Toggle value={notifications} onChange={setNotifications} />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-[#1e1e21]">
          <div className="flex items-center gap-3">
            <Volume2 size={15} className="text-neutral-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-200 font-medium">Sons</p>
              <p className="text-xs text-neutral-600">Sons ao receber mensagens</p>
            </div>
          </div>
          <Toggle value={sounds} onChange={setSounds} />
        </div>
      </div>
    </div>
  );
};

// ── Tab: Conta ────────────────────────────────────────────
const ContaTab: React.FC<{ userName: string }> = ({ userName }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-white font-semibold mb-1">Informações da Conta</h3>
      <p className="text-neutral-500 text-sm">Gerencie seus dados pessoais.</p>
    </div>

    {/* Avatar */}
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
        {userName.charAt(0)}
      </div>
      <div>
        <p className="text-white font-medium">{userName}</p>
        <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-0.5">
          Alterar foto
        </button>
      </div>
    </div>

    {/* Campos */}
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Nome</label>
        <input
          type="text"
          defaultValue={userName}
          className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">E-mail</label>
        <input
          type="email"
          placeholder="seu@email.com"
          className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 transition-colors placeholder:text-neutral-600"
        />
      </div>
      <div>
        <label className="block text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Nova Senha</label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full bg-[#1a1a1d] border border-[#313134] text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 transition-colors placeholder:text-neutral-600"
        />
      </div>
    </div>

    <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
      Salvar alterações
    </button>
  </div>
);

// ── Tab: Plano ────────────────────────────────────────────
const PlanoTab: React.FC<{ userPlan: string }> = ({ userPlan }) => {
  const plans = [
    {
      id: 'free',
      label: 'Free',
      price: 'R$ 0/mês',
      features: ['100 mensagens/mês', '1 projeto ativo', 'Acesso básico ao Chat'],
    },
    {
      id: 'pro',
      label: 'Pro',
      price: 'R$ 49/mês',
      features: ['Mensagens ilimitadas', 'Projetos ilimitados', 'Arcco Drive', 'Arc Builder', 'Suporte prioritário'],
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      price: 'Sob consulta',
      features: ['Tudo do Pro', 'SLA garantido', 'API dedicada', 'Onboarding dedicado'],
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Seu Plano</h3>
        <p className="text-neutral-500 text-sm">
          Plano atual:{' '}
          <span className="text-indigo-400 font-medium capitalize">{userPlan}</span>
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === userPlan.toLowerCase();
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-4 transition-colors ${
                isCurrent
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-[#2a2a2d] bg-[#1a1a1d]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{plan.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                      Atual
                    </span>
                  )}
                </div>
                <span className="text-neutral-300 text-sm font-medium">{plan.price}</span>
              </div>

              <ul className="space-y-1.5 mb-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check size={11} className="text-indigo-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && (
                <button className="w-full py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                  Fazer upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Tab: Uso ──────────────────────────────────────────────
const UsoTab: React.FC = () => {
  const stats = [
    { label: 'Mensagens', used: 47, total: 100, unit: 'msgs', gradient: 'from-indigo-500 to-purple-500' },
    { label: 'Armazenamento', used: 128, total: 512, unit: 'MB', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Projetos', used: 1, total: 1, unit: '', gradient: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Uso da Plataforma</h3>
        <p className="text-neutral-500 text-sm">Acompanhe o consumo do seu plano atual.</p>
      </div>

      <div className="space-y-5">
        {stats.map((stat) => {
          const pct = Math.min(100, Math.round((stat.used / stat.total) * 100));
          const isNearLimit = pct >= 80;
          return (
            <div key={stat.label}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-300 font-medium">{stat.label}</span>
                <span className={`text-xs font-medium ${isNearLimit ? 'text-amber-400' : 'text-neutral-500'}`}>
                  {stat.used}{stat.unit ? ` ${stat.unit}` : ''} / {stat.total}{stat.unit ? ` ${stat.unit}` : ''}
                </span>
              </div>
              <div className="h-2 bg-[#262629] rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`text-right text-[11px] mt-1 ${isNearLimit ? 'text-amber-500' : 'text-neutral-600'}`}>
                {pct}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-400 leading-relaxed">
          Seu plano reseta no dia{' '}
          <span className="text-white font-medium">1º de cada mês</span>. Para mais
          capacidade, considere fazer upgrade do plano.
        </p>
      </div>
    </div>
  );
};

// ── Modal Principal ───────────────────────────────────────
export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, userName, userPlan }) => {
  const [activeTab, setActiveTab] = useState<Tab>('geral');

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'geral',  label: 'Geral',  icon: <Settings size={15} /> },
    { id: 'conta',  label: 'Conta',  icon: <User size={15} /> },
    { id: 'plano',  label: 'Plano',  icon: <CreditCard size={15} /> },
    { id: 'uso',    label: 'Uso',    icon: <BarChart3 size={15} /> },
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left border ${
                  activeTab === tab.id
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
            {activeTab === 'geral' && <GeralTab />}
            {activeTab === 'conta' && <ContaTab userName={userName} />}
            {activeTab === 'plano' && <PlanoTab userPlan={userPlan} />}
            {activeTab === 'uso'   && <UsoTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
