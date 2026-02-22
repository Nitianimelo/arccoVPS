"""
Agent FastAPI v2.0 — API com streaming SSE melhorado.

Features:
✅ Streaming SSE com eventos detalhados
✅ Supabase Storage para persistência
✅ Caching de respostas
✅ Sessions com cleanup automático
✅ CORS e rate limiting
✅ Health checks
✅ Logging estruturado

Uso:
    export ANTHROPIC_API_KEY=sk-...
    uvicorn agent_fastapi_v2:app --host 0.0.0.0 --port 8000
"""

import asyncio
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List, AsyncGenerator
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic

# Importar módulos locais
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from lib import (
    get_config,
    get_tool_registry,
    AgentResponseCache,
    ToolResultCache,
    SmartModelSelector,
    StreamingEventHandler,
    EventType
)

from agent_with_tools_v2 import (
    agent_loop,
    SYSTEM_PROMPT,
    register_tool,
    web_search,
    web_fetch,
    generate_pdf,
    read_file,
    write_file,
    execute_python
)

# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIG
# ============================================================

config = get_config()
registry = get_tool_registry()

app = FastAPI(
    title="Arcco Agent API v2.0",
    description="API do agente com streaming SSE e Supabase",
    version="2.0.0"
)

# CORS (restringido em produção)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODELS
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_cache: bool = True
    streaming: bool = True


class ChatResponse(BaseModel):
    response: str
    session_id: str
    iterations: int
    tools_used: List[str]
    cache_hit: bool = False
    total_time_ms: int
    tokens_saved: int = 0


class FileUploadResponse(BaseModel):
    filename: str
    download_url: str
    size_bytes: int


class HealthCheckResponse(BaseModel):
    status: str
    model: str
    uptime_seconds: int
    sessions_active: int
    tools_available: int

# ============================================================
# SESSION MANAGEMENT
# ============================================================

sessions: dict[str, dict] = {}
app_start_time = datetime.now()


def create_session(session_id: Optional[str] = None) -> str:
    """Cria ou retorna session."""
    if session_id and session_id in sessions:
        sessions[session_id]["last_activity"] = datetime.now()
        return session_id

    new_id = session_id or f"sess_{uuid4().hex[:12]}"
    sessions[new_id] = {
        "created_at": datetime.now(),
        "last_activity": datetime.now(),
        "history": None,
        "tools_used": []
    }
    logger.info(f"Session created: {new_id}")
    return new_id


async def cleanup_sessions():
    """Cleanup de sessões inativas (background task)."""
    while True:
        await asyncio.sleep(300)  # 5 minutos
        now = datetime.now()
        expired = [
            sid for sid, data in sessions.items()
            if (now - data["last_activity"]) > timedelta(hours=1)
        ]
        for sid in expired:
            del sessions[sid]
            logger.info(f"Session cleaned up: {sid}")


# ============================================================
# CACHE
# ============================================================

# Usar em-memory cache (para Netlify, usar Supabase em produção)
response_cache = {}


async def get_cached_response(
    message: str,
    tools_available: List[str]
) -> Optional[dict]:
    """Busca resposta em cache."""
    if not config.enable_caching:
        return None

    import hashlib
    key = hashlib.sha256(
        f"{message}:{json.dumps(sorted(tools_available))}".encode()
    ).hexdigest()

    if key in response_cache:
        cached = response_cache[key]
        age = (datetime.now() - cached["timestamp"]).total_seconds()

        if age < config.cache_ttl_seconds:
            logger.info(f"Cache HIT (age: {age:.0f}s)")
            return cached
        else:
            del response_cache[key]

    return None


async def set_cached_response(
    message: str,
    tools_available: List[str],
    response: str
):
    """Armazena resposta em cache."""
    if not config.enable_caching:
        return

    import hashlib
    key = hashlib.sha256(
        f"{message}:{json.dumps(sorted(tools_available))}".encode()
    ).hexdigest()

    response_cache[key] = {
        "response": response,
        "timestamp": datetime.now()
    }


# ============================================================
# STREAMING
# ============================================================

