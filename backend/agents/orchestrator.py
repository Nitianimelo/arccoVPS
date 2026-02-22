"""
Orquestrador Multi-Agente do Arcco.

Fluxo de execução:
  1. Roteamento por keywords (zero LLM calls) — rápido
  2. Roteamento por LLM Orquestrador — para casos ambíguos
  3. Especialista executa (apenas com suas ferramentas específicas)
  4. QA revisa a saída (máximo 2 tentativas de correção)
  5. Resposta final enviada ao usuário via SSE

Chat Normal (route='chat') → streaming direto, sem ferramentas, sem QA.
Modo Agente (qualquer outra rota) → Especialista + QA.
"""

import json
import logging
import re
from typing import AsyncGenerator

from backend.core.llm import call_openrouter, stream_openrouter
from backend.agents.prompts import (
    ORCHESTRATOR_SYSTEM_PROMPT,
    CHAT_SYSTEM_PROMPT,
    WEB_SEARCH_SYSTEM_PROMPT,
    FILE_GENERATOR_SYSTEM_PROMPT,
    DESIGN_SYSTEM_PROMPT,
    DEV_SYSTEM_PROMPT,
    QA_SYSTEM_PROMPT,
)
from backend.agents.tools import WEB_SEARCH_TOOLS, FILE_GENERATOR_TOOLS
from backend.agents.executor import execute_tool

logger = logging.getLogger(__name__)

# ── Utilitários SSE ──────────────────────────────────────────────────────────

def sse(event_type: str, content: str) -> str:
    return f'data: {{"type": "{event_type}", "content": {json.dumps(content)}}}\n\n'


# ── Roteamento por Keywords (zero tokens) ────────────────────────────────────

_KEYWORD_ROUTES = {
    "web_search": re.compile(
        r"\b(pesquis|busc|procur|search|google|internet|notícia|atual|recente|"
        r"quem é|o que é|como está|quando foi|onde fica|qual é)\w*",
        re.IGNORECASE,
    ),
    "file_generator": re.compile(
        r"\b(ger[ae]|cri[ae]|faz|produz|mont[ae])\w*\s+"
        r"(pdf|excel|planilha|relatório|xlsx|spreadsheet|documento|tabela)",
        re.IGNORECASE,
    ),
    "design": re.compile(
        r"\b(post|banner|carrossel|arte|design gráfico|instagram|stories|"
        r"flyer|capa|thumbnail|identidade visual)\b",
        re.IGNORECASE,
    ),
    "dev": re.compile(
        r"\b(landing page|site|página web|html|css|javascript|frontend|"
        r"página de vendas|página de captura)\b",
        re.IGNORECASE,
    ),
}


def _keyword_route(messages: list) -> str | None:
    """Roteamento instantâneo por palavras-chave. Retorna None se ambíguo."""
    last_user = next(
        (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
    )
    for route, pattern in _KEYWORD_ROUTES.items():
        if pattern.search(str(last_user)):
            return route
    return None


# ── Orquestrador LLM ─────────────────────────────────────────────────────────

async def _llm_orchestrate(messages: list, model: str) -> dict:
    """Chama o LLM para determinar a rota. Fallback para 'chat'."""
    try:
        data = await call_openrouter(
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                *messages[-3:],  # Contexto: últimas 3 mensagens
            ],
            model=model,
            max_tokens=150,
            temperature=0.1,
        )
        raw = data["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[ORCHESTRATOR] Falha no roteamento LLM: {e}")
        return {"route": "chat", "user_intent": "conversa geral"}


# ── Agente QA ────────────────────────────────────────────────────────────────

async def _qa_review(
    user_intent: str, specialist_response: str, route: str, model: str
) -> dict:
    """Revisa a resposta do especialista. Retorna {approved, issues, correction_instruction}."""
    try:
        review_prompt = (
            f"Pedido original: {user_intent}\n"
            f"Tipo esperado: {route}\n\n"
            f"Resposta do especialista:\n{specialist_response[:3000]}"
        )
        data = await call_openrouter(
            messages=[
                {"role": "system", "content": QA_SYSTEM_PROMPT},
                {"role": "user", "content": review_prompt},
            ],
            model=model,
            max_tokens=300,
            temperature=0.1,
        )
        raw = data["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[QA] Erro na revisão: {e}")
        return {"approved": True, "issues": []}  # Fail-open


# ── Loops dos Especialistas ───────────────────────────────────────────────────

async def _run_chat_streaming(messages: list, model: str) -> AsyncGenerator[str, None]:
    """Chat Normal: streaming direto, sem ferramentas."""
    current = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}, *messages]
    async for chunk_data in stream_openrouter(messages=current, model=model, max_tokens=2048):
        choices = chunk_data.get("choices", [])
        if not choices:
            continue
        delta = choices[0].get("delta", {})
        if delta.get("content"):
            yield sse("chunk", delta["content"])


async def _run_specialist_with_tools(
    messages: list,
    model: str,
    system_prompt: str,
    tools: list,
    max_iterations: int = 5,
) -> str:
    """Executa especialista com ferramentas. Retorna resposta final como string."""
    current = [{"role": "system", "content": system_prompt}, *messages]

    for _ in range(max_iterations):
        data = await call_openrouter(
            messages=current,
            model=model,
            max_tokens=4096,
            tools=tools if tools else None,
        )
        message = data["choices"][0]["message"]
        current.append(message)

        if message.get("tool_calls"):
            for tool in message["tool_calls"]:
                func_name = tool["function"]["name"]
                try:
                    func_args = json.loads(tool["function"]["arguments"])
                except json.JSONDecodeError:
                    func_args = {}

                result = await execute_tool(func_name, func_args)
                current.append({
                    "role": "tool",
                    "tool_call_id": tool["id"],
                    "content": result,
                })
        else:
            return message.get("content", "")

    return "Limite de iterações atingido."


