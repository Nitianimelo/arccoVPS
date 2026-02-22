"""
Handler para streaming SSE com eventos detalhados.
Melhora UX em tempo real.
"""

import json
import logging
from datetime import datetime
from typing import AsyncGenerator, Dict, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Tipos de evento SSE."""
    SESSION_START = "session_start"
    ITERATION_START = "iteration_start"
    TOOLS_IDENTIFIED = "tools_identified"
    TOOL_START = "tool_start"
    TOOL_COMPLETE = "tool_complete"
    TOOL_ERROR = "tool_error"
    RESPONSE_COMPLETE = "response_complete"
    ERROR = "error"
    PROGRESS = "progress"


class StreamingEventHandler:
    """Handler para eventos de streaming."""

    def __init__(self):
        self.events: List[Dict] = []
        self.start_time = datetime.now()

    def format_sse(self, event_type: str, data: Dict) -> str:
        """Formata evento para SSE."""
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    def elapsed_seconds(self) -> float:
        """Retorna segundos decorridos."""
        return (datetime.now() - self.start_time).total_seconds()

    async def emit_session_start(
        self,
        session_id: str,
        message: str
    ) -> str:
        """Emite evento de início de sessão."""
        event = {
            "session_id": session_id,
            "message_received": message[:200],
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.SESSION_START, **event})
        logger.info(f"Session started: {session_id}")
        return self.format_sse(EventType.SESSION_START, event)

    async def emit_iteration_start(
        self,
        iteration: int,
        tools_so_far: List[str]
    ) -> str:
        """Emite evento de início de iteração."""
        event = {
            "iteration": iteration,
            "elapsed_seconds": round(self.elapsed_seconds(), 2),
            "tools_so_far": tools_so_far
        }
        self.events.append({"type": EventType.ITERATION_START, **event})
        logger.debug(f"Iteration {iteration} started")
        return self.format_sse(EventType.ITERATION_START, event)

    async def emit_tools_identified(
        self,
        tools: List[str],
        iteration: int
    ) -> str:
        """Emite evento quando tools são identificadas."""
        event = {
            "tools": tools,
            "iteration": iteration,
            "count": len(tools),
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.TOOLS_IDENTIFIED, **event})
        logger.info(f"Tools identified: {', '.join(tools)}")
        return self.format_sse(EventType.TOOLS_IDENTIFIED, event)

    async def emit_tool_start(
        self,
        tool_name: str,
        tool_number: int,
        total_tools: int,
        input_preview: str
    ) -> str:
        """Emite evento de início de execução de tool."""
        event = {
            "tool": tool_name,
            "tool_number": tool_number,
            "total_tools": total_tools,
            "input_preview": input_preview[:200],
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.TOOL_START, **event})
        logger.info(f"Tool starting: {tool_name}")
        return self.format_sse(EventType.TOOL_START, event)

    async def emit_tool_complete(
        self,
        tool_name: str,
        elapsed_seconds: float,
        result_preview: str,
        result_size: int
    ) -> str:
        """Emite evento de conclusão de tool."""
        event = {
            "tool": tool_name,
            "elapsed_seconds": round(elapsed_seconds, 2),
            "result_preview": result_preview[:200],
            "result_size_chars": result_size,
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.TOOL_COMPLETE, **event})
        logger.info(
            f"Tool completed: {tool_name} "
            f"({result_size} chars in {elapsed_seconds:.2f}s)"
        )
        return self.format_sse(EventType.TOOL_COMPLETE, event)

    async def emit_tool_error(
        self,
        tool_name: str,
        error: str,
        elapsed_seconds: float
    ) -> str:
        """Emite evento de erro em tool."""
        event = {
            "tool": tool_name,
            "error": error[:300],
            "elapsed_seconds": round(elapsed_seconds, 2),
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.TOOL_ERROR, **event})
        logger.error(f"Tool error: {tool_name} - {error}")
        return self.format_sse(EventType.TOOL_ERROR, event)

    async def emit_response_complete(
        self,
        response: str,
        iterations: int,
        tools_used: List[str],
        total_time: float
    ) -> str:
        """Emite evento de conclusão de resposta."""
        event = {
            "response": response[:500],  # Preview
            "response_full_length": len(response),
            "iterations": iterations,
            "tools_used": tools_used,
            "total_tools_count": len(tools_used),
            "elapsed_seconds": round(total_time, 2),
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.RESPONSE_COMPLETE, **event})
        logger.info(
            f"Completed in {iterations} iterations, "
            f"{len(tools_used)} tools used, {total_time:.2f}s total"
        )
        return self.format_sse(EventType.RESPONSE_COMPLETE, event)

    async def emit_error(
        self,
        error: str,
        iteration: Optional[int] = None
    ) -> str:
        """Emite evento de erro geral."""
        event = {
            "error": error[:500],
            "iteration": iteration,
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.ERROR, **event})
        logger.error(f"Agent error: {error}")
        return self.format_sse(EventType.ERROR, event)

    async def emit_progress(
        self,
        status: str,
        progress_percent: int
    ) -> str:
        """Emite evento de progresso."""
        event = {
            "status": status,
            "progress_percent": min(100, max(0, progress_percent)),
            "elapsed_seconds": round(self.elapsed_seconds(), 2),
            "timestamp": datetime.now().isoformat()
        }
        self.events.append({"type": EventType.PROGRESS, **event})
        logger.debug(f"Progress: {progress_percent}% - {status}")
        return self.format_sse(EventType.PROGRESS, event)

    def get_summary(self) -> Dict:
        """Retorna resumo de eventos."""
        return {
            "total_events": len(self.events),
            "total_time_seconds": round(self.elapsed_seconds(), 2),
            "event_types": list(set(e["type"] for e in self.events)),
            "events": self.events
        }


class StreamGenerator:
    """Gerador de stream SSE."""

    @staticmethod
    async def stream_agent_execution(
        agent_loop,
        message: str,
        history: list,
        session_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Generator que yielda eventos SSE durante execução do agente.

        Uso:
            async for chunk in StreamGenerator.stream_agent_execution(...):
                yield chunk
        """
        handler = StreamingEventHandler()
        state = {
            "iteration": 0,
            "tools_called": [],
            "status": "iniciando"
        }

        # 1️⃣ Sessão iniciada
        yield await handler.emit_session_start(session_id, message)

        try:
            for iteration in range(20):  # MAX_ITERATIONS
                state["iteration"] = iteration + 1

                # 2️⃣ Iteração iniciada
                yield await handler.emit_iteration_start(
                    state["iteration"],
                    state["tools_called"]
                )

                # Executar um passo do agente
                # (Isto seria integrado com agent_loop real)
                # Por agora, é um exemplo estrutural

                # Se não há mais tools, resposta completa
                # yield await handler.emit_response_complete(...)

        except Exception as e:
            yield await handler.emit_error(str(e), state["iteration"])

        yield "data: [DONE]\n\n"