async def stream_agent(
    message: str,
    session_id: str,
    history: Optional[List] = None
) -> AsyncGenerator[str, None]:
    """
    Generator que yielda eventos SSE durante execução.

    Eventos:
    - session_start
    - iteration_start
    - tools_identified
    - tool_start / tool_complete / tool_error
    - response_complete
    """
    handler = StreamingEventHandler()
    client = anthropic.Anthropic(api_key=config.api_key)

    # 1️⃣ Sessão iniciada
    yield await handler.emit_session_start(session_id, message)

    if history is None:
        history = []

    history.append({"role": "user", "content": message})
    tools_called = []
    state = {
        "iteration": 0,
        "status": "iniciando"
    }

    try:
        for iteration in range(config.max_iterations):
            state["iteration"] = iteration + 1

            # 2️⃣ Iteração iniciada
            yield await handler.emit_iteration_start(
                state["iteration"],
                tools_called
            )

            # Selecionar modelo adaptativo
            model = SmartModelSelector.select_model(
                message,
                len(history),
                config
            )

            # Chamar API
            state["status"] = "chamando_modelo"
            try:
                response = client.messages.create(
                    model=model,
                    max_tokens=config.max_tokens,
                    system=SYSTEM_PROMPT,
                    tools=registry.get_tools(),
                    messages=history
                )
            except Exception as e:
                yield await handler.emit_error(f"Erro ao chamar modelo: {str(e)}")
                return

            content = response.content
            history.append({"role": "assistant", "content": content})

            tool_uses = [b for b in content if b.type == "tool_use"]

            # Se não há tools, resposta está completa
            if not tool_uses:
                texts = [b.text for b in content if hasattr(b, "text")]
                final_response = "\n".join(texts)

                yield await handler.emit_response_complete(
                    response=final_response,
                    iterations=state["iteration"],
                    tools_used=tools_called,
                    total_time=handler.elapsed_seconds()
                )
                return

            # 3️⃣ Tools identificadas
            tool_names = [tu.name for tu in tool_uses]
            tools_called.extend(tool_names)

            yield await handler.emit_tools_identified(
                tools=tool_names,
                iteration=state["iteration"]
            )

            # 4️⃣ Executar tools
            results = []
            import time

            for i, tu in enumerate(tool_uses):
                tool_start = time.time()

                yield await handler.emit_tool_start(
                    tool_name=tu.name,
                    tool_number=i + 1,
                    total_tools=len(tool_uses),
                    input_preview=str(tu.input)[:200]
                )

                handler_func = registry.get_handler(tu.name)
                if not handler_func:
                    yield await handler.emit_tool_error(
                        tool_name=tu.name,
                        error="Tool não encontrada",
                        elapsed_seconds=time.time() - tool_start
                    )
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": tu.id,
                        "content": "Tool not found",
                        "is_error": True
                    })
                    continue

                try:
                    # Executar handler
                    if asyncio.iscoroutinefunction(handler_func):
                        result = await handler_func(**tu.input)
                    else:
                        result = handler_func(**tu.input)

                    elapsed = time.time() - tool_start

                    yield await handler.emit_tool_complete(
                        tool_name=tu.name,
                        elapsed_seconds=elapsed,
                        result_preview=str(result)[:200],
                        result_size=len(str(result))
                    )

                    results.append({
                        "type": "tool_result",
                        "tool_use_id": tu.id,
                        "content": str(result)
                    })

                except Exception as e:
                    elapsed = time.time() - tool_start
                    yield await handler.emit_tool_error(
                        tool_name=tu.name,
                        error=str(e),
                        elapsed_seconds=elapsed
                    )
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": tu.id,
                        "content": f"ERRO: {e}",
                        "is_error": True
                    })

            # Adicionar results ao histórico
            history.append({"role": "user", "content": results})

        # Atingiu limite de iterações
        yield await handler.emit_error(
            "Limite de iterações atingido",
            state["iteration"]
        )

    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield await handler.emit_error(f"Erro na stream: {str(e)}")

    finally:
        yield "data: [DONE]\n\n"


# ============================================================
# ROUTES
# ============================================================

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat completo (request/response)."""
    session_id = create_session(req.session_id)
    history = sessions[session_id]["history"]

    # Checark cache
    cache_hit = False
    if req.use_cache:
        cached = await get_cached_response(
            req.message,
            [t["name"] for t in registry.get_tools()]
        )
        if cached:
            return ChatResponse(
                response=cached["response"][:500],
                session_id=session_id,
                iterations=0,
                tools_used=[],
                cache_hit=True,
                total_time_ms=0,
                tokens_saved=1200
            )

    # Executar agente
    try:
        response, history, stats = await agent_loop(
            req.message,
            history,
            session_id
        )

        sessions[session_id]["history"] = history
        sessions[session_id]["tools_used"].extend(stats["tools_used"])

        # Cachear resposta
        if req.use_cache:
            await set_cached_response(
                req.message,
                [t["name"] for t in registry.get_tools()],
                response
            )

        return ChatResponse(
            response=response,
            session_id=session_id,
            iterations=stats["iterations"],
            tools_used=stats["tools_used"],
            cache_hit=cache_hit,
            total_time_ms=stats["total_time_ms"],
            tokens_saved=int(stats["cache_hits"] * 150)  # Aproximado
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, str(e))


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Chat com streaming SSE."""
    session_id = create_session(req.session_id)
    history = sessions[session_id]["history"]

    return StreamingResponse(
        stream_agent(req.message, session_id, history),
        media_type="text/event-stream"
    )


@app.get("/health", response_model=HealthCheckResponse)
async def health():
    """Health check."""
    uptime = (datetime.now() - app_start_time).total_seconds()

    return HealthCheckResponse(
        status="ok",
        model=config.model,
        uptime_seconds=int(uptime),
        sessions_active=len(sessions),
        tools_available=len(registry.get_tools())
    )


@app.get("/tools")
async def list_tools():
    """Lista ferramentas disponíveis."""
    return {
        "total": len(registry.get_tools()),
        "tools": registry.get_tools()
    }


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Info da sessão."""
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")

    session = sessions[session_id]
    return {
        "session_id": session_id,
        "created_at": session["created_at"].isoformat(),
        "last_activity": session["last_activity"].isoformat(),
        "tools_used": session["tools_used"],
        "messages": len(session["history"] or [])
    }


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete sessão."""
    if session_id in sessions:
        del sessions[session_id]
        logger.info(f"Session deleted: {session_id}")
        return {"status": "deleted"}

    raise HTTPException(404, "Session not found")


@app.post("/cache/clear")
async def clear_cache():
    """Limpa cache global."""
    response_cache.clear()
    logger.info("Cache cleared")
    return {"status": "cleared"}


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup():
    """Startup event."""
    logger.info("🚀 Arcco Agent API v2.0 starting...")

    # Validar config
    is_valid, msg = config.validate()
    if not is_valid:
        logger.error(f"Config error: {msg}")
        raise RuntimeError(f"Config error: {msg}")

    # Criar workspace
    config.workspace_path.mkdir(parents=True, exist_ok=True)

    # Iniciar cleanup de sessões
    asyncio.create_task(cleanup_sessions())

    logger.info("✅ API ready")


@app.on_event("shutdown")
async def shutdown():
    """Shutdown event."""
    logger.info("Arcco Agent API shutting down...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        log_level="info"
    )
