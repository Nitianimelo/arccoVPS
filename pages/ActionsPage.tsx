import React, { useState } from 'react';
import { Agent, AgentAction } from '../types';
import { Zap, Users, Shield, CheckCircle2, Play, Plus, Table, MessageSquare, Globe, MoreHorizontal, Clock, ArrowRight, Eye, Edit3, X, Brain, AlertTriangle, Link2, CornerDownRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

export const ActionsPage: React.FC = () => {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal Wizard State
    const [actionStep, setActionStep] = useState<'category' | 'tool' | 'config'>('category');
    const [selectedCategory, setSelectedCategory] = useState<'read' | 'act' | null>(null);
    const [selectedType, setSelectedType] = useState<AgentAction['type'] | null>(null);

    // Advanced Trigger State
    const [triggerType, setTriggerType] = useState<AgentAction['triggerType']>('auto');
    const [requireConfirmation, setRequireConfirmation] = useState(false);
    const [parentActionId, setParentActionId] = useState<string>(''); // For chaining
    
    // State to track if we are creating a chain from a specific action
    const [chainSourceAction, setChainSourceAction] = useState<AgentAction | null>(null);

    // Spreadsheet Specific State
    const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState(false);
    const [newSpreadsheetData, setNewSpreadsheetData] = useState({ name: '', url: '' });
    
    // Mock Data: Agents
    const agents: Agent[] = [
        {
          id: '1',
          name: 'Sales SDR',
          role: 'Sales',
          description: 'Qualificação de leads inbound e agendamento de reuniões.',
          model: 'gemini-1.5-pro',
          status: 'active',
          avatarColor: 'bg-orange-500',
          tags: ['Vendas', 'Outbound'],
          actions: []
        },
        {
          id: '2',
          name: 'Suporte L1',
          role: 'Support',
          description: 'Atendimento inicial ao cliente e triagem de tickets.',
          model: 'gemini-1.5-flash',
          status: 'active',
          avatarColor: 'bg-blue-500',
          tags: ['Atendimento', '24/7'],
          actions: []
        }
    ];

    // Mock Data: Actions
    const [actions, setActions] = useState<any[]>([
        {
            id: '1',
            agentId: '1',
            category: 'read',
            type: 'web_extract',
            name: 'Consultar LinkedIn',
            triggerType: 'auto',
            systemInstruction: 'Ao identificar empresa do lead.',
            requireConfirmation: false,
            details: 'Busca dados da empresa',
            status: 'active',
            lastRun: '10 min atrás'
        },
        {
            id: '2',
            agentId: '1',
            category: 'act',
            type: 'spreadsheet',
            name: 'Salvar Dados Enriquecidos',
            triggerType: 'action_complete',
            parentActionId: '1', // Chains to 'Consultar LinkedIn'
            systemInstruction: 'Após extração bem sucedida.',
            requireConfirmation: false,
            details: 'Atualiza "Leads 2024"',
            status: 'active',
            lastRun: '10 min atrás'
        },
        {
            id: '3',
            agentId: '2',
            category: 'read',
            type: 'web_extract',
            name: 'Consultar Status Pedido',
            triggerType: 'explicit',
            systemInstruction: 'Quando o cliente perguntar "onde está meu pedido?".',
            requireConfirmation: false,
            details: 'Busca em api.loja.com',
            status: 'paused',
            lastRun: 'Ontem'
        }
    ]);

    // Mock Data: Spreadsheets
    const [availableSpreadsheets, setAvailableSpreadsheets] = useState([
        { id: 'sp1', name: 'Leads 2024 - Q3', url: 'https://docs.google.com/...' },
        { id: 'sp2', name: 'Controle de Estoque', url: 'https://docs.google.com/...' },
        { id: 'sp3', name: 'Lista de Clientes VIP', url: 'https://docs.google.com/...' },
    ]);
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState('');

    const getIcon = (role: string) => {
        if (role.includes('Sales')) return <Zap size={24} />;
        if (role.includes('Support')) return <Shield size={24} />;
        return <Users size={24} />;
    };

    const getActionIcon = (type: AgentAction['type']) => {
        switch(type) {
            case 'spreadsheet': return <Table size={20} className="text-emerald-500" />;
            case 'message': return <MessageSquare size={20} className="text-blue-500" />;
            case 'web_extract': return <Globe size={20} className="text-purple-500" />;
            default: return <Zap size={20} />;
        }
    };

    const handleOpenModal = () => {
        setActionStep('category');
        setSelectedCategory(null);
        setSelectedType(null);
        setIsModalOpen(true);
        // Reset states
        setIsCreatingSpreadsheet(false);
        setSelectedSpreadsheetId('');
        setTriggerType('auto');
        setParentActionId('');
        setRequireConfirmation(false);
        setChainSourceAction(null);
    };

    // Called when clicking "Next Step" on a card
    const handleChainAction = (sourceAction: AgentAction) => {
        handleOpenModal();
        setChainSourceAction(sourceAction);
        setTriggerType('action_complete');
        setParentActionId(sourceAction.id);
        // We still let user choose Category -> Tool, but Trigger will be locked/preset
    };

    const handleSelectCategory = (cat: 'read' | 'act') => {
        setSelectedCategory(cat);
        setActionStep('tool');
    };

    const handleSelectType = (type: AgentAction['type']) => {
        setSelectedType(type);
        setActionStep('config');
    };

    const handleCreateSpreadsheet = () => {
        if (newSpreadsheetData.name && newSpreadsheetData.url) {
            const newId = Math.random().toString();
            setAvailableSpreadsheets([...availableSpreadsheets, { id: newId, ...newSpreadsheetData }]);
            setSelectedSpreadsheetId(newId);
            setIsCreatingSpreadsheet(false);
            setNewSpreadsheetData({ name: '', url: '' });
        }
    };

    const handleSaveAction = () => {
        // Here we would create the action linking it to parentActionId if set
        setIsModalOpen(false);
    };

    const selectedAgent = agents.find(a => a.id === selectedAgentId);
    const displayedActions = actions.filter(a => a.agentId === selectedAgentId);
    // Helper to find action name
    const getActionName = (id?: string) => actions.find(a => a.id === id)?.name || 'Ação desconhecida';

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Ações & Integrações</h2>
                <p className="text-neutral-400">Automatize tarefas conectando seus agentes a ferramentas externas.</p>
            </div>
            
            {/* Agent Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {agents.map((agent) => (
                    <div 
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`group relative border rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                            selectedAgentId === agent.id 
                            ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500' 
                            : 'bg-[#0F0F0F] border-[#262626] hover:border-neutral-600 hover:bg-[#141414]'
                        }`}
                    >
                        {selectedAgentId === agent.id && (
                            <div className="absolute top-4 right-4 text-indigo-500 animate-in fade-in zoom-in duration-200">
                                <CheckCircle2 size={20} />
                            </div>
                        )}
                        
                        <div className={`w-12 h-12 rounded-lg ${agent.avatarColor} bg-opacity-10 flex items-center justify-center border border-white/5 mb-4`}>
                            <div className={agent.avatarColor.replace('bg-', 'text-')}>
                                {getIcon(agent.role)}
                            </div>
                        </div>

                        <h3 className={`text-lg font-bold mb-1 transition-colors ${selectedAgentId === agent.id ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                            {agent.name}
                        </h3>
                        <p className="text-sm text-neutral-400 line-clamp-1">
                            {agent.description}
                        </p>
                    </div>
                ))}
            </div>

            {selectedAgentId ? (
                <div className="animate-fade-in-up">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                         <div className="flex items-center gap-3">
                             <h3 className="text-xl font-bold text-white">Ações Habilitadas</h3>
                             <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded-full">{displayedActions.length}</span>
                         </div>
                         <Button icon={Plus} onClick={handleOpenModal}>Nova Ação</Button>
                    </div>

                    {displayedActions.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {displayedActions.map(action => (
                                <div key={action.id} className="bg-[#0A0A0A] border border-[#262626] hover:border-indigo-500/30 rounded-xl p-6 transition-all group relative overflow-hidden">
                                    {/* Link Connector Visual for Child Actions */}
                                    {action.triggerType === 'action_complete' && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-4 pl-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center relative">
                                                {getActionIcon(action.type)}
                                                {action.triggerType === 'action_complete' && (
                                                    <div className="absolute -top-1 -left-1 bg-[#0A0A0A] rounded-full border border-[#262626] p-0.5">
                                                        <Link2 size={10} className="text-neutral-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white flex items-center gap-2">
                                                    {action.name}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${
                                                        action.category === 'read' 
                                                            ? 'border-indigo-900/50 text-indigo-400 bg-indigo-950/20' 
                                                            : 'border-amber-900/50 text-amber-500 bg-amber-950/20'
                                                    }`}>
                                                        {action.category === 'read' ? 'Leitura' : 'Execução'}
                                                    </span>
                                                </h4>
                                                
                                                {/* TRIGGER DISPLAY */}
                                                <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                                    {action.triggerType === 'action_complete' ? (
                                                        <span className="flex items-center gap-1 text-indigo-400 font-medium bg-indigo-950/10 px-1.5 py-0.5 rounded">
                                                            <Link2 size={10} />
                                                            Após: {getActionName(action.parentActionId)}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Brain size={12} className="text-indigo-500" />
                                                            {action.triggerType === 'auto' ? 'Automático' : action.triggerType === 'explicit' ? 'Sob Demanda' : 'Agendado'}
                                                        </>
                                                    )}
                                                    
                                                    {action.requireConfirmation && <span className="text-amber-500 flex items-center gap-1 ml-2"><AlertTriangle size={10} /> Confirmação</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* CHAIN ACTION BUTTON */}
                                            <button 
                                                onClick={() => handleChainAction(action)}
                                                className="text-neutral-500 hover:text-indigo-400 p-1.5 rounded hover:bg-indigo-950/20 transition-colors flex items-center gap-1"
                                                title="Adicionar próximo passo"
                                            >
                                                <CornerDownRight size={16} />
                                            </button>

                                            <div className={`w-2 h-2 rounded-full ${action.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-600'}`}></div>
                                            <button className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#141414] rounded-lg p-3 mb-4 ml-2">
                                        <p className="text-sm text-neutral-300 font-mono line-clamp-2">{action.systemInstruction}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 ml-2">
                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                            <Clock size={12} />
                                            Última execução: {action.lastRun}
                                        </span>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-neutral-400 hover:text-white text-xs font-medium px-2 py-1 rounded hover:bg-neutral-800">Editar</button>
                                            <button className="text-neutral-400 hover:text-red-400 text-xs font-medium px-2 py-1 rounded hover:bg-red-950/20">Excluir</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border border-dashed border-[#262626] rounded-xl bg-[#0A0A0A]/50 p-12 flex flex-col items-center justify-center text-neutral-500">
                            <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mb-4">
                                <Zap size={32} className="text-neutral-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Nenhuma ação configurada</h3>
                            <p className="max-w-md text-center text-sm mb-6">
                                Este agente ainda não possui ações automatizadas. Crie a primeira para integrar planilhas ou enviar mensagens.
                            </p>
                            <Button variant="secondary" icon={Plus} onClick={handleOpenModal}>Criar Primeira Ação</Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 py-20">
                    <div className="w-20 h-20 rounded-2xl bg-[#0F0F0F] border border-[#262626] flex items-center justify-center mb-6 animate-pulse">
                        <Play size={40} className="text-neutral-700" />
                    </div>
                    <p>Selecione um agente acima para gerenciar suas ações.</p>
                </div>
            )}

            {/* --- NEW ACTION MODAL --- */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={
                    actionStep === 'category' ? "Nova Ação: Categoria" :
                    actionStep === 'tool' ? "Selecione a Ferramenta" :
                    "Configurar Inteligência e Ação"
                }
                size="lg"
            >
                {/* --- STEP 1: CATEGORY --- */}
                {actionStep === 'category' && (
                    <div className="space-y-6">
                         {chainSourceAction && (
                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
                                <Link2 size={20} className="text-indigo-400" />
                                <div>
                                    <p className="text-white text-sm font-bold">Encadeando Ação</p>
                                    <p className="text-neutral-400 text-xs">Esta nova ação será executada logo após: <span className="text-white">{chainSourceAction.name}</span></p>
                                </div>
                            </div>
                        )}
                        <p className="text-neutral-400 text-center mb-4">Qual é o objetivo principal desta ação?</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                            <button 
                                onClick={() => handleSelectCategory('read')}
                                className="flex flex-col items-center p-8 bg-[#141414] border border-[#262626] hover:border-indigo-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-indigo-900/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-indigo-900/30">
                                    <Eye size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">READ (Consultar)</h3>
                                <p className="text-sm text-neutral-400">
                                    O agente apenas lê informações de fontes externas (Web ou Planilhas).
                                </p>
                            </button>

                            <button 
                                onClick={() => handleSelectCategory('act')}
                                className="flex flex-col items-center p-8 bg-[#141414] border border-[#262626] hover:border-amber-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-amber-900/20 text-amber-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-amber-900/30">
                                    <Zap size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">ACT (Executar)</h3>
                                <p className="text-sm text-neutral-400">
                                    O agente executa ações reais, como enviar mensagens ou alterar dados.
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STEP 2: TOOL SELECTION --- */}
                {actionStep === 'tool' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-6 text-sm text-neutral-500">
                            <button onClick={() => setActionStep('category')} className="hover:text-white">Categorias</button>
                            <ArrowRight size={14} />
                            <span className="text-white capitalize font-medium">{selectedCategory === 'read' ? 'READ (Consultar)' : 'ACT (Executar)'}</span>
                        </div>
                        
                        <p className="text-white font-medium mb-4">Escolha a ferramenta:</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Read Tools */}
                            {selectedCategory === 'read' && (
                                <>
                                    <button 
                                        onClick={() => handleSelectType('web_extract')}
                                        className="flex items-center gap-4 p-5 bg-[#141414] border border-[#262626] hover:border-purple-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Extração Web</h4>
                                            <p className="text-xs text-neutral-400 mt-1">Ler dados de sites ou APIs.</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => handleSelectType('spreadsheet')}
                                        className="flex items-center gap-4 p-5 bg-[#141414] border border-[#262626] hover:border-emerald-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Table size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Ler Planilha</h4>
                                            <p className="text-xs text-neutral-400 mt-1">Consultar linhas e dados no Google Sheets.</p>
                                        </div>
                                    </button>
                                </>
                            )}

                            {/* Act Tools */}
                            {selectedCategory === 'act' && (
                                <>
                                    <button 
                                        onClick={() => handleSelectType('spreadsheet')}
                                        className="flex items-center gap-4 p-5 bg-[#141414] border border-[#262626] hover:border-emerald-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Edit3 size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Editar Planilha</h4>
                                            <p className="text-xs text-neutral-400 mt-1">Adicionar, alterar ou remover linhas.</p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => handleSelectType('message')}
                                        className="flex items-center gap-4 p-5 bg-[#141414] border border-[#262626] hover:border-blue-500/50 hover:bg-[#1A1A1A] rounded-xl transition-all group text-left"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <MessageSquare size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Enviar Mensagem</h4>
                                            <p className="text-xs text-neutral-400 mt-1">WhatsApp, SMS ou Email ativo.</p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* --- STEP 3: CONFIGURATION --- */}
                {actionStep === 'config' && (
                    <div className="flex flex-col h-full max-h-[70vh]">
                        {/* Header Step 3 */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#262626] flex-shrink-0">
                            <button onClick={() => setActionStep('tool')} className="text-neutral-500 hover:text-white">
                                <ArrowRight size={20} className="rotate-180" />
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="bg-[#1A1A1A] p-1.5 rounded-md">
                                    {getActionIcon(selectedType!)}
                                </div>
                                <span className="font-bold text-white capitalize">
                                    Configurar {selectedType?.replace('_', ' ')}
                                    <span className="text-neutral-500 font-normal ml-2 text-sm">
                                        ({selectedCategory === 'read' ? 'Modo Leitura' : 'Modo Ação'})
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                            
                            {/* 1. INTELLIGENCE CONFIG (THE SYSTEM PROMPT FOR ACTION) */}
                            <section className="bg-[#141414]/50 border border-[#262626] rounded-xl p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain size={18} className="text-indigo-500" />
                                    <h4 className="font-bold text-white text-sm uppercase tracking-wide">Inteligência & Gatilho</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Tipo de Gatilho</label>
                                        <select 
                                            value={triggerType}
                                            onChange={(e) => setTriggerType(e.target.value as any)}
                                            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="auto">Automático (Decisão por Prompt)</option>
                                            <option value="explicit">Solicitação Explícita do Usuário</option>
                                            <option value="scheduled">Agendado / Tempo</option>
                                            <option value="action_complete">🔗 Após conclusão de outra ação</option>
                                        </select>
                                    </div>
                                    
                                    {/* Action Chain Selector */}
                                    {triggerType === 'action_complete' && (
                                        <div className="md:col-span-2 animate-fade-in">
                                             <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Executar após qual ação?</label>
                                             <select 
                                                value={parentActionId}
                                                onChange={(e) => setParentActionId(e.target.value)}
                                                className="w-full bg-[#1A1A1A] border border-indigo-500/50 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 cursor-pointer"
                                            >
                                                <option value="">-- Selecione a ação pai --</option>
                                                {displayedActions.map(act => (
                                                    <option key={act.id} value={act.id}>{act.name} ({act.type})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex items-end pb-1 md:col-span-2">
                                         <label className="flex items-center gap-3 cursor-pointer group">
                                            <div 
                                                onClick={() => setRequireConfirmation(!requireConfirmation)}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${requireConfirmation ? 'bg-amber-600' : 'bg-[#262626]'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${requireConfirmation ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Exigir Confirmação Antes de Executar</span>
                                         </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Instrução de Gatilho (System Prompt)</label>
                                    <textarea 
                                        rows={3} 
                                        placeholder={
                                            triggerType === 'auto' ? "Ex: Execute sempre que o usuário fornecer o email." :
                                            triggerType === 'action_complete' ? "Ex: Use os dados extraídos da ação anterior para preencher a planilha." :
                                            "Ex: Execute todos os dias às 09:00."
                                        }
                                        className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                                    />
                                </div>
                            </section>

                            <div className="border-t border-[#262626]"></div>

                            {/* 2. SPECIFIC TOOL CONFIG */}
                            <section className="space-y-4">
                                <h4 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                                    <Zap size={16} /> Configuração da Ferramenta
                                </h4>
                                
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Nome Identificador da Ação</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: SaveLeadSheet"
                                        className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                {/* Spreadsheet Specific */}
                                {selectedType === 'spreadsheet' && (
                                    <div className="space-y-6 animate-fade-in">
                                        
                                        {/* Spreadsheet Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">Selecionar Planilha</label>
                                            
                                            {!isCreatingSpreadsheet ? (
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={selectedSpreadsheetId}
                                                        onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                                                        className="flex-1 bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                                    >
                                                        <option value="">-- Escolha uma planilha --</option>
                                                        {availableSpreadsheets.map(sp => (
                                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                                        ))}
                                                    </select>
                                                    <Button 
                                                        type="button" 
                                                        onClick={() => setIsCreatingSpreadsheet(true)}
                                                        icon={Plus}
                                                        variant="secondary"
                                                        title="Criar Nova Planilha"
                                                    >
                                                        Nova
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="bg-[#141414] border border-indigo-500/50 rounded-lg p-4 animate-fade-in-up">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-sm font-bold text-white">Criar Nova Planilha</h4>
                                                        <button onClick={() => setIsCreatingSpreadsheet(false)} className="text-neutral-500 hover:text-white">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nome da Planilha (ex: Clientes 2024)"
                                                            value={newSpreadsheetData.name}
                                                            onChange={(e) => setNewSpreadsheetData({...newSpreadsheetData, name: e.target.value})}
                                                            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="URL do Google Sheets"
                                                            value={newSpreadsheetData.url}
                                                            onChange={(e) => setNewSpreadsheetData({...newSpreadsheetData, url: e.target.value})}
                                                            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500"
                                                        />
                                                        <div className="flex justify-end pt-1">
                                                            <Button size="sm" onClick={handleCreateSpreadsheet} icon={CheckCircle2}>Salvar Planilha</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Operation Configuration */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-400 mb-2">Página (Tab)</label>
                                                <input type="text" placeholder="Página1" className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-400 mb-2">Operação ({selectedCategory === 'read' ? 'Leitura' : 'Escrita'})</label>
                                                <select className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500">
                                                    {selectedCategory === 'act' ? (
                                                        <>
                                                            <option>Adicionar Linha</option>
                                                            <option>Alterar Linha</option>
                                                            <option>Excluir Linha</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option>Consultar Linha</option>
                                                            <option>Ler Toda a Planilha</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Message Specific */}
                                {selectedType === 'message' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-400 mb-2">Canal</label>
                                                <select className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500">
                                                    <option>WhatsApp</option>
                                                    <option>Email</option>
                                                    <option>SMS</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-neutral-400 mb-2">Destinatário</label>
                                                <input type="text" placeholder="+55..." className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:border-indigo-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">Objetivo/Contexto da Mensagem</label>
                                            <textarea 
                                                rows={3} 
                                                placeholder="Ex: Envie um resumo do agendamento confirmado contendo data e hora."
                                                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                                            />
                                            <p className="text-xs text-neutral-500 mt-1">
                                                O conteúdo exato da mensagem será gerado pelo Agente com base neste objetivo e no contexto da conversa.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Web Extract Specific */}
                                {selectedType === 'web_extract' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">URL Alvo ou Endpoint API</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                                <input 
                                                    type="text" 
                                                    placeholder="https://api.exemplo.com/dados"
                                                    className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-400 mb-2">O que extrair?</label>
                                            <textarea 
                                                rows={2} 
                                                placeholder="Descreva o dado que o agente deve procurar nesta página/API..."
                                                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-[#262626] flex-shrink-0">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveAction}>Salvar Ação</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
