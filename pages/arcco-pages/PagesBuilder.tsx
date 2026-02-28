import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  X,
  MessageSquare
} from 'lucide-react';
import { openRouterService } from '../../lib/openrouter';
import { pexelsService } from '../../lib/pexels';
import { supabase } from '../../lib/supabase';
import { PageAST, SectionType, SectionNode } from './types/ast';
import { ASTRenderer } from './renderer/ASTRenderer';
import { PropertyPanel } from './editor/PropertyPanel';
import { ThemePanel } from './editor/ThemePanel';
import { compileAstToHtml } from './compiler/astCompiler';
import { AVAILABLE_TEMPLATES, getTemplateHtml } from './templates';
import { iframeEditorScript } from './editor/iframeInjector';
import { VisualEditorPanel } from './editor/VisualEditorPanel';

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
  modelo_copywriter?: string;
  prompt_copywriter?: string;
  modelo_roteamento?: string;
  prompt_roteamento?: string;
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
    <title>Arcco Pages</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-white text-black overflow-x-hidden antialiased">
    <!-- O agente irá gerar o conteúdo aqui -->
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
  type: 'create' | 'update' | 'delete' | 'replace_snippet';
  file_path: string;
  content?: string;
  search?: string;
  replace?: string;
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
  explanation?: string;             // Optional explanation

  // Direct AST formats
  format?: string;
  slides?: any[];
  sections?: any[];
  id?: string;
  meta?: any;
}

