import React, { useState } from 'react';
import {
  MessageSquare,
  ShoppingCart,
  HeadphonesIcon,
  GraduationCap,
  ArrowRight,
  Plus,
  Settings,
  Clock,
  Smartphone,
  MoreVertical,
  Power,
  Trash2,
  Edit3,
  X,
  Sparkles
} from 'lucide-react';
import { TalkAgent, TalkAgentType, ViewState } from '../../types';

interface TalkHomePageProps {
  onNavigate: (view: ViewState) => void;
  agents: TalkAgent[];
  onCreateAgent: (type: TalkAgentType) => void;
  onSelectAgent: (agent: TalkAgent) => void;
  onDeleteAgent?: (id: string) => void;
  onToggleAgent?: (id: string) => void;
}

interface AgentTypeCardProps {
  type: TalkAgentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}

const AgentTypeCard: React.FC<AgentTypeCardProps> = ({
  title,
  description,
  icon,
  gradient,
  onClick
}) => (
  <button
    onClick={onClick}
    className="group relative w-full text-left bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 overflow-hidden"
  >
    {/* Background Gradient */}
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{
        background: `radial-gradient(ellipse at top left, ${gradient}, transparent 60%)`
      }}
    />

    <div className="relative z-10">
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${gradient})` }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        {title}
        <ArrowRight
          size={18}
          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-400"
        />
      </h3>

      {/* Description */}
      <p className="text-neutral-400 text-sm leading-relaxed">{description}</p>
    </div>
  </button>
);

interface ExistingAgentCardProps {
  agent: TalkAgent;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const ExistingAgentCard: React.FC<ExistingAgentCardProps> = ({
  agent,
  onSelect,
  onEdit,
  onToggle,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const typeConfig = {
    sales: { label: 'Vendas', color: 'indigo', icon: ShoppingCart, gradient: 'from-indigo-500 to-purple-600' },
    support: { label: 'Suporte', color: 'emerald', icon: HeadphonesIcon, gradient: 'from-emerald-500 to-teal-600' },
    education: { label: 'Educação', color: 'amber', icon: GraduationCap, gradient: 'from-amber-500 to-orange-600' }
  };

  const config = typeConfig[agent.type];
  const Icon = config.icon;

  return (
    <div className="group relative bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-5 hover:border-[#333] transition-all">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${config.gradient}`}>
          <Icon size={22} className="text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{agent.name}</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'active'
                ? 'bg-green-900/50 text-green-400'
                : agent.status === 'configuring'
                  ? 'bg-amber-900/50 text-amber-400'
                  : 'bg-neutral-800 text-neutral-400'
                }`}
            >
              {agent.status === 'active'
                ? 'Ativo'
                : agent.status === 'configuring'
                  ? 'Configurando'
                  : 'Inativo'}
            </span>
          </div>
          <p className="text-sm text-neutral-500 mb-3">{config.label}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-neutral-400">
              <MessageSquare size={12} />
              <span>{agent.stats.totalConversations} conversas</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-400">
              <Clock size={12} />
              <span>{agent.stats.avgResponseTime}</span>
            </div>
            {agent.whatsappConfig?.status === 'connected' && (
              <div className="flex items-center gap-1 text-green-400">
                <Smartphone size={12} />
                <span>WhatsApp conectado</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSelect}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Acessar
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <MoreVertical size={16} className="text-neutral-400" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#141414] border border-[#262626] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      onToggle();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Power size={14} />
                    {agent.status === 'active' ? 'Desativar' : 'Ativar'}
                  </button>
                  <div className="border-t border-[#262626] my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TalkHomePage: React.FC<TalkHomePageProps> = ({
  onNavigate,
  agents,
  onCreateAgent,
  onSelectAgent,
  onDeleteAgent,
  onToggleAgent
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);

  const agentTypes: Omit<AgentTypeCardProps, 'onClick'>[] = [
    {
      type: 'sales',
      title: 'Vendas',
      description: 'Qualifica leads, agenda reuniões e ajuda a fechar negócios automaticamente.',
      icon: <ShoppingCart size={26} className="text-white" />,
      gradient: 'rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.4)'
    },
    {
      type: 'support',
      title: 'Suporte',
      description: 'Resolve dúvidas e problemas dos clientes de forma rápida e inteligente.',
      icon: <HeadphonesIcon size={26} className="text-white" />,
      gradient: 'rgba(16, 185, 129, 0.8), rgba(52, 211, 153, 0.4)'
    },
    {
      type: 'education',
      title: 'Educação',
      description: 'Acompanha alunos, tira dúvidas e auxilia no processo de aprendizado.',
      icon: <GraduationCap size={26} className="text-white" />,
      gradient: 'rgba(245, 158, 11, 0.8), rgba(251, 191, 36, 0.4)'
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <MessageSquare size={24} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Arcco Talk</h1>
            </div>
            <p className="text-neutral-400 ml-[60px]">
              Atendimento inteligente via WhatsApp
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={20} />
            Novo Agente
          </button>
        </div>

        {/* Existing Agents */}
        {agents.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={18} className="text-neutral-400" />
              Seus Agentes
            </h2>
            <div className="space-y-3">
              {agents.map((agent) => (
                <ExistingAgentCard
                  key={agent.id}
                  agent={agent}
                  onSelect={() => onSelectAgent(agent)}
                  onEdit={() => onSelectAgent(agent)}
                  onToggle={() => onToggleAgent?.(agent.id)}
                  onDelete={() => setAgentToDelete(agent.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {agentToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0F0F0F] border border-red-900/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-red-900/20 scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-5 mx-auto">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">Excluir Agente?</h3>
                <p className="text-neutral-400 text-center leading-relaxed">
                  Esta ação não pode ser desfeita. Todas as conversas e configurações deste agente serão perdidas permanentemente.
                </p>
              </div>
              <div className="p-4 bg-neutral-900/50 border-t border-[#262626] flex items-center justify-center gap-3">
                <button
                  onClick={() => setAgentToDelete(null)}
                  className="px-5 py-2.5 text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (onDeleteAgent && agentToDelete) {
                      onDeleteAgent(agentToDelete);
                      setAgentToDelete(null);
                    }
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2 shadow-lg shadow-red-900/20"
                >
                  <Trash2 size={18} />
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-[#0F0F0F] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Crie seu primeiro agente
            </h3>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
              Comece criando um agente de IA para atender seus clientes automaticamente via WhatsApp
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus size={20} />
              Criar Agente
            </button>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Novo Agente</h2>
                  <p className="text-neutral-400 text-sm mt-1">
                    Escolha o tipo de agente que deseja criar
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              {/* Agent Type Cards */}
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {agentTypes.map((agentType) => (
                    <AgentTypeCard
                      key={agentType.type}
                      {...agentType}
                      onClick={() => {
                        setShowCreateModal(false);
                        onCreateAgent(agentType.type);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
