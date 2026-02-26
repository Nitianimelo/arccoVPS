"""
Orquestrador Multi-Agente do Arcco (Arquitetura Supervisor-Worker / ReAct).

Fluxo de execução:
  1. O Agente Supervisor (único a conversar com o usuário) recebe a requisição.
  2. O Supervisor decide se responde diretamente ou se usa Ferramentas (Sub-Agentes).
  3. Ao usar uma Ferramenta Não-Terminal (Busca, Arquivos):
      - O sub-agente executa a tarefa.
      - O Agente QA revisa (máx 2 tentativas).
      - O resultado volta para o Supervisor redigir a resposta final amigável.
  4. Ao usar uma Ferramenta Terminal (Design, Dev HTML):
      - O sub-agente executa a tarefa.
      - O Agente QA revisa.
      - O resultado bruto (JSON/HTML) é enviado diretamente ao usuário via SSE.
      - O loop do Supervisor é encerrado imediatamente (proteção do Front-end).
"""

import asyncio
import json
import logging
import re
from typing import AsyncGenerator

from backend.core.llm import call_openrouter, stream_openrouter
from backend.agents import registry
from backend.agents.executor import execute_tool

logger = logging.getLogger(__name__)

# ── Mapa de Ferramentas do Supervisor ────────────────────────────────────────

TOOL_MAP = {
    "ask_web_search": {"route": "web_search", "is_terminal": False},
    "ask_file_generator": {"route": "file_generator", "is_terminal": False},
    "ask_file_modifier": {"route": "file_modifier", "is_terminal": False},
    "ask_browser": {"route": "browser", "is_terminal": False},
    "generate_ui_design": {"route": "design", "is_terminal": True},
    "generate_web_page": {"route": "dev", "is_terminal": True},
}

