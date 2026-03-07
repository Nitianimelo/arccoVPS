# CLAUDE.md — Guia de Referência do Repositório Arcco

> Este arquivo existe para que qualquer IA (Claude, GPT, Cursor, Gemini) compreenda
> imediatamente a arquitetura completa do projeto antes de qualquer interação.
> Leia este arquivo inteiro antes de sugerir ou fazer qualquer mudança.

---

## 1. O QUE É O ARCCO

Arcco é uma plataforma SaaS de IA com quatro produtos integrados:

| Produto | O que faz |
|---|---|
| **Arcco Chat** | Chat principal com agentes autônomos (busca web, geração de arquivos, design, código) |
| **Arcco Pages / Builder** | Gera apps React completos via IA + preview ao vivo via WebContainers + deploy na Vercel |
| **Arcco Post Builder** | Editor visual de posts/artes para redes sociais (canvas drag-and-drop, exporta PNG/PDF) |
| **Arcco Talk** | Integração WhatsApp via Evolution API — agentes de atendimento, base de conhecimento |

**Stack:** React 18 + Vite + TypeScript (frontend) · FastAPI + Python 3.12 (backend) · Supabase (DB/storage) · OpenRouter (LLM gateway) · Vercel (deploy de apps gerados)

---

## 2. ESTRUTURA DE ARQUIVOS — MAPA RÁPIDO

```
arccovps-master/
│
├── backend/                        # FastAPI Python
│   ├── main.py                     # Entry point — monta todos os routers
│   ├── core/
│   │   ├── config.py               # Variáveis de ambiente (.env)
│   │   ├── llm.py                  # call_openrouter(), stream_openrouter(), get_vercel_key()
│   │   └── supabase_client.py      # Cliente Supabase leve (httpx, sem SDK pesado)
│   ├── agents/
│   │   ├── registry.py             # PONTO CENTRAL: mapeia agent_id → {prompt, model, tools}
│   │   ├── prompts.py              # Todos os system prompts dos agentes
│   │   ├── tools.py                # Definições JSON das ferramentas (OpenAI tool-calling format)
│   │   ├── orchestrator.py         # Loop ReAct Supervisor-Worker (Arcco Chat)
│   │   ├── executor.py             # Executa ferramentas reais (busca, arquivos, browser)
│   │   └── README.md               # Documentação da arquitetura multi-agente
│   ├── api/
│   │   ├── chat.py                 # POST /api/agent/chat → orchestrate_and_stream()
│   │   ├── builder.py              # POST /api/builder/chat → builder_stream() [ARCCO PAGES]
│   │   ├── pages.py                # GET /p/{slug} → serve HTML publicado do Supabase
│   │   ├── admin.py                # POST /api/admin/* → hot-reload de prompts/models
│   │   ├── search.py               # POST /api/agent/search
│   │   ├── files.py                # POST /api/agent/files (PDF, Excel, PPTX)
│   │   ├── ocr.py                  # POST /api/agent/ocr
│   │   └── router.py               # POST /api/agent/route (classificador de intent)
│   └── services/
│       ├── search_service.py       # Integração Tavily
│       ├── file_service.py         # Geração de PDF/Excel/PPTX + upload Supabase
│       ├── ocr_service.py          # OCR de imagens
│       └── vercel_service.py       # deploy_to_vercel() — deploy via Vercel REST API
│
├── pages/
│   ├── arcco-pages/
│   │   ├── PagesBuilder.tsx        # UI principal do Arcco Builder (apps React + WebContainers)
│   │   ├── PostBuilder.tsx         # Editor de posts/designs (canvas absoluto)
│   │   ├── ASTVerificationPage.tsx # Debug: inspeciona PageAST
│   │   ├── MyPagesPage.tsx         # Lista de páginas salvas do usuário
│   │   ├── types/ast.ts            # Tipos: PageAST, PostAST, SectionNode, SectionType
│   │   ├── compiler/astCompiler.ts # Converte PageAST → HTML estático
│   │   ├── renderer/ASTRenderer.tsx # Renderiza PageAST como React (preview visual)
│   │   ├── editor/                 # Painéis de propriedades, floating toolbar, drag-and-drop
│   │   ├── components/             # Seções atômicas: HeroSection, NavbarSection, FAQ, etc.
│   │   └── templates/              # Template base Vite+React para projetos novos
│   └── arcco-talk/                 # Páginas do produto WhatsApp/agentes
│
├── components/
│   ├── Sidebar.tsx                 # Navegação lateral — define os ViewState disponíveis
│   ├── AgentTerminal.tsx           # Painel de steps do agente (animação de progresso)
│   ├── Toast.tsx                   # Sistema de notificações (ToastProvider + useToast)
│   └── chat/                       # ArtifactCard, AgentThoughtPanel, BrowserAgentCard
│
├── lib/
│   ├── supabase.ts                 # Cliente Supabase frontend (SDK oficial)
│   ├── api-client.ts               # agentApi — wrappers para os endpoints do backend
│   ├── agentPrompts.ts             # ARCCO_AGENT_SYSTEM_PROMPT (usado no chat frontend)
│   ├── chatStorage.ts              # Persistência de histórico de chat no localStorage
│   ├── evolution.ts                # Cliente Evolution API (WhatsApp)
│   └── tavily.ts                   # Cliente Tavily para busca web
│
├── App.tsx                         # Router principal — gerencia ViewState e autenticação
├── index.tsx                       # Entrypoint React — monta <App> com <ToastProvider>
└── CLAUDE.md                       # Este arquivo
```

