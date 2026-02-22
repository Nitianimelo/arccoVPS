import React, { useState } from 'react';
import { Plus, Trash2, Bot, Database, Globe, Table, MessageSquare, Edit3, ArrowRight, Check, X } from 'lucide-react';
import { AgentCard } from '../components/AgentCard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Agent, AgentAction } from '../types';

type ActionType = 'web_scraping' | 'read_sheet' | 'write_sheet' | 'send_message';
type WizardStep = 'basic' | 'knowledge' | 'actions';

interface SimpleAction {
  id: string;
  type: ActionType;
  name: string;
  config: {
    url?: string;
    sheetUrl?: string;
    sheetName?: string;
    message?: string;
    recipient?: string;
  };
}

export const AgentsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');

  // Form data
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [actions, setActions] = useState<SimpleAction[]>([]);

  // Action editor
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
  const [actionConfig, setActionConfig] = useState({
    name: '',
    url: '',
    sheetUrl: '',
    sheetName: '',
    message: '',
    recipient: ''
  });

  // Mock knowledge bases
  const availableKnowledgeBases = [
    { id: 'kb1', title: 'Manual de Vendas 2024', docs: 12 },
    { id: 'kb2', title: 'Políticas de Reembolso', docs: 5 },
    { id: 'kb3', title: 'FAQ Produtos', docs: 20 },
  ];

  // Mock agents
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Agente de Vendas',
      role: 'Sales',
      description: 'Qualifica leads e agenda reuniões',
      model: 'gpt-4o',
      status: 'active',
      avatarColor: 'bg-orange-500',
      tags: ['Vendas'],
      actions: []
    },
    {
      id: '2',
      name: 'Suporte ao Cliente',
      role: 'Support',
      description: 'Atende dúvidas e resolve problemas',
      model: 'gpt-4o',
      status: 'active',
      avatarColor: 'bg-blue-500',
      tags: ['Suporte'],
      actions: []
    }
  ]);

  const actionTypes = [
    {
      type: 'web_scraping' as ActionType,
      name: 'Buscar na Web',
      icon: Globe,
      color: 'purple',
      description: 'Extrair dados de um site específico'
    },
    {
      type: 'read_sheet' as ActionType,
      name: 'Ler Planilha',
      icon: Table,
      color: 'emerald',
      description: 'Consultar dados em uma planilha'
    },
    {
      type: 'write_sheet' as ActionType,
      name: 'Escrever Planilha',
      icon: Edit3,
      color: 'blue',
      description: 'Adicionar ou editar dados na planilha'
    },
    {
      type: 'send_message' as ActionType,
      name: 'Enviar Mensagem',
      icon: MessageSquare,
      color: 'amber',
      description: 'Notificar via WhatsApp, SMS ou Email'
    }
  ];

  const getActionTypeInfo = (type: ActionType) => actionTypes.find(a => a.type === type)!;

  const handleOpenModal = () => {
    setAgentName('');
    setAgentDescription('');
    setKnowledgeBaseId('');
    setActions([]);
    setCurrentStep('basic');
    setIsModalOpen(true);
  };

  const handleNextStep = () => {
    if (currentStep === 'basic') setCurrentStep('knowledge');
    else if (currentStep === 'knowledge') setCurrentStep('actions');
  };

  const handlePrevStep = () => {
    if (currentStep === 'knowledge') setCurrentStep('basic');
    else if (currentStep === 'actions') setCurrentStep('knowledge');
  };

  const handleStartAddAction = (type: ActionType) => {
    setSelectedActionType(type);
    setActionConfig({
      name: '',
      url: '',
      sheetUrl: '',
      sheetName: '',
      message: '',
      recipient: ''
    });
    setIsAddingAction(true);
  };

  const handleSaveAction = () => {
    if (!selectedActionType || !actionConfig.name) return;

    const newAction: SimpleAction = {
      id: Math.random().toString(),
      type: selectedActionType,
      name: actionConfig.name,
      config: {
        url: actionConfig.url,
        sheetUrl: actionConfig.sheetUrl,
        sheetName: actionConfig.sheetName,
        message: actionConfig.message,
        recipient: actionConfig.recipient
      }
    };

    setActions([...actions, newAction]);
    setIsAddingAction(false);
    setSelectedActionType(null);
  };

  const handleDeleteAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const handleSaveAgent = () => {
    const newAgent: Agent = {
      id: Math.random().toString(),
      name: agentName || 'Novo Agente',
      description: agentDescription || 'Sem descrição',
      role: 'General',
      model: 'gpt-4o',
      status: 'active',
      avatarColor: 'bg-indigo-500',
      tags: ['Novo'],
      actions: []
    };
    setAgents([...agents, newAgent]);
    setIsModalOpen(false);
  };

  const handleDeleteAgent = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este agente?')) {
      setAgents(agents.filter(agent => agent.id !== id));
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[
        { id: 'basic', label: '1. Básico' },
        { id: 'knowledge', label: '2. Conhecimento' },
        { id: 'actions', label: '3. Ações' }
      ].map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              currentStep === step.id
                ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                : step.id === 'basic' || (step.id === 'knowledge' && currentStep === 'actions')
                ? 'bg-emerald-600 text-white'
                : 'bg-[#262626] text-neutral-500'
            }`}>
              {step.id === 'basic' || (step.id === 'knowledge' && currentStep === 'actions') ?
                <Check size={16} /> : index + 1
              }
            </div>
            <span className={`text-sm font-medium ${currentStep === step.id ? 'text-white' : 'text-neutral-500'}`}>
              {step.label}
            </span>
          </div>
          {index < 2 && <ArrowRight size={16} className="text-neutral-700" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Agentes</h2>
          <p className="text-neutral-400">Crie e gerencie seus assistentes inteligentes</p>
        </div>
        <Button icon={Plus} onClick={handleOpenModal}>
          Novo Agente
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <button
          onClick={handleOpenModal}
          className="group flex flex-col items-center justify-center min-h-[280px] rounded-xl border-2 border-dashed border-[#262626] hover:border-indigo-500/50 bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus size={32} className="text-neutral-600 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-300 group-hover:text-white">Criar Novo</h3>
        </button>

        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onDelete={handleDeleteAgent} />
        ))}
      </div>

      {/* Wizard Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Agente"
        size="lg"
      >
        <div className="flex flex-col h-[70vh]">
          {renderStepIndicator()}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* STEP 1: BASIC */}
            {currentStep === 'basic' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-900/20 border-2 border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                    <Bot size={40} className="text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Informações Básicas</h3>
                  <p className="text-sm text-neutral-400">Defina o nome e propósito do seu agente</p>
                </div>

                <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Nome do Agente *
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="Ex: Assistente de Vendas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      O que este agente faz?
                    </label>
                    <textarea
                      rows={3}
                      value={agentDescription}
                      onChange={(e) => setAgentDescription(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none resize-none"
                      placeholder="Ex: Qualifica leads, agenda reuniões e envia propostas comerciais"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: KNOWLEDGE */}
            {currentStep === 'knowledge' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-purple-900/20 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                    <Database size={40} className="text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Base de Conhecimento</h3>
                  <p className="text-sm text-neutral-400">Conecte documentos para o agente consultar</p>
                </div>

                <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-6">
                  {knowledgeBaseId ? (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-3 bg-purple-950/30 border border-purple-900/50 rounded-lg px-6 py-4 mb-4">
                        <Database size={24} className="text-purple-400" />
                        <div className="text-left">
                          <div className="font-bold text-white">
                            {availableKnowledgeBases.find(kb => kb.id === knowledgeBaseId)?.title}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {availableKnowledgeBases.find(kb => kb.id === knowledgeBaseId)?.docs} documentos
                          </div>
                        </div>
                        <button
                          onClick={() => setKnowledgeBaseId('')}
                          className="ml-4 text-neutral-500 hover:text-red-400"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500">
                        O agente pode consultar estes documentos para responder perguntas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-neutral-400 mb-4">
                        Selecione uma base de conhecimento (opcional)
                      </p>
                      {availableKnowledgeBases.map(kb => (
                        <button
                          key={kb.id}
                          onClick={() => setKnowledgeBaseId(kb.id)}
                          className="w-full flex items-center gap-4 p-4 bg-[#141414] border border-[#262626] hover:border-purple-500/50 rounded-lg transition-all text-left group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-purple-900/20 border border-purple-900/30 flex items-center justify-center group-hover:bg-purple-900/30 transition-colors">
                            <Database size={24} className="text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{kb.title}</div>
                            <div className="text-xs text-neutral-500">{kb.docs} documentos indexados</div>
                          </div>
                          <ArrowRight size={20} className="text-neutral-600 group-hover:text-purple-400 transition-colors" />
                        </button>
                      ))}

                      <button className="w-full p-4 border-2 border-dashed border-[#262626] hover:border-indigo-500/50 rounded-lg text-sm text-neutral-500 hover:text-white transition-colors">
                        Pular (sem conhecimento)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: ACTIONS */}
            {currentStep === 'actions' && !isAddingAction && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-amber-900/20 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                    <Globe size={40} className="text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Habilidades do Agente</h3>
                  <p className="text-sm text-neutral-400">Escolha o que o agente pode fazer</p>
                </div>

                {/* Actions List */}
                {actions.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {actions.map(action => {
                      const info = getActionTypeInfo(action.type);
                      const Icon = info.icon;
                      return (
                        <div key={action.id} className="flex items-center gap-3 bg-[#0F0F0F] border border-[#262626] rounded-lg p-4">
                          <div className={`w-10 h-10 rounded-lg bg-${info.color}-900/20 border border-${info.color}-900/30 flex items-center justify-center`}>
                            <Icon size={20} className={`text-${info.color}-400`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm">{action.name}</div>
                            <div className="text-xs text-neutral-500">{info.name}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteAction(action.id)}
                            className="text-neutral-500 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Types Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {actionTypes.map(actionType => {
                    const Icon = actionType.icon;
                    return (
                      <button
                        key={actionType.type}
                        onClick={() => handleStartAddAction(actionType.type)}
                        className={`p-6 bg-[#0F0F0F] border border-[#262626] hover:border-${actionType.color}-500/50 rounded-xl text-center group transition-all`}
                      >
                        <div className={`w-16 h-16 rounded-xl bg-${actionType.color}-900/20 border border-${actionType.color}-900/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon size={32} className={`text-${actionType.color}-400`} />
                        </div>
                        <div className="font-bold text-white mb-1 text-sm">{actionType.name}</div>
                        <div className="text-xs text-neutral-500">{actionType.description}</div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full p-3 border-2 border-dashed border-[#262626] hover:border-indigo-500/50 rounded-lg text-sm text-neutral-500 hover:text-white transition-colors"
                >
                  Pular (sem habilidades)
                </button>
              </div>
            )}

            {/* ACTION CONFIG */}
            {currentStep === 'actions' && isAddingAction && selectedActionType && (
              <div className="space-y-6 animate-fade-in">
                {(() => {
                  const info = getActionTypeInfo(selectedActionType);
                  const Icon = info.icon;
                  return (
                    <>
                      <div className="text-center mb-6">
                        <div className={`w-16 h-16 rounded-xl bg-${info.color}-900/20 border border-${info.color}-900/30 flex items-center justify-center mx-auto mb-3`}>
                          <Icon size={32} className={`text-${info.color}-400`} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{info.name}</h3>
                        <p className="text-sm text-neutral-400">{info.description}</p>
                      </div>

                      <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Nome da ação *
                          </label>
                          <input
                            type="text"
                            value={actionConfig.name}
                            onChange={(e) => setActionConfig({...actionConfig, name: e.target.value})}
                            className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                            placeholder="Ex: Buscar preços no site"
                          />
                        </div>

                        {selectedActionType === 'web_scraping' && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                              URL do site *
                            </label>
                            <input
                              type="url"
                              value={actionConfig.url}
                              onChange={(e) => setActionConfig({...actionConfig, url: e.target.value})}
                              className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                              placeholder="https://exemplo.com.br"
                            />
                          </div>
                        )}

                        {(selectedActionType === 'read_sheet' || selectedActionType === 'write_sheet') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                URL da Planilha *
                              </label>
                              <input
                                type="url"
                                value={actionConfig.sheetUrl}
                                onChange={(e) => setActionConfig({...actionConfig, sheetUrl: e.target.value})}
                                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="https://docs.google.com/spreadsheets/..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Nome da aba
                              </label>
                              <input
                                type="text"
                                value={actionConfig.sheetName}
                                onChange={(e) => setActionConfig({...actionConfig, sheetName: e.target.value})}
                                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="Ex: Leads, Vendas..."
                              />
                            </div>
                          </>
                        )}

                        {selectedActionType === 'send_message' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Destinatário *
                              </label>
                              <input
                                type="text"
                                value={actionConfig.recipient}
                                onChange={(e) => setActionConfig({...actionConfig, recipient: e.target.value})}
                                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                                placeholder="+55 11 99999-9999"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Mensagem padrão
                              </label>
                              <textarea
                                rows={3}
                                value={actionConfig.message}
                                onChange={(e) => setActionConfig({...actionConfig, message: e.target.value})}
                                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:outline-none resize-none"
                                placeholder="Ex: Olá! Temos uma novidade..."
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => setIsAddingAction(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSaveAction}
                          className="flex-1"
                          icon={Check}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-6 mt-4 border-t border-[#262626] flex justify-between">
            <Button
              variant="ghost"
              onClick={currentStep === 'basic' ? () => setIsModalOpen(false) : handlePrevStep}
            >
              {currentStep === 'basic' ? 'Cancelar' : 'Voltar'}
            </Button>

            {currentStep === 'actions' ? (
              <Button onClick={handleSaveAgent} icon={Check}>
                Criar Agente
              </Button>
            ) : (
              <Button onClick={handleNextStep}>
                Próximo
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
