"""
Endpoint de chat — Arquitetura Multi-Agente com Orquestrador.

POST /api/agent/chat
  → Orquestrador analisa a mensagem e determina a rota
  → Especialista executa (apenas com suas ferramentas)
  → QA revisa a saída (máx. 2 tentativas)
  → Resposta final via SSE streaming

Modos:
  Chat Normal  → route 'chat': assistente direto, sem ferramentas, sem QA
  Modo Agente  → route web_search | file_generator | design | dev

NOTA: O system_prompt enviado pelo frontend é IGNORADO intencionalmente.
Os prompts de cada agente estão em backend/agents/prompts.py.
"""

import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from backend.agents.orchestrator import orchestrate_and_stream

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat")
async def chat_endpoint(request: Request):
    """
    Endpoint principal de chat com SSE streaming.
    O Orquestrador determina automaticamente o especialista correto.
    """
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "anthropic/claude-3.5-sonnet")

    return StreamingResponse(
        orchestrate_and_stream(messages, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
