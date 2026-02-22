import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Paperclip, Send, Mic, Phone, Check, CheckCheck, Smile, User, ArrowLeft, MessageSquare, Clock, Inbox, Tag } from 'lucide-react';
import { ChatSession, Message } from '../types';

interface AgentStats {
  id: string;
  name: string;
  role: string;
  activeChats: number;
  unreadMessages: number;
  avatarColor: string;
}

export const ChatsPage: React.FC = () => {
  // Navigation State
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Chat State
  const [selectedChatId, setSelectedChatId] = useState<string>('1');
  const [messageInput, setMessageInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  // -- MOCK DATA: AGENTS --
  const agents: AgentStats[] = [
    { id: '1', name: 'Sales SDR', role: 'Vendas', activeChats: 12, unreadMessages: 3, avatarColor: 'bg-orange-500' },
    { id: '2', name: 'Suporte L1', role: 'Atendimento', activeChats: 8, unreadMessages: 0, avatarColor: 'bg-blue-500' },
    { id: '3', name: 'Financeiro Bot', role: 'Financeiro', activeChats: 2, unreadMessages: 1, avatarColor: 'bg-emerald-500' },
  ];

  // -- MOCK DATA: CHATS --
  const [chats, setChats] = useState<ChatSession[]>([
    {
      id: '1',
      contactName: 'Carlos Silva',
      contactNumber: '+55 11 99999-8888',
      avatarColor: 'bg-emerald-600',
      lastMessage: 'Ok, vou verificar o contrato e te retorno.',
      lastMessageTime: '10:42',
      unreadCount: 0,
      source: 'whatsapp',
      status: 'open',
      messages: [
        { id: 'm1', senderId: 'carlos', text: 'Olá, gostaria de saber mais sobre o plano Pro.', timestamp: '10:30', status: 'read', type: 'text' },
        { id: 'm2', senderId: 'me', text: 'Olá Carlos! Claro, o plano Pro inclui agentes ilimitados e suporte 24h.', timestamp: '10:32', status: 'read', type: 'text' },
        { id: 'm3', senderId: 'carlos', text: 'Interessante. E qual o valor mensal?', timestamp: '10:35', status: 'read', type: 'text' },
        { id: 'm4', senderId: 'me', text: 'O valor é R$ 299/mês no plano anual.', timestamp: '10:36', status: 'read', type: 'text' },
        { id: 'm5', senderId: 'carlos', text: 'Ok, vou verificar o contrato e te retorno.', timestamp: '10:42', status: 'read', type: 'text' }
      ]
    },
    {
      id: '2',
      contactName: 'Ana Julia Tech',
      contactNumber: '+55 41 98888-7777',
      avatarColor: 'bg-indigo-600',
      lastMessage: 'Preciso de ajuda com a integração da API.',
      lastMessageTime: 'Ontem',
      unreadCount: 2,
      source: 'whatsapp',
      status: 'open',
      messages: [
        { id: 'm1', senderId: 'ana', text: 'Bom dia, suporte.', timestamp: '09:15', status: 'read', type: 'text' },
        { id: 'm2', senderId: 'ana', text: 'Preciso de ajuda com a integração da API.', timestamp: '09:16', status: 'delivered', type: 'text' }
      ]
    },
    {
      id: '3',
      contactName: 'Marcos Dev',
      contactNumber: '+55 21 97777-6666',
      avatarColor: 'bg-amber-600',
      lastMessage: 'Obrigado!',
      lastMessageTime: 'Segunda',
      unreadCount: 0,
      source: 'web',
      status: 'resolved',
      messages: [
        { id: 'm1', senderId: 'me', text: 'Seu ticket foi resolvido.', timestamp: '14:00', status: 'read', type: 'text' },
        { id: 'm2', senderId: 'marcos', text: 'Obrigado!', timestamp: '14:05', status: 'read', type: 'text' }
      ]
    }
  ]);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const currentAgent = agents.find(a => a.id === selectedAgentId);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      senderId: 'me',
      text: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text'
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === selectedChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: messageInput,
          lastMessageTime: 'Agora'
        };
      }
      return chat;
    }));

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- VIEW 1: AGENT SELECTION DASHBOARD ---
  const renderAgentSelection = () => (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Caixa de Entrada</h2>
        <p className="text-neutral-400">Selecione um agente para visualizar o fluxo de mensagens.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            onClick={() => setSelectedAgentId(agent.id)}
            className="group relative bg-[#0A0A0A] hover:bg-[#0F0F0F] border border-[#262626] hover:border-indigo-500/50 rounded-lg p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-indigo-900/10"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-lg ${agent.avatarColor} flex items-center justify-center text-white shadow-lg`}>
                <Inbox size={24} />
              </div>
              {agent.unreadMessages > 0 && (
                <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md shadow-indigo-900/20">
                  {agent.unreadMessages} pendentes
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
              {agent.name}
            </h3>
            <p className="text-sm text-neutral-500 mb-6 flex items-center gap-2">
              <Tag size={12} /> {agent.role}
            </p>

            <div className="pt-4 border-t border-[#262626] flex items-center justify-between">
               <div>
                  <span className="text-2xl font-bold text-white">{agent.activeChats}</span>
                  <span className="text-xs text-neutral-500 ml-2">conversas ativas</span>
               </div>
               <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-neutral-500 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                  <ArrowLeft size={16} className="rotate-180" />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- VIEW 2: CHAT INTERFACE ---
  const renderChatInterface = () => (
    <div className="flex h-[calc(100vh-2rem)] max-w-[1800px] mx-auto overflow-hidden bg-[#0A0A0A] border border-[#262626] rounded-xl my-4 mx-4 shadow-2xl animate-fade-in">
      {/* --- LEFT SIDEBAR: CHAT LIST --- */}
      <div className="w-80 border-r border-[#262626] flex flex-col bg-[#0A0A0A]">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] bg-[#0A0A0A]">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => setSelectedAgentId(null)}
              className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-[#1A1A1A] transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="font-semibold text-sm text-white truncate">{currentAgent?.name}</span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
            <input 
              type="text"
              placeholder="Filtrar tickets..."
              className="w-full bg-[#141414] border border-[#262626] rounded-md pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-neutral-600"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`flex flex-col gap-1 p-4 cursor-pointer border-b border-[#1A1A1A] transition-all hover:bg-[#111111] ${selectedChatId === chat.id ? 'bg-[#111111] border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium ${selectedChatId === chat.id ? 'text-white' : 'text-neutral-300'}`}>
                  {chat.contactName}
                </span>
                <span className="text-[10px] text-neutral-500">{chat.lastMessageTime}</span>
              </div>
              <p className="text-xs text-neutral-500 line-clamp-1">
                {chat.lastMessage}
              </p>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[10px] px-1.5 py-0.5 rounded border ${chat.source === 'whatsapp' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-600' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>
                    {chat.source}
                 </span>
                 {chat.unreadCount > 0 && (
                   <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded-full">
                     {chat.unreadCount}
                   </span>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- RIGHT PANEL: ACTIVE CHAT --- */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col bg-[#050505] relative">
          {/* Header */}
          <div className="h-14 border-b border-[#262626] bg-[#0A0A0A] flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-md ${selectedChat.avatarColor} flex items-center justify-center text-white font-bold text-xs`}>
                {selectedChat.contactName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">{selectedChat.contactName}</h3>
                <p className="text-xs text-neutral-500 flex items-center gap-2">
                   {selectedChat.contactNumber} • <span className="text-emerald-500">Ativo</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors">
                  Resolver Ticket
               </button>
               <button className="p-2 text-neutral-400 hover:text-white rounded-md hover:bg-[#1A1A1A]">
                 <MoreVertical size={16} />
               </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050505]">
            <div className="flex justify-center">
              <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">Hoje</span>
            </div>

            {selectedChat.messages.map((msg) => {
              const isMe = msg.senderId === 'me';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed border ${
                      isMe 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-100' 
                        : 'bg-[#151515] border-[#262626] text-neutral-300'
                    }`}>
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                      <span className="text-[10px] text-neutral-600">{msg.timestamp}</span>
                      {isMe && (
                        msg.status === 'read' 
                          ? <CheckCheck size={12} className="text-indigo-400" />
                          : <Check size={12} className="text-neutral-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-4 bg-[#0A0A0A] border-t border-[#262626]">
            <div className="relative">
               <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escreva uma resposta..."
                rows={1}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-4 pr-24 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 resize-none min-h-[50px]"
              />
              <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
                 <button className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-[#262626] transition-colors">
                    <Paperclip size={16} />
                 </button>
                 <button className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-[#262626] transition-colors">
                    <Smile size={16} />
                 </button>
                 <button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-1"
                 >
                    <Send size={14} />
                 </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-neutral-500">
           <Inbox size={48} className="text-neutral-800 mb-4" />
           <p className="text-sm">Selecione um ticket para ver os detalhes</p>
        </div>
      )}
    </div>
  );

  return selectedAgentId ? renderChatInterface() : renderAgentSelection();
};