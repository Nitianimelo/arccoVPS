---
name: agent-dev-senior
description: >
  Skill de desenvolvedor sênior especializado em criar agentes de chat autônomos
  (estilo Manus/OpenDevin/AutoGPT). Cobre: arquitetura de agentes com tool-use,
  geração de PDFs, pesquisa na internet, manipulação de arquivos, execução de código,
  orquestração multi-step, e criação de interfaces conversacionais com capacidades
  computacionais. Use quando o usuário quer construir agentes, chatbots com ferramentas,
  sistemas de automação conversacional, ou qualquer aplicação que combine LLM + tools.
---

# Agent Dev Senior Skill

## Filosofia

Este não é um guia passo-a-passo. É um framework de decisão para um dev sênior.
O objetivo é produzir agentes que **funcionam em produção** — não demos bonitas.

Prioridades (nesta ordem):
1. **Funciona** — o agente completa a tarefa do usuário
2. **Robusto** — error handling, retries, fallbacks
3. **Extensível** — adicionar novas tools é trivial
4. **Mínimo** — zero abstrações desnecessárias

---

## Quando usar esta skill

- Criar agentes conversacionais com capacidade de executar ações (tool-use)
- Construir sistemas que combinam LLM + pesquisa web + geração de documentos
- Implementar pipelines de automação orquestrados por linguagem natural
- Criar chatbots estilo Manus/Devin que resolvem problemas end-to-end
- Qualquer sistema onde um LLM precisa usar ferramentas programaticamente

---

## Arquitetura Core: Agent Loop

Todo agente segue o mesmo loop fundamental:

```
USER INPUT → LLM (com tools disponíveis) → DECISÃO
  ↓
  ├── tool_call → EXECUTAR TOOL → resultado → volta pro LLM
  ├── resposta final → RETORNA ao usuário
  └── erro → RETRY/FALLBACK → volta pro LLM
```

### Implementação mínima viável (Python)

```python
import anthropic
import json

client = anthropic.Anthropic()

TOOLS = []  # Lista de tool definitions
TOOL_HANDLERS = {}  # {"tool_name": callable}

def agent_loop(user_message: str, system_prompt: str, max_iterations: int = 15):
    messages = [{"role": "user", "content": user_message}]

    for _ in range(max_iterations):
        response = client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=8096,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
        )

        # Coleta resposta textual e tool calls
        assistant_content = response.content
        messages.append({"role": "assistant", "content": assistant_content})

        # Se não há tool_use, acabou
        tool_uses = [b for b in assistant_content if b.type == "tool_use"]
        if not tool_uses:
            # Extrair texto final
            text_blocks = [b.text for b in assistant_content if b.type == "text"]
            return "\n".join(text_blocks)

        # Executar cada tool call
        tool_results = []
        for tool_use in tool_uses:
            handler = TOOL_HANDLERS.get(tool_use.name)
            if handler:
                try:
                    result = handler(**tool_use.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": str(result),
                    })
                except Exception as e:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": f"ERRO: {e}",
                        "is_error": True,
                    })
            else:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": f"Tool '{tool_use.name}' não encontrada.",
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results})

    return "Agente atingiu limite de iterações."
```

---

## Tools: Catálogo de Implementações

### ANTES DE IMPLEMENTAR: Leia a referência

Antes de implementar qualquer tool, leia o arquivo de referência correspondente:

| Tool | Referência | Lib principal |
|------|-----------|---------------|
| Geração de PDF | `reference/TOOLS_PDF.md` | reportlab, pypdf |
| Pesquisa Web | `reference/TOOLS_WEB.md` | httpx, beautifulsoup4 |
| Execução de Código | `reference/TOOLS_CODE_EXEC.md` | subprocess, docker |
| Manipulação de Arquivos | `reference/TOOLS_FILES.md` | pathlib, shutil |
| Geração de Documentos | `reference/TOOLS_DOCS.md` | python-docx, openpyxl |

### Tool Definition Pattern

Toda tool segue este formato para a API da Anthropic:

```python
def register_tool(name: str, description: str, parameters: dict, handler: callable):
    """Registra uma tool no agente."""
    TOOLS.append({
        "name": name,
        "description": description,
        "input_schema": {
            "type": "object",
            "properties": parameters,
            "required": [k for k, v in parameters.items() if v.get("required", False)],
        },
    })
    TOOL_HANDLERS[name] = handler
```

### Princípios para Tools de Qualidade

1. **Descrição é prompt engineering** — A description da tool é o que o LLM usa para decidir QUANDO e COMO usá-la. Seja preciso.
2. **Input schema restrito** — Quanto menos parâmetros, menos o LLM erra. Use defaults agressivos.
3. **Output é contexto** — O retorno da tool volta pro contexto do LLM. Seja conciso mas informativo.
4. **Erros são instrução** — Mensagens de erro devem dizer ao LLM o que fazer diferente.

---

## Padrões de Orquestração

