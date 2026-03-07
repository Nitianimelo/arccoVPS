"""
Endpoint de builder de páginas — SSE streaming com agente Python robusto.
Suporta dois modos de operação:
1. Legacy/Code Mode: Manipulação de arquivos HTML/CSS/JS brutos.
2. Design Mode (AST): Manipulação de estrutura de dados JSON (PageAST) com componentes atômicos.
3. Deploy Mode: Publicação de páginas via Vercel REST API.
"""

import json
import logging
import re
from typing import AsyncGenerator, Optional, Dict, Any

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from backend.core.config import get_config
from backend.core.llm import call_openrouter
from backend.services.search_service import search_web_formatted

logger = logging.getLogger(__name__)
router = APIRouter()

from backend.agents import registry

BUILDER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for design references, color palettes, or UI inspiration",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string", "description": "Search query"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Fetch and read content from a URL for design reference",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string", "description": "URL to fetch"}},
                "required": ["url"],
            },
        },
    },
]


def sse_event(event_type: str, content: str) -> str:
    return f"data: {json.dumps({'type': event_type, 'content': content})}\n\n"


async def web_fetch_tool(url: str) -> str:
    try:
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers={"User-Agent": "ArccoBuilder/2.0"}, follow_redirects=True)
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "aside", "form", "svg"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            if len(text) > 15000:
                text = text[:15000] + "... [Truncado]"
            title = soup.title.string if soup.title else url
            return f"**Referência: {title}**\\n\\n{text}"
    except Exception as e:
        return f"Erro ao buscar URL: {e}"


async def execute_builder_tool(func_name: str, func_args: dict) -> str:
    if func_name == "web_search":
        return await search_web_formatted(func_args.get("query", ""))
    elif func_name == "web_fetch":
        return await web_fetch_tool(func_args.get("url", ""))
    return f"Ferramenta desconhecida: {func_name}"


def build_context_message(files: list[dict], agent_mode: str, render_mode: str, page_state: Optional[Dict[str, Any]]) -> str:
    """Monta contexto do projeto para injetar no sistema, dependendo do modo."""
    
    if render_mode == "ast":
        # AST Mode Context
        mode_label = "DESIGN MODE (AST)"
        state_json = json.dumps(page_state, indent=2, ensure_ascii=False) if page_state else "Empty Page (New)"
        return (
            f"## Modo: {mode_label}\\n\\n"
            f"## Estado Atual da Página (AST)\\n```json\\n{state_json}\\n```\\n\\n"
            f"Instruções: Analise o AST atual e gere patches para atingir o objetivo do usuário."
        )
    else:
        # Legacy File Mode Context
        if not files:
            return ""
        file_tree = "\\n".join(f"  - {f['name']}" for f in files)
        file_contents = "\\n\\n".join(
            f"===== {f['name']} =====\\n{f['content']}\\n===== END ====="
            for f in files
        )
        mode_label = "CRIAÇÃO (novo projeto)" if agent_mode == "creation" else "EDIÇÃO (projeto existente)"
        return (
            f"## Modo: {mode_label}\\n\\n"
            f"## Arquivos do Projeto\\n{file_tree}\\n\\n"
            f"## Conteúdo Atual\\n{file_contents}"
        )


