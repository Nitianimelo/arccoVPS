import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  AlertCircle,
  Search,
  MoreVertical,
  Phone,
  Check,
  CheckCheck,
  Send,
  Paperclip,
  Smile,
  ArrowLeft,
  Bot,
  Star,
  Archive
} from 'lucide-react';
import { ChatSession, Message, TalkAgent, ViewState } from '../../types';
import {
  fetchEvolutionChats,
  fetchEvolutionMessages,
  getActiveEvolutionConfig,
  getEvolutionConnectionState,
  sendEvolutionTextMessage
} from '../../lib/evolution';

interface ConversationsPageProps {
  agent: TalkAgent | null;
  onNavigate: (view: ViewState) => void;
}

export const ConversationsPage: React.FC<ConversationsPageProps> = ({ agent, onNavigate }) => {
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'waiting' | 'resolved'>('all');
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [evolutionConfig, setEvolutionConfig] = useState<{ baseUrl: string; apiKey: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use sanitized instance name matching evolution.ts
  const instanceName = useMemo(() => {
    const raw = agent?.whatsappConfig?.instanceName || agent?.id;
    if (!raw) return null;
    const rawStr = String(raw);
    return rawStr.startsWith('arcco-') ? rawStr : `arcco-${rawStr.replace(/[^a-zA-Z0-9-_]/g, '')}`;
  }, [agent]);

  // Load Evolution config
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getActiveEvolutionConfig();
      setEvolutionConfig(config);
    };
    loadConfig();
  }, []);

  // Check real connection state from Evolution API
  useEffect(() => {
    const checkConnection = async () => {
      if (!evolutionConfig || !instanceName) return;
      try {
        const state = await getEvolutionConnectionState(evolutionConfig, instanceName);
        const connected = !!state && state.toLowerCase().includes('open');
        setIsConnected(connected);
        console.log('[Conversations] Connection state:', state, 'connected:', connected);
      } catch {
        // If we can't check, fall back to stored config
        setIsConnected(agent?.whatsappConfig?.status === 'connected');
      }
    };
    checkConnection();
  }, [evolutionConfig, instanceName, agent]);

  // Load chats when connected
  useEffect(() => {
    const loadChats = async () => {
      if (!agent || !evolutionConfig || !instanceName || !isConnected) return;

      setLoadingChats(true);
      setErrorMessage(null);

      try {
        const chats = await fetchEvolutionChats(evolutionConfig, instanceName);
        const mapped = chats.map((chat, index) => {
          const rawId = String(chat.id || chat.chatId || chat.jid || chat.remoteJid || `${index}`);
          const contactNumber = String(chat.number || chat.phone || rawId.split('@')[0] || '');
          const lastMessage = String(
            (chat.lastMessage as Record<string, unknown> | undefined)?.message ||
            (chat.lastMessage as Record<string, unknown> | undefined)?.text ||
            chat.lastMessage ||
            ''
          );
          const lastTimestamp = chat.lastMessageTimestamp || chat.lastMessageTime || chat.timestamp;
          const parsedTimestamp =
            typeof lastTimestamp === 'number'
              ? lastTimestamp * 1000
              : typeof lastTimestamp === 'string'
                ? Date.parse(lastTimestamp)
                : Date.now();
          const formattedTime = lastTimestamp
            ? new Date(parsedTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '--';

          return {
            id: rawId,
            agentId: agent.id,
            contactId: rawId,
            contactName: String(chat.name || chat.pushName || contactNumber || 'Contato'),
            contactNumber,
            avatarColor: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500'][index % 4],
            lastMessage,
            lastMessageTime: formattedTime,
            unreadCount: Number(chat.unreadCount || 0),
            source: 'whatsapp',
            status: 'active',
            tags: [],
            messages: []
          } as ChatSession;
        });

        setConversations(mapped);
        if (mapped.length > 0 && !selectedChat) {
          setSelectedChat(mapped[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setErrorMessage('Não foi possível carregar as conversas.');
      } finally {
        setLoadingChats(false);
      }
    };

    loadChats();
  }, [agent, evolutionConfig, instanceName, isConnected]);

  // Load messages for selected chat
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChat || !agent || !evolutionConfig || !instanceName || !isConnected) return;

      setLoadingMessages(true);
      setErrorMessage(null);

      try {
        const messages = await fetchEvolutionMessages(
          evolutionConfig,
          instanceName,
          selectedChat.id,
          selectedChat.contactNumber
        );
        const mapped = messages.map((msg, index) => {
          const fromMe = Boolean((msg as Record<string, unknown>).fromMe);
          const text = String(
            (msg as Record<string, unknown>).text ||
            (msg as Record<string, unknown>).message ||
            (msg as Record<string, unknown>).content ||
            ''
          );
          const timestamp = (msg as Record<string, unknown>).timestamp || (msg as Record<string, unknown>).messageTimestamp || Date.now();
          const parsedTimestamp =
            typeof timestamp === 'number'
              ? timestamp * 1000
              : typeof timestamp === 'string'
                ? Date.parse(timestamp)
                : Date.now();
          return {
            id: String((msg as Record<string, unknown>).id || index),
            senderId: fromMe ? 'me' : selectedChat.contactNumber,
            text,
            timestamp: new Date(parsedTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            type: 'text'
          } as Message;
        });

        setSelectedChat({ ...selectedChat, messages: mapped });
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        setErrorMessage('Não foi possível carregar as mensagens.');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChat?.id, agent, evolutionConfig, instanceName, isConnected]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactNumber.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !evolutionConfig || !instanceName) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text'
    };

    try {
      await sendEvolutionTextMessage(evolutionConfig, instanceName, selectedChat.contactNumber, newMessage);
      setSelectedChat({
        ...selectedChat,
        messages: [...selectedChat.messages, message],
        lastMessage: newMessage,
        lastMessageTime: message.timestamp
      });
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setErrorMessage('Não foi possível enviar a mensagem.');
    }
  };

  const getStatusBadge = (status: ChatSession['status']) => {
    switch (status) {
      case 'active':
        return <span className="w-2 h-2 rounded-full bg-green-500" />;
      case 'waiting':
        return <span className="w-2 h-2 rounded-full bg-amber-500" />;
      case 'resolved':
        return <span className="w-2 h-2 rounded-full bg-neutral-500" />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Conversations List */}
      <div className="w-96 bg-[#0A0A0A] border-r border-[#1a1a1a] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => onNavigate('ARCCO_TALK')}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} className="text-neutral-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Conversas</h1>
              <p className="text-xs text-neutral-500">{conversations.length} conversas</p>
            </div>
          </div>
          {!isConnected && (
            <div className="mb-3 text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle size={14} />
              Conecte o WhatsApp deste agente para carregar as conversas.
            </div>
          )}
          {errorMessage && (
            <div className="mb-3 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle size={14} />
              {errorMessage}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {(['all', 'active', 'waiting', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
              >
                {status === 'all'
                  ? 'Todas'
                  : status === 'active'
                    ? 'Ativas'
                    : status === 'waiting'
                      ? 'Aguardando'
                      : 'Resolvidas'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-8 text-center text-neutral-500 text-sm">Carregando conversas...</div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-[#0F0F0F] transition-colors text-left border-b border-[#1a1a1a] ${selectedChat?.id === conv.id ? 'bg-[#0F0F0F]' : ''
                  }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full ${conv.avatarColor} flex items-center justify-center text-white font-bold`}
                  >
                    {conv.contactName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    {getStatusBadge(conv.status)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white truncate">{conv.contactName}</span>
                    <span className="text-xs text-neutral-500 shrink-0">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate">{conv.lastMessage || 'Sem mensagens'}</p>
                  {conv.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {conv.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unread Badge */}
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <MessageSquare size={32} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">Nenhuma conversa encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#050505]">
          {/* Chat Header */}
          <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0A0A0A]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${selectedChat.avatarColor} flex items-center justify-center text-white font-bold`}
              >
                {selectedChat.contactName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold text-white">{selectedChat.contactName}</h3>
                <p className="text-xs text-neutral-500">{selectedChat.contactNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <Phone size={18} className="text-neutral-400" />
              </button>
              <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <Star size={18} className="text-neutral-400" />
              </button>
              <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <Archive size={18} className="text-neutral-400" />
              </button>
              <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <MoreVertical size={18} className="text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="text-sm text-neutral-500">Carregando mensagens...</div>
            ) : selectedChat.messages.length > 0 ? (
              selectedChat.messages.map((message) => {
                const isMe = message.senderId === 'me';
                const isBot = message.senderId === 'bot';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : isBot
                            ? 'bg-purple-900/30 text-purple-100 border border-purple-800/50 rounded-bl-md'
                            : 'bg-[#1a1a1a] text-white rounded-bl-md'
                        }`}
                    >
                      {isBot && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot size={12} className="text-purple-400" />
                          <span className="text-xs text-purple-400 font-medium">Bot</span>
                        </div>
                      )}
                      <p className="text-sm">{message.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-indigo-200' : 'text-neutral-500'}`}>
                        <span className="text-xs">{message.timestamp}</span>
                        {isMe && (
                          message.status === 'read' ? (
                            <CheckCheck size={14} className="text-indigo-200" />
                          ) : (
                            <Check size={14} />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-neutral-500">Nenhuma mensagem encontrada.</div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#1a1a1a] bg-[#0A0A0A]">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                <Paperclip size={20} className="text-neutral-400" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 pr-10 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Smile size={20} className="text-neutral-500 hover:text-neutral-300 transition-colors" />
                </button>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center bg-[#050505]">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#0A0A0A] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={40} className="text-neutral-700" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Selecione uma conversa</h3>
            <p className="text-neutral-500 text-sm">
              Escolha uma conversa na lista para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
