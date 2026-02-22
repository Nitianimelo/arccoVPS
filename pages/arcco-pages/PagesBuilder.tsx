import React, { useState, useEffect, useRef } from 'react';
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
  Code,
  Eye,
  Loader2,
  Sparkles,
  Download,
  Globe,
  Palette,
  Layout,
  FileCode,
  ChevronLeft,
  FolderOpen,
  FilePlus,
  RefreshCw,
  Upload,
  Wand2,
  Pencil,
  Plus,
  X
} from 'lucide-react';
import { openRouterService } from '../../lib/openrouter';
import { supabase } from '../../lib/supabase';
import { PageAST, SectionType, SectionNode } from './types/ast';
import { ASTRenderer } from './renderer/ASTRenderer';
import { PropertyPanel } from './editor/PropertyPanel';
import { ThemePanel } from './editor/ThemePanel';

interface PagesBuilderProps {
  userEmail: string;
  onBack: () => void;
  initialAST?: any;
}

interface ProjectFile {
  id: string;
  name: string;
  content: string;
  language: 'html' | 'css' | 'javascript' | 'json';
}

interface SavedPage {
  id: string;
  nome: string;
  codepages: string; // HTML Bundled/Compiled
  source_files?: ProjectFile[]; // Source Code (JSON)
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

interface PagesConfig {
  modelo_criacao: string;
  system_prompt_criacao: string;
  modelo_edicao: string;
  system_prompt_edicao: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'preview' | 'code';
type BuilderScreen = 'landing' | 'builder';

const DEVICE_SIZES = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' }
};

// --- New Premium Dark Mode Template ---
const DEFAULT_HTML_CONTENT = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arcco Future</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      body { font-family: 'Inter', sans-serif; }
      .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
      .gradient-text { background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .blob { filter: blur(80px); opacity: 0.4; }
    </style>
</head>
<body class="bg-[#050505] text-white overflow-x-hidden antialiased selection:bg-indigo-500 selection:text-white">

    <!-- Background Elements -->
    <div class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blob animate-pulse"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blob animate-pulse" style="animation-duration: 5s;"></div>
    </div>

    <!-- Navbar -->
    <nav class="fixed w-full z-50 transition-all duration-300 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <i data-lucide="zap" class="text-indigo-500 w-6 h-6"></i>
                <span class="font-bold text-xl tracking-tight">Arcco<span class="text-indigo-500">.pages</span></span>
            </div>
            <div class="hidden md:flex items-center gap-8">
                <a href="#features" class="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Funcionalidades</a>
                <a href="#pricing" class="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Planos</a>
                <a href="#about" class="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Sobre</a>
            </div>
            <button class="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-all transform hover:scale-105 active:scale-95">
                Começar Agora
            </button>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="min-h-screen flex items-center justify-center pt-20 relative">
        <div class="max-w-5xl mx-auto px-6 text-center">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8 animate-fade-in-up">
                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Nova Era do Design Digital
            </div>
            
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                Crie experiências <br />
                <span class="gradient-text">extraordinárias</span> em segundos
            </h1>
            
            <p class="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                A plataforma mais avançada para construir landing pages de alta conversão. Design premium, código limpo e performance incomparável.
            </p>
            
            <div class="flex flex-col md:flex-row items-center justify-center gap-4">
                <button class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 w-full md:w-auto flex items-center justify-center gap-2 group">
                    Iniciar Projeto 
                    <i data-lucide="arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform"></i>
                </button>
                <button class="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm w-full md:w-auto">
                    Ver Demo
                </button>
            </div>

            <!-- Dashboard Preview -->
            <div class="mt-20 relative rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden glass transform rotate-x-12 perspective-1000 group">
                <div class="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10"></div>
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Dashboard" class="w-full opacity-60 group-hover:scale-105 transition-transform duration-700">
            </div>
        </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="py-32 bg-[#050505] relative">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Card 1 -->
                <div class="p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-indigo-500/30 transition-all group hover:-translate-y-2">
                    <div class="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                        <i data-lucide="rocket" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Ultra Performance</h3>
                    <p class="text-neutral-400 leading-relaxed">Carregamento instantâneo, otimizado para Core Web Vitals e SEO técnico.</p>
                </div>

                <!-- Card 2 -->
                <div class="p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-purple-500/30 transition-all group hover:-translate-y-2">
                    <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                        <i data-lucide="palette" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Design System</h3>
                    <p class="text-neutral-400 leading-relaxed">Componentes pré-construídos que mantêm consistência visual em toda sua aplicação.</p>
                </div>

                <!-- Card 3 -->
                <div class="p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-pink-500/30 transition-all group hover:-translate-y-2">
                    <div class="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-6 text-pink-400 group-hover:scale-110 transition-transform">
                        <i data-lucide="code-2" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Código Limpo</h3>
                    <p class="text-neutral-400 leading-relaxed">Exportação de código sem dependências obscuras, pronto para deploy.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 border-t border-white/5 mt-20">
        <div class="max-w-7xl mx-auto px-6 text-center text-neutral-500 text-sm">
            <p>&copy; 2024 Arcco Inc. Future Design.</p>
        </div>
    </footer>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>`;

const DEFAULT_CSS_CONTENT = `/* Estilos Globais */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #0A0A0A; 
}
::-webkit-scrollbar-thumb {
  background: #333; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555; 
}`;

const DEFAULT_JS_CONTENT = `// Interações e Animações
console.log('Arcco Pages Dark Mode Initialized');`;

const DEFAULT_FILES: ProjectFile[] = [
  { id: '1', name: 'index.html', content: DEFAULT_HTML_CONTENT, language: 'html' },
  { id: '2', name: 'style.css', content: DEFAULT_CSS_CONTENT, language: 'css' },
  { id: '3', name: 'script.js', content: DEFAULT_JS_CONTENT, language: 'javascript' }
];

// --- Agent Action Types ---
interface AgentFileAction {
  type: 'create' | 'update' | 'delete';
  file_path: string;
  content?: string;
}

interface AgentASTAction {
  action: 'add_section' | 'update_section' | 'delete_section' | 'move_section' | 'update_meta' | 'set_ast';
  section_id?: string;
  section_type?: SectionType; // 'Hero', 'Features', etc.
  props?: any;
  styles?: any;
  index?: number;
  value?: any;
  ast?: PageAST; // For full replacements
}

interface AgentResponse {
  actions?: AgentFileAction[];      // Legacy / Code Mode
  ast_actions?: AgentASTAction[];   // Design Mode
  explanation: string;
}

// --- Chat Message Types ---
type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'build'; explanation: string; files: string[] };

// --- Unified Agent Prompt ---
const DEFAULT_AGENT_PROMPT = `Você é um engenheiro frontend especialista em criar e modificar landing pages de alta conversão.
Você trabalha com aplicações web multi-arquivo (HTML, CSS, JavaScript).

## Regras
- Retorne o conteúdo COMPLETO de cada arquivo, nunca diffs ou patches.
- Só modifique/crie arquivos que realmente precisem de mudanças.
- Use Tailwind CSS via CDN no HTML para estilização.
- Use fontes modernas do Google Fonts (Inter, Poppins, etc).
- Use ícones do FontAwesome ou Lucide (via CDN).
- Crie layouts visualmente impactantes, com seções claras (Hero, Benefícios, Prova Social, CTA).
- Use imagens de placeholder do Unsplash (source.unsplash.com) se necessário.
- Sempre retorne código válido e funcional.
- Se o usuário pedir algo vago, use seu julgamento de design.

## Formato de Resposta

### Se precisar fazer perguntas:
Responda APENAS com texto simples (sem JSON, sem código).

### Se for gerar/modificar código:
Retorne APENAS um objeto JSON puro com esta estrutura EXATA:

{
  "actions": [
    {
      "type": "update",
      "file_path": "index.html",
      "content": "<!DOCTYPE html>\\\\n<html>\\\\n<head>...</head>\\\\n<body>...</body>\\\\n</html>"
    },
    {
      "type": "update",
      "file_path": "style.css",
      "content": "body { margin: 0; }"
    }
  ],
  "explanation": "Criei uma landing page moderna com Tailwind CSS"
}

CRÍTICO:
- A chave DEVE ser "actions" (array de objetos)
- Cada ação DEVE ter: "type", "file_path", "content"
- NÃO use formato {"index.html": "...", "style.css": "..."} - isso está ERRADO
- NÃO envolva o JSON em blocos de código markdown (\`\`\`json)
- Retorne SOMENTE o JSON puro, sem texto antes ou depois`;


const SUGGESTIONS = [
  { text: 'Portfólio pessoal profissional', icon: '💼' },
  { text: 'Página de captura de leads', icon: '📧' },
  { text: 'Lançamento de produto', icon: '🚀' }
];

const MODIFICATION_SUGGESTIONS = [
  'Adicione depoimentos',
  'Melhore o CTA',
  'Otimize para mobile'
];



export const PagesBuilder: React.FC<PagesBuilderProps> = ({ userEmail, onBack }) => {
  const { showToast } = useToast();
  const [previewKey, setPreviewKey] = useState(0);

  // CSS Animations
  const customStyles = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    @keyframes progress-slide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }

    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<BuilderScreen>('landing');

  // Templates state
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // File Manager & Preview state
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('1'); // Default to index.html
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Helper getters
  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const setHtmlCode = (code: string) => updateFileContent('index.html', code); // Backwards compatibility helper
  const htmlCode = files.find(f => f.name === 'index.html')?.content || '';

  // Page management state
  const [currentPage, setCurrentPage] = useState<SavedPage | null>(null);
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [pageName, setPageName] = useState('Nova Página');
  const [showSavedPages, setShowSavedPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add terminal state here (restoring where it broke)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalContent, setTerminalContent] = useState('');
  const [latestStep, setLatestStep] = useState('');

  // Agent mode: creation or editing
  const [agentMode, setAgentMode] = useState<'creation' | 'editing'>('creation');

  // API state
  const [apiConfigured, setApiConfigured] = useState(false);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({
    modelo_criacao: 'anthropic/claude-3.5-sonnet',
    system_prompt_criacao: DEFAULT_AGENT_PROMPT,
    modelo_edicao: 'anthropic/claude-3.5-sonnet',
    system_prompt_edicao: DEFAULT_AGENT_PROMPT
  });

  // AST State (Phase 2)
  const [pageState, setPageState] = useState<PageAST | null>(null);
  const [renderMode, setRenderMode] = useState<'ast' | 'iframe'>('ast'); // Default to AST for new flow

  // Phase 3: Visual Editor State
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
  };