APP_BUILDER_SYSTEM_PROMPT = """Você é um engenheiro sênior de frontend especializado em criar aplicações React modernas e completas.

## STACK OBRIGATÓRIA
- **Runtime**: React 18 + Vite + TypeScript (tipagem estrita)
- **Estilização**: Tailwind CSS + tailwindcss-animate
- **Componentes UI**: shadcn/ui (Button, Card, Dialog, Tabs, etc.) + lucide-react para ícones
- **Estado Global**: Zustand (simples, nunca Redux ou Context API complexo)
- **Roteamento**: React Router DOM v6+ (BrowserRouter já está no main.tsx)
- **Gráficos**: Recharts (quando precisar de dados visuais)

## COMPONENTES shadcn/ui DISPONÍVEIS (já instalados no template)
Importe diretamente — NÃO precisa criar esses arquivos:
- `@/components/ui/button` → Button, buttonVariants
- `@/components/ui/card` → Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `@/components/ui/input` → Input
- `@/components/ui/textarea` → Textarea
- `@/components/ui/badge` → Badge
- `@/components/ui/label` → Label
- `@/components/ui/separator` → Separator
- `@/components/ui/tabs` → Tabs, TabsList, TabsTrigger, TabsContent
- `@/components/ui/dialog` → Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger, DialogClose
- `@/components/ui/select` → Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel
- `@/components/ui/avatar` → Avatar, AvatarImage, AvatarFallback
- `@/components/ui/dropdown-menu` → DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup
- `@/components/ui/switch` → Switch
- `@/components/ui/tooltip` → Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
- `@/lib/utils` → cn (para merge de classes Tailwind)

## REGRAS DE ARQUITETURA
1. **Zero backend**: 100% client-side. NUNCA use fetch/axios para APIs reais, Supabase, Firebase, etc.
2. **Mock Data Brilhante**: Sempre que precisar exibir dados (tabelas, gráficos, listas), crie `src/data/mockData.ts` com dados RICOS, REALISTAS e adaptados ao nicho (ex: barbearia → cortes reais, clientes fictícios plausíveis, horários, preços em R$)
3. **Zustand stores**: Crie em `src/store/useXxxStore.ts`. Estado inicial populado com mock data.
4. **Componentes reutilizáveis**: Coloque em `src/components/`. Use shadcn/ui como base.
5. **Páginas**: Coloque em `src/pages/`. Configure rotas no App.tsx.
6. **TypeScript estrito**: Defina interfaces para todos os dados em `src/types/`.

## FORMATO DE RESPOSTA (OBRIGATÓRIO)
Retorne APENAS JSON válido neste formato:

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

### REGRAS DO JSON:
- Para CRIAÇÃO: inclua TODOS os arquivos do projeto (App.tsx, pages, components, store, data, types)
- Para EDIÇÃO: inclua APENAS os arquivos que foram modificados
- NÃO inclua arquivos de configuração (package.json, vite.config.ts, tsconfig.json, tailwind.config.ts) — eles já existem
- Conteúdo dos arquivos deve ser strings TypeScript/TSX válidas e completas
- Use \\n para quebras de linha dentro das strings do JSON
- Escape aspas duplas internas com \\"

## QUALIDADE DO DESIGN
- Use dark mode por padrão (classe `dark` no html ou variáveis CSS do index.css)
- Design profissional e moderno — não faça nada "placeholder"
- Animações suaves com tailwindcss-animate (fade-in, slide-in nas rotas)
- Sidebar lateral fixa para dashboards/sistemas
- Responsivo para mobile (hamburger menu, cards empilhados)
- Recharts para gráficos: AreaChart, BarChart, LineChart com dados do mockData.ts
"""