interface AgentStep {
  id: string;
  text: string;
  status: 'running' | 'done' | 'error';
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
- Para CRIAÇÃO ou reescrita total, use "type": "update" com o conteúdo COMPLETO do arquivo.
- Para EDIÇÕES PEQUENAS (trocar cor, texto, classe, atributo), use "type": "replace_snippet" — é mais rápido e econômico.
- Só modifique/crie arquivos que realmente precisem de mudanças.
- Use Tailwind CSS via CDN no HTML para estilização.
- Use fontes modernas do Google Fonts (Inter, Poppins, etc).
- Use ícones do FontAwesome ou Lucide (via CDN).
- Crie layouts visualmente impactantes, com seções claras (Hero, Benefícios, Prova Social, CTA).
- Para imagens, USE AS URLs DO PEXELS fornecidas no contexto (se disponíveis). NÃO use source.unsplash.com.
- Se não houver URLs do Pexels no contexto, use https://images.pexels.com/photos/ como base.
- Sempre retorne código válido e funcional.
- Se o usuário pedir algo vago, use seu julgamento de design.

## Formato de Resposta

### Se precisar fazer perguntas:
Responda APENAS com texto simples (sem JSON, sem código).

### Se for gerar/modificar código:
Retorne APENAS um objeto JSON puro com esta estrutura:

#### Criação / Reescrita completa:
{
  "actions": [
    { "type": "update", "file_path": "index.html", "content": "<!DOCTYPE html>..." }
  ],
  "explanation": "Criei a landing page."
}

#### Edição cirurgica (trocar trechos):
{
  "actions": [
    { "type": "replace_snippet", "file_path": "index.html", "search": "class=\\"bg-blue-500\\"", "replace": "class=\\"bg-red-500\\"" },
    { "type": "replace_snippet", "file_path": "index.html", "search": "Texto Antigo", "replace": "Texto Novo" }
  ],
  "explanation": "Troquei a cor do botão e o texto do hero."
}

CRÍTICO:
- A chave DEVE ser "actions" (array de objetos)
- Cada ação DEVE ter: "type", "file_path" e ("content" OU "search"+"replace")
- PREFIRA "replace_snippet" para edições pontuais (menos tokens, mais rápido)
- Use "update" apenas quando o arquivo precisar ser reescrito por completo
- NÃO envolva o JSON em blocos de código markdown (\`\`\`json)
- Retorne SOMENTE o JSON puro, sem texto antes ou depois`;


// ── Prompts do Builder (espelhados do backend/api/builder.py) ────────────────

const AST_BUILDER_SYSTEM_PROMPT = `Você é um Arquiteto de UI especializado em construir landing pages modernas usando um sistema de Componentes Atômicos (Design System).
Você NÃO escreve HTML/CSS diretamente. Você manipula uma Árvore de Sintaxe Abstrata (AST) da página gerando JSON Patches.

## Seu Objetivo
Construir uma landing page de alta conversão adicionando, removendo ou atualizando seções na AST.

## Componentes Disponíveis (Atomic Design)

0. **Navbar** — Props: brandName, links [{label, href}], ctaText, ctaLink
1. **Hero** — Props: title, subtitle, ctaText, ctaLink, secondaryCtaText, secondaryCtaLink
2. **Marquee** — Props: items (array de strings), speed (segundos, padrão 20)
3. **Features** — Props: title, subtitle, columns (2/3/4), items [{icon, title, description}]
   - Ícones Lucide: "Rocket", "Zap", "Shield", "Globe", "Code", "Smartphone", "Star", "Heart"
4. **Pricing** — Props: title, subtitle, plans [{name, price, period, features[], ctaText, isPopular}]
5. **FAQ** — Props: title, subtitle, items [{question, answer}]
6. **CTA** — Props: title, description, ctaText, ctaLink, secondaryCtaText
7. **Footer** — Props: brandName, tagline, copyright, disclaimer

## Formato de Resposta (JSON Puro)

Retorne APENAS um objeto JSON com o campo "ast_actions":
{
  "ast_actions": [
    { "action": "add_section", "section_type": "Hero", "props": { "title": "...", "subtitle": "...", "ctaText": "..." }, "index": 0 }
  ],
  "explanation": "1 frase descrevendo o que foi criado."
}

Ações suportadas: "add_section", "update_section", "delete_section", "move_section", "update_meta".
Para update_section inclua "section_id" e "props" com apenas os campos a atualizar.

CRÍTICO: JSON VÁLIDO. Sem markdown. Sem componentes inventados.`;

const COPYWRITER_SYSTEM_PROMPT = `Você é um Copywriter de Resposta Direta especializado em Landing Pages de alta conversão.

## Missão
Receba a ideia do usuário e crie textos persuasivos para cada bloco da página.
Use gatilhos mentais: urgência, prova social, autoridade, benefício direto.
Adapte o tom ao nicho descrito.

## Formato de Saída (JSON puro, sem markdown)
{
  "navbar": { "brandName": "Nome", "ctaText": "Começar Agora", "links": [{"label": "Funcionalidades", "href": "#features"}, {"label": "Preços", "href": "#pricing"}] },
  "hero": { "title": "Título impactante (máx 8 palavras)", "subtitle": "Subtítulo com benefício central (máx 20 palavras)", "ctaText": "Começar Agora Grátis", "secondaryCtaText": "Ver Demo" },
  "marquee": { "items": ["🚀 Benefício 1", "🔒 Benefício 2", "⚡ Benefício 3", "💎 Benefício 4", "🎯 Benefício 5"] },
  "features": { "title": "Por que nos escolher", "items": [{"icon": "Rocket", "title": "Feature 1", "description": "Descrição persuasiva."}, {"icon": "Shield", "title": "Feature 2", "description": "..."}, {"icon": "Zap", "title": "Feature 3", "description": "..."}] },
  "pricing": { "title": "Planos", "plans": [{"name": "Básico", "price": "Grátis", "period": "mês", "ctaText": "Começar", "isPopular": false, "features": ["Feature 1", "Feature 2"]}, {"name": "Pro", "price": "R$97", "period": "mês", "ctaText": "Assinar", "isPopular": true, "features": ["Tudo do Básico", "Extra 1"]}, {"name": "Enterprise", "price": "Sob consulta", "period": "", "ctaText": "Falar com time", "isPopular": false, "features": ["Suporte dedicado"]}] },
  "faq": { "title": "Perguntas Frequentes", "items": [{"question": "Pergunta 1?", "answer": "Resposta 1."}, {"question": "Pergunta 2?", "answer": "Resposta 2."}, {"question": "Pergunta 3?", "answer": "Resposta 3."}] },
  "cta": { "title": "Chamada final irresistível", "description": "Reforço do valor + urgência", "ctaText": "Começar Agora — Grátis" },
  "footer": { "brandName": "Nome", "tagline": "Tagline curta", "disclaimer": "" }
}

CRÍTICO: Retorne SOMENTE o JSON puro. Nenhum texto antes ou depois.`;

// ── Helpers para extrair JSON da resposta do LLM ─────────────────────────────

function isValidActionResponse(data: unknown): data is { actions?: any[]; ast_actions?: any[]; explanation?: string; format?: string; slides?: any[]; sections?: any[]; meta?: any } {
  if (typeof data !== 'object' || !data) return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.actions) ||
    Array.isArray(d.ast_actions) ||
    Array.isArray(d.slides) ||
    Array.isArray(d.sections) ||
    !!d.format;
}

function extractJsonResponse(text: string): { actions?: any[]; ast_actions?: any[]; explanation?: string } | null {
  // Tentativa 1: JSON direto
  try {
    const parsed = JSON.parse(text);
    if (isValidActionResponse(parsed)) return parsed;
  } catch { }

  // Tentativa 2: bloco markdown
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (isValidActionResponse(parsed)) return parsed;
    } catch { }
  }

  // Tentativa 3: Busca bruta do primeiro '{' até fechar balanceado
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let balance = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') balance++;
      else if (text[i] === '}') {
        balance--;
        if (balance === 0) {
          try {
            const parsed = JSON.parse(text.slice(firstBrace, i + 1));
            if (isValidActionResponse(parsed)) return parsed;
          } catch { }
        }
      }
    }
  }

  return null;
}

// ── Contexto do projeto para o system prompt ──────────────────────────────────