# Rotas que DEVEM conter links de download
ROUTES_REQUIRING_LINK = {"file_generator", "file_modifier"}
_MARKDOWN_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\((https?://[^)]+)\)')

# ── Utilitários SSE ──────────────────────────────────────────────────────────

def sse(event_type: str, content: str) -> str:
    return f'data: {{"type": "{event_type}", "content": {json.dumps(content)}}}\n\n'


# ── Agente QA ────────────────────────────────────────────────────────────────

async def _qa_review(
    user_intent: str, specialist_response: str, route: str, model: str
) -> dict:
    """Revisa a resposta do especialista. Retorna {approved, issues, correction_instruction}."""
    try:
        review_prompt = (
            f"Pedido original: {user_intent}\n"
            f"Tipo esperado: {route}\n\n"
            f"Resposta do especialista:\n{specialist_response[:3000]}"
        )
        data = await call_openrouter(
            messages=[
                {"role": "system", "content": registry.get_prompt("qa")},
                {"role": "user", "content": review_prompt},
            ],
            model=registry.get_model("qa") or model,
            max_tokens=300,
            temperature=0.1,
        )
        raw = data["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[QA] Erro na revisão: {e}")
        return {"approved": True, "issues": []}  # Fail-open


# ── Validação Anti-Alucinação ────────────────────────────────────────────────

_URL_PATTERN = re.compile(r'https?://[^\s\)\]"\'>]+', re.IGNORECASE)
_MARKDOWN_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)', re.IGNORECASE)

ROUTES_REQUIRING_LINK = {"file_generator", "file_modifier"}


def _extract_urls_from_tool_history(messages: list) -> list[str]:
    """
    Extrai URLs de download do histórico de tool results.
    Isso funciona independente do que o LLM decidir dizer —
    os links gerados pelo executor (Supabase upload) são determinísticos.
    """
    urls = []
    for msg in messages:
        if msg.get("role") == "tool":
            content = str(msg.get("content", ""))
            # Prioriza links Markdown já formatados
            md_links = _MARKDOWN_LINK_PATTERN.findall(content)
            if md_links:
                urls.extend(url for _, url in md_links)
            else:
                # Fallback: pega URLs cruas
                raw_urls = _URL_PATTERN.findall(content)
                urls.extend(url for url in raw_urls if 'supabase' in url or 'storage' in url)
    return urls


def _validate_specialist_response(response: str, route: str, tool_messages: list) -> str:
    """
    Valida e corrige a resposta do especialista.
    Se a rota exige link de download e o LLM alucinhou (não incluiu), injeta o link real.
    """
    if route not in ROUTES_REQUIRING_LINK:
        return response

    # Verifica se a resposta já contém um link Markdown válido
    has_link = bool(_MARKDOWN_LINK_PATTERN.search(response))
    if has_link:
        return response

    # O LLM não incluiu link — extrair dos tool results determinísticos
    urls = _extract_urls_from_tool_history(tool_messages)
    if urls:
        # Injeta o link no final da resposta
        url = urls[-1]  # Pega o mais recente (última ferramenta executada)
        ext = url.rsplit('.', 1)[-1].split('?')[0].upper() if '.' in url else 'Arquivo'
        link_label = f"Baixar {ext}" if ext in ('PDF', 'XLSX', 'PPTX', 'DOCX') else "Baixar Arquivo"
        logger.warning(f"[ANTI-HALLUCINATION] Especialista não incluiu link. Injetando: {url[:60]}...")
        response += f"\n\n[{link_label}]({url})"
    else:
        logger.error(f"[ANTI-HALLUCINATION] Nenhum link encontrado nos tool results para rota '{route}'")

    return response


# ── Loops dos Especialistas (Sub-Agentes) ────────────────────────────────────

async def _run_specialist_with_tools(
    messages: list,
    model: str,
    system_prompt: str,
    tools: list,
    max_iterations: int = 5,
) -> str:
    """Executa especialista com ferramentas. Retorna resposta final como string."""
    current = [{"role": "system", "content": system_prompt}, *messages]

    for _ in range(max_iterations):
        data = await call_openrouter(
            messages=current,
            model=model,
            max_tokens=4096,
            tools=tools if tools else None,
        )
        message = data["choices"][0]["message"]
        current.append(message)

        if message.get("tool_calls"):
            for tool in message["tool_calls"]:
                func_name = tool["function"]["name"]
                try:
                    func_args = json.loads(tool["function"]["arguments"])
                    result = await execute_tool(func_name, func_args)
                except json.JSONDecodeError:
                    result = "Erro: Argumentos da ferramenta com JSON inválido. Corrija a formatação JSON e tente novamente."
                except Exception as e:
                    result = f"Erro na execução da ferramenta: {e}"
                    
                current.append({
                    "role": "tool",
                    "tool_call_id": tool["id"],
                    "content": str(result),
                })
        else:
            return message.get("content", "")

    return "Limite de iterações atingido no Especialista."


async def _run_specialist_no_tools_stream(
    messages: list, model: str, system_prompt: str, max_tokens: int = 4096
) -> AsyncGenerator[str, None]:
    """Especialista sem ferramentas (Design, Dev). Faz STREAM direto do OpenRouter."""
    current = [{"role": "system", "content": system_prompt}, *messages]
    
    async for chunk in stream_openrouter(messages=current, model=model, max_tokens=max_tokens):
        if "choices" in chunk and len(chunk["choices"]) > 0:
            delta = chunk["choices"][0].get("delta", {})
            if "content" in delta and delta["content"]:
                yield delta["content"]


async def _run_specialist_with_qa(
    route: str, user_intent: str, temp_messages: list, model: str, custom_step_msg: str
) -> AsyncGenerator[str, None]:
    """
    Executa o Especialista + QA + Validação Anti-Alucinação.
    Yields SSE steps para a UI, e no final yielda 'RESULT:' com a resposta validada.
    """
    MAX_QA_RETRIES = 2
    specialist_response = ""
    current_messages = list(temp_messages)

    for attempt in range(MAX_QA_RETRIES + 1):
        if attempt == 0:
            yield sse("steps", f"<step>{custom_step_msg}</step>")
        else:
            yield sse("steps", f"<step>Aperfeiçoando qualidade do resultado...</step>")

        # Executar especialista (genérico — usa o registry para qualquer rota)
        try:
            specialist_response = await _run_specialist_with_tools(
                current_messages,
                registry.get_model(route) or model,
                registry.get_prompt(route),
                registry.get_tools(route),
            )
        except Exception as e:
            logger.error(f"[SPECIALIST] Erro na execução do especialista '{route}': {e}")
            yield f"RESULT:Erro ao processar especialista: {e}"
            return

        # ── Validação Anti-Alucinação: garantir link de download ───────────
        specialist_response = _validate_specialist_response(
            specialist_response, route, current_messages
        )

        # ── QA Review ─────────────────────────────────────────────────────────
        yield sse("steps", "<step>Validando qualidade do resultado...</step>")
        qa_result = await _qa_review(user_intent, specialist_response, route, model)

        if qa_result.get("approved", True):
            break

        if attempt < MAX_QA_RETRIES:
            correction = qa_result.get("correction_instruction", "Corrija a resposta.")
            current_messages = current_messages + [
                {"role": "assistant", "content": specialist_response},
                {"role": "user", "content": f"[QA Feedback] {correction}"},
            ]
        else:
            yield sse("steps", "<step>Preparando melhor resultado disponível...</step>")

    yield f"RESULT:{specialist_response}"


# ── Pipeline Principal (Supervisor ReAct) ────────────────────────────────────

async def orchestrate_and_stream(
    messages: list,
    model: str,
) -> AsyncGenerator[str, None]:
    """
    Pipeline ReAct (Supervisor-Worker).
    O Supervisor gerencia a conversa, decidindo quando chamar ferramentas (sub-agentes).
    Contém proteção contra Loops Infinitos (MAX_ITERATIONS) e 
    Terminal Tools (quebram o loop para proteger o Frontend).
    """
    
    from backend.agents.tools import SUPERVISOR_TOOLS

    supervisor_prompt = registry.get_prompt("chat") # O agent 'chat' agora é o Supervisor
    supervisor_model = registry.get_model("chat") or model
    
    # Extrair intent do usuário da última mensagem para passar pro QA nas tools
    user_intent = next(
        (str(m["content"]) for m in reversed(messages) if m.get("role") == "user"), ""
    )

    current_messages = [{"role": "system", "content": supervisor_prompt}] + messages
    
    MAX_ITERATIONS = 7
    
    for iteration in range(MAX_ITERATIONS):
        # Step inicial: mostra que o Supervisor está pensando
        if iteration == 0:
            yield sse("steps", "<step>Analisando pedido e planejando execução...</step>")
        
        # Chama o LLM do Supervisor
        try:
            data = await call_openrouter(
                messages=current_messages,
                model=supervisor_model,
                max_tokens=4096,
                tools=SUPERVISOR_TOOLS
            )
            message = data["choices"][0]["message"]
        except (KeyError, IndexError) as e:
            logger.error(f"[ORCHESTRATOR] Resposta LLM malformada: {e}")
            yield sse("error", "Erro interno ao processar a resposta da IA. Tente novamente.")
            return
        except Exception as e:
            logger.error(f"[ORCHESTRATOR] Erro na chamada LLM: {e}")
            yield sse("error", f"Erro ao comunicar com a IA: {e}")
            return

        current_messages.append(message)
        
        # O Supervisor decidiu usar uma Ferramenta (Especialista)?
        if message.get("tool_calls"):
            for tool in message["tool_calls"]:
                func_name = tool["function"]["name"]
                
                try:
                    func_args = json.loads(tool["function"]["arguments"])
                except json.JSONDecodeError:
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": "Erro sintático no JSON da ferramenta. Corrija a formatação e tente novamente.",
                    })
                    yield sse("steps", "<step>Aguardando sub-agente corrigir os parâmetros da ferramenta...</step>")
                    continue
                    
                # TOOL_MAP is now a module-level constant

                if func_name in TOOL_MAP:
                    route = TOOL_MAP[func_name]["route"]
                    is_terminal = TOOL_MAP[func_name]["is_terminal"]
                    
                    # Contexto truncado: pega as últimas 5 interações pra enviar aos sub-agentes
                    recent_context = [m for m in messages if m.get("role") in ["user", "assistant"]][-5:]
                    
                    if route == "web_search":
                        query = func_args.get("query", user_intent)
                        step_message = f"Buscando na web: \"{query[:50]}\"..."
                        temp_msgs = recent_context + [{"role": "user", "content": f"Realize a pesquisa com a query: {query}"}]
                    elif route == "file_generator":
                        file_type = func_args.get("file_type", "arquivo").upper()
                        step_message = f"Gerando {file_type} → estruturando dados e criando arquivo..."
                        content = f"Instruções: {func_args.get('instructions')} Dados: {func_args.get('data')}"
                        temp_msgs = recent_context + [{"role": "user", "content": content}]
                    elif route == "file_modifier":
                        step_message = "Lendo estrutura do arquivo original e aplicando modificações..."
                        content = f"Arquivo: {func_args.get('file_url')} Instruções: {func_args.get('instructions')}"
                        temp_msgs = recent_context + [{"role": "user", "content": content}]
                    elif route == "design":
                        step_message = "Criando design → posicionando elementos e aplicando estilo..."
                        temp_msgs = recent_context + [{"role": "user", "content": func_args.get("requirements", user_intent)}]
                    elif route == "dev":
                        step_message = "Gerando código HTML/CSS → compilando layout da página..."
                        temp_msgs = recent_context + [{"role": "user", "content": func_args.get("requirements", user_intent)}]
                    elif route == "browser":
                        url = func_args.get("url", "")
                        step_message = f"Abrindo navegador e extraindo dados de {url[:40]}..."
                        temp_msgs = None  # Browser usa executor direto, sem sub-agente
                else:
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": f"Erro: ferramenta '{func_name}' não suportada pelo orquestrador.",
                    })
                    continue

                if is_terminal:
                    yield sse("steps", f"<step>{step_message}</step>")
                    yield sse("steps", "<step>Transmitindo resultado em tempo real...</step>")
                    route_prompt = registry.get_prompt(route)
                    route_model = registry.get_model(route) or model
                    
                    full_terminal_code = ""
                    async for text_chunk in _run_specialist_no_tools_stream(temp_msgs, route_model, route_prompt, max_tokens=6000):
                        full_terminal_code += text_chunk
                        yield sse("chunk", text_chunk)
                        
                    # Aqui rodamos limitados, proteção de frontend, termina todo request do SSE via return
                    return
                elif route == "browser":
                    # Browser: executa direto pelo executor, sem sub-agente
                    # Emite eventos "browser_action" para a UI mostrar card estilo Manus
                    url = func_args.get("url", "")
                    raw_actions = func_args.get("actions", [])
                    
                    # Monta descrição das ações para o step
                    if raw_actions:
                        action_types = [a.get("type", "?") for a in raw_actions if isinstance(a, dict)]
                        action_label = ", ".join(action_types)
                        step_message = f"Navegando em {url[:40]}... (ações: {action_label})"
                    
                    yield sse("steps", f"<step>{step_message}</step>")
                    yield sse("browser_action", json.dumps({
                        "status": "navigating",
                        "url": url,
                        "title": f"Acessando {url[:60]}...",
                        "actions": [a.get("type", "?") for a in raw_actions] if raw_actions else []
                    }))
                    
                    specialist_result = await execute_tool("ask_browser", func_args)
                    
                    # Se o resultado é um erro, emite status de erro
                    if specialist_result.startswith("Erro"):
                        yield sse("browser_action", json.dumps({
                            "status": "error",
                            "url": url,
                            "title": specialist_result[:100]
                        }))
                    else:
                        yield sse("browser_action", json.dumps({
                            "status": "done",
                            "url": url,
                            "title": "Página lida com sucesso"
                        }))
                    
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": specialist_result,
                    })
                    yield sse("steps", "<step>Conteúdo extraído — analisando dados...</step>")
                else:
                    specialist_result = ""
                    async for event in _run_specialist_with_qa(route, user_intent, temp_msgs, model, step_message):
                        if event.startswith("RESULT:"):
                            specialist_result = event[7:]
                        else:
                            yield event

                    # Garantia final: se o especialista retornou resultado vazio, reportar
                    if not specialist_result.strip():
                        specialist_result = "O especialista não retornou resultado. Tente reformular o pedido."
                        logger.warning(f"[ORCHESTRATOR] Especialista '{route}' retornou vazio")

                    # ── ANTI-LEAK: Para rotas de arquivo, enviar APENAS o link pro Supervisor ──
                    # Isso impede definitivamente o Supervisor de ver/replicar conteúdo interno.
                    if route in ROUTES_REQUIRING_LINK:
                        md_links = _MARKDOWN_LINK_PATTERN.findall(specialist_result)
                        if md_links:
                            links_only = "\n".join(f"[{label}]({url})" for label, url in md_links)
                            specialist_result = f"Arquivo gerado com sucesso.\n\n{links_only}"
                            logger.info("[ANTI-LEAK] Conteúdo suprimido. Apenas link enviado ao Supervisor.")

                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": specialist_result,
                    })
                    
                    yield sse("steps", "<step>Integrando resultado do especialista...</step>")
                
            # Fim do loop de tool_calls desta iteração, prossegue o while para deixar o Supervisor responder
            continue
            
        else:
            # O Supervisor decidiu responder ao usuário diretamente (sem tools ou após usar tools)
            # IMPORTANTE: Usa a resposta já obtida na chamada acima (sem chamar o LLM de novo)
            # Isso garante que links de download e dados dos especialistas sejam preservados.
            yield sse("steps", "<step>Preparando resposta final...</step>")
            
            content = message.get("content", "")
            if content:
                # Envia em chunks pequenos para simular streaming na UI
                chunk_size = 12
                for i in range(0, len(content), chunk_size):
                    yield sse("chunk", content[i:i + chunk_size])
                    await asyncio.sleep(0.015)
            else:
                yield sse("chunk", "Desculpe, não consegui gerar uma resposta. Tente novamente.")
            
            # Encerra o fluxo ReAct com sucesso
            return

    # Se saiu do loop, atingiu MAX_ITERATIONS
    yield sse("error", "Limite máximo de processamento atingido. Por favor, seja mais específico na sua solicitação.")

