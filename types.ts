import { LucideIcon } from 'lucide-react';

// ==========================================
// PLATFORM NAVIGATION TYPES
// ==========================================

export type ViewState =
  | 'DASHBOARD'           // Home - Início (só saudação)
  | 'FERRAMENTAS'         // Página de Ferramentas
  | 'ARCCO_TALK'          // Arcco Talk Home
  | 'TALK_SETUP'          // Arcco Talk Setup Wizard
  | 'TALK_AGENT_DETAIL'   // Detalhe do Agente (Config, Simulador, Conhecimento)
  | 'TALK_CONVERSATIONS'  // Conversas
  | 'TALK_AGENTS'         // Agentes
  | 'TALK_KNOWLEDGE'      // Conhecimento
  | 'TALK_SPREADSHEET'    // Planilha nativa
  | 'TALK_WHATSAPP'       // Configuração WhatsApp
  | 'ARCCO_PAGES'         // Arcco Pages - Construtor de páginas
  | 'ARCCO_DESIGN'        // Arcco Design - Editor de Imagens
  | 'ARCCO_DRIVE'         // Arcco Drive - Cofre de Arquivos
  | 'ARCCO_CHAT'          // Arcco Chat - Chat com IA
  | 'AULAS'               // Aulas (em breve)
  | 'SUPORTE'             // Suporte
  | 'PROFILE'             // Minha Conta
  | 'SETTINGS';           // Configurações

// ==========================================
// PLATFORM & TOOLS TYPES
// ==========================================

export type ToolId = 'arcco_talk' | 'arcco_pages' | 'arcco_flow' | 'arcco_learn' | 'arcco_analytics';

export interface PlatformTool {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgGradient: string;
  status: 'active' | 'coming_soon' | 'beta';
  features: string[];
}

// ==========================================
// USER TYPES
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'operator';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}

// ==========================================
// ARCCO TALK TYPES
// ==========================================

export type TalkAgentType = 'sales' | 'support' | 'education';

export interface TalkAgent {
  id: string;
  name: string;
  type: TalkAgentType;
  description: string;
  status: 'active' | 'inactive' | 'configuring';
  createdAt: string;

  // WhatsApp Configuration
  whatsappConfig?: WhatsAppConfig;

  // Knowledge Base
  knowledgeBaseId?: string;

  // Spreadsheet integration
  spreadsheet?: Spreadsheet;
  spreadsheetId?: string;
  spreadsheetInstruction?: string;

  // Agent Behavior
  personality: AgentPersonality;

  // Statistics
  stats: TalkAgentStats;
}

export interface WhatsAppConfig {
  instanceName: string;
  agentId: string;
  userEmail: string;
  phoneNumber?: string;
  businessName?: string;
  status: 'connected' | 'disconnected' | 'pending';
  qrCode?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface AgentPersonality {
  greeting: string;
  tone: 'formal' | 'semiformal' | 'informal';
  useEmojis: boolean;
  responseLength: 'short' | 'medium' | 'detailed';
  language: string;
  customInstructions?: string;
}

export interface TalkAgentStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  avgResponseTime: string;
  satisfactionRate: number;
}

// ==========================================
// KNOWLEDGE BASE TYPES
// ==========================================

export interface KnowledgeCollection {
  id: string;
  title: string;
  description: string;
  agentId?: string;
  agentName?: string;
  documentsCount: number;
  lastUpdated: string;
  status: 'active' | 'syncing' | 'error';
  totalTokens?: number;
}

export interface KnowledgeItem {
  id: string;
  collectionId: string;
  title: string;
  type: 'pdf' | 'text' | 'url' | 'faq';
  content?: string;
  size: string;
  status: 'indexed' | 'processing' | 'error';
  date: string;
  tokens?: number;
}

// ==========================================
// CHAT/CONVERSATION TYPES
// ==========================================

export interface Message {
  id: string;
  senderId: 'me' | 'bot' | string;
  text: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'audio' | 'document';
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  agentId: string;
  contactId: string;
  contactName: string;
  contactNumber: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  source: 'whatsapp' | 'web';
  status: 'active' | 'waiting' | 'resolved';
  tags: string[];
  messages: Message[];
}

// ==========================================
// ARCCO CHAT TYPES
// ==========================================

export interface ChatConfig {
  id?: number;
  slot_number: number;  // 1-5
  model_name: string;
  openrouter_model_id: string;
  system_prompt?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessageLocal {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
}

export interface ArccoChatSession {
  id: string;
  title: string;
  date: string;
  messages: ChatMessageLocal[];
  selectedModel: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// SPREADSHEET TYPES
// ==========================================

export interface SpreadsheetCell {
  value: string | number;
  type: 'text' | 'number' | 'date';
}

export interface Spreadsheet {
  id: string;
  name: string;
  description?: string;
  url?: string;
  headers: string[];
  rows: SpreadsheetCell[][];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// NAVIGATION TYPES
// ==========================================

export interface NavItem {
  id: ViewState;
  label: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
  comingSoon?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// ==========================================
// LEGACY TYPES (for backwards compatibility)
// ==========================================

export interface AgentAction {
  id: string;
  category: 'read' | 'act';
  type: 'spreadsheet' | 'message' | 'web_extract';
  name: string;
  triggerType: 'auto' | 'explicit' | 'scheduled' | 'action_complete';
  parentActionId?: string;
  systemInstruction: string;
  requireConfirmation: boolean;
  details: string;
  status: 'active' | 'paused';
}
