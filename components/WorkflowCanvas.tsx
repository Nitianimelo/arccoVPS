import React, { useState } from 'react';
import { Plus, Table, MessageSquare, Globe, Eye, Zap, Brain, Database, X, Edit3, ArrowRight, Clock, Link2, Trash2, Settings } from 'lucide-react';
import { AgentAction } from '../types';
import { Button } from './Button';

interface WorkflowCanvasProps {
  actions: AgentAction[];
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  onAddAction: () => void;
  onEditAction: (action: AgentAction) => void;
  onDeleteAction: (actionId: string) => void;
  onDisconnectKnowledge?: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  actions,
  knowledgeBaseId,
  knowledgeBaseName,
  onAddAction,
  onEditAction,
  onDeleteAction,
  onDisconnectKnowledge
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getActionIcon = (action: AgentAction) => {
    const isRead = action.category === 'read';
    const iconClass = isRead ? 'text-indigo-400' : 'text-amber-400';

    switch (action.type) {
      case 'spreadsheet':
        return isRead ?
          <Table size={24} className={iconClass} /> :
          <Edit3 size={24} className={iconClass} />;
      case 'message':
        return <MessageSquare size={24} className={iconClass} />;
      case 'web_extract':
        return <Globe size={24} className={iconClass} />;
      default:
        return <Zap size={24} className={iconClass} />;
    }
  };

  const getActionLabel = (action: AgentAction) => {
    const prefix = action.category === 'read' ? 'Ler' : 'Executar';
    switch (action.type) {
      case 'spreadsheet':
        return action.category === 'read' ? 'Ler Planilha' : 'Preencher Planilha';
      case 'message':
        return 'Enviar Mensagem';
      case 'web_extract':
        return 'Web Scraping';
      default:
        return `${prefix} ${action.type}`;
    }
  };

  const getTriggerIcon = (action: AgentAction) => {
    switch (action.triggerType) {
      case 'auto':
        return <Brain size={12} className="text-indigo-400" />;
      case 'scheduled':
        return <Clock size={12} className="text-purple-400" />;
      case 'action_complete':
        return <Link2 size={12} className="text-emerald-400" />;
      case 'explicit':
        return <Zap size={12} className="text-amber-400" />;
    }
  };

  const getTriggerLabel = (action: AgentAction) => {
    switch (action.triggerType) {
      case 'auto':
        return 'Automático';
      case 'scheduled':
        return 'Agendado';
      case 'action_complete':
        return 'Em cadeia';
      case 'explicit':
        return 'Sob demanda';
    }
  };

  // Group actions by their chain relationship
  const rootActions = actions.filter(a => !a.parentActionId);
  const getChildActions = (parentId: string) => actions.filter(a => a.parentActionId === parentId);

