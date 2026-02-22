"""
Configuration centralizada para o agente.
Suporta variáveis de ambiente e valores padrão.
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

@dataclass
class AgentConfig:
    """Configuração centralizada do agente."""

    # Anthropic
    api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    model: str = os.getenv("AGENT_MODEL", "claude-sonnet-4-5-20250929")
    model_haiku: str = "claude-haiku-4-5-20251001"
    model_opus: str = "claude-opus-4-6"
    max_tokens: int = int(os.getenv("AGENT_MAX_TOKENS", "8096"))
    max_iterations: int = int(os.getenv("AGENT_MAX_ITERATIONS", "20"))

    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_storage_bucket: str = "agent-files"

    # Agent Behavior
    enable_caching: bool = os.getenv("AGENT_CACHE", "true").lower() == "true"
    cache_ttl_seconds: int = int(os.getenv("AGENT_CACHE_TTL", "86400"))  # 24h
    enable_prompt_cache: bool = os.getenv("AGENT_PROMPT_CACHE", "true").lower() == "true"

    # Parser
    web_timeout: float = float(os.getenv("WEB_TIMEOUT", "20.0"))
    web_max_response_size: int = int(os.getenv("WEB_MAX_SIZE", "2000000"))  # 2MB
    web_max_chars: int = int(os.getenv("WEB_MAX_CHARS", "50000"))  # 50KB

    # Streaming
    stream_enable: bool = os.getenv("STREAM_ENABLE", "true").lower() == "true"
    stream_chunk_size: int = int(os.getenv("STREAM_CHUNK", "1000"))

    # Workspace
    workspace_path: Path = Path(os.getenv(
        "AGENT_WORKSPACE",
        "/tmp/agent_workspace"
    ))

    # Security
    allow_code_execution: bool = os.getenv("ALLOW_CODE_EXEC", "true").lower() == "true"
    max_code_timeout: float = float(os.getenv("CODE_TIMEOUT", "30.0"))

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_format: str = os.getenv("LOG_FORMAT", "json")  # json ou text

    def validate(self) -> tuple[bool, str]:
        """Valida configuração."""
        if not self.api_key:
            return False, "ANTHROPIC_API_KEY não configurada"

        if self.supabase_url and not self.supabase_key:
            return False, "SUPABASE_KEY faltando quando SUPABASE_URL está configurada"

        if self.web_timeout <= 0:
            return False, "WEB_TIMEOUT deve ser > 0"

        return True, "OK"


# Instância global (singleton)
_config: Optional[AgentConfig] = None

def get_config() -> AgentConfig:
    """Retorna instância única de configuração."""
    global _config
    if _config is None:
        _config = AgentConfig()
        is_valid, msg = _config.validate()
        if not is_valid:
            raise ValueError(f"Configuração inválida: {msg}")
    return _config


def reload_config() -> AgentConfig:
    """Recarrega configuração do ambiente."""
    global _config
    _config = None
    return get_config()
