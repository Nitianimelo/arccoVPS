"""
Cache inteligente de respostas do agente.
Economiza tokens e melhora latência.
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class AgentResponseCache:
    """Cache de respostas com TTL."""

    def __init__(self, supabase_client, ttl_seconds: int = 86400):
        """
        Inicializa cache.

        Args:
            supabase_client: Cliente Supabase
            ttl_seconds: Time-to-live em segundos (default: 24h)
        """
        self.client = supabase_client
        self.table = "agent_response_cache"
        self.ttl_seconds = ttl_seconds

    def _hash_query(
        self,
        message: str,
        tools_available: List[str]
    ) -> str:
        """Gera hash determinístico da query."""
        key = f"{message}:{json.dumps(sorted(tools_available))}"
        return hashlib.sha256(key.encode()).hexdigest()

    async def get(
        self,
        message: str,
        tools: List[str]
    ) -> Optional[Dict]:
        """
        Busca resposta em cache.

        Returns:
            Dict com resposta e metadados, ou None se não está em cache/expirou
        """
        try:
            cache_key = self._hash_query(message, tools)

            response = self.client.table(self.table).select(
                "response, created_at, hit_count"
            ).eq("cache_key", cache_key).execute()

            if not response.data:
                return None

            cached = response.data[0]
            age_seconds = (
                datetime.now() - datetime.fromisoformat(cached["created_at"])
            ).total_seconds()

            # Check TTL
            if age_seconds > self.ttl_seconds:
                await self.delete(cache_key)
                return None

            # Incrementar hit count (para analytics)
            self.client.table(self.table).update({
                "hit_count": cached["hit_count"] + 1
            }).eq("cache_key", cache_key).execute()

            logger.info(
                f"Cache HIT for query (age: {age_seconds:.0f}s, "
                f"hits: {cached['hit_count'] + 1})"
            )

            return {
                "response": cached["response"],
                "from_cache": True,
                "age_seconds": age_seconds,
                "hit_count": cached["hit_count"] + 1
            }

        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return None

    async def set(
        self,
        message: str,
        tools: List[str],
        response: str,
        metadata: Optional[dict] = None
    ):
        """
        Armazena resposta em cache.

        Args:
            message: Mensagem do usuário
            tools: Lista de tools disponíveis
            response: Resposta gerada
            metadata: Metadados adicionais
        """
        try:
            cache_key = self._hash_query(message, tools)

            data = {
                "cache_key": cache_key,
                "message": message[:1000],  # Truncar para não explodir DB
                "tools": json.dumps(sorted(tools)),
                "response": response[:10000],  # Truncar resposta longa
                "created_at": datetime.now().isoformat(),
                "hit_count": 0,
                "metadata": json.dumps(metadata or {})
            }

            # Upsert (insert or update)
            self.client.table(self.table).upsert(data).execute()

            logger.info(f"Cache SET for query ({len(response)} chars)")

        except Exception as e:
            logger.error(f"Cache set failed: {e}")

    async def delete(self, cache_key: str):
        """Deleta entrada do cache."""
        try:
            self.client.table(self.table).delete().eq(
                "cache_key", cache_key
            ).execute()

        except Exception as e:
            logger.error(f"Cache delete failed: {e}")

    async def cleanup_expired(self):
        """Remove entradas expiradas."""
        try:
            cutoff = (
                datetime.now() - timedelta(seconds=self.ttl_seconds)
            ).isoformat()

            response = self.client.table(self.table).delete().lt(
                "created_at", cutoff
            ).execute()

            count = len(response.data) if hasattr(response, 'data') else 0
            logger.info(f"Cache cleanup: removed {count} expired entries")

        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")


class ToolResultCache:
    """Cache de resultados de tools individuais."""

    def __init__(self, max_size: int = 1000):
        """In-memory cache para tool results (durante uma sessão)."""
        self.cache: Dict[str, str] = {}
        self.max_size = max_size

    def get_key(self, tool_name: str, tool_input: dict) -> str:
        """Gera cache key para tool call."""
        key = f"{tool_name}:{json.dumps(tool_input, sort_keys=True)}"
        return hashlib.sha256(key.encode()).hexdigest()

    def get(self, tool_name: str, tool_input: dict) -> Optional[str]:
        """Busca resultado de tool em cache."""
        key = self.get_key(tool_name, tool_input)
        if key in self.cache:
            logger.info(f"Tool cache HIT: {tool_name}")
            return self.cache[key]
        return None

    def set(self, tool_name: str, tool_input: dict, result: str):
        """Armazena resultado de tool em cache."""
        key = self.get_key(tool_name, tool_input)

        # Evitar explodir memória
        if len(self.cache) >= self.max_size:
            # Remove entrada mais antiga (simple FIFO)
            self.cache.pop(next(iter(self.cache)))

        self.cache[key] = result
        logger.info(f"Tool cache SET: {tool_name}")

    def clear(self):
        """Limpa cache."""
        self.cache.clear()
