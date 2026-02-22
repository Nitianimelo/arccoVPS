import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingCart,
  HeadphonesIcon,
  GraduationCap,
  MessageSquare,
  Database,
  Smartphone,
  Settings,
  Sparkles,
  Info
} from 'lucide-react';
import { TalkAgent, TalkAgentType, ViewState, AgentPersonality } from '../../types';
import { agentService } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

interface TalkSetupWizardProps {
  agentType: TalkAgentType;
  userEmail: string;
  onComplete: (agent: Partial<TalkAgent>, options?: { connectWhatsApp?: boolean }) => void;
  onCancel: () => void;
  onNavigate: (view: ViewState) => void;
}

type WizardStep = 'basics' | 'personality' | 'knowledge' | 'whatsapp' | 'review';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: 'basics',
    title: 'Informações Básicas',
    description: 'Nome e descrição do agente',
    icon: <Settings size={18} />
  },
  {
    id: 'personality',
    title: 'Instruções',
    description: 'Configure o comportamento do agente',
    icon: <Sparkles size={18} />
  },
  {
    id: 'knowledge',
    title: 'Conhecimento',
    description: 'Base de dados',
    icon: <Database size={18} />
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Conectar número',
    icon: <Smartphone size={18} />
  },
  {
    id: 'review',
    title: 'Revisão',
    description: 'Confirmar configuração',
    icon: <Check size={18} />
  }
];

const TYPE_CONFIG = {
  sales: {
    label: 'Vendas',
    color: 'indigo',
    bgClass: 'bg-indigo-900/30',
    textClass: 'text-indigo-400',
    icon: ShoppingCart,
    defaultGreeting:
      'Olá! Seja bem-vindo(a)! Sou assistente de vendas e estou aqui para ajudá-lo(a) a encontrar a melhor solução para você. Como posso ajudar?',
    defaultInstructions:
      'Foque em entender as necessidades do cliente, qualificar o lead e guiá-lo pelo funil de vendas. Seja proativo em oferecer soluções e agendar demonstrações.'
  },
  support: {
    label: 'Suporte',
    color: 'emerald',
    bgClass: 'bg-emerald-900/30',
    textClass: 'text-emerald-400',
    icon: HeadphonesIcon,
    defaultGreeting:
      'Olá! Bem-vindo(a) ao suporte. Estou aqui para ajudá-lo(a) a resolver qualquer dúvida ou problema. Como posso ajudar hoje?',
    defaultInstructions:
      'Priorize resolver o problema do cliente de forma rápida e eficiente. Mantenha um tom empático e profissional. Escale para um humano quando necessário.'
  },
  education: {
    label: 'Educação',
    color: 'amber',
    bgClass: 'bg-amber-900/30',
    textClass: 'text-amber-400',
    icon: GraduationCap,
    defaultGreeting:
      'Olá! Seja bem-vindo(a) à nossa plataforma de aprendizado! Estou aqui para guiá-lo(a) em sua jornada de conhecimento. Por onde gostaria de começar?',
    defaultInstructions:
      'Seja didático e paciente. Adapte as explicações ao nível do aluno. Incentive o progresso e celebre conquistas. Use exemplos práticos sempre que possível.'
  }
};

