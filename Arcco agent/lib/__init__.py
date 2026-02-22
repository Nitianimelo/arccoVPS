"""
Arcco Agent - Biblioteca de módulos compartilhados.

Módulos:
- config: Configuração centralizada
- supabase_manager: Persistência de arquivos e sessões
- agent_cache: Cache de respostas inteligente
- document_parser: Parser robusto para Netlify
- streaming_handler: Eventos SSE em tempo real
- agent_tools_registry: Registry centralizado de tools
"""

from .config import get_config, AgentConfig, reload_config
from .agent_tools_registry import (
    get_tool_registry,
    register_tool,
    ToolRegistry,
    SmartModelSelector
)
from .document_parser import RobustDocumentParser, MarkdownDocumentParser
from .streaming_handler import StreamingEventHandler, StreamGenerator, EventType
from .agent_cache import AgentResponseCache, ToolResultCache
from .supabase_manager import SupabaseFileManager, SupabaseSessionManager

__version__ = "2.0.0"
__all__ = [
    "get_config",
    "AgentConfig",
    "reload_config",
    "get_tool_registry",
    "register_tool",
    "ToolRegistry",
    "SmartModelSelector",
    "RobustDocumentParser",
    "MarkdownDocumentParser",
    "StreamingEventHandler",
    "StreamGenerator",
    "EventType",
    "AgentResponseCache",
    "ToolResultCache",
    "SupabaseFileManager",
    "SupabaseSessionManager",
]
