import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Key,
  Bot,
  Settings,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Plus,
  ShoppingCart,
  HeadphonesIcon,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Zap,
  FileCode,
  Wand2,
  Pencil,
  Layout,
  Image,
  Search,
  ChevronDown,
  X,
  Check,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { openRouterService } from '../lib/openrouter';
import { ChatConfig } from '../types';
import ModelDropdownWithSearch from '../components/ModelDropdownWithSearch';

// Types
interface UserData {
  id?: number;
  nome: string;
  email: string;
  plano: string;
  cpf: string;
  content: Record<string, unknown>;
  created_at?: string;
}

interface ApiKeyConfig {
  id?: number;
  provider: string;
  api_key: string;
  base_url?: string;
  is_active: boolean;
  created_at?: string;
}

interface AgentTemplate {
  id?: number;
  tipo: 'sales' | 'support' | 'education';
  modelo: string;
  system_prompt: string;
  updated_at?: string;
}

interface PagesConfig {
  id?: number;
  modelo_criacao: string;
  system_prompt_criacao: string;
  modelo_edicao: string;
  system_prompt_edicao: string;
  updated_at?: string;
}

interface PageTemplate {
  id?: string;
  nome: string;
  descricao: string;
  codepages: string;
  ativo: boolean;
  created_at?: string;
}

type AdminTab = 'users' | 'api_keys' | 'templates' | 'pages' | 'chat';

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)', provider: 'openai' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)', provider: 'openai' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo (OpenAI)', provider: 'openai' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', provider: 'anthropic' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (Anthropic)', provider: 'anthropic' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Anthropic)', provider: 'anthropic' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (Google)', provider: 'google' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5 (Google)', provider: 'google' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Meta)', provider: 'meta' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Meta)', provider: 'meta' },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'mistral' },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'mistral' },
];

