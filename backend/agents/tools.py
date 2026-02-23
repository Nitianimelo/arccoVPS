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

# ── Agente Modificador de Arquivos ───────────────────────────────────────────
FILE_MODIFIER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "fetch_file_content",
            "description": "Baixa e lê a estrutura de um arquivo (PDF, Excel, PPTX) antes de modificar. Sempre chame isso primeiro.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL do arquivo a ser lido"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify_excel",
            "description": "Modifica uma planilha Excel (.xlsx) e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL da planilha original"},
                    "cell_updates": {
                        "type": "array",
                        "description": "Células a atualizar",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sheet": {"type": "string", "description": "Nome da aba (opcional, usa a primeira se omitido)"},
                                "cell": {"type": "string", "description": "Referência da célula (ex: A1, B3)"},
                                "value": {"type": "string", "description": "Novo valor"},
                            },
                            "required": ["cell", "value"],
                        },
                    },
                    "append_rows": {
                        "type": "array",
                        "description": "Linhas a adicionar no final da aba",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sheet": {"type": "string", "description": "Nome da aba (opcional)"},
                                "values": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Valores da linha",
                                },
                            },
                            "required": ["values"],
                        },
                    },
                    "output_filename": {"type": "string", "description": "Nome do arquivo modificado (sem extensão)"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify_pptx",
            "description": "Modifica uma apresentação PowerPoint (.pptx) substituindo textos e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL da apresentação original"},
                    "text_replacements": {
                        "type": "array",
                        "description": "Substituições de texto em todos os slides",
                        "items": {
                            "type": "object",
                            "properties": {
                                "find": {"type": "string", "description": "Texto a encontrar"},
                                "replace": {"type": "string", "description": "Texto de substituição"},
                            },
                            "required": ["find", "replace"],
                        },
                    },
                    "output_filename": {"type": "string", "description": "Nome do arquivo modificado (sem extensão)"},
                },
                "required": ["url", "text_replacements"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "modify_pdf",
            "description": "Modifica um PDF existente (extrai texto, aplica alterações, regera o documento) e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL do PDF original"},
                    "text_replacements": {
                        "type": "array",
                        "description": "Substituições de texto no documento",
                        "items": {
                            "type": "object",
                            "properties": {
                                "find": {"type": "string", "description": "Texto a encontrar"},
                                "replace": {"type": "string", "description": "Texto de substituição"},
                            },
                            "required": ["find", "replace"],
                        },
                    },
                    "append_content": {"type": "string", "description": "Conteúdo adicional a inserir no final do documento"},
                    "output_filename": {"type": "string", "description": "Nome do arquivo modificado (sem extensão)"},
                },
                "required": ["url"],
            },
        },
    },
]

# Design e Dev não têm ferramentas (geração pura de texto/JSON/código)
DESIGN_TOOLS: list = []
DEV_TOOLS: list = []
