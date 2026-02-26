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
                    "query": {
                        "type": "string",
                        "description": "Consulta de busca"
                    }
                },
                "required": [
                    "query"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Lê e extrai texto de uma URL específica",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL para acessar"
                    }
                },
                "required": [
                    "url"
                ]
            }
        }
    }
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
                    "title": {
                        "type": "string",
                        "description": "Título do documento"
                    },
                    "content": {
                        "type": "string",
                        "description": "Conteúdo em texto ou markdown"
                    },
                    "filename": {
                        "type": "string",
                        "description": "Nome do arquivo (sem extensão)"
                    }
                },
                "required": [
                    "title",
                    "content"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_excel",
            "description": "Gera uma planilha Excel (.xlsx) com dados estruturados e retorna o link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Nome da aba (máximo 31 caracteres)"
                    },
                    "headers": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "Cabeçalhos das colunas"
                    },
                    "rows": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "description": "Linhas de dados"
                    },
                    "filename": {
                        "type": "string",
                        "description": "Nome do arquivo (sem extensão)"
                    }
                },
                "required": [
                    "title",
                    "headers",
                    "rows"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "Executa Python para processar e formatar dados complexos. Use print() para output.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Código Python a executar"
                    }
                },
                "required": [
                    "code"
                ]
            }
        }
    }
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
                    "url": {
                        "type": "string",
                        "description": "URL do arquivo a ser lido"
                    }
                },
                "required": [
                    "url"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_excel",
            "description": "Modifica uma planilha Excel (.xlsx) e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL da planilha original"
                    },
                    "cell_updates": {
                        "type": "array",
                        "description": "Células a atualizar",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sheet": {
                                    "type": "string",
                                    "description": "Nome da aba (opcional, usa a primeira se omitido)"
                                },
                                "cell": {
                                    "type": "string",
                                    "description": "Referência da célula (ex: A1, B3)"
                                },
                                "value": {
                                    "type": "string",
                                    "description": "Novo valor"
                                }
                            },
                            "required": [
                                "cell",
                                "value"
                            ]
                        }
                    },
                    "append_rows": {
                        "type": "array",
                        "description": "Linhas a adicionar no final da aba",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sheet": {
                                    "type": "string",
                                    "description": "Nome da aba (opcional)"
                                },
                                "values": {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    },
                                    "description": "Valores da linha"
                                }
                            },
                            "required": [
                                "values"
                            ]
                        }
                    },
                    "output_filename": {
                        "type": "string",
                        "description": "Nome do arquivo modificado (sem extensão)"
                    }
                },
                "required": [
                    "url"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_pptx",
            "description": "Modifica uma apresentação PowerPoint (.pptx) substituindo textos e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL da apresentação original"
                    },
                    "text_replacements": {
                        "type": "array",
                        "description": "Substituições de texto em todos os slides",
                        "items": {
                            "type": "object",
                            "properties": {
                                "find": {
                                    "type": "string",
                                    "description": "Texto a encontrar"
                                },
                                "replace": {
                                    "type": "string",
                                    "description": "Texto de substituição"
                                }
                            },
                            "required": [
                                "find",
                                "replace"
                            ]
                        }
                    },
                    "output_filename": {
                        "type": "string",
                        "description": "Nome do arquivo modificado (sem extensão)"
                    }
                },
                "required": [
                    "url",
                    "text_replacements"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_pdf",
            "description": "Modifica um PDF existente (extrai texto, aplica alterações, regera o documento) e retorna link de download",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL do PDF original"
                    },
                    "text_replacements": {
                        "type": "array",
                        "description": "Substituições de texto no documento",
                        "items": {
                            "type": "object",
                            "properties": {
                                "find": {
                                    "type": "string",
                                    "description": "Texto a encontrar"
                                },
                                "replace": {
                                    "type": "string",
                                    "description": "Texto de substituição"
                                }
                            },
                            "required": [
                                "find",
                                "replace"
                            ]
                        }
                    },
                    "append_content": {
                        "type": "string",
                        "description": "Conteúdo adicional a inserir no final do documento"
                    },
                    "output_filename": {
                        "type": "string",
                        "description": "Nome do arquivo modificado (sem extensão)"
                    }
                },
                "required": [
                    "url"
                ]
            }
        }
    }
]

# Design e Dev não têm ferramentas (geração pura de texto/JSON/código)
DESIGN_TOOLS: list = []
DEV_TOOLS: list = []