---

## 3. DOIS PIPELINES SSE COMPLETAMENTE SEPARADOS

> CRITICO: Existem dois pipelines independentes. Confundi-los causa bugs graves.

### Pipeline A — Arcco Chat (`/api/agent/chat`)

```
Frontend (ArccoChatPage)
  → POST /api/agent/chat { messages, model }
  → orchestrate_and_stream()  [backend/agents/orchestrator.py]
      → Supervisor LLM (com SUPERVISOR_TOOLS)
          → Se tool_call:
              - Ferramentas NÃO-terminais (busca, arquivos): executa especialista + QA → resultado volta ao Supervisor
              - Ferramentas TERMINAIS (design, dev HTML):   stream direto do especialista → return imediato
          → Se resposta direta: chunked SSE → return
```

**Eventos SSE emitidos:** `steps` | `chunk` | `error` | `browser_action`

### Pipeline B — Arcco Builder (`/api/builder/chat`)

```
Frontend (PagesBuilder.tsx)
  → POST /api/builder/chat { messages, agentMode, renderMode: "app", appFiles }
  → builder_stream()  [backend/api/builder.py]
      → Fase 1: Planejamento rápido (1 frase do que vai criar)
      → Fase 2: APP_BUILDER_SYSTEM_PROMPT → LLM gera JSON { "files": {...} }
      → _extract_json_response() → parseia o JSON (com reparo de newlines)
      → sse_event("actions", json.dumps(result))
```

**Eventos SSE emitidos:** `steps` | `chunk` | `actions` | `error`

**IMPORTANTE:** O frontend `PagesBuilder.tsx` SEMPRE envia `renderMode: "app"`. Isso força o backend a usar `APP_BUILDER_SYSTEM_PROMPT` (nunca `PAGES_DEV_SYSTEM_PROMPT`).

---

## 4. CONTRATO DE DADOS: BUILDER → FRONTEND

### Formato esperado pelo PagesBuilder.tsx (evento `actions`)

```json
{
  "files": {
    "src/App.tsx": "conteúdo completo do arquivo",
    "src/pages/Dashboard.tsx": "conteúdo completo",
    "src/components/Sidebar.tsx": "conteúdo completo",
    "src/store/useAppStore.ts": "conteúdo completo",
    "src/data/mockData.ts": "conteúdo completo",
    "src/types/index.ts": "conteúdo completo"
  },
  "explanation": "Breve descrição do que foi criado/modificado"
}
```

**O que o frontend faz ao receber isso:**
- `agentMode === 'creation'`: mescla com template base (`getProjectTemplate()`) e injeta no WebContainer
- `agentMode === 'editing'`: faz patch apenas nos arquivos enviados (`{ ...prev, ...newFiles }`)
- Troca `agentMode` para `'editing'` automaticamente após a primeira geração

**O que acontece se o formato estiver errado:**
- Se receber `{ "actions": [...] }` → cai no branch legado, exibe só o `explanation` no chat (sem arquivos)
- Se receber texto puro → `gotFiles = false` → `flushStreamingText()` → imprime no chat

---

## 5. SISTEMA DE AGENTES — REGISTRY

**Arquivo central:** `backend/agents/registry.py`

O registry mantém em memória (`_REGISTRY`) a configuração de cada agente:

| agent_id | Produto | Função |
|---|---|---|
| `chat` | Arcco Chat | Supervisor ReAct — conversa com usuário, orquestra especialistas |
| `web_search` | Arcco Chat | Pesquisa Tavily + leitura de páginas |
| `file_generator` | Arcco Chat | Gera PDF/Excel/PPTX → upload Supabase |
| `file_modifier` | Arcco Chat | Modifica arquivos existentes |
| `design` | Arcco Builder | Gera PostAST JSON para o Post Builder |
| `pages_ux` | Arcco Pages (AST) | Gera ast_actions para landing pages visuais |
| `pages_dev` | Arcco Pages (legado) | Gera `{ "files": {...} }` HTML/CSS (modo não-app) |
| `pages_copy` | Arcco Pages | Copywriter — gera textos de landing page |
| `dev` | Sistema | Gera HTML/CSS genérico |
| `qa` | Sistema | Valida respostas dos especialistas |

**Persistência de 3 camadas:**
1. `_REGISTRY` em memória (acesso instantâneo)
2. `configs_override.json` (sobrevive a restarts)
3. `prompts.py` / `tools.py` (alterados pelo admin.py via regex/AST + hot-reload Uvicorn)

---

## 6. PROMPTS — ONDE CADA UM É USADO

**Arquivo:** `backend/agents/prompts.py`

| Constante | Usado por | Formato de saída |
|---|---|---|
| `CHAT_SYSTEM_PROMPT` | Supervisor (`orchestrator.py`) | Texto livre + tool_calls |
| `APP_BUILDER_SYSTEM_PROMPT` | `builder.py` (modo app) | `{ "files": {...}, "explanation": "..." }` |
| `PAGES_DEV_SYSTEM_PROMPT` | `builder.py` (modo legado/non-app) | `{ "files": {...}, "explanation": "..." }` |
| `PAGES_UX_SYSTEM_PROMPT` | `builder.py` (modo AST) | `{ "ast_actions": [...] }` |
| `PAGES_COPY_SYSTEM_PROMPT` | `/api/builder/copywrite` | JSON com blocos de copy |
| `DESIGN_SYSTEM_PROMPT` | Orquestrador → `design` terminal | PostAST JSON |
| `DEV_SYSTEM_PROMPT` | Orquestrador → `dev` terminal | HTML/CSS bruto |
| `QA_SYSTEM_PROMPT` | `orchestrator.py` → `_qa_review()` | `{ "approved": bool, "issues": [...] }` |

**`lib/agentPrompts.ts`** — `ARCCO_AGENT_SYSTEM_PROMPT`:
- Define as regras de tags `<file>` e `<step>` para o chat frontend
- **NÃO é importado em nenhum lugar atualmente** — existe como referência/exportação
- **NÃO afeta o PagesBuilder** (que usa seu próprio pipeline direto com o backend)

---

## 7. PARSING JSON DO BUILDER — BUG HISTÓRICO E SOLUÇÃO

**Problema:** LLMs frequentemente geram JSON com newlines literais dentro das strings
(ex: código TypeScript com quebras de linha reais). Isso é JSON inválido e quebra `json.loads()`.

**Consequência antes do fix:** `_extract_json_response()` falhava → caia em `sse_event("chunk", text)` → frontend imprimia o código no chat em vez de aplicar no WebContainer.

**Solução implementada em `backend/api/builder.py`:**

```python
def _repair_json_strings(text: str) -> str:
    # Percorre char a char, escapa \n \r \t literais dentro de strings JSON
    # Ignora sequências de escape já existentes (\\n não vira \\\\n)
```

`_extract_json_response()` agora tenta em cada passo: original primeiro, depois reparado.

**Regra:** Ao editar `_extract_json_response()` ou `_repair_json_strings()`, sempre teste com JSON que contém código TypeScript multilinhas nos valores.

---

## 8. WEBSOCKETS / SSE — FORMATO DO EVENTO

Todos os eventos SSE seguem o formato:

```
data: {"type": "<tipo>", "content": "<string>"}\n\n
```

| type | Quem emite | O que o frontend faz |
|---|---|---|
| `steps` | Chat + Builder | Exibe no `AgentTerminal` como item de progresso (remove tags `<step>`) |
| `chunk` | Chat + Builder | Appenda ao texto em streaming (mostrado como "digitando") |
| `actions` | Builder | Parseia JSON → aplica arquivos no WebContainer OU exibe legado |
| `error` | Chat + Builder | Exibe mensagem de erro no chat |
| `browser_action` | Chat (browser tool) | Renderiza `BrowserAgentCard` com status da navegação |

---

## 9. WEBCONTAINERS — FLUXO DE PREVIEW