export const TalkSetupWizard: React.FC<TalkSetupWizardProps> = ({
  agentType,
  userEmail,
  onComplete,
  onCancel
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const typeConfig = TYPE_CONFIG[agentType];
  const TypeIcon = typeConfig.icon;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState<AgentPersonality>({
    greeting: typeConfig.defaultGreeting,
    tone: 'semiformal',
    useEmojis: true,
    responseLength: 'medium',
    language: 'pt-BR',
    customInstructions: typeConfig.defaultInstructions
  });
  const [skipKnowledge, setSkipKnowledge] = useState(false);
  const [skipWhatsApp, setSkipWhatsApp] = useState(false);
  const [connectWhatsAppAfter, setConnectWhatsAppAfter] = useState(false);

  // Instruções do agente
  const [instructions, setInstructions] = useState({
    oferta: '',
    clienteIdeal: '',
    qualificacao: '',
    conducao: '',
    tomLimites: '',
    objetivo: ''
  });

  // Prevent accidental navigation (F5/Refresh)
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'basics':
        return name.trim().length >= 3;
      case 'personality':
        return instructions.oferta.trim().length > 0 && instructions.objetivo.trim().length > 0;
      case 'knowledge':
        return true;
      case 'whatsapp':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    setIsSaving(true);

    // Salvar no Supabase
    const agentData = {
      nome: name,
      usuario: userEmail,
      tipo: agentType,
      user_config: {
        oferta: instructions.oferta,
        clienteIdeal: instructions.clienteIdeal,
        qualificacao: instructions.qualificacao,
        conducao: instructions.conducao,
        tomLimites: instructions.tomLimites,
        objetivo: instructions.objetivo
      }
    };

    console.log('=== SALVANDO AGENTE ===');
    console.log('Dados do agente:', JSON.stringify(agentData, null, 2));

    try {
      const { data, error } = await agentService.createAgent(agentData);

      if (error) {
        console.error('ERRO ao salvar agente:', error.message);
        showToast('Erro ao salvar agente: ' + error.message, 'error');
      } else {
        console.log('SUCESSO - Agente salvo:', data);
      }
    } catch (err) {
      console.error('ERRO catch:', err);
      showToast('Erro: ' + (err as Error).message, 'error');
    }

    // Combina as instruções no customInstructions
    const fullInstructions = `
OFERTA: ${instructions.oferta}

CLIENTE IDEAL: ${instructions.clienteIdeal}

QUALIFICAÇÃO: ${instructions.qualificacao}

CONDUÇÃO DA CONVERSA: ${instructions.conducao}

TOM E LIMITES: ${instructions.tomLimites}

OBJETIVO: ${instructions.objetivo}
    `.trim();

    const newAgent: Partial<TalkAgent> = {
      name,
      type: agentType,
      description: description || `Agente de ${typeConfig.label}`,
      status: 'configuring',
      personality: {
        ...personality,
        customInstructions: fullInstructions
      },
      stats: {
        totalConversations: 0,
        activeConversations: 0,
        resolvedConversations: 0,
        avgResponseTime: '--',
        satisfactionRate: 0
      }
    };

    setIsSaving(false);
    onComplete(newAgent, { connectWhatsApp: connectWhatsAppAfter });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Nome do Agente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Assistente de Vendas"
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                Mínimo de 3 caracteres. Este nome será usado internamente.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste agente..."
                rows={3}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${typeConfig.bgClass} flex items-center justify-center shrink-0`}
                >
                  <TypeIcon size={20} className={typeConfig.textClass} />
                </div>
                <div>
                  <h4 className="font-medium text-white">Agente de {typeConfig.label}</h4>
                  <p className="text-sm text-neutral-400 mt-1">
                    {agentType === 'sales' &&
                      'Focado em conversão, qualificação de leads e agendamento de reuniões.'}
                    {agentType === 'support' &&
                      'Focado em resolver problemas, responder dúvidas e manter a satisfação do cliente.'}
                    {agentType === 'education' &&
                      'Focado em ensinar, guiar o aprendizado e acompanhar o progresso dos alunos.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'personality':
        return (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {/* 1. OFERTA */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                1. OFERTA *
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                O que você vende e pra quem.
              </p>
              <textarea
                value={instructions.oferta}
                onChange={(e) => setInstructions({ ...instructions, oferta: e.target.value })}
                placeholder="Ex: Agente de WhatsApp para clínicas odontológicas converterem conversas em agendamentos."
                rows={2}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>

            {/* 2. CLIENTE IDEAL */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                2. CLIENTE IDEAL
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Quem é o cliente e qual a dor principal.
              </p>
              <textarea
                value={instructions.clienteIdeal}
                onChange={(e) => setInstructions({ ...instructions, clienteIdeal: e.target.value })}
                placeholder="Ex: Donos de clínicas odontológicas que perdem pacientes por demora no WhatsApp."
                rows={2}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>

            {/* 3. QUALIFICAÇÃO */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                3. QUALIFICAÇÃO
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Perguntas que o agente faz e quando vale a pena continuar.
              </p>
              <textarea
                value={instructions.qualificacao}
                onChange={(e) => setInstructions({ ...instructions, qualificacao: e.target.value })}
                placeholder={`Ex:\nPerguntas:\n– "Você já atende pacientes pelo WhatsApp hoje?"\n– "Quem decide sobre ferramentas na clínica?"\n\nLead bom quando:\n– é decisor\n– tem volume de atendimentos`}
                rows={4}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>

            {/* 4. CONDUÇÃO DA CONVERSA */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                4. CONDUÇÃO DA CONVERSA
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Como o agente conduz a conversa até o final.
              </p>
              <textarea
                value={instructions.conducao}
                onChange={(e) => setInstructions({ ...instructions, conducao: e.target.value })}
                placeholder={`Ex:\nFluxo: Abertura → Entender necessidade → Apresentar solução → Chamar para ação\n\nCTA: "Agendar uma conversa rápida de 15 minutos."`}
                rows={3}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>

            {/* 5. TOM E LIMITES */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                5. TOM E LIMITES
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Como o agente fala e o que ele nunca pode fazer.
              </p>
              <textarea
                value={instructions.tomLimites}
                onChange={(e) => setInstructions({ ...instructions, tomLimites: e.target.value })}
                placeholder={`Ex:\nTom: Profissional, direto, educado, sem promessas exageradas.\n\nNunca fazer:\n– prometer resultados financeiros\n– dar orientação médica ou jurídica\n– discutir ou pressionar`}
                rows={4}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>

            {/* 6. OBJETIVO */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <label className="block text-sm font-semibold text-white mb-1">
                6. OBJETIVO *
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Quando a conversa é considerada um sucesso.
              </p>
              <textarea
                value={instructions.objetivo}
                onChange={(e) => setInstructions({ ...instructions, objetivo: e.target.value })}
                placeholder="Ex: Consulta ou call agendada com data e horário definidos."
                rows={2}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm"
              />
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Database size={24} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Base de Conhecimento</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    Adicione documentos, FAQs e informações para que o agente possa responder com
                    precisão às perguntas dos clientes.
                  </p>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Configurar Base de Conhecimento
                    </button>
                    <button
                      onClick={() => setSkipKnowledge(true)}
                      className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors"
                    >
                      Configurar depois
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {skipKnowledge && (
              <div className="flex items-start gap-3 p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200">
                    Você pode configurar a base de conhecimento depois. O agente funcionará com
                    conhecimento limitado até que você adicione documentos.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <h4 className="font-medium text-white mb-3">O que você pode adicionar:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>Documentos PDF</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>Arquivos de texto</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>URLs de websites</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>FAQs personalizadas</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'whatsapp':
        return (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-900/30 flex items-center justify-center shrink-0">
                  <Smartphone size={24} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Conectar WhatsApp</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    Escaneie o QR Code com seu WhatsApp Business para conectar o agente e começar
                    a receber mensagens automaticamente.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setConnectWhatsAppAfter(true);
                        setSkipWhatsApp(false);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Conectar WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setSkipWhatsApp(true);
                        setConnectWhatsAppAfter(false);
                      }}
                      className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors"
                    >
                      Conectar depois
                    </button>
                  </div>
                  {connectWhatsAppAfter && (
                    <p className="text-xs text-emerald-300 mt-3">
                      Vamos abrir o QR Code assim que o agente for criado.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {skipWhatsApp && (
              <div className="flex items-start gap-3 p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200">
                    Você pode conectar o WhatsApp depois. O agente ficará em modo de teste até a
                    conexão ser realizada.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <h4 className="font-medium text-white mb-3">Requisitos:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>WhatsApp Business instalado no celular</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>Número de telefone ativo</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Check size={14} className="text-green-500" />
                  <span>Conexão estável com a internet</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Resumo da Configuração</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
                  <span className="text-neutral-400">Nome</span>
                  <span className="text-white font-medium">{name}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
                  <span className="text-neutral-400">Tipo</span>
                  <span className="text-white font-medium">{typeConfig.label}</span>
                </div>
                <div className="py-3 border-b border-[#1a1a1a]">
                  <span className="text-neutral-400 block mb-2">Oferta</span>
                  <span className="text-white text-sm">{instructions.oferta || '-'}</span>
                </div>
                <div className="py-3 border-b border-[#1a1a1a]">
                  <span className="text-neutral-400 block mb-2">Objetivo</span>
                  <span className="text-white text-sm">{instructions.objetivo || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
                  <span className="text-neutral-400">Base de Conhecimento</span>
                  <span
                    className={`font-medium ${skipKnowledge ? 'text-amber-400' : 'text-green-400'}`}
                  >
                    {skipKnowledge ? 'Pendente' : 'Configurada'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-neutral-400">WhatsApp</span>
                  <span
                    className={`font-medium ${skipWhatsApp ? 'text-amber-400' : 'text-green-400'}`}
                  >
                    {skipWhatsApp ? 'Pendente' : 'Conectado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl">
              <Sparkles size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-indigo-200">
                  Tudo pronto! Clique em "Criar Agente" para finalizar. Você poderá ajustar as
                  configurações a qualquer momento.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Configurar Agente de {typeConfig.label}</h1>
            <p className="text-sm text-neutral-400">
              Siga os passos para configurar seu agente de atendimento
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                          ? 'bg-green-600 text-white'
                          : isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-500'
                        }`}
                    >
                      {isCompleted ? <Check size={18} /> : step.icon}
                    </div>
                    <p
                      className={`text-xs mt-2 text-center ${isActive ? 'text-white' : 'text-neutral-500'
                        }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${index < currentStepIndex ? 'bg-green-600' : 'bg-neutral-800'
                        }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">{STEPS[currentStepIndex].title}</h2>
            <p className="text-sm text-neutral-400">{STEPS[currentStepIndex].description}</p>
          </div>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentStepIndex === 0
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${canProceed()
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
          >
            {currentStep === 'review' ? (
              <>
                <Check size={18} />
                Criar Agente
              </>
            ) : (
              <>
                Próximo
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