async def builder_stream(
    messages: list,
    files: list[dict],
    agent_mode: str,
    render_mode: str,
    page_state: Optional[Dict[str, Any]],
    model: str,
    app_files: Optional[Dict[str, str]] = None,
) -> AsyncGenerator[str, None]:
    """
    Loop do agente builder com SSE.
    Modo 'app': SEMPRE usa APP_BUILDER_SYSTEM_PROMPT (ignora registry).
    Modo legado: usa registry prompt para HTML/AST.
    """
    config = get_config()
    MAX_ITERATIONS = 8

    # ── Seleção de sistema de prompt e modelo ─────────────────────────────────
    # App mode: IGNORA registry — usa sempre APP_BUILDER_SYSTEM_PROMPT
    is_app_mode = (render_mode == "app") or (app_files is not None)

    if is_app_mode:
        base_system = APP_BUILDER_SYSTEM_PROMPT
        # Prioridade: parâmetro explícito > claude-3.5-sonnet (padrão para apps)
        model_to_use = model or "anthropic/claude-3.5-sonnet"
        tools_to_use = None  # sem busca web no modo app (mais rápido e focado)
    else:
        base_system = registry.get_prompt("pages_dev") or APP_BUILDER_SYSTEM_PROMPT
        model_to_use = model or registry.get_model("pages_dev") or config.openrouter_model
        tools_to_use = BUILDER_TOOLS

    logger.info(f"[BUILDER] mode={render_mode} is_app={is_app_mode} model={model_to_use} agent={agent_mode}")

    # ── Contexto do projeto para edição ───────────────────────────────────────
    project_context = ""
    if app_files:
        file_tree = "\n".join(f"  - {path}" for path in sorted(app_files.keys()))
        mode_label = (
            "EDIÇÃO — retorne APENAS os arquivos que precisam ser modificados"
            if agent_mode == "editing"
            else "CRIAÇÃO — gere TODOS os arquivos do projeto"
        )
        project_context = f"## Modo: {mode_label}\n\n## Arquivos existentes:\n{file_tree}\n\n"
        if agent_mode == "editing":
            key_files = ["src/App.tsx", "src/types/index.ts", "src/store/useAppStore.ts", "src/data/mockData.ts"]
            for kf in key_files:
                if kf in app_files:
                    project_context += f"\n### {kf}\n```typescript\n{app_files[kf][:3000]}\n```\n"

    full_system = base_system + (f"\n\n---\n{project_context}" if project_context else "")

    current_messages = [{"role": "system", "content": full_system}]
    for msg in messages:
        current_messages.append(msg if isinstance(msg, dict) else msg.model_dump())

    iteration = 0

    try:
        # ── FASE 1: Planejamento rápido (só no modo app) ─────────────────────
        if is_app_mode:
            yield sse_event("steps", "<step>📋 Analisando solicitação...</step>")
            try:
                action_verb = "modificar" if agent_mode == "editing" else "criar"
                last_user_msg = next(
                    (m["content"] for m in reversed(current_messages) if m.get("role") == "user"),
                    ""
                )
                plan_data = await call_openrouter(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                f"O usuário quer {action_verb} um app React. "
                                "Em 1 frase direta (máx 130 chars), descreva o que você vai criar/modificar. "
                                "Seja específico: mencione o nicho e as principais funcionalidades. "
                                "Exemplo: 'Vou criar um dashboard de barbearia com agenda, lista de clientes e gráficos de faturamento.' "
                                "Responda APENAS com a frase, sem prefixos como 'Claro' ou 'Certamente'."
                            ),
                        },
                        {"role": "user", "content": last_user_msg},
                    ],
                    model=model_to_use,
                    max_tokens=140,
                    temperature=0.4,
                )
                plan_text = (plan_data["choices"][0]["message"].get("content") or "").strip()
                if plan_text:
                    yield sse_event("chunk", plan_text)
            except Exception as plan_err:
                logger.warning(f"[BUILDER] Fase de planejamento falhou: {plan_err}")

        # ── FASE 2: Geração principal ─────────────────────────────────────────
        action_label = "Modificando arquivos" if agent_mode == "editing" else "Gerando projeto React"
        yield sse_event("steps", f"<step>⚡ {action_label}...</step>")

        while iteration < MAX_ITERATIONS:
            iteration += 1

            if iteration > 1:
                yield sse_event("steps", f"<step>🔧 Refinando resposta (passo {iteration})...</step>")

            try:
                data = await call_openrouter(
                    messages=current_messages,
                    model=model_to_use,
                    max_tokens=16000,
                    tools=tools_to_use,
                )
            except Exception as outer_err:
                logger.error(f"[BUILDER] Erro LLM: {outer_err}", exc_info=True)
                yield sse_event("error", f"Falha de conexão com a IA: {outer_err}")
                return

            if data.get("error"):
                logger.error(f"[BUILDER] Erro OpenRouter: {data['error']}")
                yield sse_event("error", json.dumps(data["error"]))
                return

            message = data["choices"][0]["message"]
            current_messages.append(message)

            # Tool calls
            if message.get("tool_calls"):
                tool_names = [t["function"]["name"] for t in message["tool_calls"]]
                yield sse_event("steps", f"<step>🔧 Usando {', '.join(tool_names)}...</step>")

                for tool in message["tool_calls"]:
                    func_name = tool["function"]["name"]
                    func_args = json.loads(tool["function"]["arguments"])
                    yield sse_event("steps", f"<step>🔍 {func_name}: {func_args.get('query', func_args.get('url', ''))[:60]}</step>")
                    try:
                        result = await execute_builder_tool(func_name, func_args)
                    except Exception as e:
                        result = f"Erro: {e}"
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": result,
                    })
                    yield sse_event("steps", f"<step>✅ {func_name} concluído</step>")
                continue

            # Resposta final
            final_content = (message.get("content") or "").strip()
            if not final_content:
                yield sse_event("error", "Resposta vazia do agente.")
                return

            actions_json = _extract_json_response(final_content)

            if actions_json:
                if "files" in actions_json:
                    file_paths = list(actions_json["files"].keys())
                    yield sse_event("steps", f"<step>📦 {len(file_paths)} arquivo(s) gerado(s)</step>")
                    # Mostra cada arquivo sendo "aplicado"
                    for fp in file_paths[:12]:
                        yield sse_event("steps", f"<step>📄 {fp}</step>")
                    if len(file_paths) > 12:
                        yield sse_event("steps", f"<step>... e mais {len(file_paths) - 12} arquivo(s)</step>")
                elif "actions" in actions_json:
                    yield sse_event("steps", f"<step>✅ {len(actions_json['actions'])} ação(ões) aplicada(s)</step>")
                elif "ast_actions" in actions_json:
                    yield sse_event("steps", f"<step>✨ {len(actions_json['ast_actions'])} alterações aplicadas</step>")

                yield sse_event("actions", json.dumps(actions_json))
            else:
                yield sse_event("steps", "<step>💬 Resposta textual</step>")
                yield sse_event("chunk", final_content)

            return

        yield sse_event("error", "Limite de iterações atingido.")

    except Exception as e:
        logger.error(f"[BUILDER] Stream error: {e}", exc_info=True)
        yield sse_event("error", str(e))


