"""
Endpoint de builder de páginas — SSE streaming com agente Python robusto.
Suporta dois modos de operação:
1. Legacy/Code Mode: Manipulação de arquivos HTML/CSS/JS brutos.
2. Design Mode (AST): Manipulação de estrutura de dados JSON (PageAST) com componentes atômicos.
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


async def builder_stream(
    messages: list,
    files: list[dict],
    agent_mode: str,
    render_mode: str,
    page_state: Optional[Dict[str, Any]],
    model: str,
) -> AsyncGenerator[str, None]:
    """
    Loop do agente builder com SSE.
    Suporta AST Mode e Code Mode.
    """
    config = get_config()
    MAX_ITERATIONS = 8

    # Seleciona System Prompt e Contexto baseado no modo
    if render_mode == "ast":
        base_system = registry.get_prompt("pages_ux")
        if not base_system:
            logger.warning("[Builder] Fallback: PAGES_UX custom prompt não encontrado.")
            base_system = "Você é um Arquiteto de UI especializado em construir landing pages modernas usando AST. Gere JSON patches."
        model_to_use = model or registry.get_model("pages_ux") or config.openrouter_model
    else:
        base_system = registry.get_prompt("pages_dev")
        if not base_system:
            logger.warning("[Builder] Fallback: PAGES_DEV custom prompt não encontrado.")
            base_system = "Você é um desenvolvedor frontend focado em landing pages. Escreva código HTML/CSS válido. Retorne JSON."
        model_to_use = model or registry.get_model("pages_dev") or config.openrouter_model

    project_context = build_context_message(files, agent_mode, render_mode, page_state)
    
    full_system = base_system
    if project_context:
        full_system += f"\\n\\n---\\n{project_context}"

    # Monta histórico de mensagens
    current_messages = [{"role": "system", "content": full_system}]
    for msg in messages:
        if isinstance(msg, dict):
            current_messages.append(msg)
        else:
            current_messages.append(msg.model_dump())

    iteration = 0

    try:
        yield sse_event("steps", f"<step>🚀 Agente builder iniciado ({render_mode.upper()})...</step>")

        while iteration < MAX_ITERATIONS:
            iteration += 1
            yield sse_event("steps", f"<step>🤔 Pensando (iteração {iteration})...</step>")

            try:
                data = await call_openrouter(
                    messages=current_messages,
                    model=model_to_use,
                    max_tokens=16000,
                    tools=BUILDER_TOOLS,
                )
            except Exception as outer_err:
                logger.error(f"Erro na comunicação com LLM (OpenRouter HTTP exc): {outer_err}", exc_info=True)
                yield sse_event("error", f"Falha de conexão com a IA: {outer_err}")
                return

            if data.get("error"):
                logger.error(f"Erro formatado retornado pela OpenRouter: {data['error']}")
                yield sse_event("error", json.dumps(data["error"]))
                return

            message = data["choices"][0]["message"]
            current_messages.append(message)

            # Se há tool calls, executa-os
            if message.get("tool_calls"):
                tool_names = [t["function"]["name"] for t in message["tool_calls"]]
                yield sse_event("steps", f"<step>🔧 Usando ferramentas: {', '.join(tool_names)}</step>")

                for tool in message["tool_calls"]:
                    func_name = tool["function"]["name"]
                    func_args = json.loads(tool["function"]["arguments"])

                    yield sse_event("steps", f"<step>⚡ Executando {func_name}...</step>")

                    try:
                        result = await execute_builder_tool(func_name, func_args)
                    except Exception as e:
                        result = f"Erro: {e}"
                        yield sse_event("steps", f"<step>⚠️ Erro em {func_name}: {e}</step>")

                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": result,
                    })
                    yield sse_event("steps", f"<step>✅ {func_name} concluído.</step>")

                # Continua o loop para o LLM gerar a resposta final
                continue

            # Sem tool calls — esta é a resposta final
            final_content = (message.get("content") or "").strip()

            if not final_content:
                yield sse_event("error", "Resposta vazia do agente.")
                return

            # Tenta extrair JSON de actions (genérico, serve para AST ou File)
            actions_json = _extract_json_response(final_content)

            if actions_json:
                action_count = 0
                if "actions" in actions_json:
                    action_count = len(actions_json["actions"])
                    yield sse_event("steps", f"<step>✅ {action_count} arquivos gerados.</step>")
                elif "ast_actions" in actions_json:
                    action_count = len(actions_json["ast_actions"])
                    yield sse_event("steps", f"<step>✨ {action_count} alterações de design aplicadas.</step>")
                
                yield sse_event("actions", json.dumps(actions_json))
            else:
                # Resposta de texto (pergunta/clarificação)
                yield sse_event("steps", "<step>💬 Resposta textual.</step>")
                yield sse_event("chunk", final_content)

            return

        yield sse_event("error", "Limite de iterações atingido.")

    except Exception as e:
        logger.error(f"Builder stream error: {e}", exc_info=True)
        yield sse_event("error", str(e))


def _extract_json_response(text: str) -> dict | None:
    """Tenta extrair JSON da resposta (suporta 'actions' e 'ast_actions')."""
    
    # Tentativa 1: JSON Parse direto
    try:
        parsed = json.loads(text)
        if _is_valid_action_response(parsed):
            return parsed
    except json.JSONDecodeError:
        pass

    # Tentativa 2: Bloco Markdown ```json ... ```
    block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if block_match:
        try:
            parsed = json.loads(block_match.group(1).strip())
            if _is_valid_action_response(parsed):
                return parsed
        except json.JSONDecodeError:
            pass

    # Tentativa 3: Buscar { ... } no texto
    # Heurística: procurar chaves que contenham "actions" ou "ast_actions"
    
    for key in ['"actions"', '"ast_actions"']:
        pos = text.find(key)
        if pos != -1:
            # Encontrar abertura de chave anterior
            start = text.rfind('{', 0, pos)
            if start != -1:
                 # Tentar extrair objeto balanceado (simplificado, pode ser melhorado se precisar)
                 # Vou usar uma abordagem iterativa de balanceamento de chaves {}
                balance = 0
                for i in range(start, len(text)):
                    if text[i] == '{':
                        balance += 1
                    elif text[i] == '}':
                        balance -= 1
                        if balance == 0:
                            try:
                                candidate = text[start:i+1]
                                parsed = json.loads(candidate)
                                if _is_valid_action_response(parsed):
                                    return parsed
                            except:
                                pass
                            break
    return None

def _is_valid_action_response(data: Any) -> bool:
    if not isinstance(data, dict):
        return False
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


@router.post("/chat")
async def builder_chat_endpoint(request: Request):
    """
    POST /api/builder/chat
    SSE streaming para o agente builder de páginas.
    """
    body = await request.json()
    messages = body.get("messages", [])
    files = body.get("files", [])
    agent_mode = body.get("agentMode", "creation")
    render_mode = body.get("renderMode", "iframe") # 'ast' ou 'iframe'
    page_state = body.get("pageState") # Dict com AST
    model = body.get("model", "anthropic/claude-3.5-sonnet")

    return StreamingResponse(
        builder_stream(messages, files, agent_mode, render_mode, page_state, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
