"""
Registry de configuração dos agentes.

ARQUITETURA DE PERSISTÊNCIA (3 camadas):
  1. Memória (_REGISTRY)       → acesso instantâneo durante a execução
  2. configs_override.json     → sobrevive a restarts do servidor (salvo automaticamente)
  3. prompts.py / tools.py     → mudança permanente no código-fonte (feita via admin.py)

FLUXO DE INICIALIZAÇÃO:
  initialize() → carrega defaults dos arquivos .py → aplica overrides do JSON

IMPORTANTE: os imports de prompts/tools/config ficam DENTRO de initialize()
para evitar importação circular (orchestrator.py também importa registry).
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Arquivo JSON que guarda as customizações feitas pelo admin (model, prompt, tools).
# Fica na mesma pasta deste arquivo: backend/agents/configs_override.json
_OVERRIDE_FILE = Path(__file__).parent / "configs_override.json"

# Dicionário principal: agent_id → configuração completa do agente
_REGISTRY: dict[str, dict[str, Any]] = {}

# Flag para inicialização lazy — evita carregar tudo no import do módulo
_initialized = False


# ── Inicialização ──────────────────────────────────────────────────────────────

def initialize():
    """
    Popula o registry com os valores padrão dos arquivos .py e então
    aplica qualquer override que tenha sido salvo pelo admin.

    Chamado automaticamente no startup do FastAPI (backend/main.py).
    Também pode ser chamado manualmente se necessário.
    """
    global _REGISTRY, _initialized

    # Imports locais para evitar circular: este módulo é importado por orchestrator,
    # e orchestrator é importado por outros módulos que também importam registry.
    from backend.agents.prompts import (
        CHAT_SYSTEM_PROMPT,
        WEB_SEARCH_SYSTEM_PROMPT,
        FILE_GENERATOR_SYSTEM_PROMPT,
        FILE_MODIFIER_SYSTEM_PROMPT,
        DESIGN_SYSTEM_PROMPT,
        DEV_SYSTEM_PROMPT,
        QA_SYSTEM_PROMPT,
        PAGES_UX_SYSTEM_PROMPT,
        PAGES_DEV_SYSTEM_PROMPT,
        PAGES_COPY_SYSTEM_PROMPT,
    )
    from backend.agents.tools import (
        SUPERVISOR_TOOLS,
        WEB_SEARCH_TOOLS,
        FILE_GENERATOR_TOOLS,
        FILE_MODIFIER_TOOLS,
    )
    from backend.core.config import get_config

    default_model = get_config().openrouter_model

    # Configuração padrão de cada agente.
    # "module" agrupa agentes por produto (Arcco Chat, Builder, Pages, Sistema).
    _REGISTRY = {
        "chat": {
            "id": "chat",
            "name": "Arcco Supervisor Especialista",
            "module": "Arcco Chat",
            "description": "Agente principal de conversação e orquestração. Analisa a intenção e delega tarefas complexas para ferramentas/agentes.",
            "system_prompt": CHAT_SYSTEM_PROMPT,
            "model": default_model,
            "tools": SUPERVISOR_TOOLS,
        },

        "web_search": {
            "id": "web_search",
            "name": "Agente de Busca Web",
            "module": "Arcco Chat",
            "description": "Pesquisa informações na internet via Tavily e lê páginas específicas",
            "system_prompt": WEB_SEARCH_SYSTEM_PROMPT,
            "model": default_model,
            "tools": WEB_SEARCH_TOOLS,
        },
        "file_generator": {
            "id": "file_generator",
            "name": "Gerador de Arquivos",
            "module": "Arcco Chat",
            "description": "Cria PDFs, planilhas Excel e apresentações do zero",
            "system_prompt": FILE_GENERATOR_SYSTEM_PROMPT,
            "model": default_model,
            "tools": FILE_GENERATOR_TOOLS,
        },
        "file_modifier": {
            "id": "file_modifier",
            "name": "Modificador de Arquivos",
            "module": "Arcco Chat",
            "description": "Edita arquivos existentes (PDF, Excel, PPTX) conforme solicitação",
            "system_prompt": FILE_MODIFIER_SYSTEM_PROMPT,
            "model": default_model,
            "tools": FILE_MODIFIER_TOOLS,
        },
        "design": {
            "id": "design",
            "name": "Agente de Design",
            "module": "Arcco Builder",
            "description": "Gera posts, banners e artes gráficas como JSON PostAST",
            "system_prompt": DESIGN_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],  # Gera JSON diretamente, sem executar ferramentas externas
        },
        "pages_ux": {
            "id": "pages_ux",
            "name": "Arcco Pages Arquiteto (UX)",
            "module": "Arcco Pages",
            "description": "Monta a estrutura (AST) de landing pages de alta conversão.",
            "system_prompt": PAGES_UX_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],
        },
        "pages_dev": {
            "id": "pages_dev",
            "name": "Arcco Pages Dev",
            "module": "Arcco Pages",
            "description": "Gera arquivos estáticos HTML/CSS/JS (Modo Código/Legacy).",
            "system_prompt": PAGES_DEV_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],
        },
        "pages_copy": {
            "id": "pages_copy",
            "name": "Arcco Pages Copywriter",
            "module": "Arcco Pages",
            "description": "Cria textos persuasivos de resposta direta para os blocos da página.",
            "system_prompt": PAGES_COPY_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],
        },
        "dev": {
            "id": "dev",
            "name": "Agente Dev (Geral)",
            "module": "Sistema",
            "description": "Gera código HTML/CSS/JS para landing pages e sites genéricos",
            "system_prompt": DEV_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],  # Gera HTML diretamente, sem ferramentas
        },
        "qa": {
            "id": "qa",
            "name": "Agente QA",
            "module": "Sistema",
            "description": "Revisa e aprova a qualidade das respostas dos especialistas",
            "system_prompt": QA_SYSTEM_PROMPT,
            "model": default_model,
            "tools": [],
        },
    }

    # Aplica overrides persistidos (customizações salvas pelo admin)
    _apply_overrides()
    _initialized = True
    logger.info(f"[REGISTRY] Inicializado com {len(_REGISTRY)} agentes")


def _ensure_initialized():
    """Garante que o registry foi inicializado antes de qualquer leitura."""
    if not _initialized:
        initialize()


def _apply_overrides():
    """
    Lê configs_override.json e sobrescreve os valores padrão com as
    customizações salvas pelo admin. Falha silenciosamente se o arquivo
    não existir ou estiver corrompido.
    """
    if not _OVERRIDE_FILE.exists():
        return
    try:
        overrides = json.loads(_OVERRIDE_FILE.read_text(encoding="utf-8"))
        for agent_id, data in overrides.items():
            if agent_id in _REGISTRY:
                _REGISTRY[agent_id].update(data)
        logger.info(f"[REGISTRY] Overrides aplicados: {list(overrides.keys())}")
    except Exception as e:
        logger.warning(f"[REGISTRY] Falha ao carregar overrides: {e}")


def _save_overrides():
    """
    Persiste o estado atual de todos os agentes em configs_override.json.
    Chamado sempre que update_agent() é usado, garantindo que mudanças
    sobrevivam ao restart do servidor.

    Nota: o model e o prompt também são escritos nos arquivos .py
    pelo admin.py via regex/AST. Este JSON serve de backup em memória.
    """
    try:
        overrides = {
            agent_id: {
                "system_prompt": agent["system_prompt"],
                "model": agent["model"],
                "tools": agent["tools"],
            }
            for agent_id, agent in _REGISTRY.items()
        }
        _OVERRIDE_FILE.write_text(
            json.dumps(overrides, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except Exception as e:
        logger.error(f"[REGISTRY] Falha ao salvar overrides: {e}")


# ── API Pública ────────────────────────────────────────────────────────────────
# Funções usadas pelo orchestrator.py e pelos endpoints de admin.

def get_all() -> list[dict]:
    """Retorna lista com a configuração atual de todos os agentes."""
    _ensure_initialized()
    return list(_REGISTRY.values())


def get_agent(agent_id: str) -> dict | None:
    """Retorna a configuração de um agente específico, ou None se não existir."""
    _ensure_initialized()
    return _REGISTRY.get(agent_id)


def get_prompt(agent_id: str) -> str:
    """Retorna o system prompt atual do agente (padrão ou customizado pelo admin)."""
    _ensure_initialized()
    agent = _REGISTRY.get(agent_id)
    return agent["system_prompt"] if agent else ""


def get_model(agent_id: str) -> str:
    """
    Retorna o modelo configurado para o agente.
    Fallback para o modelo padrão do .env se não houver override.
    """
    _ensure_initialized()
    agent = _REGISTRY.get(agent_id)
    if agent and agent.get("model"):
        return agent["model"]
    from backend.core.config import get_config
    return get_config().openrouter_model


def get_tools(agent_id: str) -> list:
    """Retorna a lista de tools do agente (formato OpenRouter/OpenAI)."""
    _ensure_initialized()
    agent = _REGISTRY.get(agent_id)
    return agent.get("tools", []) if agent else []


def update_agent(agent_id: str, data: dict) -> bool:
    """
    Atualiza campos de um agente em memória e persiste no JSON override.

    Nota: este método NÃO reescreve os arquivos .py — isso é feito
    separadamente pelo admin.py antes de chamar este método.

    Retorna False se o agent_id não existir.
    """
    _ensure_initialized()
    if agent_id not in _REGISTRY:
        return False
    _REGISTRY[agent_id].update(data)
    _save_overrides()
    logger.info(f"[REGISTRY] Agente '{agent_id}' atualizado e persistido")
    return True
