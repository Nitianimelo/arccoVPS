"""
Registry centralizado de ferramentas do agente.
Permite reutilização entre agent_basic, agent_with_tools, agent_fastapi.
"""

import json
import logging
from typing import Dict, Callable, List, Optional, Any

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Registry de ferramentas."""

    def __init__(self):
        self.tools: List[Dict] = []
        self.handlers: Dict[str, Callable] = {}

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: Callable,
        category: str = "general"
    ):
        """
        Registra uma ferramenta.

        Args:
            name: Nome único da ferramenta
            description: Descrição para o modelo
            parameters: Schema dos parâmetros
            handler: Função que executa a ferramenta
            category: Categoria (web, files, code, etc)
        """
        # Construir schema OpenAPI
        required = [
            k for k, v in parameters.items()
            if v.get("required", False)
        ]

        # Remover 'required' do esquema de propriedades
        properties = {
            k: {kk: vv for kk, vv in v.items() if kk != "required"}
            for k, v in parameters.items()
        }

        tool_schema = {
            "name": name,
            "description": description,
            "input_schema": {
                "type": "object",
                "properties": properties,
                "required": required
            },
            "category": category
        }

        self.tools.append(tool_schema)
        self.handlers[name] = handler

        logger.info(f"Tool registered: {name} ({category})")

    def get_tools(self) -> List[Dict]:
        """Retorna lista de tools para API Anthropic."""
        return self.tools

    def get_handler(self, tool_name: str) -> Optional[Callable]:
        """Retorna handler para uma ferramenta."""
        return self.handlers.get(tool_name)

    def execute_tool(
        self,
        tool_name: str,
        tool_input: Dict
    ) -> tuple[str, Optional[str]]:
        """
        Executa uma ferramenta.

        Returns:
            (resultado, erro)
        """
        handler = self.get_handler(tool_name)
        if not handler:
            return "", f"Tool '{tool_name}' not found"

        try:
            result = handler(**tool_input)
            return str(result), None
        except Exception as e:
            logger.error(f"Tool execution error: {tool_name} - {e}")
            return "", str(e)

    def get_tools_by_category(self, category: str) -> List[Dict]:
        """Retorna tools de uma categoria específica."""
        return [t for t in self.tools if t.get("category") == category]

    def list_tools(self) -> str:
        """Retorna lista formatada de tools."""
        by_category = {}
        for tool in self.tools:
            cat = tool.get("category", "general")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(tool["name"])

        result = ["📚 **Ferramentas Disponíveis:**\n"]
        for category, tools in sorted(by_category.items()):
            result.append(f"\n**{category.upper()}**")
            for tool_name in tools:
                result.append(f"  • {tool_name}")

        return "\n".join(result)


# Instância global
_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Retorna instância única do registry."""
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry


def register_tool(
    name: str,
    description: str,
    parameters: Dict,
    category: str = "general"
):
    """Decorator para registrar ferramentas."""
    def decorator(func):
        registry = get_tool_registry()
        registry.register(name, description, parameters, func, category)
        return func
    return decorator


class SmartModelSelector:
    """Seleciona modelo ideal baseado em contexto."""

    @staticmethod
    def select_model(
        message: str,
        history_length: int,
        config
    ) -> str:
        """
        Escolhe entre Haiku, Sonnet, Opus.

        Logic:
        - Haiku: queries simples, <5 iterações (80% mais barato)
        - Sonnet: padrão
        - Opus: queries complexas (5x mais caro)
        """
        # Detectar complexidade
        complexity_indicators = [
            "arquitetura",
            "sistema completo",
            "design pattern",
            "otimização",
            "complexo",
            "refatorar",
            "análise",
            "resumo"
        ]

        message_lower = message.lower()
        word_count = len(message.split())
        is_complex = (
            any(ind in message_lower for ind in complexity_indicators)
            or word_count > 100
            or history_length > 10
        )

        # Detectar simplicidade
        simple_queries = [
            "qual",
            "quando",
            "onde",
            "quem",
            "o que",
            "calcular",
            "horário",
            "data"
        ]

        is_simple = (
            any(q in message_lower for q in simple_queries)
            and word_count < 20
            and history_length < 3
        )

        if is_complex:
            logger.info("Model selected: Opus (complex query)")
            return config.model_opus

        logger.info("Model selected: Sonnet (default)")
        return config.model


class SkillLoader:
    """Carregador de skills como tools."""

    @staticmethod
    def load_skills(registry: ToolRegistry, skills_dir: str = ".agent/skills"):
        """
        Escaneia diretório de skills e registra como tools.
        
        Cada subdiretório em .agent/skills/ deve ter um SKILL.md.
        O nome da pasta vira o nome da tool (ex: 'seo_specialist').
        """
        import os
        from pathlib import Path

        skills_path = Path(os.getcwd()) / skills_dir
        if not skills_path.exists():
            logger.warning(f"Skills directory not found: {skills_path}")
            return

        logger.info(f"Scanning skills in {skills_path}...")

        for item in skills_path.iterdir():
            if item.is_dir():
                skill_name = item.name
                skill_file = item / "SKILL.md"
                
                if skill_file.exists():
                    try:
                        content = skill_file.read_text(encoding="utf-8")
                        # Extrair descrição (primeiras linhas ou frontmatter)
                        description = f"Specialized skill for {skill_name}. Use this to delegate complex tasks related to {skill_name}."
                        
                        # Tentar extrair description do frontmatter (sem yaml dependency)
                        if content.startswith("---"):
                            parts = content.split("---", 2)
                            if len(parts) >= 2:
                                frontmatter = parts[1]
                                for line in frontmatter.splitlines():
                                    if line.strip().startswith("description:"):
                                        description = line.split(":", 1)[1].strip().strip('"').strip("'")
                                        break

                        # Factory para criar closure correto
                        def create_skill_handler(path_to_skill):
                            def handler(instruction: str):
                                """
                                Reads the skill definition request.
                                """
                                return f"SKILL LOADED: {path_to_skill}\nCONTENT:\n{Path(path_to_skill).read_text(encoding='utf-8')}\n\nINSTRUCTION: {instruction}"
                            return handler

                        registry.register(
                            name=f"skill_{skill_name.replace('-', '_')}",
                            description=f"Delegate task to {skill_name} specialist. {description}",
                            parameters={
                                "instruction": {
                                    "type": "string", 
                                    "description": f"Specific instruction for the {skill_name}",
                                    "required": True
                                }
                            },
                            handler=create_skill_handler(str(skill_file)),
                            category="skills"
                        )
                        logger.info(f"  Skill registered: {skill_name}")
                        
                    except Exception as e:
                        logger.error(f"Error loading skill {skill_name}: {e}")