  const renderActionNode = (action: AgentAction, depth: number = 0, isLastChild: boolean = false) => {
    const childActions = getChildActions(action.id);
    const isHovered = hoveredNode === action.id;
    const isRead = action.category === 'read';
    const hasChildren = childActions.length > 0;

    return (
      <div key={action.id} className="relative">
        {/* Connection Line to Parent (if depth > 0) */}
        {depth > 0 && (
          <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gradient-to-b from-emerald-500/50 to-emerald-500/20"></div>
        )}

        {/* Action Node */}
        <div
          className={`relative group transition-all duration-300 ${depth > 0 ? 'ml-12' : ''}`}
          onMouseEnter={() => setHoveredNode(action.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <div className={`relative bg-[#141414] border-2 rounded-2xl p-4 transition-all duration-300 min-w-[280px] ${
            isHovered
              ? isRead
                ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
                : 'border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
              : 'border-[#262626] hover:border-neutral-600'
          }`}>

            {/* Header with Icon and Category Badge */}
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 shrink-0 ${
                isRead
                  ? 'bg-indigo-900/20 border-indigo-900/50'
                  : 'bg-amber-900/20 border-amber-900/50'
              }`}>
                {getActionIcon(action)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                    isRead
                      ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400'
                      : 'bg-amber-950/30 border-amber-900/50 text-amber-400'
                  }`}>
                    {isRead ? 'Leitura' : 'Ação'}
                  </span>

                  {action.status === 'active' && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  )}
                </div>

                <h4 className="text-white font-bold text-sm mb-0.5">{action.name}</h4>
                <p className="text-xs text-neutral-500">{getActionLabel(action)}</p>
              </div>

              {/* Action Menu */}
              <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={() => onEditAction(action)}
                  className="p-1.5 rounded-lg hover:bg-indigo-950/30 text-neutral-500 hover:text-indigo-400 transition-colors"
                  title="Editar"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={() => onDeleteAction(action.id)}
                  className="p-1.5 rounded-lg hover:bg-red-950/30 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Details */}
            {action.details && (
              <div className="mb-3">
                <p className="text-xs text-neutral-400 line-clamp-1">
                  📋 {action.details}
                </p>
              </div>
            )}

            {/* Trigger Info */}
            <div className="bg-[#0A0A0A] rounded-lg p-3 mb-3 border border-[#262626]">
              <div className="flex items-center gap-2 mb-2">
                {getTriggerIcon(action)}
                <span className="text-xs font-bold text-neutral-200">{getTriggerLabel(action)}</span>
              </div>
              {action.systemInstruction && (
                <p className="text-xs text-neutral-500 leading-relaxed">{action.systemInstruction}</p>
              )}
              {!action.systemInstruction && (
                <p className="text-xs text-neutral-600 italic">Sem instrução definida</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-between text-[10px] text-neutral-600">
              <span>ID: {action.id.slice(0, 8)}</span>
              {action.requireConfirmation && (
                <span className="text-amber-600 font-medium">⚠ Requer confirmação</span>
              )}
            </div>
          </div>

          {/* Connection Line to Children */}
          {hasChildren && (
            <>
              <div className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-gradient-to-b from-emerald-500/50 to-emerald-500/20 translate-y-full"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                <div className="w-6 h-6 rounded-full bg-[#0A0A0A] border-2 border-emerald-500/30 flex items-center justify-center mt-2 mb-2">
                  <ArrowRight size={12} className="text-emerald-500 rotate-90" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Render Child Actions */}
        {hasChildren && (
          <div className="mt-12 space-y-8">
            {childActions.map((child, index) => renderActionNode(child, depth + 1, index === childActions.length - 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-[600px] bg-[#0A0A0A] rounded-2xl border border-[#262626] p-8 overflow-auto">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Content */}
      <div className="relative z-10">

        {/* Central Brain Node */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/20 to-transparent rounded-3xl blur-xl"></div>
            <div className="relative bg-[#141414] border-2 border-indigo-500 rounded-3xl p-8 min-w-[320px]">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-900/30 border-2 border-indigo-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                  <Brain size={40} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Agente Central</h3>
                <p className="text-sm text-neutral-400 max-w-xs">
                  O cérebro que decide quando usar a Base de Conhecimento ou executar Ações
                </p>
              </div>
            </div>
          </div>

          {/* Connector Lines */}
          <div className="relative w-px h-16 mt-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-indigo-500/50 to-neutral-600"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-neutral-700 rounded-full bg-[#0A0A0A] flex items-center justify-center">
              <ArrowRight size={20} className="text-neutral-600 rotate-90" />
            </div>
          </div>
        </div>

        {/* Main Content Area: Knowledge + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">

          {/* Knowledge Base Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-purple-400" />
              <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Memória (Conhecimento)</h4>
            </div>

            {knowledgeBaseId ? (
              <div className="bg-[#141414] border-2 border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-900/20 border-2 border-purple-900/50 flex items-center justify-center">
                      <Database size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{knowledgeBaseName}</h4>
                      <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        Conectado e Indexado
                      </span>
                    </div>
                  </div>

                  {onDisconnectKnowledge && (
                    <button
                      onClick={onDisconnectKnowledge}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20"
                      title="Desconectar"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg p-3">
                  <p className="text-xs text-neutral-400">
                    O agente consulta esta base automaticamente para responder perguntas que não sabe.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#262626] rounded-2xl bg-[#0F0F0F]/30 p-8 flex flex-col items-center justify-center text-center">
                <Database size={32} className="text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-500 mb-2">Nenhuma base de conhecimento conectada</p>
                <p className="text-xs text-neutral-600">Conecte uma base na aba Básico</p>
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-amber-400" />
                <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Habilidades (Ações)</h4>
              </div>
              <Button
                size="sm"
                icon={Plus}
                onClick={onAddAction}
                variant="secondary"
              >
                Nova Ação
              </Button>
            </div>

            {actions.length > 0 ? (
              <div className="space-y-12">
                {rootActions.map((action, index) => renderActionNode(action, 0, index === rootActions.length - 1))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#262626] rounded-2xl bg-[#0F0F0F]/30 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center mb-4">
                  <Zap size={32} className="text-neutral-600" />
                </div>
                <p className="text-sm text-neutral-500 mb-2">Nenhuma ação configurada</p>
                <p className="text-xs text-neutral-600 mb-4 max-w-xs">
                  Adicione ações para permitir que o agente leia planilhas, faça web scraping ou envie mensagens
                </p>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={onAddAction}
                  variant="secondary"
                >
                  Adicionar Primeira Ação
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 pt-8 border-t border-[#262626] flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/20 border border-indigo-900/50 flex items-center justify-center">
              <Eye size={14} className="text-indigo-400" />
            </div>
            <span>Leitura de Dados</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-900/50 flex items-center justify-center">
              <Zap size={14} className="text-amber-400" />
            </div>
            <span>Execução de Ação</span>
          </div>

          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-emerald-400" />
            <span>Ação em Cadeia</span>
          </div>

          <div className="flex items-center gap-2">
            <Brain size={14} className="text-indigo-400" />
            <span>Trigger Automático</span>
          </div>
        </div>
      </div>
    </div>
  );
};