const TYPE_CONFIG = {
  sales: {
    label: 'Vendas',
    description: 'Agente de qualificação e vendas',
    icon: ShoppingCart,
    gradient: 'from-indigo-500 to-purple-600'
  },
  support: {
    label: 'Suporte',
    description: 'Agente de atendimento ao cliente',
    icon: HeadphonesIcon,
    gradient: 'from-emerald-500 to-teal-600'
  },
  education: {
    label: 'Educação',
    description: 'Agente educacional e tutoria',
    icon: GraduationCap,
    gradient: 'from-amber-500 to-orange-600'
  }
};

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users state
  const [users, setUsers] = useState<UserData[]>([]);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [showApiKey, setShowApiKey] = useState<Record<number, boolean>>({});
  const [newApiKey, setNewApiKey] = useState({ provider: 'openrouter', api_key: '', base_url: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; context_length: number; pricing: { prompt: string; completion: string } }>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  // Templates state
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<AgentTemplate | null>(null);

  // Arcco Pages config state
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({
    modelo_criacao: 'anthropic/claude-3.5-sonnet',
    system_prompt_criacao: '',
    modelo_edicao: 'anthropic/claude-3.5-sonnet',
    system_prompt_edicao: ''
  });
  const [savingPagesConfig, setSavingPagesConfig] = useState(false);
  const [pagesSubTab, setPagesSubTab] = useState<'agents' | 'templates'>('agents');

  // Page Templates state
  const [pageTemplates, setPageTemplates] = useState<PageTemplate[]>([]);
  const [editingPageTemplate, setEditingPageTemplate] = useState<PageTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateCode, setNewTemplateCode] = useState('');

  // Chat Configs state
  const [chatConfigs, setChatConfigs] = useState<ChatConfig[]>([]);
  const [editingChatConfig, setEditingChatConfig] = useState<ChatConfig | null>(null);
  const [savingChatConfig, setSavingChatConfig] = useState(false);

  // Model selector state
  const [modelSearchCreation, setModelSearchCreation] = useState('');
  const [modelSearchEdition, setModelSearchEdition] = useState('');
  const [modelSearchTemplate, setModelSearchTemplate] = useState('');
  const [showModelDropdownCreation, setShowModelDropdownCreation] = useState(false);
  const [showModelDropdownEdition, setShowModelDropdownEdition] = useState(false);
  const [showModelDropdownTemplate, setShowModelDropdownTemplate] = useState(false);
  const creationDropdownRef = useRef<HTMLDivElement>(null);
  const editionDropdownRef = useRef<HTMLDivElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  // User Management State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    senha: '',
    plano: 'free',
    telefone: '',
    ocupacao: '',
    cpf: ''
  });
  const [savingUser, setSavingUser] = useState(false);

  // User Management Functions
  const handleCreateUser = async () => {
    if (!newUser.nome || !newUser.email || !newUser.senha) {
      showMessage('error', 'Preencha os campos obrigatórios (Nome, Email, Senha)');
      return;
    }

    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('User')
        .insert({
          ...newUser,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      showMessage('success', 'Usuário criado com sucesso!');
      setShowCreateUserModal(false);
      setNewUser({ nome: '', email: '', senha: '', plano: 'free', telefone: '', ocupacao: '', cpf: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showMessage('error', 'Erro ao criar usuário');
    } finally {
      setSavingUser(false);
    }
  };

  const handleUpdateUserPlan = async (userId: number, newPlan: string) => {
    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('User')
        .update({ plano: newPlan })
        .eq('id', userId);

      if (error) throw error;

      showMessage('success', 'Plano atualizado com sucesso!');
      setShowEditUserModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating plan:', error);
      showMessage('error', 'Erro ao atualizar plano');
    } finally {
      setSavingUser(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchUsers();
    fetchApiKeys();
    fetchTemplates();
    fetchPagesConfig();
    fetchPageTemplates();
    fetchChatConfigs();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (creationDropdownRef.current && !creationDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdownCreation(false);
      }
      if (editionDropdownRef.current && !editionDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdownEdition(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdownTemplate(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all models (from API or fallback to hardcoded) with pricing
  const getAllModels = () => {
    if (availableModels.length > 0) {
      return availableModels.map(m => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing
      }));
    }
    return AVAILABLE_MODELS.map(m => ({
      id: m.id,
      name: m.name,
      context_length: 0,
      pricing: undefined as { prompt: string; completion: string } | undefined
    }));
  };

  // Filter models based on search
  const filterModels = (search: string) => {
    const allModels = getAllModels();
    if (!search.trim()) return allModels;
    const searchLower = search.toLowerCase();
    return allModels.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.id.toLowerCase().includes(searchLower)
    );
  };

  // Get model name by id
  const getModelName = (modelId: string) => {
    const allModels = getAllModels();
    const model = allModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ==================== USERS ====================
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('error', 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // ==================== API KEYS ====================
  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('ApiKeys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.log('ApiKeys table not found or error:', error);
        return;
      }
      setApiKeys(data || []);

      // Load models if there's an active OpenRouter key
      const activeKey = data?.find(k => k.provider === 'openrouter' && k.is_active);
      if (activeKey) {
        openRouterService.setApiKey(activeKey.api_key);
        fetchAvailableModels();
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const models = await openRouterService.getModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const testOpenRouterConnection = async (apiKey: string) => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    openRouterService.setApiKey(apiKey);
    const result = await openRouterService.testConnection();

    setTestingConnection(false);

    if (result.success) {
      setConnectionStatus('success');
      showMessage('success', 'Conexão com OpenRouter estabelecida!');
      return true;
    } else {
      setConnectionStatus('error');
      showMessage('error', result.error || 'Erro ao conectar com OpenRouter');
      return false;
    }
  };

  const testEvolutionConnection = async (baseUrl: string, apiKey: string) => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const normalized = baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${normalized}/instance/fetchInstances`, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com Evolution API');
      }

      setConnectionStatus('success');
      showMessage('success', 'Conexão com Evolution API estabelecida!');
      return true;
    } catch (error) {
      console.error('Evolution connection error:', error);
      setConnectionStatus('error');
      showMessage('error', 'Erro ao conectar com Evolution API');
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  const saveApiKey = async () => {
    if (!newApiKey.api_key.trim()) {
      showMessage('error', 'Insira uma API key válida');
      return;
    }

    // Test connection first for OpenRouter
    if (newApiKey.provider === 'openrouter') {
      const isValid = await testOpenRouterConnection(newApiKey.api_key);
      if (!isValid) return;
    }

    if (newApiKey.provider === 'evolution') {
      if (!newApiKey.base_url?.trim()) {
        showMessage('error', 'Insira a URL da Evolution API');
        return;
      }
      const isValid = await testEvolutionConnection(newApiKey.base_url, newApiKey.api_key);
      if (!isValid) return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ApiKeys')
        .insert({
          provider: newApiKey.provider,
          api_key: newApiKey.api_key,
          base_url: newApiKey.base_url || null,
          is_active: true
        });

      if (error) throw error;

      showMessage('success', 'API Key salva com sucesso');
      setNewApiKey({ provider: 'openrouter', api_key: '', base_url: '' });
      setConnectionStatus('idle');
      fetchApiKeys();
    } catch (error) {
      console.error('Error saving API key:', error);
      showMessage('error', 'Erro ao salvar API Key. Verifique se a tabela ApiKeys existe no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta API Key?')) return;

    try {
      const { error } = await supabase
        .from('ApiKeys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'API Key excluída');
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      showMessage('error', 'Erro ao excluir API Key');
    }
  };

  const toggleApiKeyActive = async (id: number, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('ApiKeys')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      fetchApiKeys();
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  // ==================== TEMPLATES ====================
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('AgentTemplates')
        .select('*');

      if (error) {
        console.log('AgentTemplates table not found, using defaults');
        // Use default templates if table doesn't exist
        setTemplates([
          { tipo: 'sales', modelo: 'openai/gpt-4o-mini', system_prompt: '' },
          { tipo: 'support', modelo: 'openai/gpt-4o-mini', system_prompt: '' },
          { tipo: 'education', modelo: 'openai/gpt-4o-mini', system_prompt: '' }
        ]);
        return;
      }

      // Ensure all 3 types exist
      const types: ('sales' | 'support' | 'education')[] = ['sales', 'support', 'education'];
      const existingTypes = data?.map(t => t.tipo) || [];
      const missingTemplates = types
        .filter(t => !existingTypes.includes(t))
        .map(tipo => ({ tipo, modelo: 'openai/gpt-4o-mini', system_prompt: '' }));

      setTemplates([...(data || []), ...missingTemplates]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const saveTemplate = async (template: AgentTemplate) => {
    setLoading(true);
    try {
      if (template.id) {
        // Update existing
        const { error } = await supabase
          .from('AgentTemplates')
          .update({
            modelo: template.modelo,
            system_prompt: template.system_prompt,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('AgentTemplates')
          .insert({
            tipo: template.tipo,
            modelo: template.modelo,
            system_prompt: template.system_prompt
          });

        if (error) throw error;
      }

      showMessage('success', 'Template salvo com sucesso');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showMessage('error', 'Erro ao salvar template. Verifique se a tabela AgentTemplates existe.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ARCCO PAGES CONFIG ====================
  const fetchPagesConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('PagesConfig')
        .select('*')
        .single();

      if (error) {
        console.log('PagesConfig table not found or empty, using defaults');
        return;
      }

      if (data) {
        setPagesConfig({
          id: data.id,
          modelo_criacao: data.modelo_criacao || 'anthropic/claude-3.5-sonnet',
          system_prompt_criacao: data.system_prompt_criacao || '',
          modelo_edicao: data.modelo_edicao || 'anthropic/claude-3.5-sonnet',
          system_prompt_edicao: data.system_prompt_edicao || '',
          updated_at: data.updated_at
        });
      }
    } catch (error) {
      console.error('Error fetching pages config:', error);
    }
  };

  const savePagesConfig = async () => {
    setSavingPagesConfig(true);
    try {
      const { data: existing } = await supabase
        .from('PagesConfig')
        .select('id')
        .single();

      const configData = {
        modelo_criacao: pagesConfig.modelo_criacao,
        system_prompt_criacao: pagesConfig.system_prompt_criacao,
        modelo_edicao: pagesConfig.modelo_edicao,
        system_prompt_edicao: pagesConfig.system_prompt_edicao,
        updated_at: new Date().toISOString()
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('PagesConfig')
          .update(configData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('PagesConfig')
          .insert(configData);
        if (error) throw error;
      }

      showMessage('success', 'Configuração salva com sucesso');
      fetchPagesConfig();
    } catch (error) {
      console.error('Error saving pages config:', error);
      showMessage('error', 'Erro ao salvar. Verifique se a tabela PagesConfig existe.');
    } finally {
      setSavingPagesConfig(false);
    }
  };

  // ==================== PAGE TEMPLATES ====================
  const fetchPageTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('PageTemplates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('PageTemplates table not found:', error);
        return;
      }
      setPageTemplates(data || []);
    } catch (error) {
      console.error('Error fetching page templates:', error);
    }
  };

  const savePageTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateCode.trim()) {
      showMessage('error', 'Nome e código são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('PageTemplates')
        .insert({
          nome: newTemplateName,
          descricao: newTemplateDesc,
          codepages: newTemplateCode,
          ativo: true
        });

      if (error) throw error;

      showMessage('success', 'Template salvo com sucesso');
      setNewTemplateName('');
      setNewTemplateDesc('');
      setNewTemplateCode('');
      fetchPageTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showMessage('error', 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  const deletePageTemplate = async (id: string) => {
    if (!confirm('Excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('PageTemplates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'Template excluído');
      fetchPageTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showMessage('error', 'Erro ao excluir template');
    }
  };

  const togglePageTemplate = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('PageTemplates')
        .update({ ativo: !currentState })
        .eq('id', id);

      if (error) throw error;
      fetchPageTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copiado para a área de transferência');
  };

  // ==================== CHAT CONFIGS ====================
  const fetchChatConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('chatconfigs')
        .select('*')
        .order('slot_number', { ascending: true });

      if (error) {
        console.log('ChatConfigs table not found:', error);
        return;
      }
      setChatConfigs(data || []);
    } catch (error) {
      console.error('Error fetching chat configs:', error);
    }
  };

  const saveChatConfig = async (config: ChatConfig) => {
    setSavingChatConfig(true);
    try {
      if (config.id) {
        // Update existing config
        const { error } = await supabase
          .from('chatconfigs')
          .update({
            model_name: config.model_name,
            openrouter_model_id: config.openrouter_model_id,
            system_prompt: config.system_prompt,
            is_active: config.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from('chatconfigs')
          .insert({
            slot_number: config.slot_number,
            model_name: config.model_name,
            openrouter_model_id: config.openrouter_model_id,
            system_prompt: config.system_prompt,
            is_active: config.is_active
          });

        if (error) throw error;
      }

      showMessage('success', 'Configuração salva com sucesso');
      fetchChatConfigs();
      setEditingChatConfig(null);
    } catch (error) {
      console.error('Error saving chat config:', error);
      showMessage('error', 'Erro ao salvar configuração');
    } finally {
      setSavingChatConfig(false);
    }
  };

  const deleteChatConfig = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) return;

    try {
      const { error } = await supabase
        .from('chatconfigs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'Configuração excluída');
      fetchChatConfigs();
    } catch (error) {
      console.error('Error deleting chat config:', error);
      showMessage('error', 'Erro ao excluir configuração');
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-neutral-500">Configurações avançadas da plataforma</p>
            </div>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar
          </a>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg ${message.type === 'success' ? 'bg-green-900/90 text-green-200' : 'bg-red-900/90 text-red-200'
          }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#0A0A0A] p-1 rounded-xl border border-[#1a1a1a] w-fit flex-wrap">
          {[
            { id: 'users', label: 'Usuários', icon: Users },
            { id: 'api_keys', label: 'API Keys', icon: Key },
            { id: 'templates', label: 'Templates de Agentes', icon: Bot },
            { id: 'pages', label: 'Arcco Pages', icon: FileCode },
            { id: 'chat', label: 'Chat', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {/* ==================== USERS TAB ==================== */}
          {activeTab === 'users' && (
            <div>
              <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Usuários Cadastrados</h2>
                  <p className="text-sm text-neutral-500">{users.length} usuários na plataforma</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Novo Usuário
                  </button>
                  <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0F0F0F] text-left text-sm text-neutral-500">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Plano</th>
                      <th className="px-4 py-3 font-medium">CPF</th>
                      <th className="px-4 py-3 font-medium">Data Cadastro</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr
                        key={user.id || index}
                        className="border-t border-[#1a1a1a] hover:bg-[#0F0F0F] transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{user.nome}</td>
                        <td className="px-4 py-3 text-neutral-400">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.plano === 'pro' ? 'bg-indigo-900/50 text-indigo-300' :
                            user.plano === 'starter' ? 'bg-emerald-900/50 text-emerald-300' :
                              'bg-neutral-800 text-neutral-400'
                            }`}>
                            {user.plano || 'free'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 font-mono text-sm">{user.cpf || '-'}</td>
                        <td className="px-4 py-3 text-neutral-500 text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditUserModal(true);
                            }}
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                            title="Editar Plano"
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Create User Modal */}
              {showCreateUserModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-md">
                    <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                      <h3 className="text-lg font-bold">Novo Usuário</h3>
                      <button onClick={() => setShowCreateUserModal(false)} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Nome</label>
                        <input
                          type="text"
                          value={newUser.nome}
                          onChange={e => setNewUser({ ...newUser, nome: e.target.value })}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-400 mb-1">Senha</label>
                        <input
                          type="password"
                          value={newUser.senha}
                          onChange={e => setNewUser({ ...newUser, senha: e.target.value })}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-neutral-400 mb-1">Telefone</label>
                          <input
                            type="text"
                            value={newUser.telefone}
                            onChange={e => setNewUser({ ...newUser, telefone: e.target.value })}
                            className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-neutral-400 mb-1">Plano</label>
                          <select
                            value={newUser.plano}
                            onChange={e => setNewUser({ ...newUser, plano: e.target.value })}
                            className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-t border-[#262626] flex justify-end gap-2">
                      <button
                        onClick={() => setShowCreateUserModal(false)}
                        className="px-4 py-2 text-neutral-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateUser}
                        disabled={savingUser}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {savingUser ? 'Criando...' : 'Criar Usuário'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit User Modal */}
              {showEditUserModal && selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-sm">
                    <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                      <h3 className="text-lg font-bold">Editar Plano</h3>
                      <button onClick={() => setShowEditUserModal(false)} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-sm text-neutral-400 mb-2">Usuário: <span className="text-white font-medium">{selectedUser.nome}</span></p>
                        <p className="text-sm text-neutral-400 mb-4">Email: <span className="text-white">{selectedUser.email}</span></p>

                        <label className="block text-sm text-neutral-400 mb-1">Selecione o Plano</label>
                        <div>
                          <label className="block text-sm font-medium text-neutral-400 mb-2">
                            Plano de Acesso
                          </label>
                          <select
                            value={selectedUser.plano || 'free'}
                            onChange={(e) => setSelectedUser({ ...selectedUser, plano: e.target.value })}
                            className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          >
                            <option value="free">Free (Limitado)</option>
                            <option value="starter">Starter (Acesso Total)</option>
                          </select>
                          <p className="mt-2 text-xs text-neutral-500">
                            * O plano Free bloqueia acesso a ferramentas. O Starter libera tudo.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 border-t border-[#262626] flex justify-end gap-2">
                      <button
                        onClick={() => setShowEditUserModal(false)}
                        className="px-4 py-2 text-neutral-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (selectedUser && selectedUser.id) {
                            handleUpdateUserPlan(selectedUser.id, selectedUser.plano || 'free');
                          }
                        }}
                        disabled={savingUser}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                      >
                        {savingUser ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== API KEYS TAB ==================== */}
          {activeTab === 'api_keys' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-1">Configuração de API Keys</h2>
                <p className="text-sm text-neutral-500">
                  Configure suas chaves de API para integração com OpenRouter e outros provedores.
                </p>
              </div>

              {/* OpenRouter Info */}
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ExternalLink size={20} className="text-indigo-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-indigo-200 mb-1">OpenRouter</h3>
                    <p className="text-sm text-indigo-300/70 mb-2">
                      O OpenRouter permite acesso a múltiplos modelos de IA com uma única API key.
                    </p>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Obter API Key <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Evolution API Info */}
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ExternalLink size={20} className="text-emerald-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-emerald-200 mb-1">Evolution API</h3>
                    <p className="text-sm text-emerald-300/70 mb-2">
                      Configure a URL e o token da Evolution API para habilitar o WhatsApp via QR Code.
                    </p>
                    <a
                      href="https://doc.evolution-api.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      Ver documentação <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Add New Key */}
              <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-4 mb-6">
                <h3 className="font-medium mb-4">Adicionar Nova API Key</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <select
                      value={newApiKey.provider}
                      onChange={(e) => {
                        setNewApiKey({ ...newApiKey, provider: e.target.value });
                        setConnectionStatus('idle');
                      }}
                      className="px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="openrouter">OpenRouter</option>
                      <option value="evolution">Evolution API</option>
                    </select>
                    <input
                      type="password"
                      placeholder={newApiKey.provider === 'evolution' ? 'evo-xxxx' : 'sk-or-v1-...'}
                      value={newApiKey.api_key}
                      onChange={(e) => {
                        setNewApiKey({ ...newApiKey, api_key: e.target.value });
                        setConnectionStatus('idle');
                      }}
                      className={`flex-1 px-4 py-2.5 bg-[#0A0A0A] border rounded-lg focus:outline-none focus:border-indigo-500 ${connectionStatus === 'success' ? 'border-green-500' :
                        connectionStatus === 'error' ? 'border-red-500' :
                          'border-[#262626]'
                        }`}
                    />
                  </div>
                  {newApiKey.provider === 'evolution' && (
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Base URL da Evolution API</label>
                      <input
                        type="text"
                        placeholder="https://sua-evolution-api.com"
                        value={newApiKey.base_url}
                        onChange={(e) => {
                          setNewApiKey({ ...newApiKey, base_url: e.target.value });
                          setConnectionStatus('idle');
                        }}
                        className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        newApiKey.provider === 'openrouter'
                          ? testOpenRouterConnection(newApiKey.api_key)
                          : testEvolutionConnection(newApiKey.base_url, newApiKey.api_key)
                      }
                      disabled={
                        testingConnection ||
                        !newApiKey.api_key.trim() ||
                        (newApiKey.provider === 'evolution' && !newApiKey.base_url.trim())
                      }
                      className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-lg font-medium transition-colors"
                    >
                      <Zap size={18} className={testingConnection ? 'animate-pulse' : ''} />
                      {testingConnection ? 'Testando...' : 'Testar Conexão'}
                    </button>
                    <button
                      onClick={saveApiKey}
                      disabled={
                        loading ||
                        testingConnection ||
                        !newApiKey.api_key.trim() ||
                        (newApiKey.provider === 'evolution' && !newApiKey.base_url.trim())
                      }
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg font-medium transition-colors"
                    >
                      <Save size={18} />
                      Salvar API Key
                    </button>
                  </div>
                  {connectionStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle2 size={16} />
                      Conexão válida! Pronto para salvar.
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Keys */}
              <div>
                <h3 className="font-medium mb-3">API Keys Configuradas</h3>
                {apiKeys.length > 0 ? (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#262626] rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-neutral-600'}`} />
                          <div>
                            <span className="font-medium capitalize">{key.provider}</span>
                            {key.base_url && (
                              <p className="text-xs text-neutral-500 mt-1">{key.base_url}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm text-neutral-500 font-mono">
                                {showApiKey[key.id!] ? key.api_key : '••••••••••••••••••••'}
                              </code>
                              <button
                                onClick={() => setShowApiKey({ ...showApiKey, [key.id!]: !showApiKey[key.id!] })}
                                className="p-1 hover:bg-neutral-800 rounded"
                              >
                                {showApiKey[key.id!] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(key.api_key)}
                                className="p-1 hover:bg-neutral-800 rounded"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleApiKeyActive(key.id!, key.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${key.is_active
                              ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              }`}
                          >
                            {key.is_active ? 'Ativo' : 'Inativo'}
                          </button>
                          <button
                            onClick={() => deleteApiKey(key.id!)}
                            className="p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <Key size={40} className="mx-auto mb-3 opacity-50" />
                    <p>Nenhuma API Key configurada</p>
                    <p className="text-sm mt-1">Adicione sua primeira key acima</p>
                  </div>
                )}
              </div>

              {/* Available Models */}
              {apiKeys.some(k => k.provider === 'openrouter' && k.is_active) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Modelos Disponíveis no OpenRouter</h3>
                      <p className="text-sm text-neutral-500">{availableModels.length} modelos disponíveis</p>
                    </div>
                    <button
                      onClick={fetchAvailableModels}
                      disabled={loadingModels}
                      className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-sm"
                    >
                      <RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''} />
                      Atualizar
                    </button>
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Buscar modelo..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-indigo-500 mb-4"
                  />

                  {/* Models Grid */}
                  <div className="max-h-96 overflow-y-auto bg-[#0F0F0F] border border-[#262626] rounded-xl">
                    {loadingModels ? (
                      <div className="p-8 text-center text-neutral-500">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                        Carregando modelos...
                      </div>
                    ) : (
                      <div className="divide-y divide-[#1a1a1a]">
                        {availableModels
                          .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                          .slice(0, 50)
                          .map((model) => (
                            <div key={model.id} className="p-3 hover:bg-[#0A0A0A] transition-colors">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white text-sm">{model.name}</p>
                                  <p className="text-xs text-neutral-500 font-mono">{model.id}</p>
                                </div>
                                <div className="text-right text-xs text-neutral-500">
                                  <p>{model.context_length?.toLocaleString()} ctx</p>
                                  <p className="text-green-500/70">
                                    ${(parseFloat(model.pricing?.prompt || '0') * 1000000).toFixed(2)}/1M tokens
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {!loadingModels && availableModels.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase())).length > 50 && (
                    <p className="text-xs text-neutral-500 mt-2 text-center">
                      Mostrando 50 de {availableModels.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase())).length} modelos. Use a busca para filtrar.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TEMPLATES TAB ==================== */}
          {activeTab === 'templates' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-1">Templates de Agentes</h2>
                <p className="text-sm text-neutral-500">
                  Configure o modelo e system prompt padrão para cada tipo de agente.
                </p>
              </div>

              {/* Template Editing Modal */}
              {editingTemplate && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b border-[#262626] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const config = TYPE_CONFIG[editingTemplate.tipo];
                          const Icon = config.icon;
                          return (
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                              <Icon size={20} className="text-white" />
                            </div>
                          );
                        })()}
                        <div>
                          <h2 className="text-xl font-bold">Configurar {TYPE_CONFIG[editingTemplate.tipo].label}</h2>
                          <p className="text-sm text-neutral-400">{TYPE_CONFIG[editingTemplate.tipo].description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="p-2 hover:bg-neutral-800 rounded-lg"
                      >
                        <ArrowLeft size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                      {/* Model Selection */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Modelo de IA
                        </label>
                        <div className="relative" ref={templateDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowModelDropdownTemplate(!showModelDropdownTemplate)}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-left flex items-center justify-between"
                          >
                            <span className="truncate">{getModelName(editingTemplate.modelo)}</span>
                            <ChevronDown size={16} className={`text-neutral-500 transition-transform ${showModelDropdownTemplate ? 'rotate-180' : ''}`} />
                          </button>

                          {showModelDropdownTemplate && (
                            <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-[#262626] rounded-xl shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-[#262626]">
                                <div className="relative">
                                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                  <input
                                    type="text"
                                    value={modelSearchTemplate}
                                    onChange={(e) => setModelSearchTemplate(e.target.value)}
                                    placeholder="Buscar modelo..."
                                    className="w-full pl-9 pr-8 py-2 bg-[#0F0F0F] border border-[#262626] rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                  />
                                  {modelSearchTemplate && (
                                    <button
                                      onClick={() => setModelSearchTemplate('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded"
                                    >
                                      <X size={14} className="text-neutral-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="max-h-72 overflow-y-auto">
                                {filterModels(modelSearchTemplate).length > 0 ? (
                                  filterModels(modelSearchTemplate).slice(0, 100).map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        setEditingTemplate({ ...editingTemplate, modelo: m.id });
                                        setShowModelDropdownTemplate(false);
                                        setModelSearchTemplate('');
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#1a1a1a] transition-colors ${editingTemplate.modelo === m.id ? 'bg-indigo-900/30 text-indigo-400' : ''}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium truncate">{m.name}</div>
                                          <div className="text-xs text-neutral-500 font-mono truncate">{m.id}</div>
                                        </div>
                                        {m.pricing && (
                                          <div className="text-right text-xs text-neutral-500 ml-3 shrink-0">
                                            <p className="text-green-500/70">
                                              ${(parseFloat(m.pricing.prompt || '0') * 1000000).toFixed(2)}/1M in
                                            </p>
                                            <p className="text-blue-500/70">
                                              ${(parseFloat(m.pricing.completion || '0') * 1000000).toFixed(2)}/1M out
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-center text-neutral-500 text-sm">
                                    Nenhum modelo encontrado
                                  </div>
                                )}
                              </div>
                              {filterModels(modelSearchTemplate).length > 100 && (
                                <div className="px-4 py-2 text-xs text-neutral-500 border-t border-[#262626] text-center">
                                  Mostrando 100 de {filterModels(modelSearchTemplate).length} modelos
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* System Prompt */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          System Prompt
                        </label>
                        <textarea
                          value={editingTemplate.system_prompt}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, system_prompt: e.target.value })}
                          placeholder={`Escreva o system prompt para o agente de ${TYPE_CONFIG[editingTemplate.tipo].label.toLowerCase()}...`}
                          rows={12}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-xl focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-2">
                          Este prompt será usado como base para todos os agentes deste tipo.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 border-t border-[#262626] flex justify-end gap-3">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveTemplate(editingTemplate)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
                      >
                        <Save size={18} />
                        Salvar Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const config = TYPE_CONFIG[template.tipo];
                  const Icon = config.icon;

                  return (
                    <div
                      key={template.tipo}
                      className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-5 hover:border-[#333] transition-all"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{config.label}</h3>
                      <p className="text-sm text-neutral-500 mb-4">{config.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">Modelo:</span>
                          <span className="text-neutral-300 font-mono text-xs truncate ml-2 max-w-[60%] text-right">
                            {template.modelo?.split('/')[1] || 'Não configurado'}
                          </span>
                        </div>
                        {(() => {
                          const modelInfo = availableModels.find(m => m.id === template.modelo);
                          if (modelInfo?.pricing) {
                            return (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-neutral-500">Preço:</span>
                                <span className="text-green-500/70">
                                  ${(parseFloat(modelInfo.pricing.prompt || '0') * 1000000).toFixed(2)}/1M tokens
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">System Prompt:</span>
                          <span className={template.system_prompt ? 'text-green-400' : 'text-amber-400'}>
                            {template.system_prompt ? 'Configurado' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings size={16} />
                        Configurar
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Table Creation Info */}
              <div className="mt-6 bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-200 mb-1">Tabela Supabase Necessária</h3>
                    <p className="text-sm text-amber-300/70 mb-2">
                      Crie a tabela <code className="bg-amber-900/50 px-1 rounded">AgentTemplates</code> no Supabase com as colunas:
                    </p>
                    <code className="text-xs text-amber-300/60 block bg-amber-900/30 p-2 rounded">
                      id (int8, primary), tipo (text), modelo (text), system_prompt (text), updated_at (timestamptz)
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ARCCO PAGES TAB ==================== */}
          {activeTab === 'pages' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                    <FileCode size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Configuração do Arcco Pages</h2>
                    <p className="text-sm text-neutral-500">Configure agentes e templates de páginas</p>
                  </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex gap-2 bg-[#0F0F0F] p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setPagesSubTab('agents')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${pagesSubTab === 'agents' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <Bot size={16} />
                    Agentes IA
                  </button>
                  <button
                    onClick={() => setPagesSubTab('templates')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${pagesSubTab === 'templates' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                  >
                    <Layout size={16} />
                    Templates
                  </button>
                </div>
              </div>

              {/* AGENTS SUB TAB */}
              {pagesSubTab === 'agents' && (
                <div className="space-y-6">
                  {/* Agent 1: Creation */}
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <Wand2 size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Agente de Criação</h3>
                        <p className="text-xs text-neutral-500">Cria páginas do zero a partir de descrições</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Modelo</label>
                        <div className="relative" ref={creationDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowModelDropdownCreation(!showModelDropdownCreation)}
                            className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-green-500 text-sm text-left flex items-center justify-between"
                          >
                            <span className="truncate">{getModelName(pagesConfig.modelo_criacao)}</span>
                            <ChevronDown size={16} className={`text-neutral-500 transition-transform ${showModelDropdownCreation ? 'rotate-180' : ''}`} />
                          </button>

                          {showModelDropdownCreation && (
                            <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-[#262626]">
                                <div className="relative">
                                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                  <input
                                    type="text"
                                    value={modelSearchCreation}
                                    onChange={(e) => setModelSearchCreation(e.target.value)}
                                    placeholder="Buscar modelo..."
                                    className="w-full pl-9 pr-8 py-2 bg-[#0F0F0F] border border-[#262626] rounded-lg text-sm focus:outline-none focus:border-green-500"
                                    autoFocus
                                  />
                                  {modelSearchCreation && (
                                    <button
                                      onClick={() => setModelSearchCreation('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded"
                                    >
                                      <X size={14} className="text-neutral-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {filterModels(modelSearchCreation).length > 0 ? (
                                  filterModels(modelSearchCreation).slice(0, 100).map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        setPagesConfig({ ...pagesConfig, modelo_criacao: m.id });
                                        setShowModelDropdownCreation(false);
                                        setModelSearchCreation('');
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#1a1a1a] transition-colors ${pagesConfig.modelo_criacao === m.id ? 'bg-green-900/30 text-green-400' : ''}`}
                                    >
                                      <div className="font-medium truncate">{m.name}</div>
                                      <div className="text-xs text-neutral-500 font-mono truncate">{m.id}</div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-center text-neutral-500 text-sm">
                                    Nenhum modelo encontrado
                                  </div>
                                )}
                              </div>
                              {filterModels(modelSearchCreation).length > 100 && (
                                <div className="px-4 py-2 text-xs text-neutral-500 border-t border-[#262626] text-center">
                                  Mostrando 100 de {filterModels(modelSearchCreation).length} modelos
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">System Prompt</label>
                        <textarea
                          value={pagesConfig.system_prompt_criacao}
                          onChange={(e) => setPagesConfig({ ...pagesConfig, system_prompt_criacao: e.target.value })}
                          placeholder="Instruções para o agente que cria páginas do zero..."
                          rows={6}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-green-500 text-sm font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Agent 2: Editing */}
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Pencil size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Agente de Edição</h3>
                        <p className="text-xs text-neutral-500">Modifica páginas existentes via chat</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Modelo</label>
                        <div className="relative" ref={editionDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowModelDropdownEdition(!showModelDropdownEdition)}
                            className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-blue-500 text-sm text-left flex items-center justify-between"
                          >
                            <span className="truncate">{getModelName(pagesConfig.modelo_edicao)}</span>
                            <ChevronDown size={16} className={`text-neutral-500 transition-transform ${showModelDropdownEdition ? 'rotate-180' : ''}`} />
                          </button>

                          {showModelDropdownEdition && (
                            <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-[#262626]">
                                <div className="relative">
                                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                  <input
                                    type="text"
                                    value={modelSearchEdition}
                                    onChange={(e) => setModelSearchEdition(e.target.value)}
                                    placeholder="Buscar modelo..."
                                    className="w-full pl-9 pr-8 py-2 bg-[#0F0F0F] border border-[#262626] rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  {modelSearchEdition && (
                                    <button
                                      onClick={() => setModelSearchEdition('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded"
                                    >
                                      <X size={14} className="text-neutral-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {filterModels(modelSearchEdition).length > 0 ? (
                                  filterModels(modelSearchEdition).slice(0, 100).map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        setPagesConfig({ ...pagesConfig, modelo_edicao: m.id });
                                        setShowModelDropdownEdition(false);
                                        setModelSearchEdition('');
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#1a1a1a] transition-colors ${pagesConfig.modelo_edicao === m.id ? 'bg-blue-900/30 text-blue-400' : ''}`}
                                    >
                                      <div className="font-medium truncate">{m.name}</div>
                                      <div className="text-xs text-neutral-500 font-mono truncate">{m.id}</div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-6 text-center text-neutral-500 text-sm">
                                    Nenhum modelo encontrado
                                  </div>
                                )}
                              </div>
                              {filterModels(modelSearchEdition).length > 100 && (
                                <div className="px-4 py-2 text-xs text-neutral-500 border-t border-[#262626] text-center">
                                  Mostrando 100 de {filterModels(modelSearchEdition).length} modelos
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">System Prompt</label>
                        <textarea
                          value={pagesConfig.system_prompt_edicao}
                          onChange={(e) => setPagesConfig({ ...pagesConfig, system_prompt_edicao: e.target.value })}
                          placeholder="Instruções para o agente que edita páginas existentes..."
                          rows={6}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-blue-500 text-sm font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={savePagesConfig}
                      disabled={savingPagesConfig}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 rounded-xl font-medium transition-all"
                    >
                      {savingPagesConfig ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                      {savingPagesConfig ? 'Salvando...' : 'Salvar Agentes'}
                    </button>
                  </div>
                </div>
              )}

              {/* TEMPLATES SUB TAB */}
              {pagesSubTab === 'templates' && (
                <div className="space-y-6">
                  {/* Add New Template */}
                  <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Plus size={18} />
                      Adicionar Template
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Nome</label>
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="Ex: Landing Page SaaS"
                          className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Descrição</label>
                        <input
                          type="text"
                          value={newTemplateDesc}
                          onChange={(e) => setNewTemplateDesc(e.target.value)}
                          placeholder="Descrição breve do template..."
                          className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-400 mb-2">Código HTML</label>
                      <textarea
                        value={newTemplateCode}
                        onChange={(e) => setNewTemplateCode(e.target.value)}
                        placeholder="Cole o código HTML completo do template..."
                        rows={8}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-lg focus:outline-none focus:border-pink-500 text-sm font-mono resize-none"
                      />
                    </div>
                    {/* Preview do template */}
                    {newTemplateCode && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Preview</label>
                        <div className="h-48 bg-white rounded-lg overflow-hidden border border-[#262626]">
                          <iframe
                            srcDoc={newTemplateCode}
                            className="w-full h-full border-0 transform scale-50 origin-top-left"
                            style={{ width: '200%', height: '200%' }}
                            title="Template Preview"
                            sandbox="allow-scripts"
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={savePageTemplate}
                      disabled={loading || !newTemplateName.trim() || !newTemplateCode.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
                    >
                      <Save size={16} />
                      Salvar Template
                    </button>
                  </div>

                  {/* Templates List */}
                  <div>
                    <h3 className="font-semibold mb-4">Templates Salvos ({pageTemplates.length})</h3>
                    {pageTemplates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pageTemplates.map((t) => (
                          <div key={t.id} className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden">
                            <div className="h-32 bg-white relative overflow-hidden">
                              {t.codepages ? (
                                <iframe
                                  srcDoc={t.codepages}
                                  className="w-full h-full border-0 transform scale-[0.25] origin-top-left pointer-events-none"
                                  style={{ width: '400%', height: '400%' }}
                                  title={t.nome}
                                  sandbox=""
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                  <FileCode size={32} className="text-neutral-600" />
                                </div>
                              )}
                              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${t.ativo ? 'bg-green-600' : 'bg-neutral-600'}`}>
                                {t.ativo ? 'Ativo' : 'Inativo'}
                              </div>
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold mb-1">{t.nome}</h4>
                              <p className="text-xs text-neutral-500 mb-3">{t.descricao || 'Sem descrição'}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => togglePageTemplate(t.id!, t.ativo)}
                                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  {t.ativo ? 'Desativar' : 'Ativar'}
                                </button>
                                <button
                                  onClick={() => deletePageTemplate(t.id!)}
                                  className="p-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-neutral-500">
                        <Layout size={40} className="mx-auto mb-3 opacity-50" />
                        <p>Nenhum template cadastrado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Table Creation Info */}
              <div className="mt-6 bg-pink-950/30 border border-pink-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-pink-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-pink-200 mb-1">Tabelas Supabase Necessárias</h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <code className="text-pink-300/80">PagesConfig:</code>
                        <code className="text-pink-300/60 block bg-pink-900/30 p-2 rounded mt-1">
                          id, modelo_criacao, system_prompt_criacao, modelo_edicao, system_prompt_edicao, updated_at
                        </code>
                      </div>
                      <div>
                        <code className="text-pink-300/80">PageTemplates:</code>
                        <code className="text-pink-300/60 block bg-pink-900/30 p-2 rounded mt-1">
                          id (uuid), nome, descricao, thumbnail, codepages, ativo (bool), created_at
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== CHAT TAB ==================== */}
          {activeTab === 'chat' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Configuração dos Modelos de Chat</h2>
                <p className="text-sm text-neutral-500">
                  Configure até 5 modelos de IA que estarão disponíveis no Arcco Chat
                </p>
              </div>

              {/* Info Alert */}
              <div className="mb-6 bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-indigo-400 mt-0.5" />
                  <div className="text-sm text-indigo-200">
                    <p className="font-medium mb-1">Antes de configurar os modelos:</p>
                    <ul className="text-xs text-indigo-300/80 space-y-1 mt-2">
                      <li>• Configure uma API Key do OpenRouter na aba "API Keys"</li>
                      <li>• Cada slot representa um modelo que aparecerá no dropdown do chat</li>
                      <li>• O system prompt define o comportamento padrão do modelo</li>
                      <li>• Modelos inativos não aparecerão para os usuários</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Chat Configs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5].map((slotNumber) => {
                  const config = chatConfigs.find(c => c.slot_number === slotNumber);

                  return (
                    <div
                      key={slotNumber}
                      className={`bg-[#0F0F0F] border rounded-xl p-5 transition-all ${config
                        ? 'border-[#262626] hover:border-[#333]'
                        : 'border-dashed border-[#1a1a1a] hover:border-[#262626]'
                        }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{slotNumber}</span>
                          </div>
                          <span className="text-xs text-neutral-500">Slot {slotNumber}</span>
                        </div>
                        {config && (
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.is_active
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-neutral-800 text-neutral-500'
                            }`}>
                            {config.is_active ? 'Ativo' : 'Inativo'}
                          </div>
                        )}
                      </div>

                      {/* Config Content */}
                      {config ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium text-white mb-1 truncate">
                              {config.model_name}
                            </div>
                            <div className="text-xs text-neutral-500 truncate">
                              {config.openrouter_model_id}
                            </div>
                          </div>

                          {config.system_prompt && (
                            <div className="text-xs text-neutral-600 line-clamp-2">
                              {config.system_prompt}
                            </div>
                          )}

                          <button
                            onClick={() => setEditingChatConfig(config)}
                            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            Configurar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm text-neutral-600 text-center py-4">
                            Slot vazio
                          </div>
                          <button
                            onClick={() => setEditingChatConfig({
                              slot_number: slotNumber,
                              model_name: '',
                              openrouter_model_id: '',
                              system_prompt: '',
                              is_active: true
                            })}
                            className="w-full px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Plus size={16} className="inline mr-1" />
                            Adicionar Modelo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Config Modal */}
              {editingChatConfig && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Modal Header */}
                    <div className="p-6 border-b border-[#262626]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            Configurar Modelo - Slot {editingChatConfig.slot_number}
                          </h3>
                          <p className="text-sm text-neutral-500 mt-1">
                            Configure o modelo que aparecerá neste slot do chat
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingChatConfig(null)}
                          className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <X size={20} className="text-neutral-400" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto flex-1">
                      <div className="space-y-5">
                        {/* Model Name */}
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Nome do Modelo
                          </label>
                          <input
                            type="text"
                            value={editingChatConfig.model_name}
                            onChange={(e) => setEditingChatConfig({
                              ...editingChatConfig,
                              model_name: e.target.value
                            })}
                            placeholder="Ex: GPT-4o para Análise de Código"
                            className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#262626] rounded-xl
                              text-neutral-200 placeholder-neutral-600
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                          />
                          <p className="text-xs text-neutral-600 mt-1.5">
                            Nome amigável que aparecerá no seletor de modelos
                          </p>
                        </div>

                        {/* OpenRouter Model */}
                        <div>
                          <ModelDropdownWithSearch
                            label="Modelo OpenRouter"
                            selectedModelId={editingChatConfig.openrouter_model_id}
                            onChange={(modelId) => setEditingChatConfig({
                              ...editingChatConfig,
                              openrouter_model_id: modelId
                            })}
                            availableModels={
                              availableModels.length > 0
                                ? availableModels
                                : AVAILABLE_MODELS.map(m => ({
                                  id: m.id,
                                  name: m.name,
                                  provider: m.provider
                                }))
                            }
                            showPricing={true}
                            placeholder="Selecione o modelo OpenRouter..."
                          />
                          <p className="text-xs text-neutral-600 mt-1.5">
                            Modelo que será usado para gerar as respostas
                          </p>
                        </div>

                        {/* System Prompt */}
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            System Prompt
                          </label>
                          <textarea
                            value={editingChatConfig.system_prompt || ''}
                            onChange={(e) => setEditingChatConfig({
                              ...editingChatConfig,
                              system_prompt: e.target.value
                            })}
                            placeholder="Você é um assistente especializado em..."
                            rows={6}
                            className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#262626] rounded-xl
                              text-neutral-200 placeholder-neutral-600 font-mono text-sm
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20
                              resize-none"
                          />
                          <p className="text-xs text-neutral-600 mt-1.5">
                            Instruções que definem o comportamento padrão do modelo
                          </p>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[#0F0F0F] border border-[#262626] rounded-xl">
                          <div>
                            <div className="text-sm font-medium text-neutral-200">Modelo Ativo</div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              Modelos inativos não aparecerão no chat
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingChatConfig({
                              ...editingChatConfig,
                              is_active: !editingChatConfig.is_active
                            })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${editingChatConfig.is_active ? 'bg-indigo-600' : 'bg-neutral-700'
                              }`}
                          >
                            <div
                              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${editingChatConfig.is_active ? 'translate-x-6' : 'translate-x-0.5'
                                }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 border-t border-[#262626] flex items-center justify-between">
                      <div>
                        {editingChatConfig.id && (
                          <button
                            onClick={() => {
                              if (editingChatConfig.id) {
                                deleteChatConfig(editingChatConfig.id);
                                setEditingChatConfig(null);
                              }
                            }}
                            className="px-4 py-2 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="inline mr-2" />
                            Excluir
                          </button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingChatConfig(null)}
                          className="px-4 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveChatConfig(editingChatConfig)}
                          disabled={savingChatConfig || !editingChatConfig.model_name || !editingChatConfig.openrouter_model_id}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium
                            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingChatConfig ? 'Salvando...' : 'Salvar Configuração'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Info */}
              <div className="mt-6 bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-indigo-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-indigo-200 mb-1">Tabela Supabase Necessária</h3>
                    <div className="text-xs">
                      <code className="text-indigo-300/80">ChatConfigs:</code>
                      <code className="text-indigo-300/60 block bg-indigo-900/30 p-2 rounded mt-1 font-mono text-[11px]">
                        id, slot_number (1-5), model_name, openrouter_model_id, system_prompt, is_active, created_at, updated_at
                      </code>
                      <p className="text-indigo-300/70 mt-2">
                        Execute o arquivo <code className="bg-indigo-900/30 px-1 py-0.5 rounded">migrations/001_create_chat_configs.sql</code> no Supabase SQL Editor
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
