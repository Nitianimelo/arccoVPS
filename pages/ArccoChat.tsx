import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertTriangle, Save, Edit, Terminal, FileText, Download, BrainCircuit, ChevronDown, Paperclip, HardDrive, FileSpreadsheet, Eye, X, Square } from 'lucide-react';
import { openRouterService } from '../lib/openrouter';
import { agentApi } from '../lib/api-client';
import { supabase } from '../lib/supabase';
import { driveService } from '../lib/driveService';
import { ArtifactCard } from '../components/chat/ArtifactCard';
import AgentThoughtPanel, { ThoughtStep } from '../components/chat/AgentThoughtPanel';
import { BrowserAgentCard } from '../components/chat/BrowserAgentCard';
import CircuitBackground from '../components/ui/CircuitBackground';
import ModelDropdownWithSearch from '../components/ModelDropdownWithSearch';
import { PostAST } from './arcco-pages/types/ast';
import { useToast } from '../components/Toast';
import AgentTerminal from '../components/AgentTerminal';
import { chatStorage, ChatSession, Message } from '../lib/chatStorage';
import { pexelsService } from '../lib/pexels';
import { PostBuilder } from './arcco-pages/PostBuilder';

interface FilePreviewCardProps {
  url: string;
  filename: string;
  type: 'pdf' | 'excel' | 'other';
  onOpenPreview?: () => void;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ url, filename, type, onOpenPreview }) => {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleDownload = () => window.open(url, '_blank');

  const handleSaveToVault = async () => {
    try {
      setIsSaving(true);
      const fileType = type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await driveService.saveArtifactReference(filename || `arquivo_${Date.now()}`, fileType, url);
      showToast('Arquivo salvo no Arcco Drive com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao salvar no cofre:', err);
      showToast(`Erro ao salvar no Cofre: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="my-4 bg-[#151515] border border-[#333] hover:border-indigo-500/50 rounded-xl overflow-hidden shadow-lg transition-all w-80">
      <div className="bg-[#1a1a1a] px-4 py-3 border-b border-[#333] flex items-center gap-3">
        {type === 'pdf' ? (
          <FileText size={24} className="text-red-400" />
        ) : type === 'excel' ? (
          <FileSpreadsheet size={24} className="text-emerald-400" />
        ) : (
          <HardDrive size={24} className="text-indigo-400" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-sm font-medium truncate" title={filename}>{filename}</h4>
          <span className="text-[10px] text-neutral-500 uppercase">{type} Document</span>
        </div>
      </div>
      <div className="p-3 bg-[#111] grid grid-cols-2 gap-2">
        {onOpenPreview && (
          <button
            onClick={onOpenPreview}
            className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-medium transition-colors"
          >
            <Eye size={14} /> Visualizar Preview
          </button>
        )}
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] text-neutral-300 py-2 rounded-lg text-xs font-medium transition-colors border border-neutral-800"
        >
          <Download size={14} /> Baixar
        </button>
        <button
          onClick={handleSaveToVault}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] disabled:opacity-50 text-neutral-300 py-2 rounded-lg text-xs font-medium transition-colors border border-neutral-800"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar
        </button>
      </div>
    </div>
  );
};

interface ArccoChatPageProps {
  userName: string;
  userPlan: string;
  chatSessionId?: string | null;
  onSessionUpdate?: (session: ChatSession) => void;
  initialMessage?: string | null;
  onClearInitialMessage?: () => void;
  onEditDesign?: (design: PostAST) => void;
  onNavigate?: (view: any) => void;
}

const ArccoChatPage: React.FC<ArccoChatPageProps> = ({
  userName,
  userPlan,
  chatSessionId,
  onSessionUpdate,
  initialMessage,
  onClearInitialMessage,
  onEditDesign
}) => {
  const { showToast } = useToast();


  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string, content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalContent, setTerminalContent] = useState('');

  const [agentThoughts, setAgentThoughts] = useState<ThoughtStep[]>([]);
  const [isThoughtsExpanded, setIsThoughtsExpanded] = useState(true);
  const [browserAction, setBrowserAction] = useState<{ status: string; url: string; title: string } | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const thoughtsStartTimeRef = useRef<number>(0);
  const [previewData, setPreviewData] = useState<{ url?: string, filename: string, type: 'pdf' | 'excel' | 'code' | 'design' | 'other', content?: string, ast?: any } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pexelsUrlsRef = useRef<string[]>([]);

  const arccoEmblemUrl = "https://qscezcbpwvnkqoevulbw.supabase.co/storage/v1/object/public/Chipro%20calculadora/8.png";

  // Dynamic Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getSubtitle = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    const isWeekend = day === 0 || day === 6;

    if (hour >= 5 && hour < 12) {
      if (day === 1) return "Segunda-feira com energia! Como posso te ajudar hoje?";
      if (day === 5) return "Sexta chegou! Vamos fechar a semana com tudo. O que fazemos?";
      if (isWeekend) return "Fim de semana produtivo! O que vamos criar juntos?";
      return "Mais um dia para criar algo incrível. Por onde começamos?";
    }
    if (hour >= 12 && hour < 18) {
      if (day === 5) return "Tarde de sexta! Últimos sprints do dia. No que posso ajudar?";
      if (isWeekend) return "Tarde de fim de semana! Em que posso ser útil?";
      return "A tarde é boa para grandes ideias. O que resolvemos hoje?";
    }
    if (hour >= 18 && hour < 23) {
      if (isWeekend) return "Boa noite! Ótima hora para criar algo memorável. Por onde vamos?";
      return "Encerrando o dia ou só aquecendo? Pode contar comigo.";
    }
    return "Madrugada produtiva! O que faremos juntos?";
  };

  const firstName = userName.split(' ')[0];
  const [greetingTime] = useState(getGreeting());
  const [greetingSubtitle] = useState(getSubtitle());

  // Single Source of Truth: busca a chave do Supabase (tabela ApiKeys) a cada mount.
  // Se a chave já estiver injetada (ex: via App.tsx), apenas confirma o estado.
  useEffect(() => {
    const loadApiKey = async () => {
      if (openRouterService.hasApiKey()) {
        setIsApiKeyReady(true);
        openRouterService.getModels().then(setAvailableModels);
        return;
      }
      const { data: apiKeyData } = await supabase
        .from('ApiKeys')
        .select('api_key')
        .eq('provider', 'openrouter')
        .eq('is_active', true)
        .single();
      if (apiKeyData?.api_key) {
        openRouterService.setApiKey(apiKeyData.api_key);
        setIsApiKeyReady(true);
        openRouterService.getModels().then(setAvailableModels);
      }
    };
    loadApiKey();
  }, []);

  // Load chat session if provided
  useEffect(() => {
    if (chatSessionId) {
      const session = chatStorage.getSession(chatSessionId);
      if (session) {
        setMessages(session.messages);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [chatSessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (initialMessage) {
      handleSendMessage(initialMessage);
      if (onClearInitialMessage) onClearInitialMessage();
    }
  }, [initialMessage]);

  // Timer para elapsed seconds do painel de pensamentos
  useEffect(() => {
    if (!isLoading || agentThoughts.length === 0) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - thoughtsStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading, agentThoughts.length]);

  const saveToSession = (msgs: Message[]) => {
    if (!msgs || msgs.length === 0) return;
    const session: ChatSession = {
      id: chatSessionId || Date.now().toString(),
      title: chatStorage.generateTitle(msgs),
      updatedAt: Date.now(),
      messages: msgs
    };
    chatStorage.saveSession(session);
    if (onSessionUpdate && session.id !== chatSessionId) {
      // It was a new session, notify parent adapter
      onSessionUpdate(session);
    }
  };

  const handleSendMessage = async (text: string = inputValue) => {
    if ((!text.trim() && attachments.length === 0) || isLoading || !isApiKeyReady) return;

    let finalUserText = text;
    if (attachments.length > 0) {
      attachments.forEach(att => {
        finalUserText += `\n\n[Conteúdo do Arquivo Injetado: ${att.name}]\n${att.content}`;
      });
    }

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = { id: userMsgId, role: 'user', content: finalUserText, timestamp: new Date().toISOString() };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    saveToSession(newMessages); // Save intermediate state

    setInputValue('');
    setAttachments([]);
    setIsLoading(true);
    setAgentThoughts([]);
    setBrowserAction(null);
    setIsThoughtsExpanded(true);
    setElapsedSeconds(0);
    thoughtsStartTimeRef.current = Date.now();

    const assistantMsgId = (Date.now() + 1).toString();
    const placeholderAiMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date().toISOString() };

    setMessages(prev => [...prev, placeholderAiMsg]);

    try {

      const formattedMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      // Typing effect queue
      let displayContent = '';
      let queue: string[] = [];
      let isTyping = false;

      const processQueue = async () => {
        if (isTyping || queue.length === 0) return;
        isTyping = true;

        while (queue.length > 0) {
          const chunk = queue.shift();
          if (chunk) {
            displayContent += chunk;
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMsgId ? { ...msg, content: displayContent } : msg
            ));
            await new Promise(r => setTimeout(r, 15 + Math.random() * 20));
          }
        }
        isTyping = false;

        // Save to storage after typing batch is done
        setMessages(currentMessages => {
          saveToSession(currentMessages);
          return currentMessages;
        });
      };

      // ── Pexels: busca imagens se o usuário pediu algo visual ──────────────
      let pexelsUrls: string[] = [];
      const imageKeywords = /(imagem|image|foto|photo|design|post|banner|thumbnail|capa|visual|gato|cat|criar|gerar|animal|logo|paisagem)/i;
      if (imageKeywords.test(text)) {
        try {
          // Extrai termos de busca — aceita palavras com 2+ letras
          const stopWords = ['criar', 'gerar', 'fazer', 'quero', 'preciso', 'para', 'sobre', 'uma', 'com', 'que', 'post', 'banner', 'design', 'imagem', 'foto'];
          const searchTerms = text
            .replace(/[^a-zA-Z\u00e0-\u00fa\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()))
            .slice(0, 4)
            .join(' ');

          const finalQuery = searchTerms || text.replace(/[^a-zA-Z\u00e0-\u00fa\s]/g, '').trim();
          if (finalQuery) {
            const result = await pexelsService.searchPhotos(finalQuery, { per_page: 3, orientation: 'landscape' });
            pexelsUrls = result.photos.map(p => p.src.large);
            pexelsUrlsRef.current = pexelsUrls;
          }
        } catch (e) {
          console.warn('[Pexels] Search failed in chat:', e);
        }
      }

      // Contrói bloco de URLs para o prompt
      const pexelsBlock = pexelsUrls.length > 0
        ? `\n\nIMPORTANTE — IMAGENS REAIS DISPONÍVEIS (USE OBRIGATORIAMENTE estas URLs no "src" dos ImageOverlay):
${pexelsUrls.map((url, i) => `- Imagem ${i + 1}: ${url}`).join('\n')}
NUNCA invente URLs de imagens. NUNCA use .png, .jpg ou nomes de arquivo inventados. Use APENAS as URLs acima.`
        : `\nSe precisar de imagem, use: https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1080`;

      const systemPrompt = `Você é um Cientista de Dados e Engenheiro de Software autônomo. Role: ${userPlan} user. Nome: ${userName}.
Use markdown. Responda em PT-BR.
${pexelsBlock}

REGRAS PARA DESIGN E IMAGENS:
Gere OBRIGATORIAMENTE um JSON (PostAST) no bloco \`\`\`json com esta estrutura exata:
\`\`\`json
{
"format": "square",
"meta": { "title": "Título do Post", "theme": "dark" },
"slides": [
{
"id": "slide-1",
"elements": [
{
"id": "bg-1",
"type": "ImageOverlay",
"props": { "src": "${pexelsUrls[0] || 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1080'}", "opacity": 0.4 },
"styles": { "width": "100%", "height": "100%", "top": "0", "left": "0" }
},
{
"id": "text-1",
"type": "TextOverlay",
"props": { "text": "Texto Chamativo", "variant": "h1" },
"styles": { "color": "#ffffff", "fontSize": "60px", "top": "40%", "left": "10%", "fontWeight": "bold" }
}
]
}
]
}
\`\`\`
Não adicione comentários. Utilize 'TextOverlay', 'ImageOverlay' ou 'Shape' para os types dos elements.
REGRA ABSOLUTA: O campo "src" de todo ImageOverlay DEVE começar com "https://images.pexels.com/". NUNCA use URLs inventadas.`;

      let fullResponse = '';
      let terminalLogs = '';
      let hasStartedTalking = false;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      await agentApi.chat(formattedMessages, systemPrompt, (type: string, content: string) => {

        // Agent Thought Panel — captura os steps do orquestrador/especialistas
        if (type === 'steps') {
          const label = content.replace(/<\/?step>/g, '').trim();
          if (label) {
            setAgentThoughts(prev => {
              const updated = prev.map(s =>
                s.status === 'running' ? { ...s, status: 'done' as const } : s
              );
              return [...updated, { label, status: 'running' }];
            });
          }
          return;
        }

        // Browser Agent Card — mostra card estilo Manus
        if (type === 'browser_action') {
          try {
            const data = JSON.parse(content);
            setBrowserAction(data);
          } catch { /* ignore parse errors */ }
          return;
        }

        if (type === 'chunk') {
          if (!hasStartedTalking) {
            hasStartedTalking = true;
            // Marca o último step como concluído e recolhe o painel
            setAgentThoughts(prev =>
              prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const } : s)
            );
            setIsThoughtsExpanded(false);

          }

          fullResponse += content;

          const cleanChunk = content.replace(/<step>[\s\S]*?(<\/step>|$)/g, '');
          if (cleanChunk) {
            queue.push(cleanChunk);
            processQueue();
          }
        }
      }, controller.signal);

      // Wait for queue to finish draining typing effect
      while (isTyping || queue.length > 0) {
        await new Promise(r => setTimeout(r, 50));
      }

      // Final save to guarantee persistence
      setMessages(currentMessages => {
        saveToSession(currentMessages);
        return currentMessages;
      });

    } catch (error: any) {
      console.error('Chat error:', error);

      setMessages(prev => {
        const errMsgs = prev.map(msg => {
          if (msg.id === assistantMsgId) {
            return { ...msg, content: `Desculpe, ocorreu um erro na comunicação (${error.message}).`, isError: true };
          }
          return msg;
        });
        saveToSession(errMsgs);
        return errMsgs;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveToVault = async (parsedDesign: PostAST) => {
    try {
      const title = parsedDesign.meta?.title || 'design';
      const fileName = `${title.replace(/\s+/g, '_')} -${Date.now()}.json`;
      await driveService.saveArtifactReference(
        fileName,
        'post_ast',
        JSON.stringify(parsedDesign, null, 2)
      );
      showToast('Design salvo no Cofre com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar no Cofre:', error);
      showToast('Erro ao salvar no Cofre. Verifique sua autenticação.', 'error');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      showToast('Upload de imagens requer processamento adicional de OCR.', 'info');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsFileLoading(true);
      const text = await agentApi.extractText(file);
      if (text) {
        setAttachments(prev => [...prev, { name: file.name, content: text.substring(0, 5000) }]);
        showToast('Arquivo anexado com sucesso!', 'success');
      } else {
        showToast('Não foi possível extrair texto ou o arquivo está vazio.', 'info');
      }
    } catch (err: any) {
      console.error('Erro no upload/extração:', err);
      showToast(`Erro ao processar arquivo: ${err.message} `, 'error');
    } finally {
      setIsFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const renderContent = (content: string) => {
    // Matches closed OR unclosed code blocks (until end of string) for streaming safety
    const parts = content.split(/(```[\s\S]*? (?: ```|$))/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)(?:```|$)/);
        if (!match) return <pre key={index} className="bg-[#111] p-3 rounded-lg overflow-x-auto text-sm">{part}</pre>;
        const language = match[1] || 'text';
        const code = match[2];

        if (language === 'json') {
          try {
            const parsed = JSON.parse(code);
            // LLMs sometimes wrap the JSON in a root object like {"post": {...}}
            const ast = parsed.post || parsed.design || parsed.ast || parsed;

            // Relaxed verification: if it looks like a design AST, render it.
            if (ast.slides || (ast.meta && ast.format) || ast.id?.startsWith('post') || Array.isArray(ast.slides)) {
              // ── POST-PROCESS: Forçar URLs reais do Pexels nos ImageOverlay ──
              if (pexelsUrlsRef.current.length > 0 && ast.slides) {
                let urlIndex = 0;
                for (const slide of ast.slides) {
                  if (slide.elements) {
                    for (const el of slide.elements) {
                      if (el.type === 'ImageOverlay' && el.props?.src) {
                        // Substitui qualquer URL que NÃO seja do Pexels
                        if (!el.props.src.includes('images.pexels.com')) {
                          el.props.src = pexelsUrlsRef.current[urlIndex % pexelsUrlsRef.current.length];
                          urlIndex++;
                        }
                      }
                    }
                  }
                }
              }
              return (
                <div key={index} className="my-4 bg-[#151515] border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5">
                  <div className="bg-indigo-500/10 px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      <span className="font-semibold text-indigo-100 text-sm">Design Gerado</span>
                    </div>
                    <span className="text-[10px] text-indigo-300 font-mono uppercase bg-indigo-500/20 px-2 py-0.5 rounded">{ast.format || 'post'}</span>
                  </div>
                  <div className="p-4">
                    <h4 className="text-white font-medium mb-1">{ast.meta?.title || 'Design'}</h4>
                    <p className="text-neutral-500 text-xs mb-4">{ast.slides?.length || 1} slide(s) • Tema {ast.meta?.theme || 'dark'}</p>
                    <div className="flex gap-2">
                      <button onClick={() => onEditDesign?.(ast)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"><Edit size={16} /> Interagir no Preview</button>
                      <button onClick={() => handleSaveToVault(ast)} className="flex-1 flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] text-neutral-300 py-2 rounded-lg text-sm font-medium transition-colors border border-neutral-800"><Save size={16} /> Salvar no Cofre</button>
                    </div>
                  </div>
                </div>
              );
            }
          } catch (e: any) {
            // Se o JSON estiver quebrado pq está stremando, mostramos um loader de design
            if (code.includes('"slides"') || code.includes('"format"') || code.includes('TextOverlay')) {
              return (
                <div key={index} className="my-4 bg-[#151515] border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5 animate-pulse">
                  <div className="bg-indigo-500/10 px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      <span className="font-semibold text-indigo-100 text-sm">Gerando Design...</span>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center py-8">
                    <p className="text-indigo-400/70 text-xs text-center border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 rounded-full">
                      O agente está posicionando os elementos do seu design...
                    </p>
                  </div>
                </div>
              );
            } else {
              // JSON incompleto durante streaming é normal — só loga quando NÃO está carregando
              if (!isLoading) {
                console.warn("Agent JSON parsing error:", e);
              }
            }
          }
        }
        // Fallback for non-design JSONs or invalid JSONs during stream
        return <ArtifactCard key={index} title="Snippet" language={language} content={code} type={language === 'json' ? 'json' : 'code'} />;
      } else {
        // Parse markdown links outside of code blocks: [text](https://url) or bare https://url
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+)/g;
        if (!linkRegex.test(part)) {
          return <div key={index} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
        }

        // Split by regex, yielding array of strings and matches
        const tokens: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        // Reset regex state since we tested it
        linkRegex.lastIndex = 0;
        let matchIdx = 0;

        while ((match = linkRegex.exec(part)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            tokens.push(<span key={`text-${index}-${lastIndex}`}>{part.substring(lastIndex, match.index)}</span>);
          }

          let title = '';
          let url = '';

          if (match[2]) {
            // Markdown format [title](url)
            title = match[1];
            url = match[2];
          } else if (match[3]) {
            // Bare url format
            url = match[3];
            // Get the last part of the URL, split by ? to remove query params
            const pathPart = url.split('?')[0];
            title = pathPart.split('/').pop() || url;

            // Clean up common URL trailing punctuations like '.' or ','
            if (title.endsWith('.') || title.endsWith(',')) {
              title = title.slice(0, -1);
              url = url.slice(0, -1);
            }
          }

          const lowerUrl = url.toLowerCase();
          let fileType: 'pdf' | 'excel' | 'other' | null = null;

          if (lowerUrl.includes('.pdf')) fileType = 'pdf';
          else if (lowerUrl.includes('.xlsx') || lowerUrl.includes('.csv')) fileType = 'excel';
          else if (lowerUrl.includes('.docx') || lowerUrl.includes('.doc')) fileType = 'other';

          if (fileType) {
            tokens.push(<FilePreviewCard key={`card-${index}-${matchIdx}`} url={url} filename={title} type={fileType} onOpenPreview={() => setPreviewData({ url, filename: title, type: fileType })} />);
          } else {
            // Normal link
            tokens.push(
              <a key={`link-${index}-${matchIdx}`} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                {title}
              </a>
            );
          }

          lastIndex = linkRegex.lastIndex;
          matchIdx++;
        }

        // Add remaining text
        if (lastIndex < part.length) {
          tokens.push(<span key={`text-${index}-${lastIndex}`}>{part.substring(lastIndex)}</span>);
        }

        return <div key={index} className="whitespace-pre-wrap leading-relaxed flex flex-col items-start gap-1">{tokens}</div>;
      }
    });
  };

  const renderInputArea = (variant: 'centered' | 'bottom') => (
    <div className={`relative group w-full ${variant === 'centered' ? 'max-w-2xl' : 'max-w-4xl mx-auto'}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-700/20 to-neutral-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <div className={`relative flex items-center gap-2 bg-[#121212]/95 border border-[#333] rounded-xl px-4 py-3 shadow-2xl ${variant === 'centered' ? 'min-h-[56px]' : ''}`}>

        <div className="flex items-center gap-1 pr-2 border-r border-[#333] mr-2">
          <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} />
          <button
            onClick={() => !isFileLoading && fileInputRef.current?.click()}
            disabled={isFileLoading}
            className="p-1.5 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-[#222] disabled:cursor-not-allowed"
            title={isFileLoading ? "Processando arquivo..." : "Anexar arquivo de texto (txt, csv, md)"}
          >
            {isFileLoading
              ? <Loader2 size={16} className="animate-spin text-indigo-400" />
              : <Paperclip size={16} />
            }
          </button>
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isFileLoading ? "Lendo arquivo..." : "Digite sua mensagem..."}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-500 focus:ring-0"
          autoFocus={variant === 'centered'}
        />

        <button
          onClick={() => handleSendMessage(inputValue)}
          disabled={isLoading || !isApiKeyReady || (!inputValue.trim() && attachments.length === 0)}
          className="p-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-neutral-800 hover:bg-neutral-700"
          title={!isApiKeyReady ? 'Carregando chave de API...' : undefined}
        >
          <Send size={18} />
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 px-1">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs px-2.5 py-1 rounded-full">
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="hover:text-red-400 ml-1 text-sm leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-row h-full w-full bg-[#050505] overflow-hidden">
      <div className={`flex flex-col h-full bg-transparent text-white relative transition-all duration-300 ease-in-out ${previewData ? 'w-[55%] border-r border-[#222]' : 'w-full'}`}>
        <CircuitBackground />

        {/* Header - REFINED ROUND 7 */}
        <div className="h-16 border-b border-[#222] flex items-center px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10 transition-opacity duration-500">

          {/* Model Selector — Dropdown minimalista */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(p => !p)}
              className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors"
            >
              <span className="font-medium">Arcco Pro V1</span>
              <ChevronDown size={14} className={`text-neutral-500 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showModelDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#141414] border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => setShowModelDropdown(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Arcco Pro V1</p>
                      <p className="text-[11px] text-neutral-500">Modelo principal</p>
                    </div>
                  </button>
                  <div className="w-full flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
                    <div className="w-2 h-2 rounded-full bg-neutral-600" />
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Arcco Symphony</p>
                      <p className="text-[11px] text-neutral-600">Em breve</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        <div className="flex-1 overflow-y-auto z-10 relative scrollbar-hide">

          {messages.length === 0 ? (
            // GREETING STATE
            <div className="h-full flex flex-col items-center justify-center p-4 -mt-16">

              <div className="flex flex-col mb-10">
                <div className="flex items-center gap-0 mb-1">
                  <div className="animate-pulse duration-[3000ms] flex-shrink-0">
                    <img
                      src={arccoEmblemUrl}
                      alt="Arcco Emblem"
                      className="w-[85px] h-[85px] object-contain opacity-90"
                    />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-normal text-white tracking-tight leading-snug">
                    {greetingTime}, {firstName}
                  </h1>
                </div>
                <p className="text-2xl md:text-3xl font-normal text-neutral-400 tracking-tight leading-snug pl-[85px]">
                  {greetingSubtitle}
                </p>
              </div>

              {renderInputArea('centered')}

              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mt-8 opacity-60 hover:opacity-100 transition-opacity">
                {['Criar um post para Instagram', 'Resumir este documento', 'Planejar campanha de vendas'].map(hint => (
                  <button
                    key={hint}
                    onClick={() => handleSendMessage(hint)}
                    className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] rounded-full text-xs text-neutral-300 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ACTIVE CHAT STATE - NO AVATARS
            <div className="flex flex-col min-h-full">
              <div className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar Removed */}
                    <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-5 py-4 relative group
                                  ${msg.role === 'user'
                        ? 'bg-[#222] text-white rounded-tr-sm shadow-md'
                        : 'bg-transparent text-neutral-200'
                      } ${msg.isError ? 'border border-red-500/30 bg-red-500/10' : ''}`}
                    >
                      {renderContent(msg.content)}

                      {msg.role === 'assistant' && !msg.isError && (
                        <div className="mt-3 flex justify-start -ml-5">
                          <div className="animate-pulse duration-[3000ms]">
                            <img
                              src={arccoEmblemUrl}
                              alt="Arcco"
                              className="w-[68px] h-[68px] object-contain opacity-90 bg-transparent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Agent Thought Panel — mostra steps do orquestrador em tempo real */}
                {agentThoughts.length > 0 && (
                  <div className="w-full max-w-[85%] md:max-w-[80%]">
                    <AgentThoughtPanel
                      steps={agentThoughts}
                      isExpanded={isThoughtsExpanded}
                      onToggle={() => setIsThoughtsExpanded(p => !p)}
                      elapsedSeconds={elapsedSeconds}
                    />
                  </div>
                )}

                {/* Browser Agent Card — mostra card estilo Manus quando o agente navega */}
                {browserAction && (
                  <div className="w-full max-w-[85%] md:max-w-[80%]">
                    <BrowserAgentCard action={browserAction as any} />
                  </div>
                )}

                {/* Terminal legado só aparece em Agent Mode explícito sem steps */}
                {isTerminalOpen && agentThoughts.length === 0 && (
                  <div className="flex gap-4 flex-row">
                    <div className="max-w-[85%] md:max-w-[80%] w-full">
                      <AgentTerminal
                        isOpen={isTerminalOpen}
                        content={terminalContent}
                        status="Processando..."
                        onClose={() => setIsTerminalOpen(false)}
                        className="w-full shadow-[0_0_15px_rgba(99,102,241,0.1)] border-[#333]"
                      />
                    </div>
                  </div>
                )}

                {/* Loading dots apenas antes do primeiro step chegar */}
                {isLoading && agentThoughts.length === 0 && !isTerminalOpen && (
                  <div className="flex items-center gap-3 animate-pulse ml-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}

                {/* Botão Parar — aparece durante execução do agente */}
                {isLoading && (
                  <div className="flex justify-center my-2">
                    <button
                      onClick={() => {
                        abortControllerRef.current?.abort();
                        setIsLoading(false);
                        setAgentThoughts(prev =>
                          prev.map(s => s.status === 'running' ? { ...s, status: 'done' as const, label: s.label + ' (parado)' } : s)
                        );
                        setIsThoughtsExpanded(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] hover:border-red-500/50 rounded-full text-xs text-neutral-400 hover:text-red-400 transition-all"
                    >
                      <Square size={12} fill="currentColor" />
                      Parar
                    </button>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="p-4 bg-transparent border-t border-[#222] z-10 relative backdrop-blur-sm flex flex-col gap-4">
            {renderInputArea('bottom')}
          </div>
        )}
      </div>

      {/* Side-by-Side Preview Panel */}
      {
        previewData && (
          <div className="w-[45%] h-full border-l border-[#222] flex flex-col bg-[#0a0a0a] shadow-2xl relative animate-in slide-in-from-right-8 duration-300 z-50">
            <div className="h-14 border-b border-[#222] flex items-center justify-between px-4 bg-[#111]">
              <div className="flex items-center gap-2">
                {previewData.type === 'design' ? <Sparkles size={16} className="text-indigo-400" /> : null}
                {previewData.type === 'pdf' && <FileText size={16} className="text-red-400" />}
                {previewData.type === 'excel' && <FileSpreadsheet size={16} className="text-emerald-400" />}
                {previewData.type === 'code' && <Terminal size={16} className="text-indigo-400" />}
                <span className="font-medium text-sm text-neutral-200 truncate pr-4">{previewData.filename}</span>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-1.5 hover:bg-white/10 rounded-md text-neutral-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0a0a0a] relative flex flex-col">
              {previewData.type === 'pdf' && (
                <iframe src={previewData.url} className="w-full flex-1 border-none bg-white" title="PDF Preview" />
              )}
              {previewData.type === 'excel' && (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewData.url!)}`} className="w-full flex-1 border-none bg-white" title="Excel Preview" />
              )}
              {previewData.type === 'code' && (
                <pre className="p-4 text-xs font-mono text-neutral-300 whitespace-pre-wrap flex-1">{previewData.content}</pre>
              )}
              {previewData.type === 'design' && previewData.ast && (
                <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0a0a0a]">
                  <PostBuilder
                    initialState={previewData.ast}
                    onBack={() => setPreviewData(null)}
                    onSave={(ast) => handleSaveToVault(ast)}
                  />
                </div>
              )}
              {(previewData.type !== 'pdf' && previewData.type !== 'excel' && previewData.type !== 'code' && previewData.type !== 'design') && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-8 text-center flex-1 bg-[#0a0a0a]">
                  <p className="text-sm">O visualizador nativo não suporta este formato ({previewData.type}) no momento.</p>
                  {previewData.url && (
                    <a href={previewData.url} target="_blank" rel="noreferrer" className="mt-4 px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-indigo-400 transition-colors text-sm font-medium">Fazer Download Direto</a>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ArccoChatPage;
