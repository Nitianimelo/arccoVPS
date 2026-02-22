import React, { useState } from 'react';
import {
  Plus,
  Bot,
  ShoppingCart,
  HeadphonesIcon,
  GraduationCap,
  MoreVertical,
  Edit3,
  Trash2,
  Power,
  MessageSquare,
  Smartphone,
  Settings,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import { TalkAgent, TalkAgentType, ViewState } from '../../types';

interface AgentsPageProps {
  agents: TalkAgent[];
  onNavigate: (view: ViewState) => void;
  onCreateAgent: (type: TalkAgentType) => void;
  onDeleteAgent: (id: string) => void;
  onToggleAgent: (id: string) => void;
  onSelectAgent: (agent: TalkAgent) => void;
}

const TYPE_CONFIG = {
  sales: {
    label: 'Vendas',
    description: 'Qualifica leads e fecha vendas',
    color: 'indigo',
    icon: ShoppingCart,
    gradient: 'from-indigo-500 to-purple-600'
  },
  support: {
    label: 'Suporte',
    description: 'Resolve dúvidas e problemas',
    color: 'emerald',
    icon: HeadphonesIcon,
    gradient: 'from-emerald-500 to-teal-600'
  },
  education: {
    label: 'Educação',
    description: 'Ensina e acompanha alunos',
    color: 'amber',
    icon: GraduationCap,
    gradient: 'from-amber-500 to-orange-600'
  }
};

interface AgentCardProps {
  agent: TalkAgent;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, onEdit, onDelete, onToggle }) => {
  const [showMenu, setShowMenu] = useState(false);
  const config = TYPE_CONFIG[agent.type];
  const TypeIcon = config.icon;

  return (
    <div
      className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl p-5 hover:border-[#333] transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
        >
          <TypeIcon size={24} className="text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{agent.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                agent.status === 'active'
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

          <p className="text-sm text-neutral-500 mb-3">{config.label} - {agent.description || config.description}</p>

          {/* Status Indicators */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {agent.whatsappConfig?.status === 'connected' ? (
                <>
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span className="text-green-400">WhatsApp conectado</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} className="text-amber-500" />
                  <span className="text-amber-400">WhatsApp pendente</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-neutral-500">
              <MessageSquare size={12} />
              <span>{agent.stats.totalConversations} conversas</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-neutral-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#141414] border border-[#262626] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-3"
                >
                  <Settings size={16} />
                  Configurar
                </button>
                <button
                  onClick={() => {
                    onToggle();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-3"
                >
                  <Power size={16} />
                  {agent.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
                <div className="border-t border-[#262626] my-1" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-3"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AgentsPage: React.FC<AgentsPageProps> = ({
  agents,
  onNavigate,
  onCreateAgent,
  onDeleteAgent,
  onToggleAgent,
  onSelectAgent
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const agentTypes: TalkAgentType[] = ['sales', 'support', 'education'];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Agentes</h1>
            <p className="text-neutral-400">
              Gerencie seus agentes de atendimento
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={18} />
            Novo Agente
          </button>
        </div>

        {/* Agents List */}
        {agents.length > 0 ? (
          <div className="space-y-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => onSelectAgent(agent)}
                onEdit={() => onSelectAgent(agent)}
                onDelete={() => {
                  if (confirm('Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.')) {
                    onDeleteAgent(agent.id);
                  }
                }}
                onToggle={() => onToggleAgent(agent.id)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-[#0F0F0F] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-6">
              <Bot size={40} className="text-neutral-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum agente criado
            </h3>
            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
              Crie seu primeiro agente para começar a atender seus clientes automaticamente via WhatsApp
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Sparkles size={18} />
              Criar Primeiro Agente
            </button>
          </div>
        )}

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-lg overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Novo Agente</h2>
                  <p className="text-sm text-neutral-400 mt-1">
                    Escolha o tipo de atendimento
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                {agentTypes.map((type) => {
                  const config = TYPE_CONFIG[type];
                  const TypeIcon = config.icon;

                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setShowCreateModal(false);
                        onCreateAgent(type);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-all text-left group"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                      >
                        <TypeIcon size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-0.5">{config.label}</h3>
                        <p className="text-sm text-neutral-500">{config.description}</p>
                      </div>
                      <div className="text-neutral-600 group-hover:text-indigo-400 transition-colors">
                        <Plus size={20} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info */}
              <div className="px-6 pb-6">
                <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-200">
                        Cada tipo de agente vem pré-configurado para seu objetivo.
                        Você poderá personalizar depois.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