**Componentes:** `WebContainerProvider` + `WebContainerPreview` (em `pages/arcco-pages/`)

**Template base:** `pages/arcco-pages/templates/viteReactTemplate.ts` → `getProjectTemplate(name)`
- Contém `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`
- Shadcn/ui já configurado — LLM **não deve** gerar esses arquivos de configuração

**Ciclo de vida:**
1. Usuário descreve o app → `agentMode = 'creation'`
2. Builder gera `{ "files": {...} }` → frontend mescla com template → injeta no WebContainer
3. WebContainer instala deps + inicia dev server → preview aparece no iframe
4. Usuário pede edição → `agentMode = 'editing'` → apenas arquivos alterados são patchados

---

## 10. BANCO DE DADOS SUPABASE — TABELAS PRINCIPAIS

| Tabela | Uso |
|---|---|
| `pages_user` | Páginas salvas pelo usuário (`id`, `nome`, `codepages`, `source_files`, `publicado`, `url_slug`) |
| `ApiKeys` | Chaves de API gerenciadas (`provider`, `api_key`, `is_active`) — inclui `openrouter` e `vercel` |
| `chat_configs` | Configurações de agentes do Arcco Talk |

**`source_files`** (coluna JSONB em `pages_user`): armazena o `Record<string, string>` completo dos arquivos React gerados — permite recarregar o projeto no WebContainer ao abrir uma página salva.

---

## 11. DEPLOY DE APPS GERADOS

**Serviço:** `backend/services/vercel_service.py` → `deploy_to_vercel(files, name)`

- Converte todos os arquivos para base64
- Se tiver `package.json`, detecta como projeto Vite (`framework: "vite"`)
- Usa Vercel REST API v13 (`POST /deployments`)
- A chave Vercel é buscada da tabela `ApiKeys` no Supabase (`provider='vercel'`)
- Endpoint: `POST /api/builder/deploy-vercel`

---

## 12. ADMIN PANEL — HOT-RELOAD DINÂMICO

**Arquivo:** `backend/api/admin.py`

- Altera `prompts.py` diretamente via **regex multiline** no disco
- Altera `tools.py` via **manipulação de AST Python**
- O Uvicorn em modo `--reload` detecta mudança nos `.py` e reinicia automaticamente
- Mudanças também são salvas em `backend/agents/configs_override.json` como backup

---

## 13. VARIÁVEIS DE AMBIENTE (.env)

```env
OPENROUTER_API_KEY=...     # Chave OpenRouter (LLM gateway)
OPENROUTER_MODEL=...       # Modelo padrão (ex: anthropic/claude-3.5-sonnet)
SUPABASE_URL=...            # URL do projeto Supabase
SUPABASE_KEY=...            # anon key do Supabase
CORS_ORIGINS=...            # Origins permitidos (ex: http://localhost:5173,https://arccoai.com)
WORKSPACE_PATH=...          # Diretório local para arquivos temporários
TAVILY_API_KEY=...          # Chave Tavily para busca web
```

A chave Vercel NÃO fica no `.env` — é buscada dinamicamente do Supabase (`ApiKeys`).

---

## 14. COMO RODAR LOCALMENTE

```bash
# Backend
cd arccovps-master
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
npm install
npm run dev   # Vite na porta 5173
```

**Proxy:** O Vite está configurado em `vite.config.ts` para fazer proxy de `/api/*` → `http://localhost:8000`.

---

## 15. REGRAS PARA IA QUE FOR EDITAR ESTE REPO

1. **Nunca altere o contrato SSE** sem atualizar tanto o emitter (Python) quanto o consumer (TypeScript)
2. **O PagesBuilder sempre envia `renderMode: "app"`** — `PAGES_DEV_SYSTEM_PROMPT` só é usado se algo externo enviar outro renderMode
3. **Arquivos de configuração Vite/shadcn** (`package.json`, `vite.config.ts`, etc.) vêm do template — o LLM não os gera, o frontend os injeta
4. **`_repair_json_strings`** deve ser chamado como fallback, nunca como primeira tentativa — o texto original tem prioridade
5. **O registry é a fonte da verdade** para prompts/modelos em produção — editar `prompts.py` sem passar pelo registry não tem efeito em runtime (o override do JSON tem precedência)
6. **Terminal Tools** no orquestrador (`generate_ui_design`, `generate_web_page`) fazem `return` imediato após o stream — não adicione lógica depois desse return
7. **`agentMode`** no builder muda de `'creation'` para `'editing'` automaticamente após a primeira geração bem-sucedida — respeite essa transição ao debugar