  const handleDeleteSection = (id: string) => {
    // Confirm with window.confirm (simple)
    const confirmDelete = window.confirm('Tem certeza que deseja remover esta seção?');
    if (!confirmDelete) return;

    setPageState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.filter(s => s.id !== id)
      };
    });
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down') => {
    setPageState(prev => {
      if (!prev) return null;
      const index = prev.sections.findIndex(s => s.id === id);
      if (index === -1) return prev;

      const newSections = [...prev.sections];
      if (direction === 'up' && index > 0) {
        [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      } else if (direction === 'down' && index < newSections.length - 1) {
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      }
      return { ...prev, sections: newSections };
    });
  };

  const handleDuplicateSection = (id: string) => {
    setPageState(prev => {
      if (!prev) return null;
      const sectionToClone = prev.sections.find(s => s.id === id);
      if (!sectionToClone) return prev;

      // Deep clone including props
      const newSection: SectionNode = {
        ...JSON.parse(JSON.stringify(sectionToClone)),
        id: 'sec-' + Date.now() + Math.random().toString(36).substr(2, 9)
      };

      const index = prev.sections.findIndex(s => s.id === id);
      const newSections = [...prev.sections];
      newSections.splice(index + 1, 0, newSection);

      return { ...prev, sections: newSections };
    });
  };

  const handleUpdateSectionProps = (newProps: any) => {
    setPageState(prev => {
      if (!prev || !selectedSectionId) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === selectedSectionId ? { ...s, props: newProps } : s
        )
      };
    });
  };

  const handleUpdateMeta = (newMeta: any) => {
    setPageState(prev => {
      if (!prev) return null;
      return { ...prev, meta: newMeta };
    });
  };

  // Load API configuration and templates
  useEffect(() => {
    loadApiConfig();
    loadTemplates();
    loadSavedPages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prevent accidental navigation (F5/Refresh/Close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if in builder mode (meaning potentially unsaved work)
      if (currentScreen === 'builder') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen]);



  const loadApiConfig = async () => {
    try {
      // Load API key
      const { data: apiKeyData } = await supabase
        .from('ApiKeys')
        .select('api_key')
        .eq('provider', 'openrouter')
        .eq('is_active', true)
        .single();

      if (apiKeyData?.api_key) {
        openRouterService.setApiKey(apiKeyData.api_key);
        setApiConfigured(true);
      }

      // Load Pages configuration
      const { data: configData } = await supabase
        .from('PagesConfig')
        .select('*')
        .single();

      if (configData) {
        setPagesConfig({
          modelo_criacao: configData.modelo_criacao || 'anthropic/claude-3.5-sonnet',
          system_prompt_criacao: configData.system_prompt_criacao || DEFAULT_AGENT_PROMPT,
          modelo_edicao: configData.modelo_edicao || 'anthropic/claude-3.5-sonnet',
          system_prompt_edicao: configData.system_prompt_edicao || DEFAULT_AGENT_PROMPT
        });
      }
    } catch (error) {
      console.log('Error loading config:', error);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('PageTemplates')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadSavedPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages_user')
        .select('*')
        .eq('usuario', userEmail)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setSavedPages(data);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const selectTemplate = (template: PageTemplate) => {
    setHtmlCode(template.codepages);
    setPageName(template.nome);
    setAgentMode('editing');
    setMessages([{
      role: 'assistant',
      content: `Template "${template.nome}" carregado! Descreva as modificações que você deseja fazer.`
    }]);
    setCurrentScreen('builder');
  };

  const startFromScratch = () => {
    setHtmlCode(DEFAULT_HTML_CONTENT);
    setPageName('Nova Página');
    setAgentMode('creation');
    setMessages([]);
    setCurrentScreen('builder');
  };

  /* -------------------------------------------------------------------------- */
  /*                           FILE HANDLING FUNCTIONS                          */
  /* -------------------------------------------------------------------------- */

  // Helper to update the content of a specific file in the state
  const updateFileInState = (fileName: string, newContent: string) => {
    setFiles(prev => prev.map(f =>
      f.name === fileName ? { ...f, content: newContent } : f
    ));
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let content = e.target?.result as string;

        // Determine language
        let language: ProjectFile['language'] = 'html';
        if (file.name.endsWith('.css')) language = 'css';
        if (file.name.endsWith('.js')) language = 'javascript';
        if (file.name.endsWith('.json')) language = 'json';



        // Check if file exists
        if (files.some(f => f.name === file.name)) {
          if (confirm(`O arquivo ${file.name} já existe.Deseja substituir ? `)) {
            updateFileInState(file.name, content);
          }
        } else {
          setFiles(prev => [...prev, {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            content: content,
            language: language
          }]);
        }
      };
      reader.readAsText(file);
    });

    // Reset input
    event.target.value = '';
  };

  // Bundle logic: merges HTML, CSS and JS into a single string for preview/publishing
  const bundleProject = (projectFiles: ProjectFile[]): string => {
    const htmlFile = projectFiles.find(f => f.name === 'index.html');
    const cssFiles = projectFiles.filter(f => f.language === 'css');
    const jsFiles = projectFiles.filter(f => f.language === 'javascript');

    if (!htmlFile) return '<h1>Erro: index.html não encontrado</h1>';

    let bundledHtml = htmlFile.content;

    // Inject CSS
    const cssContent = cssFiles.map(f => f.content).join('\n');
    if (cssContent) {
      if (bundledHtml.includes('</head>')) {
        bundledHtml = bundledHtml.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
      } else {
        bundledHtml += `<style>\n${cssContent}\n</style>`;
      }
    }

    // Inject JS
    const jsContent = jsFiles.map(f => f.content).join('\n');
    if (jsContent) {
      if (bundledHtml.includes('</body>')) {
        bundledHtml = bundledHtml.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`);
      } else {
        bundledHtml += `<script>\n${jsContent}\n</script>`;
      }
    }

    return bundledHtml;
  };

  const updateFileContent = (fileNameOrId: string, newContent: string) => {
    setFiles(prev => prev.map(f =>
      (f.id === fileNameOrId || f.name === fileNameOrId) ? { ...f, content: newContent } : f
    ));
  };

  const addNewFile = () => {
    const name = prompt('Nome do arquivo (ex: style.css, script.js):');
    if (!name) return;

    if (files.some(f => f.name === name)) {
      showToast('Arquivo já existe!', 'error');
      return;
    }

    let language: ProjectFile['language'] = 'html';
    if (name.endsWith('.css')) language = 'css';
    if (name.endsWith('.js')) language = 'javascript';
    if (name.endsWith('.json')) language = 'json';

    const newFile: ProjectFile = {
      id: Date.now().toString(),
      name,
      content: '',
      language
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const removeFile = (id: string) => {
    if (files.length <= 1) return; // Don't delete last file
    const fileToDelete = files.find(f => f.id === id);
    if (fileToDelete?.name === 'index.html') {
      showToast('Não é possível excluir o index.html', 'error');
      return;
    }

    if (confirm('Excluir arquivo?')) {
      setFiles(prev => prev.filter(f => f.id !== id));
      if (activeFileId === id) {
        setActiveFileId(files[0].id);
      }
    }
  };



  // --- Build prompt with full project context ---
  const buildPrompt = (userRequest: string) => {
    // Build file tree
    const fileTree = files.map(f => `  - ${f.name} (${f.language})`).join('\n');

    // Build file contents
    const fileContents = files.map(f =>
      `===== FILE: ${f.name} =====\n${f.content} \n ===== END FILE ===== `
    ).join('\n\n');

    return `## Arquivos do Projeto\n${fileTree} \n\n## Conteúdo Atual dos Arquivos\n${fileContents} \n\n## Solicitação do Usuário\n"${userRequest}"\n\nSe a solicitação for vaga, FAÇA PERGUNTAS(apenas texto, sem JSON).\nSe tiver detalhes suficientes, retorne o JSON com as ações para criar / modificar os arquivos necessários.`;
  };

  const applyAgentActions = (parsed: AgentResponse) => {
    const changedFiles: string[] = [];

    // Handle File Actions (Code Mode)
    if (parsed.actions && parsed.actions.length > 0) {
      for (const action of parsed.actions) {
        const fileName = action.file_path;
        changedFiles.push(fileName);

        if (action.type === 'create') {
          const existing = files.find(f => f.name === fileName);
          if (existing) {
            updateFileContent(existing.id, action.content || '');
          } else {
            let language: ProjectFile['language'] = 'html';
            if (fileName.endsWith('.css')) language = 'css';
            if (fileName.endsWith('.js')) language = 'javascript';
            if (fileName.endsWith('.json')) language = 'json';
            const newFile: ProjectFile = {
              id: Date.now().toString() + Math.random().toString(36),
              name: fileName,
              content: action.content || '',
              language
            };
            setFiles(prev => [...prev, newFile]);
          }
        } else if (action.type === 'update') {
          updateFileInState(fileName, action.content || '');
        } else if (action.type === 'delete') {
          if (fileName !== 'index.html') {
            setFiles(prev => prev.filter(f => f.name !== fileName));
          }
        }
      }
      // Force Code Mode for file actions
      setRenderMode('iframe');
    }

    // Handle AST Actions (Design Mode)
    if (parsed.ast_actions && parsed.ast_actions.length > 0) {
      setPageState(prevState => {
        // Clone state or create initial state
        const newState: PageAST = prevState ? JSON.parse(JSON.stringify(prevState)) : {
          id: 'page-' + Date.now(),
          meta: { title: 'New Page', theme: 'dark' },
          sections: []
        };

        for (const action of parsed.ast_actions!) {
          if (action.action === 'set_ast' && action.ast) {
            return action.ast;
          }

          if (action.action === 'add_section') {
            const newSection = {
              id: action.section_id || 'sec-' + Date.now() + Math.random().toString(36).substr(2, 9),
              type: action.section_type || 'Hero',
              props: action.props || {},
              styles: action.styles || {}
            };
            if (typeof action.index === 'number' && action.index >= 0) {
              newState.sections.splice(action.index, 0, newSection as any);
            } else {
              newState.sections.push(newSection as any);
            }
          } else if (action.action === 'update_section') {
            const section = newState.sections.find(s => s.id === action.section_id);
            if (section) {
              if (action.props) section.props = { ...section.props, ...action.props };
              if (action.styles) section.styles = { ...section.styles, ...action.styles };
            }
          } else if (action.action === 'delete_section') {
            newState.sections = newState.sections.filter(s => s.id !== action.section_id);
          } else if (action.action === 'move_section') {
            // Simple move logic implementation if needed
          } else if (action.action === 'update_meta') {
            newState.meta = { ...newState.meta, ...action.value };
          }
        }
        return newState;
      });
      // Force Design Mode for AST actions
      setRenderMode('ast');
    }

    if (agentMode === 'creation') setAgentMode('editing');

    // Adiciona mensagem de build (card compacto, sem dump de código)
    const explanation = (parsed.explanation || 'Alterações aplicadas.')
      .split('\n')[0]           // só a primeira linha
      .replace(/```[\s\S]*?```/g, '') // remove blocos de código
      .trim()
      .slice(0, 200);           // máx 200 chars

    setMessages(prev => [...prev, {
      role: 'build',
      explanation,
      files: changedFiles
    }]);

    // Auto-switch para preview
    setViewMode('preview');
    setPreviewKey(k => k + 1);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    // Filtra mensagens 'build' antes de enviar ao backend (LLM só aceita user/assistant)
    const historyForBackend = messages
      .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant'
      );
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    const backendMessages = [...historyForBackend, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setInputMessage('');

    // Transição automática: landing → builder ao enviar mensagem
    if (currentScreen === 'landing') {
      setCurrentScreen('builder');
    }

    setIsLoading(true);
    setLoadingStatus(agentMode === 'creation' ? 'Criando projeto...' : 'Aplicando mudanças...');
    setLatestStep('Iniciando agente...');

    try {
      const response = await fetch('/api/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: backendMessages,
          files: files.map(f => ({ name: f.name, content: f.content })),
          agentMode,
          renderMode, // 'ast' | 'iframe'
          pageState, // Current AST state (if any)
          model: pagesConfig.modelo_criacao || 'anthropic/claude-3.5-sonnet',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'steps') {
              setLatestStep(event.content);
            } else if (event.type === 'actions') {
              const parsed: AgentResponse = typeof event.content === 'string'
                ? JSON.parse(event.content)
                : event.content;
              if (parsed?.actions?.length > 0) {
                applyAgentActions(parsed);
              }
            } else if (event.type === 'chunk') {
              setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
            } else if (event.type === 'error') {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Erro: ${event.content}`
              }]);
            }
          } catch {
            // linha mal formada, ignora
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro de conexão';
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      setLatestStep('');
    }
  };

  const handleSavePage = async (silent = false): Promise<SavedPage | null> => {
    if (!pageName.trim()) return null;

    setIsSaving(true);
    try {
      // Create bundle for 'codepages' column (backward compatibility & publishing)
      // CRITICAL: Always rebuild from files state to include latest edits
      const bundledHtml = bundleProject(files);
      const currentTimestamp = new Date().toISOString();

      let savedPage: SavedPage | null = null;
      const pageData = {
        nome: pageName,
        codepages: bundledHtml, // Use the fresh bundle
        source_files: files,    // Save source files JSON
        updated_at: currentTimestamp
      };

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
            created_at: currentTimestamp
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
          content: `Página "${pageName}" salva com sucesso!`
        }]);
      }
      return savedPage;
    } catch (error) {
      console.error('Error saving page:', error);
      // Fallback for when source_files column doesn't exist yet
      if (error instanceof Error && error.message?.includes('source_files')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'ATENÇÃO: A coluna "source_files" parece não existir no Supabase. Salvei apenas o HTML compilado, mas a edição futura pode ser limitada.'
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Erro ao salvar página. Verifique a conexão ou tabela do banco de dados.'
        }]);
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishPage = async () => {
    setIsPublishing(true);

    try {
      // Step 1: Ensure everything is saved first
      const savedPage = await handleSavePage(true);
      if (!savedPage) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Erro ao salvar página antes de publicar.'
        }]);
        return;
      }

      const slug = savedPage.url_slug || generateSlug(pageName);

      // Step 2: Update status
      const { error } = await supabase
        .from('pages_user')
        .update({
          publicado: true,
          url_slug: slug,
          updated_at: new Date().toISOString()
        })
        .eq('id', savedPage.id);

      if (error) throw error;

      const updatedPage = { ...savedPage, publicado: true, url_slug: slug };
      setCurrentPage(updatedPage);
      loadSavedPages();

      const pageUrl = getPageUrl(slug);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Página publicada com sucesso! URL: ${pageUrl} `
      }]);

      try {
        await navigator.clipboard.writeText(pageUrl);
      } catch {
        // Clipboard might not be available
      }
    } catch (error) {
      console.error('Error publishing page:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao publicar página.'
      }]);
    } finally {
      setIsPublishing(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  };

  const getPageUrl = (slug: string): string => {
    return `${window.location.origin} /p/${slug} `;
  };

  const copyPageUrl = () => {
    if (currentPage?.url_slug) {
      navigator.clipboard.writeText(getPageUrl(currentPage.url_slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadPage = (page: SavedPage) => {
    setCurrentPage(page);
    setPageName(page.nome);

    // Logic to load source files vs legacy content
    if (page.source_files && Array.isArray(page.source_files) && page.source_files.length > 0) {
      setFiles(page.source_files);
      setActiveFileId(page.source_files[0].id);
    } else {
      // Legacy migration: put everything in index.html
      setFiles([
        { id: '1', name: 'index.html', content: page.codepages || DEFAULT_HTML_CONTENT, language: 'html' },
        { id: '2', name: 'style.css', content: DEFAULT_CSS_CONTENT, language: 'css' },
        { id: '3', name: 'script.js', content: DEFAULT_JS_CONTENT, language: 'javascript' }
      ]);
      setActiveFileId('1');
    }

    setAgentMode('editing');
    setMessages([{
      role: 'assistant',
      content: `Página "${page.nome}" carregada.O que você gostaria de modificar ? `
    }]);
    setShowSavedPages(false);
    setCurrentScreen('builder');
  };

  /* -------------------------------------------------------------------------- */
  /*                           NAVIGATION LOGIC                                */
  /* -------------------------------------------------------------------------- */

  const confirmNavigation = (action: () => void) => {
    // If not in builder or very initial state, just proceed
    if (files.length === DEFAULT_FILES.length && files[0].content === DEFAULT_HTML_CONTENT) {
      action();
      return;
    }

    // Warn about unsaved changes
    if (confirm('Você pode perder alterações não salvas. Tem certeza que deseja sair?')) {
      action();
    }
  };

  const newPage = () => {
    confirmNavigation(() => {
      setCurrentPage(null);
      // Wait for React batching if needed, but these are independent
      setHtmlCode(DEFAULT_HTML_CONTENT);
      setFiles(DEFAULT_FILES);
      setPageName('Nova Página');
      setAgentMode('creation');
      setMessages([]);
      setCurrentScreen('builder');
    });
  };

  const handleBackToTemplates = () => {
    confirmNavigation(() => {
      setCurrentScreen('landing');
      // Reset state for clean start next time? Or keep? Usually reset is safer
      setPageName('Nova Página');
      setMessages([]);
      setFiles(DEFAULT_FILES);
    });
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta página?')) return;

    try {
      const { error } = await supabase
        .from('pages_user')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      if (currentPage?.id === pageId) {
        startFromScratch();
      }
      loadSavedPages();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  const downloadHtml = () => {
    // Always download the bundled version
    const htmlToDownload = bundleProject(files);
    const blob = new Blob([htmlToDownload], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pageName.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================== LANDING SCREEN (Lovable-style) ====================
  if (currentScreen === 'landing') {
    return (
      <>
        <style>{customStyles}</style>
        <div className="h-screen flex flex-col bg-[#080808] font-sans overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-white/[0.06] bg-[#080808] z-20 relative">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <ChevronLeft size={18} className="text-neutral-400 hover:text-white transition-colors" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="font-semibold text-white text-sm tracking-tight">Arcco Pages</span>
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
              <span>Minhas Páginas</span>
            </button>
          </div>

          {/* Saved Pages Dropdown */}
          {showSavedPages && (
            <div className="absolute top-[65px] right-6 z-50 w-80 bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e1e1e]">
                <h3 className="font-semibold text-white text-sm">Projetos Recentes</h3>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {savedPages.length > 0 ? savedPages.map(page => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-[#1e1e1e] last:border-0 transition-colors group"
                  >
                    <button onClick={() => loadPage(page)} className="flex-1 text-left">
                      <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{page.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neutral-500">{new Date(page.updated_at).toLocaleDateString('pt-BR')}</span>
                        {page.publicado && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                            No Ar
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deletePage(page.id); }}
                      className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )) : (
                  <div className="py-10 text-center">
                    <FolderOpen size={24} className="mx-auto mb-2 text-neutral-700" />
                    <p className="text-xs text-neutral-500">Nenhum projeto salvo</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">

            {/* Hero / Input Section */}
            <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8 min-h-[58vh]">

              {/* Logo icon */}
              <div className="relative mb-7">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10">
                  <Wand2 size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#080808] flex items-center justify-center">
                  <Sparkles size={9} className="text-white" />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white text-center mb-3 tracking-tight leading-tight">
                O que você quer criar?
              </h1>
              <p className="text-neutral-500 text-center text-sm mb-8 max-w-md leading-relaxed">
                Descreva sua ideia e o agente gera a landing page completa — HTML, CSS e JS em segundos
              </p>

              {/* Input box */}
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
                  placeholder="Ex: landing page para uma startup de SaaS, tema escuro, seção hero animada, features e planos de preço..."
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

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-xl">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInputMessage(`Landing page para ${s.text.toLowerCase()}`)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0d0d0d] border border-[#1e1e1e] hover:border-neutral-700 rounded-full text-xs text-neutral-500 hover:text-neutral-300 transition-all"
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    <span className="font-medium">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Section */}
            <div className="px-8 pb-12 max-w-7xl mx-auto w-full">
              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[#1a1a1a]" />
                <div className="flex items-center gap-2">
                  <Layout size={12} className="text-neutral-600" />
                  <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                    ou comece de um template
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
                      onClick={() => selectTemplate(template)}
                      className="group flex flex-col bg-[#0d0d0d] border border-[#1e1e1e] hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 text-left"
                    >
                      <div className="h-36 bg-[#111] relative overflow-hidden">
                        {template.codepages ? (
                          <iframe
                            srcDoc={template.codepages}
                            className="w-full h-full border-0 scale-[0.25] origin-top-left pointer-events-none"
                            style={{ width: '400%', height: '400%' }}
                            title={template.nome}
                            sandbox=""
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileCode size={24} className="text-neutral-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center pb-3">
                          <span className="px-3 py-1 bg-indigo-600/90 text-white text-xs font-medium rounded-lg">
                            Usar template
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
                  <Layout size={22} className="text-neutral-700 mb-2" />
                  <p className="text-xs text-neutral-600">Nenhum template disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ==================== BUILDER SCREEN ====================
  return (
    <>
      <style>{customStyles}</style>
      <div className="h-screen flex flex-col bg-[#0f0f0f] overflow-hidden relative font-sans">



        {/* Background Effect - PCB Circuit Neon */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.3]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="pcb-glow-full-bld" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="trace-grad-full-bld" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <g filter="url(#pcb-glow-full-bld)">
              <path d="M 0 100 H 200 L 250 150 H 500" stroke="url(#trace-grad-full-bld)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 0 300 H 150 L 180 330 H 400" stroke="url(#trace-grad-full-bld)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 0 600 H 300 L 350 650 H 800" stroke="url(#trace-grad-full-bld)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 800 0 V 100 L 750 150 V 400" stroke="url(#trace-grad-full-bld)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M 1200 0 V 200 L 1150 250 V 600" stroke="url(#trace-grad-full-bld)" strokeWidth="1" fill="none" opacity="0.3" />
            </g>
            <circle r="2" fill="#818cf8">
              <animateMotion dur="8s" repeatCount="indefinite" path="M 0 100 H 200 L 250 150 H 500" />
              <animate attributeName="opacity" values="0;1;0" dur="8s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="#a78bfa">
              <animateMotion dur="12s" repeatCount="indefinite" path="M 0 300 H 150 L 180 330 H 400" />
              <animate attributeName="opacity" values="0;1;0" dur="12s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* Header */}
        <div className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between shrink-0 z-20 relative">
          {/* Progress bar when loading */}
          {isLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full animate-pulse"
                style={{ animation: 'progress-slide 2s ease-in-out infinite' }} />
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={currentScreen === 'builder' ? handleBackToTemplates : onBack}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group shrink-0"
            >
              <ChevronLeft size={20} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
            <button
              onClick={() => setShowSavedPages(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 shrink-0 whitespace-nowrap"
            >
              <FolderOpen size={16} />
              <span className="hidden sm:inline">Minhas Páginas</span>
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg ${agentMode === 'creation'
                ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                } `}>
                {agentMode === 'creation' ? <Wand2 size={18} /> : <Pencil size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none focus:bg-white/5 px-2 py-0.5 rounded -ml-2 transition-colors border border-transparent focus:border-white/10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${agentMode === 'creation'
                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    } `}>
                    {agentMode === 'creation' ? 'Criação' : 'Edição'}
                  </span>
                  <span className="text-xs text-neutral-600 hidden sm:inline-block">AI Assistant Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={newPage}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white"
              title="Nova Página"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova</span>
            </button>

            <div className="h-6 w-px bg-[#262626] mx-1" />

            <button
              onClick={() => handleSavePage()}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden sm:inline">Salvar</span>
            </button>

            <button
              onClick={downloadHtml}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white"
              title="Download HTML"
            >
              <Download size={16} />
            </button>

            <button
              onClick={handlePublishPage}
              disabled={isPublishing}
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



        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Chat Panel */}
          <div className="w-96 bg-[#0A0A0A] border-r border-[#1a1a1a] flex flex-col shrink-0 relative">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0F0F0F]">
              <div className="flex items-center gap-2">
                <div className={`w - 6 h - 6 rounded - md flex items - center justify - center ${agentMode === 'creation'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  } `}>
                  {agentMode === 'creation' ? <Wand2 size={12} className="text-white" /> : <Pencil size={12} className="text-white" />}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {agentMode === 'creation' ? 'Criação' : 'Edição'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0A0A0A]">
              {messages.length === 0 && agentMode === 'creation' && (
                <div className="space-y-4 mt-6 px-2">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                      Comece com uma ideia
                    </p>
                  </div>

                  {/* Suggestion cards */}
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInputMessage(`Landing page para ${s.text.toLowerCase()} `)}
                        className="group relative flex items-center gap-3 px-4 py-3.5 bg-[#151515] border border-[#262626] rounded-xl text-left transition-all hover:border-neutral-600 hover:bg-[#1a1a1a]"
                      >
                        {/* Icon background */}
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#262626]">
                          <span className="text-xl">
                            {s.icon}
                          </span>
                        </div>

                        {/* Text */}
                        <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors flex-1">
                          {s.text}
                        </span>

                        {/* Arrow */}
                        <ChevronLeft size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-colors rotate-180" />
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
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

              {messages.length > 0 && agentMode === 'editing' && !isLoading && (
                <div className="py-3 px-2">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Wand2 size={12} className="text-purple-400" />
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                      Sugestões rápidas
                    </span>
                  </div>

                  {/* Pills */}
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

              {messages.map((msg, i) => {
                // Card de build (resultado do agente)
                if (msg.role === 'build') {
                  const extIcon = (name: string) =>
                    name.endsWith('.html') ? '🟠' :
                      name.endsWith('.css') ? '🔵' :
                        name.endsWith('.js') ? '🟡' : '⬜';
                  return (
                    <div key={i} className="flex justify-start animate-fade-in">
                      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                        {/* Header do card */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/10 bg-emerald-500/10">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check size={11} className="text-white" />
                          </div>
                          <span className="text-xs font-semibold text-emerald-400">Preview atualizado</span>
                        </div>
                        {/* Explicação */}
                        {msg.explanation && (
                          <p className="text-xs text-neutral-300 px-3 pt-2 pb-1 leading-relaxed">
                            {msg.explanation}
                          </p>
                        )}
                        {/* Pills de arquivos */}
                        {msg.files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-3 pb-2.5 pt-1">
                            {msg.files.map((f, fi) => (
                              <span
                                key={fi}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#333] text-[10px] text-neutral-400 font-mono"
                              >
                                {extIcon(f)} {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                // Mensagens normais user/assistant
                return (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3 py-2 ${msg.role === 'user'
                        ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30'
                        : 'bg-[#151515] text-neutral-300 border border-[#262626]'
                        }`}
                    >
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <div className="bg-[#0f0f0f] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 max-w-[85%]">
                      <div className="flex items-center gap-2.5">
                        <div className="flex gap-1 shrink-0">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <span className="text-xs text-neutral-400 leading-relaxed">
                          {latestStep
                            ? latestStep.replace(/<\/?step>/g, '').trim()
                            : loadingStatus
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1a1a1a] bg-[#0F0F0F]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={agentMode === 'creation' ? 'Descreva sua página...' : 'O que mudar?'}
                  className="flex-1 bg-[#050505] border border-[#262626] rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 text-sm font-medium"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 rounded-lg transition-all text-white"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* Editor/Preview Panel */}
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden relative">
            {/* File Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1a1a1a] bg-[#0F0F0F] overflow-x-auto">
              {files.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFileId(f.id)}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border-b-2 transition-all shrink-0 ${activeFileId === f.id
                    ? 'bg-[#1a1a1a] border-white/20 text-white'
                    : 'bg-transparent border-transparent text-neutral-500 hover:text-white hover:bg-[#1a1a1a]/50'
                    } `}
                >
                  <FileCode size={12} className={
                    f.name.endsWith('.html') ? 'text-neutral-400' :
                      f.name.endsWith('.css') ? 'text-neutral-500' :
                        f.name.endsWith('.js') ? 'text-neutral-500' : 'text-neutral-600'
                  } />
                  <span className="text-xs font-mono">{f.name}</span>
                  {f.name !== 'index.html' && (
                    <X
                      size={12}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 ml-1 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    />
                  )}
                </button>
              ))}

              {/* Add file button */}
              <button
                onClick={addNewFile}
                className="p-1.5 text-neutral-500 hover:text-white shrink-0 transition-colors"
                title="Novo Arquivo"
              >
                <FilePlus size={14} />
              </button>

              {/* Upload button */}
              <label className="p-1.5 text-neutral-500 hover:text-white cursor-pointer shrink-0 transition-colors" title="Upload">
                <Upload size={14} />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".html,.css,.js,.json"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Editor Header / Tabs */}
            <div className="bg-[#0F0F0F] border-b border-[#1a1a1a] px-4 py-2 flex items-center justify-between shrink-0 h-10">
              {/* View Mode Toggle */}
              <div className="flex bg-[#050505] rounded-lg p-0.5 border border-[#262626]">
                <button
                  onClick={() => setViewMode('code')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'code'
                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                    } `}
                >
                  <Code size={12} />
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'preview'
                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                    } `}
                >
                  <Eye size={12} />
                  Preview
                </button>
              </div>

              {/* Render Mode Toggle (Design vs Code Preview) */}
              {viewMode === 'preview' && (
                <div className="flex bg-[#050505] rounded-lg p-0.5 border border-[#262626] ml-4">
                  <button
                    onClick={() => setRenderMode('ast')}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${renderMode === 'ast'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                      } `}
                    title="Design Mode (Interactive AST)"
                  >
                    <Layout size={12} />
                    Design
                  </button>
                  <button
                    onClick={() => setRenderMode('iframe')}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all ${renderMode === 'iframe'
                      ? 'bg-[#1a1a1a] text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                      } `}
                    title="Code Mode (Legacy HTML)"
                  >
                    <FileCode size={12} />
                    Code
                  </button>
                </div>
              )}

              {/* Device Selector (Only visible in preview) */}
              {viewMode === 'preview' && (
                <div className="flex items-center gap-1 bg-[#050505] rounded-lg p-0.5 border border-[#262626] ml-auto">
                  {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((d) => {
                    const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
                    return (
                      <button
                        key={d}
                        onClick={() => setDevice(d)}
                        className={`p - 1.5 rounded transition - all ${device === d
                          ? 'bg-[#1a1a1a] text-white'
                          : 'text-neutral-500 hover:text-white'
                          } `}
                        title={DEVICE_SIZES[d].label}
                      >
                        <Icon size={14} />
                      </button>
                    );
                  })}
                  <div className="w-px h-4 bg-[#262626] mx-1"></div>
                  <button
                    onClick={() => setPreviewKey(k => k + 1)}
                    className="p-1.5 text-neutral-500 hover:text-white hover:bg-[#1a1a1a] rounded transition-all"
                    title="Atualizar"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-row">
              {viewMode === 'preview' ? (
                <div className="flex-1 overflow-auto bg-[#050505] flex items-start justify-center p-16 relative">
                  {/* Skeleton quando ainda não há nenhuma build gerada */}
                  {isLoading && messages.filter(m => m.role === 'build').length === 0 && !pageState && (
                    <div className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-10">
                      <div className="relative mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Wand2 size={26} className="text-indigo-500/50" />
                        </div>
                      </div>
                      <p className="text-neutral-400 text-sm font-medium mb-1.5">Gerando sua página...</p>
                      <p className="text-neutral-600 text-xs text-center max-w-[180px] leading-relaxed">
                        O preview aparecerá aqui quando o agente terminar
                      </p>
                      <div className="mt-5 flex gap-1.5">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}
                  <div
                    className={`bg-white shadow-2xl transition-all duration-300 origin-top overflow-hidden ${device === 'mobile' ? 'rounded-[3rem] border-[8px] border-[#1a1a1a] ring-1 ring-[#333]' :
                      device === 'tablet' ? 'rounded-[2rem] border-[8px] border-[#1a1a1a] ring-1 ring-[#333]' :
                        ''
                      }`}
                    style={{
                      width: DEVICE_SIZES[device].width,
                      maxWidth: '100%',
                      height: device === 'desktop' ? '100%' : device === 'mobile' ? '812px' : '1024px', // iPhone X / iPad Pro heights approximated
                      minHeight: device !== 'desktop' ? undefined : '100%',
                      aspectRatio: undefined // Remove generic aspect ratio to allow fixed heights
                    }}
                  >
                    {/* Device Notch/Camera for Mobile */}
                    {device === 'mobile' && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-[#1a1a1a] rounded-b-2xl z-20 pointer-events-none"></div>
                    )}

                    {/* Preview Component based on Render Mode */}
                    {renderMode === 'ast' && pageState ? (
                      <div className="h-full w-full overflow-y-auto bg-[#050505]">
                        <ASTRenderer
                          ast={pageState}
                          selectedId={selectedSectionId}
                          onSelect={handleSelectSection}
                          onDelete={handleDeleteSection}
                          onMove={handleMoveSection}
                          onDuplicate={handleDuplicateSection}
                        />
                      </div>
                    ) : (
                      // Legacy Code Mode (iframe)
                      <iframe
                        key={previewKey}
                        ref={iframeRef}
                        srcDoc={bundleProject(files)}
                        className="w-full h-full border-none bg-white"
                        title="Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-[#1e1e1e] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
                    <span className="text-sm text-neutral-400 font-medium flex items-center gap-2">
                      <FileCode size={14} className="text-blue-400" />
                      {activeFile.name}
                    </span>
                  </div>
                  <textarea
                    value={activeFile.content}
                    onChange={(e) => updateFileContent(activeFile.name, e.target.value)}
                    className="flex-1 w-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm leading-6 focus:outline-none resize-none"
                    spellCheck={false}
                    style={{
                      fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                      tabSize: 2
                    }}
                  />

                  {/* Status Bar */}
                  <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[10px] text-white select-none">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Code size={10} />
                        {activeFile.name.endsWith('.ts') || activeFile.name.endsWith('.tsx') ? 'TYPESCRIPT' : 'PLAINTEXT'}
                      </span>
                      <span>UTF-8</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Ln {((activeFile.content || '').substring(0, (activeFile.content || '').length).match(/\n/g) || []).length + 1}</span>
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Property Panel Sidebar (Phase 3) */}
              {renderMode === 'ast' && pageState && (
                selectedSectionId ? (
                  <PropertyPanel
                    section={pageState.sections.find(s => s.id === selectedSectionId)!}
                    onUpdate={handleUpdateSectionProps}
                    onClose={() => setSelectedSectionId(null)}
                  />
                ) : (
                  <ThemePanel
                    meta={pageState.meta}
                    onUpdate={handleUpdateMeta}
                  />
                )
              )}
            </div>
          </div>
        </div >
      </div >
    </>
  );
};
