"""
Agent FastAPI — API web com streaming via SSE.

Expõe o agente como API HTTP com:
- POST /chat — Resposta completa (request/response)
- POST /chat/stream — Streaming via Server-Sent Events
- GET /files/{filename} — Download de arquivos gerados
- GET /health — Health check

Requisitos:
    pip install fastapi uvicorn anthropic httpx beautifulsoup4 reportlab python-docx openpyxl

Uso:
    export ANTHROPIC_API_KEY=sk-...
    uvicorn agent_fastapi:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import json
import os
from pathlib import Path
from datetime import datetime

# Import tools do agent_with_tools (ou copie as tools que precisa)
# Para produção, extraia as tools para um módulo separado

app = FastAPI(title="Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrinja em produção
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# CONFIG
# ============================================================

MODEL = "claude-sonnet-4-5-20250514"
MAX_TOKENS = 8096
MAX_ITERATIONS = 20
WORKSPACE = Path("/tmp/agent_workspace")
WORKSPACE.mkdir(parents=True, exist_ok=True)

SYSTEM_PROMPT = """Você é um agente autônomo com acesso a ferramentas.
Use-as para completar tarefas. Seja conciso e direto."""

# Reutilize TOOLS e HANDLERS do agent_with_tools.py
# Para este template, incluímos uma versão simplificada:
TOOLS = []
HANDLERS = {}

# ... (copie as tool definitions de agent_with_tools.py aqui)
# Por brevidade, este template assume que as tools estão importadas


# ============================================================
# MODELS
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tools_used: list[str]
    files_generated: list[str]
    tokens_used: int

# ============================================================
# SESSION MANAGEMENT (in-memory, use Redis em produção)
# ============================================================

sessions: dict[str, list] = {}

def get_or_create_session(session_id: str | None) -> tuple[str, list]:
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]
    new_id = session_id or datetime.now().strftime("%Y%m%d%H%M%S%f")
    sessions[new_id] = []
    return new_id, sessions[new_id]


# ============================================================
# AGENT LOOP
# ============================================================

def run_agent(message: str, history: list) -> tuple[str, list[str], int]:
    """Executa agent loop. Retorna (resposta, tools_usadas, tokens)."""
    client = anthropic.Anthropic()
    history.append({"role": "user", "content": message})
    tools_used = []
    total_tokens = 0

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=history,
        )

        total_tokens += response.usage.input_tokens + response.usage.output_tokens
        content = response.content
        history.append({"role": "assistant", "content": content})

        tool_uses = [b for b in content if b.type == "tool_use"]

        if not tool_uses:
            texts = [b.text for b in content if hasattr(b, "text")]
            return "\n".join(texts), tools_used, total_tokens

        results = []
        for tu in tool_uses:
            tools_used.append(tu.name)
            handler = HANDLERS.get(tu.name)
            if not handler:
                results.append({"type": "tool_result", "tool_use_id": tu.id,
                                "content": f"Tool não encontrada", "is_error": True})
                continue
            try:
                r = handler(**tu.input)
                results.append({"type": "tool_result", "tool_use_id": tu.id, "content": str(r)})
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": tu.id,
                                "content": f"ERRO: {e}", "is_error": True})

        history.append({"role": "user", "content": results})

    return "Limite de iterações atingido.", tools_used, total_tokens


# ============================================================
# STREAMING AGENT
# ============================================================

async def stream_agent(message: str, history: list):
    """Generator que yielda eventos SSE durante execução."""
    client = anthropic.Anthropic()
    history.append({"role": "user", "content": message})

    for iteration in range(MAX_ITERATIONS):
        yield f"data: {json.dumps({'type': 'status', 'content': f'Iteração {iteration + 1}...'})}\n\n"

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=history,
        )

        content = response.content
        history.append({"role": "assistant", "content": content})

        tool_uses = [b for b in content if b.type == "tool_use"]

        if not tool_uses:
            texts = [b.text for b in content if hasattr(b, "text")]
            final = "\n".join(texts)
            yield f"data: {json.dumps({'type': 'response', 'content': final})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Report tool calls
        for tu in tool_uses:
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tu.name, 'input': tu.input})}\n\n"

            handler = HANDLERS.get(tu.name)
            if handler:
                try:
                    r = handler(**tu.input)
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool': tu.name, 'result': str(r)[:200]})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'tool_error', 'tool': tu.name, 'error': str(e)})}\n\n"

        # (simplified — em produção, acumule tool_results como no agent_loop)

    yield f"data: {json.dumps({'type': 'error', 'content': 'Limite de iterações'})}\n\n"
    yield "data: [DONE]\n\n"


# ============================================================
# ROUTES
# ============================================================

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id, history = get_or_create_session(req.session_id)

    response_text, tools_used, tokens = run_agent(req.message, history)

    # Detectar arquivos gerados
    files = [f.name for f in WORKSPACE.iterdir() if f.is_file()]

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        tools_used=tools_used,
        files_generated=files,
        tokens_used=tokens,
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    session_id, history = get_or_create_session(req.session_id)
    return StreamingResponse(
        stream_agent(req.message, history),
        media_type="text/event-stream",
    )


@app.get("/files/{filename}")
async def download_file(filename: str):
    path = (WORKSPACE / filename).resolve()
    if not str(path).startswith(str(WORKSPACE.resolve())):
        raise HTTPException(403, "Acesso negado")
    if not path.exists():
        raise HTTPException(404, "Arquivo não encontrado")
    return FileResponse(path, filename=filename)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL,
        "tools": len(TOOLS),
        "sessions": len(sessions),
        "workspace": str(WORKSPACE),
    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
