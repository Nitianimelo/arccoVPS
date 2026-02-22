"""
Endpoint de chat com agente — SSE streaming.
Portado de netlify/functions/agent-chat.ts

O frontend envia: {messages, model?, system_prompt?}
O backend responde com SSE: data: {"type": "steps"|"chunk"|"error", "content": "..."}
"""

import json
import logging
import time
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from backend.core.config import get_config
from backend.core.llm import call_openrouter
from backend.services.search_service import search_web_formatted
from backend.services.file_service import generate_pdf, generate_xlsx, FILE_GENERATORS
from backend.core.supabase_client import upload_to_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM_PROMPT = """Você é o Arcco Agent v2 (Python Edition).
Suas capacidades:
- Pesquisar na Web (Tavily/Brave)
- Ler URLs e analisar conteúdo
- Gerar PDFs profissionais e salvar no Supabase
- Gerar planilhas Excel (.xlsx) com dados estruturados
- Responder com precisão e profundidade

Regras:
1. Pense passo-a-passo.
2. Use ferramentas quando necessário. NÃO diga "vou gerar" sem usar a ferramenta — execute imediatamente.
3. SEMPRE que você gerar um arquivo (PDF ou Excel) usando uma tool, A SUA RESPOSTA FINAL OBRIGATORIAMENTE DEVE INCLUIR O LINK para o usuário baixar em formato Markdown, exemplo: [Baixar Arquivo Gerado](url aqui).
4. Responda em Markdown rico (tabelas, listas, bold).
5. Quando o usuário pedir Excel, planilha ou spreadsheet: use a ferramenta generate_excel diretamente e SEMPRE DEVOLVA O LINK na resposta final!
6. Quando o usuário pedir "design", "post para instagram", "carrossel" ou "arte": responda APENAS com um bloco de código ````json contendo o modelo PostAST. O formato OBRIGATÓRIO é:
{
  "id": "post-1", "format": "portrait",
  "meta": {"title": "Título", "theme": "dark"},
  "slides": [
    {
      "id": "slide-1", 
      "elements": [
        {"id": "bg", "type": "Shape", "props": {"color": "#111111"}},
        {"id": "t1", "type": "TextOverlay", "props": {"text": "Seu Texto", "variant": "h1"}, "styles": {"top": "50%", "left": "10%"}}
      ]
    }
  ]
}
Sempre devolva o JSON bruto e válido dentro do markdown de código."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Fetch and read content from a URL",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_pdf",
            "description": "Generate a PDF file with text content",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "filename": {"type": "string"},
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_excel",
            "description": "Generate an Excel (.xlsx) spreadsheet file with structured data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Sheet name (max 31 chars)"},
                    "headers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Column headers",
                    },
                    "rows": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}},
                        "description": "Data rows",
                    },
                    "filename": {"type": "string"},
                },
                "required": ["title", "headers", "rows"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_python",
            "description": "Execute Python code in a secure sandbox. Use print() to output results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code to execute"}
                },
                "required": ["code"],
            },
        },
    },
]


def load_skills():
    """Carrega skills da pasta .agent/skills e adiciona como tools."""
    import os
    from pathlib import Path
    
    # Tentar localizar a pasta de skills. Assumindo que estamos em backend/api/ ou similar
    # e a raiz é ../../
    # Ajuste conforme a estrutura real de deploy
    base_dir = Path(os.getcwd())
    skills_dir = base_dir / ".agent" / "skills"
    
    if not skills_dir.exists():
        # Tentar subir um nível se estiver rodando de backend/
        skills_dir = base_dir / ".." / ".agent" / "skills"
    
    if not skills_dir.exists():
        # logging.warning(f"Skills dir not found at {skills_dir}")
        return

    for item in skills_dir.iterdir():
        if item.is_dir():
            skill_name = item.name
            skill_file = item / "SKILL.md"
            
            if skill_file.exists():
                tool_name = f"skill_{skill_name.replace('-', '_')}"
                
                # Criar a definição da tool
                skill_tool = {
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "description": f"Delegate task to {skill_name} specialist. Reads the skill definition.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "instruction": {
                                    "type": "string",
                                    "description": f"Instruction for the {skill_name}"
                                }
                            },
                            "required": ["instruction"],
                        },
                    },
                }
                
                # Adicionar à lista global se não existir
                if not any(t["function"]["name"] == tool_name for t in TOOLS):
                    TOOLS.append(skill_tool)
                    # logging.info(f"Loaded skill tool: {tool_name}")

# Carregar skills na inicialização
load_skills()



def sse_event(event_type: str, content: str) -> str:
    """Formata evento SSE compatível com o frontend."""
    return f'data: {{"type": "{event_type}", "content": {json.dumps(content)}}}\n\n'


async def web_fetch_tool(url: str) -> str:
    """Busca e parseia conteúdo de URL."""
    try:
        import httpx
        from bs4 import BeautifulSoup

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url, headers={"User-Agent": "ArccoAgent/2.0"}, follow_redirects=True
            )
            html = response.text

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "svg", "noscript"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)
        title = soup.title.string if soup.title else ""

        if len(text) > 20000:
            text = text[:20000] + "... [Truncado]"

        return f"**Conteúdo de {url}**\n**Título:** {title}\n\n{text}"
    except Exception as e:
        return f"Erro ao ler URL ({url}): {e}"


async def execute_tool(func_name: str, func_args: dict, config) -> str:
    """Executa uma tool e retorna resultado."""
    if func_name == "web_search":
        return await search_web_formatted(func_args["query"])

    elif func_name == "web_fetch":
        return await web_fetch_tool(func_args["url"])

    elif func_name == "generate_pdf":
        import asyncio
        import time

        def sync_pdf():
            pdf_bytes = generate_pdf(func_args["title"], func_args["content"])
            filename = func_args.get("filename", f"doc-{int(time.time())}.pdf")
            if not filename.endswith(".pdf"):
                filename += ".pdf"
            return upload_to_supabase(
                config.supabase_storage_bucket, filename, pdf_bytes, "application/pdf"
            )

        url = await asyncio.to_thread(sync_pdf)
        return f"PDF Gerado. A URL é: {url}\n\nATENÇÃO: O usuário NÃO vê o que acontece nas ferramentas. Você OBRIGATORIAMENTE DEVE incluir exatamente este texto na sua resposta final: [Baixar PDF]({url})"

    elif func_name == "generate_excel":
        import asyncio
        import time
        from openpyxl import Workbook
        import io

        def sync_excel():
            headers = [str(h) for h in func_args.get("headers", [])]
            rows = [[str(c) for c in row] for row in func_args.get("rows", [])]
            title = func_args.get("title", "Planilha")[:31]

            wb = Workbook()
            ws = wb.active
            ws.title = title
            ws.append(headers)
            for row in rows:
                ws.append(row)

            buffer = io.BytesIO()
            wb.save(buffer)
            file_bytes = buffer.getvalue()

            filename = func_args.get("filename", f"planilha-{int(time.time())}")
            if not filename.endswith(".xlsx"):
                filename += ".xlsx"

            return upload_to_supabase(
                config.supabase_storage_bucket,
                filename,
                file_bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )

        url = await asyncio.to_thread(sync_excel)
        return f"Excel Gerado. A URL é: {url}\n\nATENÇÃO: O usuário NÃO vê o que acontece nas ferramentas. Você OBRIGATORIAMENTE DEVE incluir exatamente este texto na sua resposta final: [Baixar Planilha]({url})"

    elif func_name == "execute_python":
        import asyncio
        import tempfile
        import os
        
        code = func_args.get("code", "")
        if not config.allow_code_execution:
            return "❌ Execução de código desabilitada no backend."

        # Security checks
        blocked = ["os.system", "eval(", "exec(", "__import__", "requests.", "urllib.", "open("]
        for b in blocked:
            if b in code:
                return f"❌ Comando bloqueado por segurança: {b}"

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, dir="/tmp") as f:
            f.write(code)
            tmp_name = f.name

        try:
            process = await asyncio.create_subprocess_exec(
                "python3", tmp_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="/tmp"
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
            except asyncio.TimeoutError:
                process.kill()
                await process.communicate()
                return "❌ Timeout na execução do Python (10s excedidos)."

            out_text = stdout.decode() if stdout else ""
            err_text = stderr.decode() if stderr else ""
            output = out_text + (f"\nSTDERR: {err_text}" if err_text else "")
            return output if output.strip() else "(Código executado sem output. Use print() para ver resultado.)"
        except Exception as e:
            return f"Erro na execução: {e}"
        finally:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)

    return f"Tool desconhecida: {func_name}"


async def agent_stream(messages: list, model: str, system_prompt: str) -> AsyncGenerator[str, None]:
    """
    Loop do agente com streaming SSE e suporte a ReAct.
    """
    config = get_config()
    MAX_ITERATIONS = 5

    # Não injetamos instruções ReAct explícitas aqui para evitar vazamento (leakage) no chat do usuário
    # O modelo deve pensar naturalmente usando tool_calls quando necessário.

    current_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if isinstance(msg, dict):
            current_messages.append(msg)
        else:
            current_messages.append(msg.model_dump())

    iteration = 0

    try:
        while iteration < MAX_ITERATIONS:
            iteration += 1
            # yield sse_event("steps", f"<step>🤔 Pensando... (iteração {iteration})</step>")

            # Chamar LLM usando stream verdadeiro
            from backend.core.llm import stream_openrouter
            
            content_accumulated = ""
            tool_calls_accumulated = []
            
            is_first_chunk = True
            
            try:
                async for chunk_data in stream_openrouter(
                    messages=current_messages,
                    model=model,
                    max_tokens=4096,
                    tools=TOOLS,
                ):
                    if chunk_data.get("error"):
                        yield sse_event("error", json.dumps(chunk_data["error"]))
                        return
                        
                    choices = chunk_data.get("choices", [])
                    if not choices:
                        continue
                        
                    delta = choices[0].get("delta", {})
                    
                    # Se tiver conteúdo de texto, strema imediatamente para o front
                    if "content" in delta and delta["content"]:
                        t_content = delta["content"]
                        content_accumulated += t_content
                        
                        # Se for o primeiro pedaço de texto, enviamos um thought event (para compatibilidade)
                        if is_first_chunk:
                            yield sse_event("thought", "") # sinaliza inicio
                            is_first_chunk = False
                            
                        # Manda o pedaço diretamente para a tela do usuário!
                        yield sse_event("chunk", t_content)
                        
                    # Se for chamada de ferramenta, acumula (streams de tools vêm em pedaços do JSON)
                    if "tool_calls" in delta and delta["tool_calls"]:
                        for tc_delta in delta["tool_calls"]:
                            idx = tc_delta.get("index", 0)
                            while len(tool_calls_accumulated) <= idx:
                                tool_calls_accumulated.append({"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                                
                            if tc_delta.get("id"):
                                tool_calls_accumulated[idx]["id"] = tc_delta["id"]
                            if tc_delta.get("function"):
                                if tc_delta["function"].get("name"):
                                    tool_calls_accumulated[idx]["function"]["name"] += tc_delta["function"]["name"]
                                if tc_delta["function"].get("arguments"):
                                    tool_calls_accumulated[idx]["function"]["arguments"] += tc_delta["function"]["arguments"]

            except Exception as e:
                yield sse_event("error", f"Stream error: {str(e)}")
                return

            # Ao fim do stream, montamos a mensagem para o histórico e execução de tools
            message = {"role": "assistant"}
            if content_accumulated:
                message["content"] = content_accumulated
            if tool_calls_accumulated:
                message["tool_calls"] = tool_calls_accumulated
                
            current_messages.append(message)
            content = content_accumulated

            # Verificar tool calls
            if message.get("tool_calls"):
                tool_names = [t["function"]["name"] for t in message["tool_calls"]]
                # yield sse_event("steps", f"<step>🔧 Ferramentas: {', '.join(tool_names)}</step>")
                yield sse_event("action", f"Executando: {', '.join(tool_names)}")

                for tool in message["tool_calls"]:
                    func_name = tool["function"]["name"]
                    func_args = json.loads(tool["function"]["arguments"])

                    try:
                        result = await execute_tool(func_name, func_args, config)
                    except Exception as e:
                        result = f"Erro: {e}"
                        yield sse_event("error", f"Erro em {func_name}: {e}")

                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool["id"],
                        "content": result,
                    })
                    yield sse_event("observation", f"Resultado de {func_name}: {str(result)[:200]}...")
            else:
                # Resposta final
                # Se já enviamos como 'thought', talvez não precisemos enviar como 'chunk' novamente se for redundante,
                # mas 'thought' é um evento de passo. 'chunk' é a resposta final.
                # Se o modelo seguiu o ReAct, a resposta final vem após o último Thought/Observation.
                # Como extraímos 'content' acima, ele já foi enviado como Thought.
                # Mas o frontend espera 'chunk' para exibir a resposta.
                
                # Se for a resposta final (sem tool calls), enviamos como chunks
                words = content.split(" ")
                CHUNK_SIZE = 8
                for i in range(0, len(words), CHUNK_SIZE):
                    chunk = " ".join(words[i:i + CHUNK_SIZE])
                    is_last = i + CHUNK_SIZE >= len(words)
                    yield sse_event("chunk", chunk + ("" if is_last else " "))

                # yield sse_event("steps", "<step>✅ Finalizado.</step>")
                return

        yield sse_event("error", "Limite de iterações atingido.")

    except Exception as e:
        logger.error(f"Agent chat error: {e}", exc_info=True)
        yield sse_event("error", str(e))


@router.post("/chat")
async def chat_endpoint(request: Request):
    """
    Endpoint de chat com SSE streaming.
    """
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "anthropic/claude-3.5-sonnet")
    system_prompt = body.get("system_prompt", SYSTEM_PROMPT)

    return StreamingResponse(
        agent_stream(messages, model, system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