def _extract_json_response(text: str) -> dict | None:
    """Tenta extrair JSON da resposta. Suporta formato 'files' (novo) e 'actions'/'ast_actions' (legado)."""

    # Tentativa 1: JSON Parse direto
    try:
        parsed = json.loads(text)
        if _is_valid_action_response(parsed):
            return parsed
    except json.JSONDecodeError:
        pass

    # Tentativa 2: Bloco Markdown ```json ... ``` ou ```typescript (com ou sem specifier)
    for pattern in [
        r"```(?:json|typescript|ts|)\s*([\s\S]*?)```",
        r"~~~(?:json|typescript|ts|)\s*([\s\S]*?)~~~",
    ]:
        block_match = re.search(pattern, text)
        if block_match:
            try:
                parsed = json.loads(block_match.group(1).strip())
                if _is_valid_action_response(parsed):
                    return parsed
            except json.JSONDecodeError:
                pass

    # Tentativa 3: raw_decode — encontra JSON válido em qualquer posição do texto.
    # Usa o JSONDecoder nativo que entende strings (ignora { } dentro de strings),
    # portanto não se confunde com código TypeScript dentro dos valores do JSON.
    decoder = json.JSONDecoder()
    idx = 0
    while idx < len(text):
        next_brace = text.find('{', idx)
        if next_brace == -1:
            break
        try:
            parsed, end_idx = decoder.raw_decode(text, next_brace)
            if _is_valid_action_response(parsed):
                return parsed
            idx = end_idx
        except json.JSONDecodeError:
            idx = next_brace + 1
    return None