function buildContextMessage(
  files: { name: string; content: string }[],
  agentMode: string,
  renderMode: string,
  pageState: unknown
): string {
  if (renderMode === 'ast') {
    const stateJson = pageState ? JSON.stringify(pageState, null, 2) : 'Empty Page (New)';
    return `## Modo: DESIGN MODE (AST)\n\n## Estado Atual da Página (AST)\n\`\`\`json\n${stateJson}\n\`\`\`\n\nInstruções: Analise o AST atual e gere patches para atingir o objetivo do usuário.`;
  }
  if (!files.length) return '';
  const fileTree = files.map(f => `  - ${f.name}`).join('\n');
  const fileContents = files.map(f => `===== ${f.name} =====\n${f.content}\n===== END =====`).join('\n\n');
  const modeLabel = agentMode === 'creation' ? 'CRIAÇÃO (novo projeto)' : 'EDIÇÃO (projeto existente)';
  return `## Modo: ${modeLabel}\n\n## Arquivos do Projeto\n${fileTree}\n\n## Conteúdo Atual\n${fileContents}`;
}

function looksLikeStructuredResponse(text: string): boolean {
  return (
    text.includes('"actions"') ||
    text.includes('"ast_actions"') ||
    text.includes('"section_type"') ||
    text.includes('"file_path"') ||
    (text.includes('{') && text.includes('"action"') && text.includes('"props"'))
  );
}

// VALIDAÇÃO DETERMINÍSTICA AGRESSIVA: detecta qualquer código/HTML/JSON
function containsCodeBlocks(text: string): boolean {
  const lower = text.toLowerCase();
  // Code blocks markdown
  if (lower.includes('```') && (lower.includes('html') || lower.includes('json') || lower.includes('css') || lower.includes('js'))) return true;
  // Tags HTML
  if (/<\s*(html|head|body|div|section|article|h[1-6]|p|span|a|button|nav|footer)/.test(lower)) return true;
  // HTML brackets
  if ((text.includes('<') && text.includes('>')) || (text.includes('</') && text.includes('>'))) return true;
  // JSON structure
  if ((text.includes('{') && text.includes('}')) && (text.includes('"') || text.includes(':'))) return true;
  // Doctype ou <!
  if (lower.includes('<!doctype') || lower.includes('<!')) return true;
  // Bloco de código com aspas triplas
  if (text.includes('"') && text.length > 100 && (text.includes('html') || text.includes('html'))) return true;
  return false;
}