async def _run_specialist_no_tools(
    messages: list, model: str, system_prompt: str, max_tokens: int = 4096
) -> str:
    """Especialista sem ferramentas (Design, Dev). Retorna resposta como string."""
    current = [{"role": "system", "content": system_prompt}, *messages]
    data = await call_openrouter(messages=current, model=model, max_tokens=max_tokens)
    return data["choices"][0]["message"].get("content", "")


# ── Pipeline Principal ────────────────────────────────────────────────────────

async def orchestrate_and_stream(
    messages: list,
    model: str,
) -> AsyncGenerator[str, None]:
    """
    Pipeline Orquestrador → Especialista → QA → Usuário.

    Chat Normal (route='chat'): streaming direto, sem ferramentas, sem QA.
    Modo Agente (outra rota)  : Especialista + QA (máx 2 correções).
    """
    # ── 1. Roteamento ─────────────────────────────────────────────────────────
    route = _keyword_route(messages)
    user_intent = next(
        (str(m["content"]) for m in reversed(messages) if m.get("role") == "user"), ""
    )

    if route:
        yield sse("steps", f"<step>🧭 Rota identificada: {route}</step>")
    else:
        yield sse("steps", "<step>🧭 Orquestrador analisando pedido...</step>")
        routing = await _llm_orchestrate(messages, model)
        route = routing.get("route", "chat")
        user_intent = routing.get("user_intent", user_intent)
        yield sse("steps", f"<step>🎯 Especialista selecionado: {route} — {user_intent}</step>")

    # ── 2. Chat Normal → streaming direto ─────────────────────────────────────
    if route == "chat":
        async for event in _run_chat_streaming(messages, model):
            yield event
        return

    # ── 3. Modo Agente → Especialista + QA ────────────────────────────────────
    _SPECIALIST_LABELS = {
        "web_search": "🔍 Agente de Busca Web",
        "file_generator": "📄 Agente Gerador de Arquivos",
        "design": "🎨 Agente de Design Gráfico",
        "dev": "💻 Agente Dev (Arcco Pages)",
    }

    MAX_QA_RETRIES = 2
    specialist_response = ""
    current_messages = list(messages)

    for attempt in range(MAX_QA_RETRIES + 1):
        label = _SPECIALIST_LABELS.get(route, route)

        if attempt == 0:
            yield sse("steps", f"<step>{label} iniciado...</step>")
        else:
            yield sse("steps", f"<step>🔄 QA solicitou correção — tentativa {attempt + 1}</step>")

        # Executar especialista
        try:
            if route == "web_search":
                yield sse("action", "Pesquisando na internet...")
                specialist_response = await _run_specialist_with_tools(
                    current_messages, model, WEB_SEARCH_SYSTEM_PROMPT, WEB_SEARCH_TOOLS
                )
            elif route == "file_generator":
                yield sse("action", "Gerando arquivo...")
                specialist_response = await _run_specialist_with_tools(
                    current_messages, model, FILE_GENERATOR_SYSTEM_PROMPT, FILE_GENERATOR_TOOLS
                )
            elif route == "design":
                specialist_response = await _run_specialist_no_tools(
                    current_messages, model, DESIGN_SYSTEM_PROMPT, max_tokens=3000
                )
            elif route == "dev":
                specialist_response = await _run_specialist_no_tools(
                    current_messages, model, DEV_SYSTEM_PROMPT, max_tokens=6000
                )
            else:
                # Rota desconhecida → fallback para chat
                async for event in _run_chat_streaming(messages, model):
                    yield event
                return

        except Exception as e:
            yield sse("error", f"Erro no especialista {route}: {e}")
            return

        # ── 4. QA Review ──────────────────────────────────────────────────────
        yield sse("steps", "<step>✅ QA revisando resposta...</step>")
        qa_result = await _qa_review(user_intent, specialist_response, route, model)

        if qa_result.get("approved", True):
            break

        if attempt < MAX_QA_RETRIES:
            issues = ", ".join(qa_result.get("issues", []))
            correction = qa_result.get("correction_instruction", "Corrija a resposta.")
            yield sse("steps", f"<step>⚠️ QA reprovado: {issues}</step>")
            # Injeta o feedback do QA para a próxima tentativa do especialista
            current_messages = current_messages + [
                {"role": "assistant", "content": specialist_response},
                {"role": "user", "content": f"[QA Feedback] {correction}"},
            ]
        else:
            yield sse("steps", "<step>⚠️ QA: máximo de tentativas atingido. Enviando melhor versão.</step>")

    # ── 5. Stream da resposta final ───────────────────────────────────────────
    # Envia em chunks para efeito de streaming suave
    words = specialist_response.split(" ")
    CHUNK_SIZE = 6
    for i in range(0, len(words), CHUNK_SIZE):
        chunk = " ".join(words[i : i + CHUNK_SIZE])
        is_last = i + CHUNK_SIZE >= len(words)
        yield sse("chunk", chunk + ("" if is_last else " "))