# ── Agente Supervisor (Novo Orquestrador) ─────────────────────────────────────
SUPERVISOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "ask_web_search",
            "description": "Delega uma pesquisa na internet para o Especialista de Busca Web. Retorna os dados crus/resumidos encontrados.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta detalhada e otimizada para a busca web (ex: adicione o ano, termos específicos)"
                    }
                },
                "required": [
                    "query"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ask_file_generator",
            "description": "Delega a criação de um documento (Excel ou PDF) novo para o Especialista de Arquivos. Retorna a URL de download.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_type": {
                        "type": "string",
                        "enum": [
                            "excel",
                            "pdf"
                        ],
                        "description": "Tipo de arquivo a gerar"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Instruções claras para a geração (título abrangente, estrutura)"
                    },
                    "data": {
                        "type": "string",
                        "description": "Os dados estruturados a serem incluídos no arquivo (pode ser CSV ou Markdown longo)"
                    }
                },
                "required": [
                    "file_type",
                    "instructions",
                    "data"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ask_file_modifier",
            "description": "Delega a modificação de um arquivo (PDF, Excel, PPTX) existente na conversa para o Especialista. Retorna URL do novo arquivo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_url": {
                        "type": "string",
                        "description": "URL do arquivo original que precisa ser modificado"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Instruções de modificação (ex: 'Altere a célula B2 para 100', 'Adicione nova linha no final')"
                    }
                },
                "required": [
                    "file_url",
                    "instructions"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ask_browser",
            "description": "Abre um navegador headless para acessar, interagir e extrair conteúdo de um site. "
                           "Suporta ações como clicar em botões, rolar a página, digitar texto, e executar JavaScript. "
                           "Use quando precisar ler artigos completos, interagir com sites dinâmicos (SPAs), passar por carrosséis, "
                           "aceitar cookies, ou extrair dados de URLs que exigem renderização JavaScript.\n\n"
                           "TIPOS DE ACTIONS SUPORTADAS (no campo 'actions'):\n"
                           "- {\"type\": \"click\", \"selector\": \"CSS_SELECTOR\"} — Clica num elemento\n"
                           "- {\"type\": \"scroll\", \"direction\": \"down\", \"amount\": 500} — Rola a página\n"
                           "- {\"type\": \"wait\", \"milliseconds\": 2000} — Espera X ms\n"
                           "- {\"type\": \"write\", \"text\": \"...\", \"selector\": \"CSS_SELECTOR\"} — Digita texto\n"
                           "- {\"type\": \"press\", \"key\": \"Enter\"} — Pressiona tecla\n"
                           "- {\"type\": \"screenshot\"} — Tira print da página\n"
                           "- {\"type\": \"execute_javascript\", \"script\": \"...\"} — Executa JS customizado\n"
                           "- {\"type\": \"scrape\"} — Extrai o conteúdo após as ações\n\n"
                           "EXEMPLO de carrossel: actions=[{\"type\":\"click\",\"selector\":\".next-slide\"},{\"type\":\"wait\",\"milliseconds\":1000},{\"type\":\"scrape\"}]",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL completa do site a ser acessado (ex: https://example.com/artigo)"
                    },
                    "actions": {
                        "type": "array",
                        "description": "Lista de ações a executar no browser ANTES de extrair o conteúdo. Cada ação é um objeto com 'type' obrigatório. Tipos: click, scroll, wait, write, press, screenshot, execute_javascript, scrape.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "enum": ["click", "scroll", "wait", "write", "press", "screenshot", "execute_javascript", "scrape"],
                                    "description": "Tipo da ação"
                                },
                                "selector": {
                                    "type": "string",
                                    "description": "Seletor CSS do elemento (para click e write)"
                                },
                                "text": {
                                    "type": "string",
                                    "description": "Texto a digitar (para write)"
                                },
                                "key": {
                                    "type": "string",
                                    "description": "Tecla a pressionar (para press): Enter, Tab, Escape, etc."
                                },
                                "direction": {
                                    "type": "string",
                                    "enum": ["up", "down"],
                                    "description": "Direção do scroll"
                                },
                                "amount": {
                                    "type": "integer",
                                    "description": "Pixels para scroll"
                                },
                                "milliseconds": {
                                    "type": "integer",
                                    "description": "Milissegundos para wait"
                                },
                                "script": {
                                    "type": "string",
                                    "description": "Código JavaScript a executar"
                                }
                            },
                            "required": ["type"]
                        }
                    },
                    "wait_for": {
                        "type": "integer",
                        "description": "Milissegundos para esperar antes de extrair conteúdo. Útil para SPAs que carregam via JavaScript. Padrão: sem espera."
                    },
                    "mobile": {
                        "type": "boolean",
                        "description": "Se true, acessa o site em modo mobile (viewport de celular). Útil para sites responsivos."
                    },
                    "include_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags HTML para incluir na extração (ex: ['article', 'main']). Filtra o conteúdo."
                    },
                    "exclude_tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags HTML para excluir da extração (ex: ['nav', 'footer', 'aside']). Remove ruído."
                    }
                },
                "required": [
                    "url"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_ui_design",
            "description": "[TERMINAL TOOL] Aciona o Especialista de Design Gráfico (Arcco Builder) para gerar posts/carrosseis JSON.",
            "parameters": {
                "type": "object",
                "properties": {
                    "requirements": {
                        "type": "string",
                        "description": "Tema, texto e formato (square, portrait, landscape) para o design visual."
                    }
                },
                "required": [
                    "requirements"
                ]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_web_page",
            "description": "[TERMINAL TOOL] Aciona o Especialista Dev (Arcco Pages) para gerar código HTML/CSS/JS completo de sites.",
            "parameters": {
                "type": "object",
                "properties": {
                    "requirements": {
                        "type": "string",
                        "description": "Descrição detalhada dos componentes, seções e conteúdo da página."
                    }
                },
                "required": [
                    "requirements"
                ]
            }
        }
    }
]
