"""
Definições de ferramentas por agente especialista.

Isolamento estrito: cada especialista tem acesso APENAS às suas ferramentas.
  - Agente de Busca Web    → WEB_SEARCH_TOOLS
  - Agente Gerador         → FILE_GENERATOR_TOOLS
  - Agente de Design       → [] (sem ferramentas — apenas geração de JSON)
  - Agente Dev             → [] (sem ferramentas — apenas geração de código)
"""

# ── Agente de Busca Web ───────────────────────────────────────────────────────
WEB_SEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Pesquisa informações atualizadas na internet",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Consulta de busca"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Lê e extrai texto de uma URL específica",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL para acessar"}
                },
                "required": ["url"],
            },
        },
    },
]

# ── Agente Gerador de Arquivos ────────────────────────────────────────────────
FILE_GENERATOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_pdf",
            "description": "Gera um arquivo PDF profissional e retorna o link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Título do documento"},
                    "content": {"type": "string", "description": "Conteúdo em texto ou markdown"},
                    "filename": {"type": "string", "description": "Nome do arquivo (sem extensão)"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_excel",
            "description": "Gera uma planilha Excel (.xlsx) com dados estruturados e retorna o link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Nome da aba (máximo 31 caracteres)"},
                    "headers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Cabeçalhos das colunas",
                    },
                    "rows": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}},
                        "description": "Linhas de dados",
                    },
                    "filename": {"type": "string", "description": "Nome do arquivo (sem extensão)"},
                },
                "required": ["title", "headers", "rows"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "Executa Python para processar e formatar dados complexos. Use print() para output.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Código Python a executar"}
                },
                "required": ["code"],
            },
        },
    },
]

# Design e Dev não têm ferramentas (geração pura de texto/JSON/código)
DESIGN_TOOLS: list = []
DEV_TOOLS: list = []