### 1. Sequential (simples)
Agente executa uma tool de cada vez, sequencialmente.
**Use para**: Tarefas lineares (pesquisar → resumir → gerar PDF).

### 2. Parallel Tool Calls
LLM emite múltiplos tool_use blocks. Execute em paralelo.
**Use para**: Pesquisar múltiplas fontes simultaneamente.

```python
import asyncio

async def execute_tools_parallel(tool_uses, handlers):
    tasks = []
    for tu in tool_uses:
        handler = handlers[tu.name]
        tasks.append(asyncio.to_thread(handler, **tu.input))
    return await asyncio.gather(*tasks, return_exceptions=True)
```

### 3. Sub-Agent Delegation
Um agente cria sub-agentes especializados para subtarefas.
**Use para**: Problemas complexos que requerem expertise diferentes.

```python
def delegate_to_subagent(task: str, specialist_prompt: str, tools: list):
    """Cria um sub-agente com tools e prompt especializados."""
    sub_tools = [t for t in ALL_TOOLS if t["name"] in tools]
    sub_handlers = {k: v for k, v in ALL_HANDLERS.items() if k in tools}
    return agent_loop(task, specialist_prompt, tools=sub_tools, handlers=sub_handlers)
```

### 4. Planning → Execution
O agente primeiro cria um plano, depois executa cada step.
**Use para**: Tarefas multi-step complexas onde o LLM precisa raciocinar sobre a ordem.

---

## System Prompts para Agentes

O system prompt é 80% da qualidade do agente. Padrão recomendado:

```python
AGENT_SYSTEM_PROMPT = """Você é um agente autônomo especializado em {DOMÍNIO}.

## Capacidades
Você tem acesso às seguintes ferramentas:
{TOOL_DESCRIPTIONS_AUTO_GENERATED}

## Regras de Execução
1. Sempre verifique os parâmetros antes de chamar uma tool
2. Se uma tool falhar, analise o erro e tente uma abordagem diferente
3. Nunca invente dados — use tools para obter informações reais
4. Ao completar a tarefa, apresente um resumo do que foi feito

## Formato de Resposta
- Pense passo-a-passo antes de agir
- Use tools na ordem que faz sentido para a tarefa
- Seja conciso nas respostas ao usuário
"""
```

---

## Stack Recomendada

### Backend do Agente
| Componente | Escolha | Motivo |
|-----------|---------|--------|
| LLM | Claude Sonnet 4.5 | Melhor custo/benefício para tool-use |
| HTTP | httpx (async) | Async nativo, timeout configurável |
| PDF | reportlab + pypdf | Criação + manipulação |
| Web scraping | httpx + beautifulsoup4 | Leve, sem overhead de browser |
| Browser (se necessário) | playwright | Headless Chrome, JS rendering |
| Docs | python-docx, openpyxl | Word e Excel nativos |
| Code execution | subprocess com sandbox | Segurança primeiro |
| Queue | asyncio.Queue ou Redis | Conforme escala |

### Interface
| Tipo | Stack | Use quando |
|------|-------|-----------|
| CLI | rich + click | Dev/teste rápido |
| Web chat | FastAPI + WebSocket + React | Produto real |
| API | FastAPI + SSE | Integração com outros sistemas |

---

## Templates Prontos

Veja `templates/` para implementações completas:
- `templates/agent_basic.py` — Agente mínimo com agent loop
- `templates/agent_with_tools.py` — Agente com PDF, web search, file ops
- `templates/agent_fastapi.py` — Agente com API web completa
- `templates/tool_web_search.py` — Tool de pesquisa web isolada
- `templates/tool_pdf_generator.py` — Tool de geração de PDF isolada

---

## Checklist de Produção

Antes de considerar o agente "pronto":

- [ ] **Error handling em toda tool** — try/except com mensagem útil
- [ ] **Timeout em chamadas externas** — httpx timeout, subprocess timeout
- [ ] **Rate limiting** — Respeitar limites da API Anthropic e APIs externas
- [ ] **Logging estruturado** — Cada tool call logada com input/output/tempo
- [ ] **Max iterations** — Agent loop SEMPRE tem limite
- [ ] **Sanitização de input** — Especialmente em code execution
- [ ] **Testes** — Pelo menos smoke test de cada tool isolada
- [ ] **Custo** — Monitorar tokens consumidos por sessão
- [ ] **Graceful degradation** — Se uma tool falha, o agente continua

---

## Anti-Patterns (evite)

1. **Over-engineering de abstrações** — Não crie um "framework de agentes". Use o loop básico.
2. **Tools com muitos parâmetros** — Mais de 5 params = o LLM vai errar.
3. **System prompt genérico** — Quanto mais específico ao domínio, melhor.
4. **Sem limite de iterações** — Loop infinito = conta infinita.
5. **Confiar no output do LLM para code execution** — SEMPRE sandbox.
6. **Retornar dados grandes da tool** — Truncate. O contexto tem limite.
