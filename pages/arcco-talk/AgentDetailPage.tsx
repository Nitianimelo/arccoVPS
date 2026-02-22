import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Settings,
  MessageSquare,
  Database,
  Send,
  Trash2,
  Bot,
  User,
  Save,
  ShoppingCart,
  HeadphonesIcon,
  GraduationCap,
  Loader2,
  AlertCircle,
  Zap,
  Wifi,
  WifiOff,
  Phone,
  Table,
  CheckCircle2,
  Sparkles,
  Edit2,
  X
} from 'lucide-react';
import { Spreadsheet, SpreadsheetCell, TalkAgent, TalkAgentType } from '../../types';
import { openRouterService, ChatMessage } from '../../lib/openrouter';
import { supabase, spreadsheetService, agentService, SpreadsheetRecord } from '../../lib/supabase';
import {
  getActiveEvolutionConfig,
  getEvolutionConnectionState,
  fetchEvolutionChats,
  fetchEvolutionMessages,
  sendEvolutionTextMessage,
  fetchRecentMessages,
  extractMessageText,
  extractMessageId,
  extractFromMe,
  extractRemoteJid,
  extractTimestamp
} from '../../lib/evolution';
import { useToast } from '../../components/Toast';

interface AgentDetailPageProps {
  agent: TalkAgent;
  onBack: () => void;
  onUpdateAgent: (agent: TalkAgent) => void;
  onDeleteAgent?: (id: string) => void;
  onConfigureWhatsApp: () => void;
}

type TabType = 'config' | 'simulator' | 'conversations' | 'knowledge';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface WhatsAppChat {
  id: string;
  name: string;
  number: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

interface WhatsAppMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  isAutoReply?: boolean;
}

const TYPE_CONFIG = {
  sales: { label: 'Vendas', icon: ShoppingCart, color: 'indigo', bgClass: 'bg-indigo-900/30', bgClass50: 'bg-indigo-900/50', textClass: 'text-indigo-400' },
  support: { label: 'Suporte', icon: HeadphonesIcon, color: 'emerald', bgClass: 'bg-emerald-900/30', bgClass50: 'bg-emerald-900/50', textClass: 'text-emerald-400' },
  education: { label: 'Educação', icon: GraduationCap, color: 'amber', bgClass: 'bg-amber-900/30', bgClass50: 'bg-amber-900/50', textClass: 'text-amber-400' }
};

