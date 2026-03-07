/**
 * PagesBuilder — Arcco Apps Builder
 * Gera projetos React+Vite+TypeScript completos via agente AI.
 * Preview ao vivo via WebContainers (Node.js no browser).
 * Deploy real na Vercel.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import {
  Send,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Save,
  Eye,
  Loader2,
  Sparkles,
  Globe,
  Layout,
  ChevronLeft,
  FolderOpen,
  Wand2,
  Pencil,
  Plus,
  X,
  Boxes,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WebContainerProvider } from './WebContainerContext';
import { WebContainerPreview } from './WebContainerPreview';
import { getProjectTemplate } from './templates/viteReactTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PagesBuilderProps {
  userEmail: string;
  onBack: () => void;
}

interface SavedPage {
  id: string;
  nome: string;
  codepages: string;
  source_files?: Record<string, string>; // mapa path → conteúdo
  usuario: string;
  publicado: boolean;
  url_slug?: string;
  created_at: string;
  updated_at: string;
}

interface PageTemplate {
  id: string;
  nome: string;
  descricao: string;
  codepages: string;
  ativo: boolean;
}

interface AgentStep {
  id: string;
  text: string;
  status: 'running' | 'done' | 'error';
}

type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'build'; explanation: string; files: string[] };

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type BuilderScreen = 'landing' | 'builder';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_SIZES: Record<DeviceType, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

const SUGGESTIONS = [
  { text: 'Dashboard de barbearia', icon: '✂️' },
  { text: 'Sistema de gestão para clínica', icon: '🏥' },
  { text: 'Painel de e-commerce com pedidos', icon: '🛒' },
];

const MODIFICATION_SUGGESTIONS = [
  'Adicione um gráfico de faturamento',
  'Melhore o design do sidebar',
  'Adicione modo escuro',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const PagesBuilder: React.FC<PagesBuilderProps> = ({ userEmail, onBack }) => {
  const { showToast } = useToast();

  const customStyles = `
    @keyframes progress-slide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
  `;

  // ── Screen ──────────────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<BuilderScreen>('landing');

  // ── App files (WebContainer) ─────────────────────────────────────────────────
  const [appFiles, setAppFiles] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<DeviceType>('desktop');
  const hasProject = Object.keys(appFiles).length > 0;

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState(''); // texto sendo digitado pelo agente
  const streamingTextRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Page management ──────────────────────────────────────────────────────────
  const [pageName, setPageName] = useState('Novo App');
  const [currentPage, setCurrentPage] = useState<SavedPage | null>(null);
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showSavedPages, setShowSavedPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Agent ────────────────────────────────────────────────────────────────────
  const [agentMode, setAgentMode] = useState<'creation' | 'editing'>('creation');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const agentStepsRef = useRef<AgentStep[]>([]);
  const activeStepIdRef = useRef<string | null>(null); // ID do step ativo atual

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTemplates();
    loadSavedPages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'builder' && hasProject) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen, hasProject]);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('PageTemplates')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (!error && data) setTemplates(data);
    } catch { }
    finally { setLoadingTemplates(false); }
  };

  const loadSavedPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages_user')
        .select('*')
        .eq('usuario', userEmail)
        .order('updated_at', { ascending: false });
      if (!error && data) setSavedPages(data);
    } catch { }
  };

  // ── Agent step helpers ───────────────────────────────────────────────────────
  const addAgentStep = useCallback((text: string): string => {
    const id = 'step-' + Date.now() + Math.random().toString(36).slice(2, 5);
    const step: AgentStep = { id, text, status: 'running' };
    agentStepsRef.current = [...agentStepsRef.current, step];
    setAgentSteps([...agentStepsRef.current]);
    return id;
  }, []);

  const updateAgentStep = useCallback((id: string, updates: Partial<AgentStep>) => {
    agentStepsRef.current = agentStepsRef.current.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    setAgentSteps([...agentStepsRef.current]);
  }, []);

  const clearAgentSteps = useCallback(() => {
    agentStepsRef.current = [];
    setAgentSteps([]);
  }, []);

  // ── Send message via SSE ─────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const historyForBackend = messages.filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant'
    );
    const backendMessages = [
      ...historyForBackend,
      { role: 'user' as const, content: userMessage },
    ];

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    if (currentScreen === 'landing') setCurrentScreen('builder');

    setIsLoading(true);
    clearAgentSteps();
    activeStepIdRef.current = null;
    streamingTextRef.current = '';
    setStreamingText('');

    // helper: criar novo step marcando o anterior como concluído
    const pushStep = (text: string) => {
      if (activeStepIdRef.current) {
        updateAgentStep(activeStepIdRef.current, { status: 'done' });
      }
      activeStepIdRef.current = addAgentStep(text);
    };

    // helper: finalizar step ativo
    const finishStep = (status: 'done' | 'error' = 'done') => {
      if (activeStepIdRef.current) {
        updateAgentStep(activeStepIdRef.current, { status });
        activeStepIdRef.current = null;
      }
    };

    // helper: flush do texto em streaming → mensagem no chat
    const flushStreamingText = () => {
      const text = streamingTextRef.current.trim();
      if (text) {
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      }
      streamingTextRef.current = '';
      setStreamingText('');
    };

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/builder/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: backendMessages,
          agentMode,
          renderMode: 'app',
          appFiles: hasProject ? appFiles : {},
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Backend retornou ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotFiles = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          try {
            const event = JSON.parse(raw) as { type: string; content: string };

            if (event.type === 'steps') {
              // Cada step do backend → novo item visual no terminal
              const text = event.content.replace(/<\/?step>/g, '').trim();
              if (text) pushStep(text);

            } else if (event.type === 'chunk') {
              // Texto em streaming (plano do agente) → mostra como "digitando"
              streamingTextRef.current += event.content;
              setStreamingText(streamingTextRef.current);

            } else if (event.type === 'actions') {
              // Flush do texto em streaming antes de aplicar arquivos
              flushStreamingText();

              // Conteúdo é JSON serializado → precisa de JSON.parse()
              let result: any = null;
              try { result = JSON.parse(event.content); } catch { }

              if (result?.files && typeof result.files === 'object') {
                gotFiles = true;
                const newFiles = result.files as Record<string, string>;

                // Criação: mescla com template base (package.json, vite.config.ts, etc.)
                // Edição: apenas aplica patches
                if (agentMode === 'creation') {
                  const template = getProjectTemplate(pageName);
                  setAppFiles({ ...template, ...newFiles });
                } else {
                  setAppFiles(prev => ({ ...prev, ...newFiles }));
                }

                setAgentMode('editing');
                finishStep('done');

                const explanation = (result.explanation || 'App atualizado com sucesso.')
                  .trim().slice(0, 200);
                setMessages(prev => [...prev, {
                  role: 'build',
                  explanation,
                  files: Object.keys(newFiles),
                }]);

              } else if (result?.actions && Array.isArray(result.actions)) {
                // Formato legado com `actions` (HTML) — converte para texto
                finishStep('done');
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: result.explanation || 'Resposta recebida (formato legado — use modo app).',
                }]);

              } else if (result?.explanation) {
                finishStep('done');
                setMessages(prev => [...prev, { role: 'assistant', content: result.explanation }]);
              }

            } else if (event.type === 'error') {
              flushStreamingText();
              finishStep('error');
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ ${event.content}`,
              }]);
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Finaliza steps e texto pendentes
      if (!gotFiles) {
        flushStreamingText();
        finishStep('done');
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      finishStep('error');
      flushStreamingText();
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${msg}` }]);
    } finally {
      setIsLoading(false);
      activeStepIdRef.current = null;
    }
  };

  // ── Save page ─────────────────────────────────────────────────────────────────
  const handleSavePage = async (silent = false): Promise<SavedPage | null> => {
    if (!pageName.trim()) return null;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const pageData = {
        nome: pageName,
        codepages: '', // kept for backward compat
        source_files: appFiles,
        updated_at: now,
      };

      let savedPage: SavedPage | null = null;

      if (currentPage) {
        const { error } = await supabase
          .from('pages_user')
          .update(pageData)
          .eq('id', currentPage.id);
        if (error) throw error;
        savedPage = { ...currentPage, ...pageData };
      } else {
        const slug = generateSlug(pageName);
        const { data, error } = await supabase
          .from('pages_user')
          .insert({
            ...pageData,
            usuario: userEmail,
            publicado: false,
            url_slug: slug,
            created_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        setCurrentPage(data);
        savedPage = data;
      }

      loadSavedPages();
      if (!silent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ App "${pageName}" salvo com sucesso!`,
        }]);
      }
      return savedPage;
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao salvar. Verifique a conexão.',
      }]);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // ── Publish page ──────────────────────────────────────────────────────────────
  const handlePublishPage = async () => {
    if (!hasProject) {
      showToast('Gere um app primeiro!', 'error');
      return;
    }
    setIsPublishing(true);
    try {
      const savedPage = await handleSavePage(true);
      if (!savedPage) return;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '▲ Fazendo deploy na Vercel...',
      }]);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let pageUrl: string;

      try {
        const res = await fetch(`${backendUrl}/api/builder/deploy-vercel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appFiles, name: pageName }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        pageUrl = data.url;
      } catch (deployErr: any) {
        pageUrl = getPageUrl(savedPage.url_slug || generateSlug(pageName));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Deploy Vercel falhou: ${deployErr.message}. URL legada usada.`,
        }]);
      }

      await supabase
        .from('pages_user')
        .update({ publicado: true, url_slug: pageUrl, updated_at: new Date().toISOString() })
        .eq('id', savedPage.id);

      setCurrentPage({ ...savedPage, publicado: true, url_slug: pageUrl });
      loadSavedPages();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Publicado! URL: ${pageUrl}`,
      }]);
      try { await navigator.clipboard.writeText(pageUrl); } catch { }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao publicar.' }]);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Load page ─────────────────────────────────────────────────────────────────
  const loadPage = (page: SavedPage) => {
    setCurrentPage(page);
    setPageName(page.nome);

    const sf = page.source_files;
    if (sf && typeof sf === 'object' && !Array.isArray(sf) && Object.keys(sf).length > 0) {
      setAppFiles(sf);
    } else {
      // Página legada (HTML): sem arquivos WebContainer — começa vazio
      setAppFiles({});
    }

    setAgentMode('editing');
    setMessages([{
      role: 'assistant',
      content: `App "${page.nome}" carregado. O que deseja modificar?`,
    }]);
    setShowSavedPages(false);
    setCurrentScreen('builder');
  };

  // ── Navigation ────────────────────────────────────────────────────────────────
  const newProject = () => {
    if (hasProject && !confirm('Perderá alterações não salvas. Continuar?')) return;
    setAppFiles({});
    setCurrentPage(null);
    setPageName('Novo App');
    setAgentMode('creation');
    setMessages([]);
    setCurrentScreen('builder');
  };

  const handleBackToLanding = () => {
    if (hasProject && !confirm('Perderá alterações não salvas. Continuar?')) return;
    setCurrentScreen('landing');
    setAppFiles({});
    setMessages([]);
    setPageName('Novo App');
    setAgentMode('creation');
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Excluir este projeto?')) return;
    try {
      await supabase.from('pages_user').delete().eq('id', pageId);
      if (currentPage?.id === pageId) {
        setAppFiles({});
        setCurrentPage(null);
        setAgentMode('creation');
      }
      loadSavedPages();
    } catch { }
  };

  // ── Utility ───────────────────────────────────────────────────────────────────
  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
    '-' + Date.now().toString(36);

  const getPageUrl = (slug: string) =>
    slug.startsWith('https://') || slug.startsWith('http://')
      ? slug
      : `https://pages.arccoai.com/${slug}`;

  const copyPageUrl = () => {
    if (currentPage?.url_slug) {
      navigator.clipboard.writeText(getPageUrl(currentPage.url_slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Saved pages panel (shared between screens) ────────────────────────────────
  const SavedPagesDropdown = ({ position }: { position: 'landing' | 'builder' }) => (
    <div className={`absolute z-50 w-80 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden ${position === 'landing' ? 'top-[65px] right-6' : 'top-[65px] right-6'}`}>
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Apps Recentes</h3>
        <button onClick={() => setShowSavedPages(false)} className="text-neutral-600 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {savedPages.length > 0 ? savedPages.map(page => (
          <div key={page.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-[#1e1e1e] last:border-0 transition-colors group">
            <button onClick={() => loadPage(page)} className="flex-1 text-left">
              <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{page.nome}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-neutral-500">
                  {new Date(page.updated_at).toLocaleDateString('pt-BR')}
                </span>
                {page.publicado && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                    No Ar
                  </span>
                )}
              </div>
            </button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={e => { e.stopPropagation(); loadPage(page); }}
                className="p-1.5 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Abrir"
              >
                <Eye size={13} />
              </button>
              {page.publicado && page.url_slug && (
                <a
                  href={getPageUrl(page.url_slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                  title="Ver publicado"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              <button
                onClick={e => { e.stopPropagation(); deletePage(page.id); }}
                className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )) : (
          <div className="py-10 text-center">
            <FolderOpen size={24} className="mx-auto mb-2 text-neutral-700" />
            <p className="text-xs text-neutral-500">Nenhum app salvo</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Build card file icon ──────────────────────────────────────────────────────
  const fileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return '🔷';
    if (name.endsWith('.css')) return '🔵';
    if (name.endsWith('.json')) return '🟡';
    return '⬜';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LANDING SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentScreen === 'landing') {
    return (
      <>
        <style>{customStyles}</style>
        <div className="h-screen flex flex-col bg-[#080808] font-sans overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/[0.06] bg-[#080808] z-20 relative">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <ChevronLeft size={18} className="text-neutral-400 hover:text-white transition-colors" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-semibold text-white text-sm tracking-tight">Arcco Apps</span>
              </div>
            </div>
            <button
              onClick={() => setShowSavedPages(!showSavedPages)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${showSavedPages
                ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                : 'bg-[#111] border-[#1e1e1e] text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
            >
              <FolderOpen size={14} />
              <span>Meus Apps</span>
            </button>
          </div>

          {showSavedPages && <SavedPagesDropdown position="landing" />}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">

            {/* Hero / Input */}
            <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8 min-h-[58vh]">
              <div className="relative mb-7">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10">
                  <Boxes size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#080808] flex items-center justify-center">
                  <Sparkles size={9} className="text-white" />
                </div>
              </div>

              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white text-center mb-3 tracking-tight leading-tight">
                Que app você quer criar?
              </h1>
              <p className="text-neutral-500 text-center text-sm mb-8 max-w-md leading-relaxed">
                Descreva sua ideia e o agente gera um app React completo — com preview ao vivo e deploy na Vercel
              </p>

              <div className="w-full max-w-2xl relative">
                <textarea
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputMessage.trim()) handleSendMessage();
                    }
                  }}
                  placeholder="Ex: dashboard para barbearia com agendamentos, clientes e faturamento mensal..."
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] focus:border-indigo-500/50 rounded-2xl px-5 py-4 pr-14 text-white text-sm placeholder-neutral-600 focus:outline-none resize-none transition-colors leading-relaxed"
                  autoFocus
                />
                <button
                  onClick={() => inputMessage.trim() && handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className="absolute right-3 bottom-3 w-9 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1a1a1a] rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-600/20 disabled:shadow-none"
                >
                  <Send size={14} className={inputMessage.trim() ? 'text-white' : 'text-neutral-600'} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-xl">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInputMessage(`Crie um app React para ${s.text.toLowerCase()}`)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0d0d0d] border border-[#1e1e1e] hover:border-neutral-700 rounded-full text-xs text-neutral-500 hover:text-neutral-300 transition-all"
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    <span className="font-medium">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="px-8 pb-12 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[#1a1a1a]" />
                <div className="flex items-center gap-2">
                  <Layout size={12} className="text-neutral-600" />
                  <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                    ou inspire-se num template
                  </span>
                </div>
                <div className="h-px flex-1 bg-[#1a1a1a]" />
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-neutral-700" />
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setInputMessage(`Crie um app React para ${template.nome}${template.descricao ? ': ' + template.descricao : ''}`);
                        setPageName(template.nome);
                      }}
                      className="group flex flex-col bg-[#0d0d0d] border border-[#1e1e1e] hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 text-left"
                    >
                      <div className="h-36 bg-[#111] relative overflow-hidden flex items-center justify-center">
                        <Boxes size={32} className="text-neutral-700 group-hover:text-indigo-500/50 transition-colors" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center pb-3">
                          <span className="px-3 py-1 bg-indigo-600/90 text-white text-xs font-medium rounded-lg">
                            Usar como base
                          </span>
                        </div>
                      </div>
                      <div className="px-3 py-2.5 border-t border-[#1a1a1a]">
                        <h3 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {template.nome}
                        </h3>
                        {template.descricao && (
                          <p className="text-[10px] text-neutral-600 mt-0.5 line-clamp-1">{template.descricao}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#1a1a1a] rounded-2xl">
                  <Boxes size={22} className="text-neutral-700 mb-2" />
                  <p className="text-xs text-neutral-600">Nenhum template disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BUILDER SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <WebContainerProvider>
      <style>{customStyles}</style>
      <div className="h-screen flex flex-col bg-[#0f0f0f] overflow-hidden relative font-sans">

        {/* PCB Background */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.3]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="pcb-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="trace-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <g filter="url(#pcb-glow)">
              <path d="M 0 100 H 200 L 250 150 H 500" stroke="url(#trace-grad)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 0 300 H 150 L 180 330 H 400" stroke="url(#trace-grad)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 800 0 V 100 L 750 150 V 400" stroke="url(#trace-grad)" strokeWidth="1" fill="none" opacity="0.3" />
            </g>
            <circle r="2" fill="#818cf8">
              <animateMotion dur="8s" repeatCount="indefinite" path="M 0 100 H 200 L 250 150 H 500" />
              <animate attributeName="opacity" values="0;1;0" dur="8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* Header */}
        <div className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between shrink-0 z-20 relative">
          {isLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full"
                style={{ animation: 'progress-slide 2s ease-in-out infinite' }}
              />
            </div>
          )}

          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToLanding}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group shrink-0"
            >
              <ChevronLeft size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
            <button
              onClick={() => setShowSavedPages(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 shrink-0 whitespace-nowrap"
            >
              <FolderOpen size={16} />
              <span className="hidden sm:inline">Meus Apps</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-800 text-neutral-300 border border-neutral-700">
                {agentMode === 'creation' ? <Wand2 size={18} /> : <Pencil size={18} />}
              </div>
              <div>
                <input
                  type="text"
                  value={pageName}
                  onChange={e => setPageName(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none focus:bg-white/5 px-2 py-0.5 rounded -ml-2 transition-colors border border-transparent focus:border-white/10"
                />
                <div className="px-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {agentMode === 'creation' ? 'Criação' : 'Edição'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={newProject}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white"
              title="Novo App"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo</span>
            </button>

            <div className="h-6 w-px bg-[#262626] mx-1" />

            <button
              onClick={() => handleSavePage()}
              disabled={isSaving || !hasProject}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden sm:inline">Salvar</span>
            </button>

            <button
              onClick={handlePublishPage}
              disabled={isPublishing || !hasProject}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-indigo-500/50 rounded-lg transition-all text-sm font-medium text-white shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
              <span className="hidden sm:inline">Publicar</span>
            </button>

            {currentPage?.publicado && (
              <button
                onClick={copyPageUrl}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors text-sm ml-1"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'URL'}
              </button>
            )}
          </div>
        </div>

        {/* Saved Pages Dropdown */}
        {showSavedPages && <SavedPagesDropdown position="builder" />}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
          <div className="w-96 bg-[#0A0A0A] border-r border-[#1a1a1a] flex flex-col shrink-0 relative z-10">

            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0F0F0F]">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${agentMode === 'creation'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                  {agentMode === 'creation'
                    ? <Wand2 size={12} className="text-white" />
                    : <Pencil size={12} className="text-white" />}
                </div>
                <h3 className="font-semibold text-white text-sm">
                  {agentMode === 'creation' ? 'Criar App' : 'Editar App'}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0A0A0A]">

              {/* Empty creation state */}
              {messages.length === 0 && agentMode === 'creation' && (
                <div className="space-y-4 mt-6 px-2">
                  <div className="flex items-center gap-2 px-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                      Comece com uma ideia
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInputMessage(`Crie um app React para ${s.text.toLowerCase()}`)}
                        className="group relative flex items-center gap-3 px-4 py-3.5 bg-[#151515] border border-[#262626] rounded-xl text-left transition-all hover:border-neutral-600 hover:bg-[#1a1a1a]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#262626]">
                          <span className="text-xl">{s.icon}</span>
                        </div>
                        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors flex-1">
                          {s.text}
                        </span>
                        <ChevronLeft size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-colors rotate-180" />
                      </button>
                    ))}
                  </div>
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#262626]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#0A0A0A] px-3 text-xs text-neutral-600 uppercase tracking-wider">
                        ou descreva sua ideia
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick suggestions in edit mode */}
              {messages.length > 0 && agentMode === 'editing' && !isLoading && (
                <div className="py-3 px-2">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Wand2 size={12} className="text-purple-400" />
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                      Sugestões rápidas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MODIFICATION_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setInputMessage(suggestion)}
                        className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] hover:border-neutral-600 rounded-full text-xs text-neutral-400 hover:text-neutral-300 transition-all font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages list */}
              {messages.map((msg, i) => {
                if (msg.role === 'build') {
                  return (
                    <div key={i} className="flex justify-start animate-fade-in">
                      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/10 bg-emerald-500/10">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                          <span className="text-xs font-semibold text-emerald-400">App atualizado</span>
                        </div>
                        {msg.explanation && (
                          <p className="text-xs text-neutral-300 px-3 pt-2 pb-1 leading-relaxed">
                            {msg.explanation}
                          </p>
                        )}
                        {msg.files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-1">
                            {msg.files.slice(0, 8).map((f, fi) => (
                              <span
                                key={fi}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#333] text-[10px] text-neutral-400 font-mono"
                              >
                                {fileIcon(f)} {f.split('/').pop()}
                              </span>
                            ))}
                            {msg.files.length > 8 && (
                              <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#333] text-[10px] text-neutral-500">
                                +{msg.files.length - 8} mais
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 ${msg.role === 'user'
                      ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30'
                      : 'bg-[#151515] text-neutral-300 border border-[#262626]'
                      }`}>
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Streaming text bubble (agente "digitando" o plano) */}
              {isLoading && streamingText && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[90%] rounded-xl px-3 py-2 bg-[#151515] text-neutral-300 border border-indigo-500/20">
                    <p className="text-xs leading-relaxed">
                      {streamingText}
                      <span className="inline-block w-1.5 h-3 bg-indigo-400 ml-0.5 rounded-sm animate-pulse" />
                    </p>
                  </div>
                </div>
              )}

              {/* Agent Steps Terminal (Lovable-style) */}
              {isLoading && agentSteps.length > 0 && (
                <div className="flex justify-start animate-fade-in">
                  <div className="w-full bg-[#0c0c0c] border border-indigo-500/20 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border-b border-[#1a1a1a]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono ml-1">arcco-builder</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                      {agentSteps.map(step => (
                        <div key={step.id} className="flex items-center gap-2 animate-fade-in">
                          {step.status === 'running'
                            ? <Loader2 size={10} className="animate-spin text-indigo-400 shrink-0" />
                            : step.status === 'done'
                              ? <Check size={10} className="text-emerald-400 shrink-0" />
                              : <X size={10} className="text-red-400 shrink-0" />}
                          <span className={
                            step.status === 'running' ? 'text-indigo-300'
                              : step.status === 'done' ? 'text-neutral-500'
                                : 'text-red-300'
                          }>
                            {step.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-[#1a1a1a] bg-[#0F0F0F]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={agentMode === 'creation' ? 'Descreva seu app...' : 'O que mudar no app?'}
                  className="flex-1 bg-[#050505] border border-[#262626] rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 text-sm font-medium"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 rounded-lg transition-all text-white"
                >
                  {isLoading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Preview Panel ────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a] bg-[#0F0F0F] shrink-0 z-10">
              <div className="flex items-center gap-2">
                <Boxes size={14} className="text-neutral-600" />
                <span className="text-xs text-neutral-500">Preview ao vivo</span>
                {hasProject && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                    WebContainer
                  </span>
                )}
              </div>

              {/* Device selector */}
              <div className="flex items-center gap-1 bg-[#050505] rounded-lg p-0.5 border border-[#262626]">
                {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map(d => {
                  const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={`p-1.5 rounded transition-all ${device === d
                        ? 'bg-[#1a1a1a] text-white'
                        : 'text-neutral-500 hover:text-white'
                        }`}
                      title={DEVICE_SIZES[d].label}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WebContainer Preview or Empty State */}
            {hasProject ? (
              <div className="flex-1 min-h-0">
                <WebContainerPreview
                  files={appFiles}
                  deviceWidth={DEVICE_SIZES[device].width}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#050505]">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                    {isLoading
                      ? <Loader2 size={26} className="text-indigo-500 animate-spin" />
                      : <Boxes size={26} className="text-indigo-500/50" />}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-neutral-400 text-sm font-medium mb-1.5">
                    {isLoading ? 'Gerando seu app...' : 'Preview aparecerá aqui'}
                  </p>
                  <p className="text-neutral-600 text-xs max-w-[220px] leading-relaxed text-center">
                    {isLoading
                      ? 'O WebContainer iniciará quando o agente gerar os arquivos'
                      : 'Descreva seu app no chat ao lado para começar'}
                  </p>
                </div>
                {isLoading && (
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </WebContainerProvider>
  );
};