def _is_valid_action_response(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
    # Novo formato: { "files": { "src/App.tsx": "..." } }
    if "files" in data and isinstance(data["files"], dict):
        return True
    # Legado: actions / ast_actions
    if "actions" in data and isinstance(data["actions"], list):
        return True
    if "ast_actions" in data and isinstance(data["ast_actions"], list):
        return True
    return False


@router.post("/copywrite")
async def copywrite_endpoint(request: Request):
    """
    POST /api/builder/copywrite
    Chama o Agente Copywriter para gerar textos persuasivos estruturados (JSON).
    Retorna { "copy": "<json string>" } ou { "error": "..." }.
    Não faz streaming — é uma chamada síncrona simples.
    """
    body = await request.json()
    user_prompt = body.get("prompt", "").strip()
    model = body.get("model", registry.get_model("pages_copy") or get_config().openrouter_model)
    custom_prompt = body.get("system_prompt")
    if not custom_prompt:
        custom_prompt = registry.get_prompt("pages_copy")
    if not custom_prompt:
        custom_prompt = "Você é um copywriter."

    if not user_prompt:
        return {"error": "prompt vazio"}

    try:
        data = await call_openrouter(
            messages=[
                {"role": "system", "content": custom_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            model=model,
            max_tokens=4000,
        )
        if data.get("error"):
            return {"error": str(data["error"])}

        copy_text = (data["choices"][0]["message"].get("content") or "").strip()
        return {"copy": copy_text}

    except Exception as e:
        logger.error(f"Copywrite error: {e}", exc_info=True)
        return {"error": str(e)}


@router.post("/deploy-vercel")
async def deploy_vercel_endpoint(request: Request):
    """
    POST /api/builder/deploy-vercel
    Faz deploy de uma página HTML na Vercel.
    Body: { "html": "...", "name": "minha-pagina" }
    Retorna: { "url": "https://..." } ou { "error": "..." }
    """
    try:
        body = await request.json()
    except Exception:
        raw = await request.body()
        body = json.loads(raw.decode("utf-8", errors="replace"))
    name = body.get("name", "app").strip()
    # Suporta tanto multi-arquivo (appFiles) quanto HTML único (html)
    app_files: dict = body.get("appFiles") or {}
    html: str = body.get("html", "").strip()

    if not app_files and not html:
        return {"error": "appFiles ou html são obrigatórios"}

    # Monta o dict de arquivos para o serviço
    files_to_deploy: dict[str, str] = app_files if app_files else {"index.html": html}

    try:
        from backend.services.vercel_service import deploy_to_vercel
        url = await deploy_to_vercel(files_to_deploy, name)
        return {"url": url}
    except Exception as e:
        logger.error(f"[deploy-vercel] erro: {e}", exc_info=True)
        return {"error": str(e)}


@router.post("/chat")
async def builder_chat_endpoint(request: Request):
    """
    POST /api/builder/chat
    SSE streaming para o agente builder de apps React.
    """
    try:
        body = await request.json()
    except Exception:
        # Fallback: lê bytes brutos e decodifica com tolerância a erros
        raw = await request.body()
        body = json.loads(raw.decode("utf-8", errors="replace"))
    messages = body.get("messages", [])
    files = body.get("files", [])
    agent_mode = body.get("agentMode", "creation")
    render_mode = body.get("renderMode", "app")
    page_state = body.get("pageState")
    model = body.get("model", "anthropic/claude-3.5-sonnet")
    app_files = body.get("appFiles")  # dict[str, str] — arquivos atuais do projeto

    return StreamingResponse(
        builder_stream(messages, files, agent_mode, render_mode, page_state, model, app_files),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