// LIMPAZA AGRESSIVA DE CÓDIGO
function sanitizeForChat(text: string): string {
  let cleaned = text;
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  // Remove JSON blocks
  cleaned = cleaned.replace(/\{[\s\S]*\}/g, '[JSON]');
  // Limita tamanho
  return cleaned.trim().substring(0, 300);
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // Memoize bundled HTML to prevent iframe from reloading on every state change
  const bundledHtml = useMemo(() => {
    const htmlFile = files.find(f => f.name === 'index.html');
    const cssFiles = files.filter(f => f.language === 'css');
    const jsFiles = files.filter(f => f.language === 'javascript');

    if (!htmlFile) return '<h1>Erro: index.html não encontrado</h1>';

    let html = htmlFile.content;

    // Trava de segurança: garante estrutura HTML + Tailwind + Lucide
    if (!html.toLowerCase().includes('<html') && !html.toLowerCase().includes('<!doctype')) {
      html = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<script src="https://cdn.tailwindcss.com"></script>\n<script src="https://unpkg.com/lucide@latest"></script>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">\n<style>body { font-family: 'Inter', sans-serif; }</style>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    } else if (!html.includes('tailwindcss')) {
      html = html.replace('</head>', `<script src="https://cdn.tailwindcss.com"></script>\n<script src="https://unpkg.com/lucide@latest"></script>\n</head>`);
    }

    const cssContent = cssFiles.map(f => f.content).join('\n');
    if (cssContent) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
      } else {
        html += `<style>\n${cssContent}\n</style>`;
      }
    }
    const jsContent = jsFiles.map(f => f.content).join('\n');
    let injectedHtml = html;

    // Inject custom js
    if (jsContent || iframeEditorScript) {
      const allScript = [jsContent, iframeEditorScript].filter(Boolean).join('\n\n');
      if (injectedHtml.includes('</body>')) {
        injectedHtml = injectedHtml.replace('</body>', `\n<script>\n${allScript}\n</script>\n</body>`);
      } else {
        injectedHtml += `\n<script>\n${allScript}\n</script>`;
      }
    }
    return injectedHtml;
  }, [files]);

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

  // Agent terminal steps (Lovable-style)
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const agentStepsRef = useRef<AgentStep[]>([]);

  // Agent mode: creation or editing
  const [agentMode, setAgentMode] = useState<'creation' | 'editing'>('creation');
  // Chat Mode: 'preview' (aplica código) ou 'chat' (só texto natural)
  const [chatMode, setChatMode] = useState<'preview' | 'chat'>('preview');

  // API state
  const [apiConfigured, setApiConfigured] = useState(false);
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>({
    modelo_criacao: 'anthropic/claude-3.5-sonnet',
    system_prompt_criacao: '',
    modelo_edicao: 'anthropic/claude-3.5-sonnet',
    system_prompt_edicao: '',
    modelo_copywriter: 'anthropic/claude-3.5-sonnet',
  });

  // AST State (Phase 2)
  const [pageState, setPageState] = useState<PageAST | null>(null);
  const [renderMode, setRenderMode] = useState<'ast' | 'iframe'>('ast'); // Default to AST for new flow

  // Phase 3: Visual Editor State
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedVisualElement, setSelectedVisualElement] = useState<any | null>(null);

  // --- Visual Editor Listeners (Iframe) ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if needed (currently running on same origin usually)
      const { type, payload } = event.data;
      if (type === 'ELEMENT_SELECTED') {
        setSelectedVisualElement(payload);
      } else if (type === 'ELEMENT_DESELECTED') {
        setSelectedVisualElement(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleUpdateVisualElement = (payload: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send update command back to the iframe
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        payload
      }, '*');

      // Update local state proactively for immediate feedback
      setSelectedVisualElement((prev: any) => prev ? { ...prev, ...payload } : null);
    }
  };

  const handleCloseVisualEditor = () => {
    setSelectedVisualElement(null);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'DESELECT_ALL' }, '*');
    }
  };

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
          system_prompt_criacao: configData.system_prompt_criacao || '',
          modelo_edicao: configData.modelo_edicao || 'anthropic/claude-3.5-sonnet',
          system_prompt_edicao: configData.system_prompt_edicao || '',
          modelo_copywriter: configData.modelo_copywriter || 'anthropic/claude-3.5-sonnet',
          prompt_copywriter: configData.prompt_copywriter || undefined,
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

    // Trava de segurança: garante estrutura HTML + Tailwind + Lucide
    if (!bundledHtml.toLowerCase().includes('<html') && !bundledHtml.toLowerCase().includes('<!doctype')) {
      bundledHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<script src="https://cdn.tailwindcss.com"></script>\n<script src="https://unpkg.com/lucide@latest"></script>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">\n<style>body { font-family: 'Inter', sans-serif; }</style>\n</head>\n<body>\n${bundledHtml}\n</body>\n</html>`;
    } else if (!bundledHtml.includes('tailwindcss')) {
      bundledHtml = bundledHtml.replace('</head>', `<script src="https://cdn.tailwindcss.com"></script>\n<script src="https://unpkg.com/lucide@latest"></script>\n</head>`);
    }

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
          updateFileContent(fileName, action.content || '');
        } else if (action.type === 'replace_snippet') {
          if (action.search && action.replace !== undefined) {
            setFiles(prev => prev.map(f => {
              if (f.name === fileName && f.content.includes(action.search!)) {
                return { ...f, content: f.content.replace(action.search!, action.replace!) };
              }
              return f;
            }));
          }
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

    // Handle Direct AST Formats (slides or sections direct array)
    if (parsed.slides || parsed.sections) {
      setPageState(prevState => {
        const structuralArray = parsed.slides || parsed.sections;
        // Se for um PostAST ou DesignAST inteiro
        const newId = parsed.id || 'page-' + Date.now();
        const newMeta = parsed.meta || { title: 'Design Gerado', theme: 'dark' };

        return {
          id: prevState?.id || newId,
          meta: newMeta,
          sections: Array.isArray(structuralArray) ? structuralArray : []
        };
      });
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

  // ── Agent Terminal Helpers (Lovable-style) ────────────────────────────────────
  const addAgentStep = (text: string): string => {
    const id = 'step-' + Date.now() + Math.random().toString(36).slice(2, 5);
    const step: AgentStep = { id, text, status: 'running' };
    agentStepsRef.current = [...agentStepsRef.current, step];
    setAgentSteps([...agentStepsRef.current]);
    return id;
  };

  const updateAgentStep = (id: string, updates: Partial<AgentStep>) => {
    agentStepsRef.current = agentStepsRef.current.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    setAgentSteps([...agentStepsRef.current]);
  };

  const clearAgentSteps = () => {
    agentStepsRef.current = [];
    setAgentSteps([]);
  };

  const repairJsonResponse = async (raw: string): Promise<string> => {
    const repairSystem = renderMode === 'ast'
      ? 'Extract ast_actions from the text below. Return ONLY valid JSON: {"ast_actions":[...],"explanation":"..."}. No markdown.'
      : 'Extract actions from the text below. Return ONLY valid JSON: {"actions":[...],"explanation":"..."}. No markdown.';
    const result = await openRouterService.chat({
      model: pagesConfig.modelo_criacao || 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: repairSystem },
        { role: 'user', content: raw.slice(0, 30000) },
      ],
      max_tokens: 16000,
      temperature: 0,
    });
    return (result.choices[0]?.message?.content || '').trim();
  };
  // ───────────────────────────────────────────────────────────────────────────────

  // TODO: handleSendMessage com chatMode será implementado abaixo

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const historyForBackend = messages
      .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant'
      );
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    const backendMessages = [...historyForBackend, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setInputMessage('');

    if (currentScreen === 'landing') {
      setCurrentScreen('builder');
    }

    setIsLoading(true);
    clearAgentSteps();

    try {
      // ── MODO PREVIEW: Aplica código no preview ─────────────────────────
      if (chatMode === 'preview') {
        const analyzeStep = addAgentStep('Analisando solicitação e template base...');

        // ── Seleção Inteligente de Template (Routing) ───────────────────────
        let selectedTemplateHtml = '';
        let selectedTemplateId = '';

        if (agentMode === 'creation' && renderMode === 'iframe') {
          try {
            const templateContext = AVAILABLE_TEMPLATES.map(t =>
              `[ID: ${t.id}] - Nome: ${t.name} - Keywords: ${t.keywords.join(', ')}`
            ).join('\n');

            const defaultRoutingPrompt = `Você é um roteador de templates altamente eficiente.
Sua única função é ler o pedido do usuário e escolher o ID do template que melhor se encaixa no pedido.
Os templates disponíveis são:
${templateContext}

Retorne APENAS o ID do template escolhido (ex: 01-clinica-estetica). Se nenhum encaixar bem, retorne "10-health-wellness" como fallback padrão. NADA de texto extra, apenas o ID exato.`;

            const routingSystemPrompt = pagesConfig.prompt_roteamento
              ? pagesConfig.prompt_roteamento.replace('{{templateContext}}', templateContext)
              : defaultRoutingPrompt;

            const routerResult = await openRouterService.chat({
              model: pagesConfig.modelo_roteamento || 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: routingSystemPrompt },
                { role: 'user', content: userMessage },
              ],
              max_tokens: 20,
              temperature: 0,
            });

            selectedTemplateId = (routerResult.choices[0]?.message?.content || '').trim().replace(/[^a-zA-Z0-9-]/g, '');

            if (selectedTemplateId) {
              console.log('[Routing Agent] Templete selecionado:', selectedTemplateId);
              const htmlContent = await getTemplateHtml(selectedTemplateId);
              if (htmlContent) {
                selectedTemplateHtml = htmlContent;
              }
            }
          } catch (e) {
            console.warn('[Routing Agent] Falha ao selecionar template, seguindo sem template base:', e);
          }
        }

        let copywriterContext = '';
        if (renderMode === 'ast' && agentMode === 'creation') {
          updateAgentStep(analyzeStep, { status: 'done', text: 'Solicitação analisada' });
          const copywriterStep = addAgentStep('Copywriter gerando textos persuasivos...');
          try {
            const copywriterPrompt = pagesConfig.prompt_copywriter || COPYWRITER_SYSTEM_PROMPT;
            const copyResult = await openRouterService.chat({
              model: pagesConfig.modelo_copywriter || pagesConfig.modelo_criacao || 'anthropic/claude-3.5-sonnet',
              messages: [
                { role: 'system', content: copywriterPrompt },
                { role: 'user', content: userMessage },
              ],
              max_tokens: 4000,
              temperature: 0.7,
            });
            const copy = (copyResult.choices[0]?.message?.content || '').trim();
            if (copy) {
              copywriterContext = copy;
              updateAgentStep(copywriterStep, { status: 'done', text: 'Textos persuasivos gerados' });
            } else {
              updateAgentStep(copywriterStep, { status: 'error', text: 'Copywriter sem resposta' });
            }
          } catch (e) {
            console.warn('[Copywriter] Falha ao gerar copy:', e);
            updateAgentStep(copywriterStep, { status: 'error', text: 'Copywriter falhou' });
          }
        } else {
          updateAgentStep(analyzeStep, { status: 'done', text: 'Solicitação analisada' });
        }

        // ── Pexels: busca imagens relevantes ───────────────────────────────────
        let pexelsContext = '';
        if (agentMode === 'creation') {
          const pexelsStep = addAgentStep('Buscando imagens no Pexels...');
          try {
            // Extrai palavras-chave do pedido do usuário para buscar imagens relevantes
            const keywords = userMessage
              .replace(/[^a-zA-Zà-ú\s]/g, '')
              .split(/\s+/)
              .filter(w => w.length > 3)
              .slice(0, 3)
              .join(' ');

            const searchTerm = keywords || 'modern business';
            const queries: Record<string, string> = {
              hero: `${searchTerm} professional`,
              feature: `${searchTerm} technology`,
              team: 'professional team office',
              background: `${searchTerm} abstract`,
            };

            const imageUrls = await pexelsService.searchMultiple(queries, 'landscape');
            if (Object.keys(imageUrls).length > 0) {
              pexelsContext = Object.entries(imageUrls)
                .map(([key, url]) => `- ${key}: ${url}`)
                .join('\n');
              updateAgentStep(pexelsStep, { status: 'done', text: `${Object.keys(imageUrls).length} imagens encontradas` });
            } else {
              updateAgentStep(pexelsStep, { status: 'done', text: 'Nenhuma imagem encontrada' });
            }
          } catch (e) {
            console.warn('[Pexels] Falha ao buscar imagens:', e);
            updateAgentStep(pexelsStep, { status: 'error', text: 'Pexels falhou' });
          }
        }

        const architectStep = addAgentStep('Arquiteto montando estrutura...');

        // Injeta contexto do Copywriter + Pexels na mensagem do usuário
        let enrichedContext = '';
        if (copywriterContext) {
          enrichedContext += `\n\n---\n[CONTEXTO DO COPYWRITER — use estes textos nos blocos da página]\n${copywriterContext}`;
        }
        if (pexelsContext) {
          enrichedContext += `\n\n---\n[IMAGENS PEXELS — use estas URLs reais nas tags <img>. NÃO use source.unsplash.com]\n${pexelsContext}`;
        }
        if (selectedTemplateHtml) {
          enrichedContext += `\n\n---\n[TEMPLATE HTML BASE]
O usuário quer uma landing page profissional. Tome este código HTML abaixo como o SEU ESQUELETO DE BASE ABSOLUTA.
Regras OBRIGATÓRIAS:
1. MANTENHA 100% da estrutura, tags HTML, classes do TailwindCSS, tags <style>, animações CSS e links externos do head originais fornecidos.
2. SUA ÚNICA FUNÇÃO é SUBSTITUIR APENAS E EXCLUSIVAMENTE os textos (títulos, parágrafos, botões) e as imagens (links <img> e de CSS background) usando o que o usuário pediu e o contexto do pexels/copywriter acima. Nada mais.
3. Não remova as fontes (ex: Playfair Display) do <style> nem os ícones lucide.
4. O resultado final deve ser o HTML inteiro da página editada pronta para rodar no Iframe, mantendo todo o estilo visual estético Premium do template base!
\n\`\`\`html\n${selectedTemplateHtml}\n\`\`\`\n`;
        }

        const finalMessages = enrichedContext
          ? [
            ...backendMessages.slice(0, -1),
            {
              role: 'user' as const,
              content: `${userMessage}${enrichedContext}`
            }
          ]
          : backendMessages;

        const baseSystemPrompt = renderMode === 'ast'
          ? (pagesConfig.system_prompt_criacao || AST_BUILDER_SYSTEM_PROMPT)
          : (agentMode === 'creation'
            ? (pagesConfig.system_prompt_criacao || DEFAULT_AGENT_PROMPT)
            : (pagesConfig.system_prompt_edicao || DEFAULT_AGENT_PROMPT));

        const projectContext = buildContextMessage(
          files.map(f => ({ name: f.name, content: f.content })),
          agentMode,
          renderMode,
          pageState
        );
        const fullSystemPrompt = projectContext
          ? `${baseSystemPrompt}\n\n---\n${projectContext}`
          : baseSystemPrompt;

        const allMessages = [
          { role: 'system' as const, content: fullSystemPrompt },
          ...finalMessages,
        ];

        let fullResponse = '';
        try {
          await openRouterService.streamChat(
            {
              model: (agentMode === 'editing' ? pagesConfig.modelo_edicao : pagesConfig.modelo_criacao) || 'anthropic/claude-3.5-sonnet',
              messages: allMessages,
              max_tokens: 16000,
              temperature: 0.7,
            },
            (chunk) => {
              fullResponse += chunk;
              const tokenCount = Math.floor(fullResponse.length / 4);
              updateAgentStep(architectStep, { text: `Arquiteto montando estrutura... (${tokenCount} tokens)` });
            }
          );
        } catch (e) {
          updateAgentStep(architectStep, { status: 'error', text: 'Erro ao conectar com modelo' });
          throw e;
        }

        if (!fullResponse.trim() || fullResponse.length < 50) {
          updateAgentStep(architectStep, { status: 'error', text: 'Resposta vazia do modelo' });
          setIsLoading(false);
          return;
        }

        updateAgentStep(architectStep, { status: 'done', text: `Estrutura montada (${Math.floor(fullResponse.length / 4)} tokens)` });

        console.log('[PagesBuilder] Full response length:', fullResponse.length);
        console.log('[PagesBuilder] Response preview (first 300 chars):', fullResponse.substring(0, 300));
        console.log('[PagesBuilder] renderMode:', renderMode, '| agentMode:', agentMode);

        const processStep = addAgentStep('Processando resposta...');
        let parsed: any = extractJsonResponse(fullResponse);
        console.log('[PagesBuilder] extractJsonResponse result:', parsed ? Object.keys(parsed) : 'NULL');

        if (!parsed && looksLikeStructuredResponse(fullResponse)) {
          updateAgentStep(processStep, { text: 'JSON malformado, reparando...' });
          try {
            const repaired = await repairJsonResponse(fullResponse);
            parsed = extractJsonResponse(repaired);
            if (parsed) {
              updateAgentStep(processStep, { status: 'done', text: 'JSON reparado com sucesso' });
            } else {
              updateAgentStep(processStep, { status: 'error', text: 'Falha ao reparar JSON' });
            }
          } catch (e) {
            console.warn('[Repair Agent] Falha:', e);
            updateAgentStep(processStep, { status: 'error', text: 'Falha no repair agent' });
          }
        }

        const fileCount = parsed?.actions?.length || 0;
        const astCount = parsed?.ast_actions?.length || 0;
        const slidesCount = parsed?.slides?.length || parsed?.sections?.length || 0;
        const formatFlag = parsed?.format ? 1 : 0;

        const hasActions = fileCount > 0 || astCount > 0 || slidesCount > 0 || formatFlag > 0;

        if (hasActions) {
          const actionTypesDesc = fileCount > 0 ? fileCount + ' arquivo(s)' :
            astCount > 0 ? astCount + ' ação(ões) AST' :
              slidesCount > 0 ? slidesCount + ' slide(s)/seção(ões)' : 'design';
          const applyStep = addAgentStep(`Aplicando ${actionTypesDesc}...`);
          applyAgentActions(parsed as AgentResponse);
          updateAgentStep(applyStep, { status: 'done', text: `${actionTypesDesc} aplicado(s)` });
          console.log('[PagesBuilder] Actions applied successfully. renderMode:', renderMode);
        } else if (parsed) {
          // Parsed JSON exists but has no recognized action keys
          console.warn('[PagesBuilder] Parsed JSON has no actions/ast_actions/slides. Keys:', Object.keys(parsed));
          updateAgentStep(processStep, { status: 'error', text: 'JSON sem ações reconhecidas' });
        }

        // ── FALLBACK: Se o JSON falhou mas a resposta parece ser HTML puro ──
        if (!hasActions && (fullResponse.includes('<!DOCTYPE') || fullResponse.includes('<html'))) {
          console.log('[PagesBuilder] FALLBACK: Detected raw HTML in response, injecting into index.html');
          const htmlMatch = fullResponse.match(/<!DOCTYPE[\s\S]*<\/html>/i) || fullResponse.match(/<html[\s\S]*<\/html>/i);
          if (htmlMatch) {
            const rawHtml = htmlMatch[0];
            updateFileContent('index.html', rawHtml);
            setRenderMode('iframe');
            setViewMode('preview');
            setPreviewKey(k => k + 1);
            if (agentMode === 'creation') setAgentMode('editing');
            const fallbackStep = addAgentStep('Aplicando HTML direto (fallback)...');
            updateAgentStep(fallbackStep, { status: 'done', text: 'HTML aplicado via fallback' });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Página gerada com sucesso.' }]);
          }
        }

        if (parsed?.explanation) {
          const cleanExplanation = parsed.explanation
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\{[\s\S]*\}/g, '[JSON oculto]')
            .trim()
            .slice(0, 500);
          setMessages(prev => [...prev, { role: 'assistant', content: cleanExplanation }]);
        }

        if (agentMode === 'creation') setAgentMode('editing');
      }
      // ── MODO CHAT: Só responde texto natural ─────────────────────────────
      else {
        const chatStep = addAgentStep('Processando pergunta...');

        const baseSystemPrompt = pagesConfig.system_prompt_edicao || DEFAULT_AGENT_PROMPT;
        const allMessages = [
          { role: 'system' as const, content: baseSystemPrompt },
          ...backendMessages,
        ];

        let fullResponse = '';
        try {
          await openRouterService.streamChat(
            {
              model: pagesConfig.modelo_edicao || 'anthropic/claude-3.5-sonnet',
              messages: allMessages,
              max_tokens: 4000,
              temperature: 0.7,
            },
            (chunk) => {
              fullResponse += chunk;
              const tokenCount = Math.floor(fullResponse.length / 4);
              updateAgentStep(chatStep, { text: `Gerando resposta... (${tokenCount} tokens)` });
            }
          );
        } catch (e) {
          updateAgentStep(chatStep, { status: 'error', text: 'Erro ao conectar com modelo' });
          throw e;
        }

        if (!fullResponse.trim() || fullResponse.length < 20) {
          updateAgentStep(chatStep, { status: 'error', text: 'Resposta vazia do modelo' });
          setIsLoading(false);
          return;
        }

        // VERIFICA SE TEM CÓDIGO - se sim, erro amigável
        if (containsCodeBlocks(fullResponse)) {
          updateAgentStep(chatStep, { status: 'error', text: 'Resposta contém código' });
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Para conversas naturais, use o modo Chat. Para criar páginas, use o modo Preview.'
          }]);
          setIsLoading(false);
          return;
        }

        // Resposta em texto natural - sanitiza e mostra
        const cleanResponse = sanitizeForChat(fullResponse);
        updateAgentStep(chatStep, { status: 'done', text: 'Resposta gerada' });
        setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
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
      let finalHtml = '';
      let currentFiles = [...files];

      // Extract raw DOM if visual editing
      if (renderMode === 'iframe' && iframeRef.current?.contentDocument) {
        const doc = iframeRef.current.contentDocument;

        // Remove editor injected styles and selection outlines
        const styles = doc.querySelectorAll('style');
        if (styles.length > 0) {
          const lastStyle = styles[styles.length - 1];
          if (lastStyle.textContent?.includes('arcco-hover-outline')) {
            lastStyle.remove();
          }
        }
        doc.querySelectorAll('.arcco-hover-outline').forEach(el => el.classList.remove('arcco-hover-outline'));
        doc.querySelectorAll('.arcco-selected-outline').forEach(el => el.classList.remove('arcco-selected-outline'));

        const innerBody = doc.body.innerHTML;
        const oldHtml = bundleProject(files);

        // Repackage HTML without the injector
        const bodyMatch = oldHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
          finalHtml = oldHtml.replace(bodyMatch[1], innerBody);
          currentFiles = currentFiles.map(f => f.name === 'index.html' ? { ...f, content: finalHtml } : f);
          setFiles(currentFiles);
        } else {
          finalHtml = oldHtml;
        }
      } else if (renderMode === 'ast' && pageState) {
        finalHtml = compileAstToHtml(pageState);
      } else {
        finalHtml = bundleProject(files);
      }

      const currentTimestamp = new Date().toISOString();

      let savedPage: SavedPage | null = null;
      const pageData = {
        nome: pageName,
        codepages: finalHtml,
        source_files: currentFiles,
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
    return `https://pages.arccoai.com/${slug}`;
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Preview: carrega no builder */}
                      <button
                        onClick={e => { e.stopPropagation(); loadPage(page); }}
                        className="p-1.5 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="Abrir no editor"
                      >
                        <Eye size={13} />
                      </button>
                      {/* Link externo se publicada */}
                      {page.publicado && page.url_slug && (
                        <a
                          href={getPageUrl(page.url_slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="Ver página publicada"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {/* Deletar */}
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
    <div>
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
              onClick={() => {
                const html = bundleProject(files);
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] rounded-lg transition-colors text-sm text-neutral-300 hover:text-white"
              title="Preview em nova aba"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Preview</span>
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

              {/* Lovable-style Agent Terminal */}
              {isLoading && agentSteps.length > 0 && (
                <div className="flex justify-start animate-fade-in">
                  <div className="w-full bg-[#0c0c0c] border border-indigo-500/20 rounded-xl overflow-hidden max-w-[600px]">
                    {/* macOS-style header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border-b border-[#1a1a1a]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono ml-1">
                        {chatMode === 'preview' ? 'arcco-preview' : 'arcco-chat'}
                      </span>
                    </div>
                    {/* Steps */}
                    <div className="px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                      {agentSteps.map((step) => (
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
                          }>{step.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Mode Toggle */}
            <div className="px-3 pb-2 border-b border-[#1a1a1a] bg-[#0F0F0F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${chatMode === 'preview'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-neutral-500 hover:text-white'
                  }`}
                  onClick={() => setChatMode('preview')}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} />
                    Preview
                  </span>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${chatMode === 'chat'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-neutral-500 hover:text-white'
                  }`}
                  onClick={() => setChatMode('chat')}
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    Chat
                  </span>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1a1a1a] bg-[#0F0F0F]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={
                    chatMode === 'preview'
                      ? (agentMode === 'creation' ? 'Descreva sua página...' : 'O que mudar?')
                      : 'Faça uma pergunta...'
                  }
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

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-row">
              {viewMode === 'preview' ? (
                <div className={`flex-1 overflow-hidden bg-[#050505] flex items-start justify-center relative ${device !== 'desktop' ? 'p-4 overflow-auto' : ''}`}>
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
                    className={`bg-white shadow-2xl transition-all duration-300 origin-top flex flex-col ${device === 'mobile' ? 'rounded-[3rem] border-[8px] border-[#1a1a1a] ring-1 ring-[#333]' :
                      device === 'tablet' ? 'rounded-[2rem] border-[8px] border-[#1a1a1a] ring-1 ring-[#333]' :
                        ''
                      }`}
                    style={{
                      width: DEVICE_SIZES[device].width,
                      maxWidth: '100%',
                      height: device === 'desktop' ? '100%' : device === 'mobile' ? '812px' : '1024px',
                      minHeight: device === 'desktop' ? '100%' : undefined,
                      flexShrink: 0,
                    }}
                  >
                    {/* Device Notch/Camera for Mobile */}
                    {device === 'mobile' && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-[#1a1a1a] rounded-b-2xl z-20 pointer-events-none"></div>
                    )}

                    {/* Preview Component based on Render Mode */}
                    {renderMode === 'ast' && pageState ? (
                      <div className="flex-1 w-full overflow-y-auto bg-[#050505]">
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
                      <>
                        <iframe
                          key={previewKey}
                          ref={iframeRef}
                          srcDoc={bundledHtml}
                          className="flex-1 w-full border-none bg-white"
                          title="Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                          style={{ minHeight: 0 }}
                        />
                        {/* Visual Editor Panel injetado flutuando no Iframe */}
                        <VisualEditorPanel
                          selectedElement={selectedVisualElement}
                          onUpdateElement={handleUpdateVisualElement}
                          onClose={handleCloseVisualEditor}
                          onOpenDrive={() => {
                            showToast('A funcionalidade de troca de imagens com o Drive será implementada a seguir.', 'info');
                          }}
                        />
                      </>
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
        </div>
      </div>
    </div >
  );
};