export const AgentDetailPage: React.FC<AgentDetailPageProps> = ({
  agent,
  onBack,
  onUpdateAgent,
  onDeleteAgent,
  onConfigureWhatsApp
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState(agent);

  // Simulator state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [templateSystemPrompt, setTemplateSystemPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [runtimeSpreadsheet, setRuntimeSpreadsheet] = useState<Spreadsheet | undefined>(undefined);
  const [isEditingInstruction, setIsEditingInstruction] = useState(false);

  // WhatsApp Conversations state
  const [waChats, setWaChats] = useState<WhatsAppChat[]>([]);
  const [selectedWaChat, setSelectedWaChat] = useState<WhatsAppChat | null>(null);
  const [waMessages, setWaMessages] = useState<WhatsAppMessage[]>([]);
  const [waNewMessage, setWaNewMessage] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [evolutionConfig, setEvolutionConfig] = useState<{ baseUrl: string; apiKey: string } | null>(null);

  // Spreadsheet state
  const [availableSpreadsheets, setAvailableSpreadsheets] = useState<SpreadsheetRecord[]>([]);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [isSavingSpreadsheet, setIsSavingSpreadsheet] = useState(false);

  // Track which messages we've already replied to
  const repliedMessagesRef = useRef<Set<string>>(new Set());
  // Per-contact conversation history for AI context
  const contactHistoryRef = useRef<Map<string, ChatMessage[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const typeConfig = TYPE_CONFIG[agent.type as TalkAgentType];
  const TypeIcon = typeConfig.icon;

  // Sanitized instance name
  const instanceName = useMemo(() => {
    const raw = agent.whatsappConfig?.instanceName || agent.id;
    const rawStr = String(raw);
    return rawStr.startsWith('arcco-') ? rawStr : `arcco-${rawStr.replace(/[^a-zA-Z0-9-_]/g, '')}`;
  }, [agent]);

  // Load API key from Supabase on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const { data } = await supabase
          .from('ApiKeys')
          .select('api_key')
          .eq('provider', 'openrouter')
          .eq('is_active', true)
          .single();

        if (data?.api_key) {
          openRouterService.setApiKey(data.api_key);
          setApiConfigured(true);
        }
      } catch (error) {
        console.log('No API key configured');
      }
    };

    loadApiKey();
  }, []);

  // Load AgentTemplate (system_prompt + modelo) for this agent type
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const { data } = await supabase
          .from('AgentTemplates')
          .select('modelo, system_prompt')
          .eq('tipo', agent.type)
          .single();

        if (data) {
          if (data.system_prompt) {
            setTemplateSystemPrompt(data.system_prompt);
          }
          if (data.modelo) {
            setSelectedModel(data.modelo);
          }
        }
      } catch (error) {
        console.log('No template configured for type:', agent.type);
      }
    };

    loadTemplate();
  }, [agent.type]);

  // Load Evolution config
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getActiveEvolutionConfig();
      setEvolutionConfig(config);
    };
    loadConfig();
  }, []);

  // Check WhatsApp connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!evolutionConfig || !instanceName) return;
      try {
        const state = await getEvolutionConnectionState(evolutionConfig, instanceName);
        const connected = !!state && state.toLowerCase().includes('open');
        console.log('[AgentDetail] Connection check for', instanceName, '→ state:', state, '→ connected:', connected);
        setWaConnected(connected);
      } catch {
        // Fallback to stored config status
        const fallback = agent.whatsappConfig?.status === 'connected';
        console.log('[AgentDetail] Connection check failed, using stored status:', fallback);
        setWaConnected(fallback);
      }
    };
    checkConnection();
  }, [evolutionConfig, instanceName, agent.whatsappConfig?.status]);

  useEffect(() => {
    setEditedAgent(agent);

    // If agent has a linked spreadsheet ID but no content, fetch it
    const loadLinkedSpreadsheet = async () => {
      if (agent.spreadsheetId && !agent.spreadsheet) {
        // Fetch all sheets first (or fetch specific one)
        // Ideally fetch specific, but we need list anyway for config
      }
    };

    // Reset runtime spreadsheet
    setRuntimeSpreadsheet(agent.spreadsheet);
  }, [agent]);

  // Load available spreadsheets on mount
  useEffect(() => {
    const loadSpreadsheets = async () => {
      setIsLoadingSpreadsheets(true);
      try {
        const { data } = await spreadsheetService.getSpreadsheetsByUser(); // Fetch all (or filter by user if specific logic needed)
        if (data) setAvailableSpreadsheets(data);
      } catch (err) {
        console.error('Failed to load spreadsheets:', err);
      } finally {
        setIsLoadingSpreadsheets(false);
      }
    };
    loadSpreadsheets();
  }, []);

  // Use Effect to load linked spreadsheet content if ID exists
  useEffect(() => {
    const loadContent = async () => {
      if (agent.spreadsheetId && (!agent.spreadsheet || agent.spreadsheet.id !== agent.spreadsheetId)) {
        // Find in available if loaded, or fetch
        if (availableSpreadsheets.length > 0) {
          const found = availableSpreadsheets.find(s => s.id === agent.spreadsheetId);
          if (found) {
            // Map SpreadsheetRecord to Spreadsheet
            const mapped: Spreadsheet = {
              id: found.id || '',
              name: found.name || found.nome || 'Planilha',
              headers: Array.isArray(found.headers) ? found.headers : [],
              rows: Array.isArray(found.rows) ? (found.rows as any[]) : [],
              createdAt: found.created_at || new Date().toISOString(),
              updatedAt: found.updated_at || new Date().toISOString()
            };
            setRuntimeSpreadsheet(mapped);
            setEditedAgent(prev => ({ ...prev, spreadsheet: mapped }));
            onUpdateAgent({ ...agent, spreadsheet: mapped });
          }
        }
      }
    };
    loadContent();
  }, [agent.spreadsheetId, availableSpreadsheets]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [waMessages]);

  // Build system prompt from agent instructions
  const buildSystemPrompt = useCallback((): string => {
    // Start with the admin-configured template system prompt if available
    let prompt = templateSystemPrompt
      ? templateSystemPrompt
      : `Você é ${agent.name}, um assistente de ${typeConfig.label.toLowerCase()}.`;

    // Append user_config instructions from the agent configuration
    if (agent.personality?.customInstructions) {
      try {
        const instructions = JSON.parse(agent.personality.customInstructions);
        if (instructions.oferta) prompt += `\n\nOFERTA: ${instructions.oferta}`;
        if (instructions.clienteIdeal) prompt += `\n\nCLIENTE IDEAL: ${instructions.clienteIdeal}`;
        if (instructions.qualificacao) prompt += `\n\nQUALIFICAÇÃO: ${instructions.qualificacao}`;
        if (instructions.conducao) prompt += `\n\nCONDUÇÃO DA CONVERSA: ${instructions.conducao}`;
        if (instructions.tomLimites) prompt += `\n\nTOM E LIMITES: ${instructions.tomLimites}`;
        if (instructions.objetivo) prompt += `\n\nOBJETIVO: ${instructions.objetivo}`;
      } catch {
        prompt += `\n\n${agent.personality.customInstructions}`;
      }
    }

    if (agent.spreadsheet) {
      prompt += `\n\nPLANILHA VINCULADA: ${agent.spreadsheet.name}`;
      if (agent.spreadsheetInstruction) {
        prompt += `\nINSTRUÇÃO DA PLANILHA: ${agent.spreadsheetInstruction}`;
      }
      prompt += `\nCOLUNAS: ${agent.spreadsheet.headers.join(', ')}`;
      prompt += `\n\nINSTRUÇÕES DE AUTOMAÇÃO DE PLANILHA:`;
      prompt += `\nQuando identificar que uma informação deve ser adicionada na planilha (ex: agendou consulta, novo lead, venda realizada), você deve ADICIONAR uma linha automaticamente.`;
      prompt += `\nNÃO peça para o usuário digitar comandos. FAÇA você mesmo.`;
      prompt += `\nPara adicionar uma linha, inclua no final da sua resposta a tag oculta:`;
      prompt += `\n[SPREADSHEET_ADD: valor1 | valor2 | valor3]`;
      prompt += `\nSubstitua valor1, valor2, etc. pelos dados correspondentes às colunas. Se uma coluna for vazia, deixe um espaço entre as barras.`;
      prompt += `\nExemplo: "Agendado para amanhã!" [SPREADSHEET_ADD: João Silva | 10/10/2024 | 14:00]`;
    }

    prompt += `\n\nIMPORTANTE: Você está respondendo mensagens do WhatsApp. Seja direto, amigável e conciso. Use emojis quando apropriado. Mantenha respostas curtas (máximo 2-3 parágrafos).`;

    return prompt;
  }, [agent, typeConfig, templateSystemPrompt]);

  // =====================================================
  // AUTO-REPLY ENGINE
  // =====================================================

  const processAutoReply = useCallback(async (
    contactNumber: string,
    incomingText: string,
    messageId: string
  ) => {
    if (!evolutionConfig || !apiConfigured || !autoReplyEnabled) return;
    if (repliedMessagesRef.current.has(messageId)) return;

    repliedMessagesRef.current.add(messageId);
    setIsReplying(true);

    try {
      console.log(`[AutoReply] Processing message from ${contactNumber}: "${incomingText.substring(0, 50)}..."`);

      // Get or create contact history
      const history = contactHistoryRef.current.get(contactNumber) || [];
      const systemPrompt = buildSystemPrompt();

      // Generate AI response
      let response = await openRouterService.sendMessage(
        selectedModel,
        systemPrompt,
        incomingText,
        history
      );

      // CHECK FOR AUTONOMOUS SPREADSHEET ACTIONS
      const addMatch = response.match(/\[SPREADSHEET_ADD:\s*(.*?)\]/);
      if (addMatch && runtimeSpreadsheet && agent.spreadsheetId) {
        const rawValues = addMatch[1].split('|').map(v => v.trim());
        const row = buildRowFromValues(runtimeSpreadsheet.headers, rawValues);

        // 1. Update local state
        const updatedRows = [...runtimeSpreadsheet.rows, row];
        const updatedSheet = { ...runtimeSpreadsheet, rows: updatedRows, updatedAt: new Date().toISOString() };

        setRuntimeSpreadsheet(updatedSheet);
        setEditedAgent(prev => ({ ...prev, spreadsheet: updatedSheet })); // Update config view if open

        // 2. Persist to Supabase immediately
        const rowsForDb = updatedRows.map(r => r.map(c => String(c.value)));
        try {
          await spreadsheetService.updateSpreadsheet(agent.spreadsheetId, {
            rows: rowsForDb
          });
          console.log('[AutoReply] Spreadsheet updated automatically');
          setAvailableSpreadsheets(prev => prev.map(s =>
            s.id === agent.spreadsheetId
              ? { ...s, rows: rowsForDb }
              : s
          ));
        } catch (err) {
          console.error('[AutoReply] Failed to update spreadsheet:', err);
        }

        // 3. Remove tag from response
        response = response.replace(addMatch[0], '').trim();
      }

      // Update contact history
      const updatedHistory: ChatMessage[] = [
        ...history,
        { role: 'user', content: incomingText },
        { role: 'assistant', content: response }
      ];
      // Keep last 20 messages for context
      contactHistoryRef.current.set(
        contactNumber,
        updatedHistory.slice(-20)
      );

      // Send reply via Evolution API
      await sendEvolutionTextMessage(evolutionConfig, instanceName, contactNumber, response);

      console.log(`[AutoReply] Replied to ${contactNumber}: "${response.substring(0, 50)}..."`);

      // Add to local messages if viewing this chat
      if (selectedWaChat && selectedWaChat.number === contactNumber) {
        setWaMessages(prev => [...prev, {
          id: `reply-${Date.now()}`,
          fromMe: true,
          text: response,
          timestamp: Date.now() / 1000,
          isAutoReply: true
        }]);
      }
    } catch (err) {
      console.error(`[AutoReply] Failed to reply to ${contactNumber}:`, err);
    } finally {
      setIsReplying(false);
    }
  }, [evolutionConfig, apiConfigured, autoReplyEnabled, instanceName, selectedModel, buildSystemPrompt, selectedWaChat, runtimeSpreadsheet, agent.spreadsheetId]);

  // Poll for new messages (auto-reply engine)
  useEffect(() => {
    if (activeTab !== 'conversations' || !waConnected || !evolutionConfig || !autoReplyEnabled || !apiConfigured) return;

    console.log('[AutoReply] Starting polling...');
    let active = true;

    const poll = async () => {
      if (!active) return;

      try {
        const recentMsgs = await fetchRecentMessages(evolutionConfig, instanceName, 30);
        console.log(`[AutoReply] Polled ${recentMsgs.length} messages`);

        for (const msg of recentMsgs) {
          const msgId = extractMessageId(msg, 0);

          if (extractFromMe(msg)) {
            // console.log(`[AutoReply] Skipping own message ${msgId}`);
            continue;
          }

          if (!msgId || repliedMessagesRef.current.has(msgId)) {
            // console.log(`[AutoReply] Skipping already processed message ${msgId}`);
            continue;
          }

          const text = extractMessageText(msg);
          if (!text.trim()) {
            console.log(`[AutoReply] Skipping empty message ${msgId}. Type: ${msg.messageType || 'unknown'}`);
            // console.log('Raw empty msg:', JSON.stringify(msg));
            continue;
          }

          const remoteJid = extractRemoteJid(msg);

          // Ignore groups (remoteJid ends with @g.us)
          if (remoteJid.includes('@g.us')) {
            // console.log(`[AutoReply] Skipping group message from ${remoteJid}`);
            continue;
          }

          const contactNumber = remoteJid.split('@')[0] || '';
          if (!contactNumber) {
            console.log(`[AutoReply] Skipping message ${msgId} (no contact number)`);
            continue;
          }

          // Check message age (allow up to 5 minutes for testing)
          let ts = extractTimestamp(msg);
          const nowSec = Date.now() / 1000;

          // If ts is zero or unreasonably old, warn but maybe process if it looks new? 
          // For now, strict check but relaxed to 300s
          if (ts <= 0) {
            console.log(`[AutoReply] Message ${msgId} has invalid timestamp ${ts}, treating as new`);
            ts = nowSec;
          }

          const age = nowSec - ts;
          if (age > 3600) { // 1 hour
            console.log(`[AutoReply] Skipping old message ${msgId} (age: ${age.toFixed(1)}s)`);
            continue;
          }

          console.log(`[AutoReply] >>> TRIGGERING REPLY <<< From: ${contactNumber}, Ref: ${msgId}, Text: "${text.substring(0, 40)}..."`);
          await processAutoReply(contactNumber, text, msgId);
        }
      } catch (err) {
        console.warn('[AutoReply] Polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      active = false;
      clearInterval(interval);
      console.log('[AutoReply] Polling stopped');
    };
  }, [activeTab, waConnected, evolutionConfig, instanceName, autoReplyEnabled, apiConfigured, processAutoReply]);

  // Periodic cleanup of refs to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep only last 1000 replied message IDs
      if (repliedMessagesRef.current.size > 1000) {
        const arr = Array.from(repliedMessagesRef.current);
        repliedMessagesRef.current = new Set(arr.slice(-500));
      }
      // Keep only last 50 contact histories
      if (contactHistoryRef.current.size > 50) {
        const keys = Array.from(contactHistoryRef.current.keys());
        const keysToDelete = keys.slice(0, keys.length - 30);
        keysToDelete.forEach(k => contactHistoryRef.current.delete(k));
      }
    }, 60000); // every minute
    return () => clearInterval(cleanup);
  }, []);

  // =====================================================
  // LOCAL STORAGE HELPERS
  // =====================================================
  const lsKey = useCallback((suffix: string) => `arcco-wa-${agent.id}-${suffix}`, [agent.id]);

  const saveToLS = useCallback((suffix: string, data: unknown) => {
    try { localStorage.setItem(lsKey(suffix), JSON.stringify(data)); } catch { /* quota */ }
  }, [lsKey]);

  const loadFromLS = useCallback(<T,>(suffix: string): T | null => {
    try {
      const raw = localStorage.getItem(lsKey(suffix));
      return raw ? JSON.parse(raw) as T : null;
    } catch { return null; }
  }, [lsKey]);

  // Load cached chats/messages from localStorage on mount
  useEffect(() => {
    const cachedChats = loadFromLS<WhatsAppChat[]>('chats');
    if (cachedChats && cachedChats.length > 0) {
      console.log('[Conversations] Loaded', cachedChats.length, 'cached chats from localStorage');
      setWaChats(cachedChats);
    }
  }, [loadFromLS]);

  // Load WhatsApp chats when tab is active
  useEffect(() => {
    const loadChats = async () => {
      if (activeTab !== 'conversations' || !waConnected || !evolutionConfig) return;

      setWaLoading(true);
      try {
        const chats = await fetchEvolutionChats(evolutionConfig, instanceName);
        console.log('[Conversations] Raw chats from API:', chats.length);

        const mapped: WhatsAppChat[] = chats.map((chat, i) => {
          // Extract ID — Evolution v2 uses remoteJid or id
          const rawId = String(chat.remoteJid || chat.id || chat.chatId || chat.jid || `${i}`);
          const contactNumber = String(chat.number || chat.phone || rawId.split('@')[0] || '');

          // Extract last message text
          let lastMsg = '';
          const lm = chat.lastMessage;
          if (typeof lm === 'string') lastMsg = lm;
          else if (typeof lm === 'object' && lm !== null) {
            const lmr = lm as Record<string, unknown>;
            lastMsg = extractMessageText(lmr) || String(lmr.message || lmr.text || '');
          }

          // Timestamp
          const ts = chat.lastMessageTimestamp || chat.updatedAt || chat.timestamp;
          let parsedTs = Date.now();
          if (typeof ts === 'number') parsedTs = ts > 1e12 ? ts : ts * 1000;
          else if (typeof ts === 'string') parsedTs = Date.parse(ts) || Date.now();

          return {
            id: rawId,
            name: String(chat.name || chat.pushName || chat.notifyName || contactNumber || 'Contato'),
            number: contactNumber,
            lastMessage: lastMsg,
            lastMessageTime: new Date(parsedTs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            unread: Number(chat.unreadCount || chat.unreadMessages || 0)
          };
        }).filter(c => c.number && !c.id.includes('status@') && !c.id.includes('newsletter'));

        if (mapped.length > 0) {
          setWaChats(mapped);
          saveToLS('chats', mapped);
        }
      } catch (err) {
        console.error('[Conversations] Error loading chats:', err);
      } finally {
        setWaLoading(false);
      }
    };

    loadChats();
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, [activeTab, waConnected, evolutionConfig, instanceName, saveToLS]);

  // Load messages for selected chat
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedWaChat || !evolutionConfig || !waConnected) return;

      // Load from localStorage first
      const cached = loadFromLS<WhatsAppMessage[]>(`msgs-${selectedWaChat.id}`);
      if (cached && cached.length > 0 && waMessages.length === 0) {
        setWaMessages(cached.sort((a, b) => a.timestamp - b.timestamp));
      }

      try {
        const msgs = await fetchEvolutionMessages(
          evolutionConfig, instanceName,
          selectedWaChat.id, selectedWaChat.number
        );
        console.log('[Conversations] Raw messages from API:', msgs.length);

        const mapped: WhatsAppMessage[] = msgs.map((msg, i) => ({
          id: extractMessageId(msg, i),
          fromMe: extractFromMe(msg),
          text: extractMessageText(msg),
          timestamp: extractTimestamp(msg)
        })).filter(m => m.text.trim())
          .sort((a, b) => a.timestamp - b.timestamp); // Sort chronological (oldest first)

        if (mapped.length > 0) {
          setWaMessages(mapped);
          saveToLS(`msgs-${selectedWaChat.id}`, mapped);
        }

        // Mark all as "seen" so auto-reply doesn't re-process
        mapped.forEach(m => {
          if (!m.fromMe) repliedMessagesRef.current.add(m.id);
        });
      } catch (err) {
        console.error('[Conversations] Error loading messages:', err);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedWaChat?.id, evolutionConfig, instanceName, waConnected, loadFromLS, saveToLS]);

  // Send manual WhatsApp message
  const handleSendWaMessage = async () => {
    if (!waNewMessage.trim() || !selectedWaChat || !evolutionConfig) return;

    try {
      await sendEvolutionTextMessage(evolutionConfig, instanceName, selectedWaChat.number, waNewMessage);
      setWaMessages(prev => [...prev, {
        id: `manual-${Date.now()}`,
        fromMe: true,
        text: waNewMessage,
        timestamp: Date.now() / 1000
      }]);
      setWaNewMessage('');
    } catch (err) {
      console.error('[Conversations] Error sending message:', err);
    }
  };

  // =====================================================
  // SIMULATOR (existing logic preserved)
  // =====================================================

  const handleLinkSpreadsheet = (spreadsheetId: string) => {
    console.log('[LinkSpreadsheet] Selected:', spreadsheetId);
    // Loose equality check in case ID types differ (string vs number)
    const found = availableSpreadsheets.find(s => String(s.id) === String(spreadsheetId));

    if (!found) {
      console.log('[LinkSpreadsheet] Spreadsheet not found in available list', availableSpreadsheets);
      return;
    }

    const mapped: Spreadsheet = {
      id: found.id || '',
      name: found.name || found.nome || 'Planilha',
      headers: Array.isArray(found.headers) ? found.headers : [],
      rows: Array.isArray(found.rows) ? (found.rows as any[]) : [],
      createdAt: found.created_at || new Date().toISOString(),
      updatedAt: found.updated_at || new Date().toISOString()
    };

    setEditedAgent(prev => ({
      ...prev,
      spreadsheet: mapped,
      spreadsheetId: found.id,
      spreadsheetInstruction: '' // Start empty
    }));
    setRuntimeSpreadsheet(mapped);
    setIsEditing(true); // Enable edit mode to allow instruction input
  };

  const getSafeUserConfig = () => {
    try {
      return JSON.parse(agent.personality.customInstructions || '{}');
    } catch {
      return {};
    }
  };

  const handleSave = async () => {
    // 1. Generate new config first
    // Moved onUpdateAgent to after successful generation and DB save attempt OR parallel execution
    // access to safe config

    // 2. Persist to Supabase
    try {
      const existingConfig = getSafeUserConfig();

      // Create updated config
      const userConfig = {
        ...existingConfig,
        // Ensure standard fields are preserved
        oferta: existingConfig.oferta,
        clienteIdeal: existingConfig.clienteIdeal,
        qualificacao: existingConfig.qualificacao,
        conducao: existingConfig.conducao,
        tomLimites: existingConfig.tomLimites,
        objetivo: existingConfig.objetivo,

        // Add spreadsheet info
        spreadsheet_id: editedAgent.spreadsheetId,
        spreadsheet_instruction: editedAgent.spreadsheetInstruction
      };

      await agentService.updateAgent(agent.id, {
        nome: editedAgent.name,
        user_config: userConfig as any
      });
      console.log('Saved agent to Supabase with spreadsheet config');

      // 3. Update local state with CORRECT customInstructions to prevent staleness
      const updatedCustomInstructions = JSON.stringify(userConfig);
      onUpdateAgent({
        ...editedAgent,
        personality: {
          ...editedAgent.personality,
          customInstructions: updatedCustomInstructions
        }
      });
      setIsEditing(false);

    } catch (err) {
      console.error('Failed to save agent to Supabase:', err);
    }
  };



  const handleSaveInstructionOnly = async () => {
    try {
      const existingConfig = getSafeUserConfig();
      const updatedConfig = {
        ...existingConfig,
        spreadsheet_instruction: editedAgent.spreadsheetInstruction
        // Note: we preserve spreadsheet_id from existingConfig
      };

      await agentService.updateAgent(agent.id, {
        user_config: updatedConfig as any
      });

      // Update local agent state including customInstructions
      const updatedCustomInstructions = JSON.stringify(updatedConfig);
      onUpdateAgent({
        ...agent,
        spreadsheetInstruction: editedAgent.spreadsheetInstruction,
        personality: {
          ...agent.personality,
          customInstructions: updatedCustomInstructions
        }
      });

      setIsEditingInstruction(false);
      showToast('Instrução salva com sucesso!', 'success');
    } catch (err) {
      console.error('Failed to save instruction:', err);
      showToast('Erro ao salvar instrução.', 'error');
    }
  };

  const createEmptySpreadsheet = (name: string, url: string, headers: string[]): Spreadsheet => {
    const now = new Date().toISOString();
    return { id: `${Date.now()}`, name, description: '', headers, rows: [], createdAt: now, updatedAt: now };
  };

  const handleUnlinkSpreadsheet = async () => {
    if (!confirm('Tem certeza que deseja desvincular esta planilha? A instrução personalizada também será removida.')) return;

    try {
      const existingConfig = getSafeUserConfig();
      const updatedConfig = {
        ...existingConfig,
        spreadsheet_id: null,
        spreadsheet_instruction: null
      };

      await agentService.updateAgent(agent.id, {
        user_config: updatedConfig as any
      });

      // Update local state
      setEditedAgent(prev => ({ ...prev, spreadsheet: undefined, spreadsheetId: undefined, spreadsheetInstruction: undefined }));
      setRuntimeSpreadsheet(undefined);

      // Update agent in list with cleaned config
      const updatedCustomInstructions = JSON.stringify(updatedConfig);
      onUpdateAgent({
        ...agent,
        spreadsheetId: undefined,
        spreadsheet: undefined,
        personality: {
          ...agent.personality,
          customInstructions: updatedCustomInstructions
        }
      });

      console.log('Spreadsheet unlinked successfully');
    } catch (err) {
      console.error('Failed to unlink spreadsheet:', err);
      showToast('Erro ao desvincular planilha.', 'error');
    }
  };

  const buildRowFromValues = (headers: string[], values: string[]): SpreadsheetCell[] => {
    return headers.map((_, index) => ({ value: values[index] ?? '', type: 'text' }));
  };

  const updateSpreadsheet = (nextSpreadsheet?: Spreadsheet) => {
    setRuntimeSpreadsheet(nextSpreadsheet);
    setEditedAgent((prev) => ({ ...prev, spreadsheet: nextSpreadsheet }));
    onUpdateAgent({ ...agent, spreadsheet: nextSpreadsheet });
  };

  const handleSpreadsheetCommand = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const addMatch = trimmed.match(/^\/?planilha\s+(adicionar|add)\s+(.+)$/i);
    const deleteMatch = trimmed.match(/^\/?planilha\s+(excluir|remover|delete)\s+(\d+)$/i);

    if (!addMatch && !deleteMatch) return false;

    if (!runtimeSpreadsheet) {
      const agentMessage: Message = { id: (Date.now() + 1).toString(), role: 'agent', content: '⚠️ Nenhuma planilha vinculada.', timestamp: new Date() };
      setMessages(prev => [...prev, agentMessage]);
      return true;
    }

    if (addMatch) {
      const rawValues = addMatch[2].split('|').map(v => v.trim()).filter(Boolean);
      const row = buildRowFromValues(runtimeSpreadsheet.headers, rawValues);
      updateSpreadsheet({ ...runtimeSpreadsheet, rows: [...runtimeSpreadsheet.rows, row], updatedAt: new Date().toISOString() });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: `✅ Linha adicionada na planilha "${runtimeSpreadsheet.name}".`, timestamp: new Date() }]);
      return true;
    }

    if (deleteMatch) {
      const index = Number(deleteMatch[2]) - 1;
      if (Number.isNaN(index) || index < 0 || index >= runtimeSpreadsheet.rows.length) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: '⚠️ Índice inválido.', timestamp: new Date() }]);
        return true;
      }
      const updatedRows = runtimeSpreadsheet.rows.filter((_, i) => i !== index);
      updateSpreadsheet({ ...runtimeSpreadsheet, rows: updatedRows, updatedAt: new Date().toISOString() });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: `🗑️ Linha ${index + 1} removida.`, timestamp: new Date() }]);
      return true;
    }

    return false;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: inputMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const messageText = inputMessage;
    setInputMessage('');

    if (handleSpreadsheetCommand(messageText)) return;

    if (!apiConfigured) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: '⚠️ API não configurada. Configure uma API Key do OpenRouter no painel de administração.', timestamp: new Date() }]);
      }, 500);
      return;
    }

    setIsLoading(true);
    try {
      const systemPrompt = buildSystemPrompt();
      const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: messageText }];
      let response = await openRouterService.sendMessage(selectedModel, systemPrompt, messageText, chatHistory);

      // CHECK FOR AUTONOMOUS SPREADSHEET ACTIONS
      const addMatch = response.match(/\[SPREADSHEET_ADD:\s*(.*?)\]/);
      if (addMatch && runtimeSpreadsheet && agent.spreadsheetId) {
        const rawValues = addMatch[1].split('|').map(v => v.trim());
        const row = buildRowFromValues(runtimeSpreadsheet.headers, rawValues);

        // 1. Update local state
        const updatedRows = [...runtimeSpreadsheet.rows, row];
        const updatedSheet = { ...runtimeSpreadsheet, rows: updatedRows, updatedAt: new Date().toISOString() };

        setRuntimeSpreadsheet(updatedSheet);
        setEditedAgent(prev => ({ ...prev, spreadsheet: updatedSheet }));

        // 2. Persist to Supabase immediately
        // We map back to string[][] for the database
        const rowsForDb = updatedRows.map(r => r.map(c => String(c.value)));
        spreadsheetService.updateSpreadsheet(agent.spreadsheetId, {
          rows: rowsForDb
        }).then(() => {
          console.log('[AutoSpreadsheet] Saved to Supabase');
          // Update available spreadsheets list to keep sync
          setAvailableSpreadsheets(prev => prev.map(s =>
            s.id === agent.spreadsheetId
              ? { ...s, rows: rowsForDb }
              : s
          ));
        }).catch(err => console.error('[AutoSpreadsheet] Failed to save:', err));

        // 3. Remove tag from response
        response = response.replace(addMatch[0], '').trim();
      }

      setChatHistory([...newHistory, { role: 'assistant', content: response }]);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: response, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => { setMessages([]); setChatHistory([]); };

  // =====================================================
  // RENDER FUNCTIONS
  // =====================================================

  const renderConfig = () => (
    <div className="space-y-6">
      {/* Agent Info Card */}
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Informações do Agente</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-600/10 rounded-lg transition-all">Editar</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditedAgent(agent); setIsEditing(false); }} className="px-4 py-2 text-sm text-neutral-400 hover:bg-white/5 rounded-lg transition-all">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-2"><Save size={16} /> Salvar</button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Nome</label>
            {isEditing ? (
              <input type="text" value={editedAgent.name} onChange={(e) => setEditedAgent({ ...editedAgent, name: e.target.value })} className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
            ) : (
              <p className="text-white">{agent.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Tipo</label>
            <div className="flex items-center gap-2">
              <TypeIcon size={18} className={typeConfig.textClass} />
              <span className="text-white">{typeConfig.label}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Descrição</label>
            {isEditing ? (
              <textarea value={editedAgent.description} onChange={(e) => setEditedAgent({ ...editedAgent, description: e.target.value })} rows={3} className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none" />
            ) : (
              <p className="text-white">{agent.description || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Status</label>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${agent.status === 'active' ? 'bg-green-900/30 text-green-400' : agent.status === 'configuring' ? 'bg-amber-900/30 text-amber-400' : 'bg-neutral-800 text-neutral-400'}`}>
              <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-400' : agent.status === 'configuring' ? 'bg-amber-400' : 'bg-neutral-400'}`}></span>
              {agent.status === 'active' ? 'Ativo' : agent.status === 'configuring' ? 'Configurando' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Instruções</h3>
        {agent.personality?.customInstructions ? (
          (() => {
            try {
              const instructions = JSON.parse(agent.personality.customInstructions);
              const fields = [
                { key: 'oferta', label: 'Oferta' }, { key: 'clienteIdeal', label: 'Cliente Ideal' },
                { key: 'qualificacao', label: 'Qualificação' }, { key: 'conducao', label: 'Condução da Conversa' },
                { key: 'tomLimites', label: 'Tom e Limites' }, { key: 'objetivo', label: 'Objetivo' }
              ];
              return (
                <div className="space-y-4">
                  {fields.map(({ key, label }) => (
                    instructions[key] && (
                      <div key={key}>
                        <label className="block text-sm font-medium text-indigo-400 mb-1">{label}</label>
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{instructions[key]}</p>
                      </div>
                    )
                  ))}
                </div>
              );
            } catch {
              return <p className="text-sm text-neutral-300">{agent.personality.customInstructions}</p>;
            }
          })()
        ) : (
          <p className="text-neutral-500">Nenhuma instrução configurada.</p>
        )}
      </div>

      {/* Spreadsheet Integration */}
      {/* Spreadsheet Integration */}
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Planilha vinculada</h3>
            <p className="text-xs text-neutral-500">Vincule uma planilha existente do sistema para que o agente possa consultá-la.</p>
          </div>
        </div>

        {!editedAgent.spreadsheetId && !editedAgent.spreadsheet ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Selecionar Planilha Existente</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  onChange={(e) => handleLinkSpreadsheet(e.target.value)}
                  value={editedAgent.spreadsheetId || ""}
                >
                  <option value="">Selecione uma planilha...</option>
                  {availableSpreadsheets.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.nome || 'Sem nome'}</option>
                  ))}
                </select>
                <button onClick={() => { /* Navigate to tools? */ }} className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#262626] text-white rounded-lg transition-colors text-sm whitespace-nowrap">
                  Ir para Planilhas
                </button>
              </div>
              {availableSpreadsheets.length === 0 && (
                <p className="text-xs text-amber-500 mt-2">Nenhuma planilha encontrada. Crie uma na seção Ferramentas para vincular aqui.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-900/30 flex items-center justify-center">
                    <Table size={20} className="text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{runtimeSpreadsheet?.name || 'Planilha'}</h3>
                    <p className="text-xs text-neutral-500">
                      {runtimeSpreadsheet?.headers.length} colunas, {runtimeSpreadsheet?.rows.length} linhas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-lg flex items-center gap-1">
                    <CheckCircle2 size={12} /> Vinculada
                  </span>

                  <button
                    onClick={handleUnlinkSpreadsheet}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-xs flex items-center gap-1"
                    title="Desvincular Planilha"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Desvincular</span>
                  </button>

                  {isEditing && (
                    <button
                      onClick={handleSave}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs px-3"
                    >
                      <Save size={14} /> Salvar Agente
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 p-3 bg-[#0A0A0A] rounded-lg border border-[#262626]">
                <p className="text-xs text-neutral-500 mb-2">Estrutura da planilha (visualização):</p>
                <div className="flex gap-2 flex-wrap">
                  {runtimeSpreadsheet?.headers.map((h, i) => (
                    <span key={i} className="px-2 py-1 bg-[#1a1a1a] text-neutral-300 text-xs rounded border border-[#333]">{h}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-neutral-400 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    Instrução para o Agente
                  </label>
                  {!isEditing && (
                    <div className="flex gap-2">
                      {!isEditingInstruction ? (
                        <button
                          onClick={() => setIsEditingInstruction(true)}
                          className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Edit2 size={12} /> Editar Instrução
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setIsEditingInstruction(false);
                              setEditedAgent(prev => ({ ...prev, spreadsheetInstruction: agent.spreadsheetInstruction }));
                            }}
                            className="text-xs flex items-center gap-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                          >
                            <X size={12} /> Cancelar
                          </button>
                          <button
                            onClick={handleSaveInstructionOnly}
                            className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
                          >
                            <Save size={12} /> Salvar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <textarea
                  value={editedAgent.spreadsheetInstruction || ''}
                  onChange={(e) => setEditedAgent({ ...editedAgent, spreadsheetInstruction: e.target.value })}
                  disabled={!isEditing && !isEditingInstruction}
                  placeholder="Ex: Use esta planilha para consultar preços. Se o cliente perguntar sobre 'Tênis', busque na coluna Produto..."
                  className={`w-full bg-[#0A0A0A] border rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none h-24 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isEditingInstruction ? 'border-indigo-500/50 bg-[#141414]' : 'border-[#262626]'}`}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Defina como o agente deve interagir com esta planilha. Dê exemplos de perguntas e o comportamento esperado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Agent */}
      < div className="bg-[#0A0A0A] border border-red-900/30 rounded-xl p-6" >
        <h3 className="text-lg font-semibold text-white mb-2">Zona de Perigo</h3>
        <p className="text-sm text-neutral-500 mb-4">Ao excluir o agente, todas as configurações serão perdidas permanentemente.</p>
        <button onClick={() => { if (confirm('Tem certeza que deseja excluir este agente?')) { onDeleteAgent?.(agent.id); onBack(); } }} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2">
          <Trash2 size={16} /> Excluir Agente
        </button>
      </div >
    </div >
  );

  const renderSimulator = () => (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-t-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${typeConfig.bgClass} flex items-center justify-center`}>
            <Bot size={20} className={typeConfig.textClass} />
          </div>
          <div>
            <p className="font-medium text-white">{agent.name}</p>
            <p className="text-xs text-neutral-500">Simulador de Conversa</p>
          </div>
        </div>
        <button onClick={handleClearChat} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all" title="Limpar conversa">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex-1 bg-[#0A0A0A] border-x border-[#1a1a1a] p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-neutral-600" />
              </div>
              <p className="text-neutral-500">Envie uma mensagem para simular uma conversa</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${message.role === 'user' ? 'bg-indigo-600' : typeConfig.bgClass50}`}>
                    {message.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className={typeConfig.textClass} />}
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[#141414] text-neutral-200 border border-[#262626]'}`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-indigo-200' : 'text-neutral-500'}`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-neutral-400" />
                  <span className="text-sm text-neutral-400">Pensando...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-b-xl p-4">
        <div className="flex gap-3">
          <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Digite uma mensagem..." className="flex-1 bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500" />
          <button onClick={handleSendMessage} disabled={!inputMessage.trim()} className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-xl transition-all">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderConversations = () => (
    <div className="flex h-[calc(100vh-280px)] bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl overflow-hidden">
      {/* Chat List */}
      <div className="w-80 border-r border-[#1a1a1a] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Conversas WhatsApp</h3>
            <div className="flex items-center gap-2">
              {waConnected ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400"><Wifi size={12} /> Online</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-400"><WifiOff size={12} /> Offline</span>
              )}
            </div>
          </div>

          {/* Auto-reply toggle */}
          <div className="flex items-center justify-between bg-[#141414] rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className={autoReplyEnabled ? 'text-green-400' : 'text-neutral-500'} />
              <span className="text-xs text-neutral-300">Auto-reply</span>
            </div>
            <button
              onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative ${autoReplyEnabled ? 'bg-green-600' : 'bg-neutral-700'}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${autoReplyEnabled ? 'left-[18px]' : 'left-[3px]'}`} />
            </button>
          </div>

          {isReplying && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Respondendo...</span>
            </div>
          )}
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {!waConnected ? (
            <div className="p-6 text-center">
              <WifiOff size={32} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-sm text-neutral-500 mb-3">WhatsApp não conectado</p>
              <button onClick={onConfigureWhatsApp} className="text-xs text-indigo-400 hover:text-indigo-300">Configurar WhatsApp →</button>
            </div>
          ) : waLoading ? (
            <div className="p-6 text-center"><Loader2 size={24} className="animate-spin text-neutral-500 mx-auto" /></div>
          ) : waChats.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">Nenhuma conversa encontrada</div>
          ) : (
            waChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedWaChat(chat)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-[#141414] transition-colors text-left border-b border-[#1a1a1a] ${selectedWaChat?.id === chat.id ? 'bg-[#141414]' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-900/40 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                  {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                    <span className="text-xs text-neutral-500 shrink-0">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate">{chat.lastMessage || 'Sem mensagens'}</p>
                </div>
                {chat.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center shrink-0">{chat.unread}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      {selectedWaChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-900/40 flex items-center justify-center text-indigo-300 font-bold text-sm">
              {selectedWaChat.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{selectedWaChat.name}</p>
              <p className="text-xs text-neutral-500">{selectedWaChat.number}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {waMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-neutral-500">Nenhuma mensagem</div>
            ) : (
              waMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.fromMe
                    ? msg.isAutoReply
                      ? 'bg-purple-700/60 text-purple-100 rounded-br-md'
                      : 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-[#1a1a1a] text-white rounded-bl-md'
                    }`}>
                    {msg.isAutoReply && (
                      <div className="flex items-center gap-1 mb-1">
                        <Bot size={10} className="text-purple-300" />
                        <span className="text-[10px] text-purple-300 font-medium">Auto-reply</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 text-right ${msg.fromMe ? 'text-indigo-200/60' : 'text-neutral-500'}`}>
                      {msg.timestamp > 0
                        ? new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#1a1a1a]">
            <div className="flex gap-3">
              <input
                type="text"
                value={waNewMessage}
                onChange={(e) => setWaNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendWaMessage()}
                placeholder="Responder manualmente..."
                className="flex-1 bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendWaMessage}
                disabled={!waNewMessage.trim() || !waConnected}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-xl transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Phone size={40} className="text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500">Selecione uma conversa</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderKnowledge = () => (
    <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mx-auto mb-4">
          <Database size={24} className="text-neutral-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Base de Conhecimento</h3>
        <p className="text-neutral-500 mb-6">Adicione documentos, FAQs e informações para que o agente responda com precisão.</p>
        <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all">Adicionar Conhecimento</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-12 h-12 rounded-xl ${typeConfig.bgClass} flex items-center justify-center`}>
              <TypeIcon size={24} className={typeConfig.textClass} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              <p className="text-sm text-neutral-400">Agente de {typeConfig.label}</p>
            </div>
          </div>
          <button
            onClick={onConfigureWhatsApp}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <MessageSquare size={16} />
            Configurar WhatsApp
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#0A0A0A] p-1 rounded-xl border border-[#1a1a1a]">
          <button onClick={() => setActiveTab('config')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>
            <Settings size={18} /> Configuração
          </button>
          <button onClick={() => setActiveTab('simulator')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'simulator' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>
            <Bot size={18} /> Simulador
          </button>
          <button onClick={() => setActiveTab('conversations')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'conversations' ? 'bg-green-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>
            <MessageSquare size={18} /> Conversas
            {waConnected && autoReplyEnabled && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
          <button onClick={() => setActiveTab('knowledge')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'knowledge' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>
            <Database size={18} /> Conhecimento
          </button>
        </div>

        {/* Content */}
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'simulator' && renderSimulator()}
        {activeTab === 'conversations' && renderConversations()}
        {activeTab === 'knowledge' && renderKnowledge()}
      </div>
    </div>
  );
};
