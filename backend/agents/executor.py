"""
Execução de ferramentas para os agentes especialistas.

Cada função de ferramenta está isolada aqui, desacoplada do endpoint HTTP.
"""

import asyncio
import io
import logging
import os
import tempfile
import time

import httpx

logger = logging.getLogger(__name__)


async def execute_tool(func_name: str, func_args: dict) -> str:
    """Despachante principal: executa a ferramenta e retorna resultado como string."""
    if func_name == "web_search":
        return await _web_search(func_args.get("query", ""))

    elif func_name == "web_fetch":
        return await _web_fetch(func_args.get("url", ""))

    elif func_name == "generate_pdf":
        return await _generate_pdf(func_args)

    elif func_name == "generate_excel":
        return await _generate_excel(func_args)

    elif func_name == "execute_python":
        return await _execute_python(func_args.get("code", ""))

    return f"Ferramenta desconhecida: {func_name}"


# ── Implementações ─────────────────────────────────────────────────────────────

async def _web_search(query: str) -> str:
    from backend.services.search_service import search_web_formatted
    return await search_web_formatted(query)


async def _web_fetch(url: str) -> str:
    try:
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
        title = soup.title.string if soup.title else url

        if len(text) > 20000:
            text = text[:20000] + "... [Truncado]"

        return f"**Conteúdo de {url}**\n**Título:** {title}\n\n{text}"
    except Exception as e:
        return f"Erro ao ler URL ({url}): {e}"


async def _generate_pdf(args: dict) -> str:
    from backend.core.config import get_config
    from backend.core.supabase_client import upload_to_supabase
    from backend.services.file_service import generate_pdf

    config = get_config()

    def sync_pdf():
        pdf_bytes = generate_pdf(args["title"], args["content"])
        filename = args.get("filename", f"doc-{int(time.time())}")
        if not filename.endswith(".pdf"):
            filename += ".pdf"
        return upload_to_supabase(
            config.supabase_storage_bucket, filename, pdf_bytes, "application/pdf"
        )

    url = await asyncio.to_thread(sync_pdf)
    return (
        f"PDF gerado com sucesso. URL: {url}\n\n"
        f"INSTRUÇÃO OBRIGATÓRIA: Inclua exatamente este link na resposta final: [Baixar PDF]({url})"
    )


async def _generate_excel(args: dict) -> str:
    from backend.core.config import get_config
    from backend.core.supabase_client import upload_to_supabase
    from openpyxl import Workbook

    config = get_config()

    def sync_excel():
        headers = [str(h) for h in args.get("headers", [])]
        rows = [[str(c) for c in row] for row in args.get("rows", [])]
        title = args.get("title", "Planilha")[:31]

        wb = Workbook()
        ws = wb.active
        ws.title = title
        ws.append(headers)
        for row in rows:
            ws.append(row)

        buffer = io.BytesIO()
        wb.save(buffer)
        file_bytes = buffer.getvalue()

        filename = args.get("filename", f"planilha-{int(time.time())}")
        if not filename.endswith(".xlsx"):
            filename += ".xlsx"

        return upload_to_supabase(
            config.supabase_storage_bucket,
            filename,
            file_bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    url = await asyncio.to_thread(sync_excel)
    return (
        f"Planilha Excel gerada. URL: {url}\n\n"
        f"INSTRUÇÃO OBRIGATÓRIA: Inclua exatamente este link na resposta final: [Baixar Planilha]({url})"
    )


async def _execute_python(code: str) -> str:
    from backend.core.config import get_config
    config = get_config()

    if not config.allow_code_execution:
        return "❌ Execução de código desabilitada neste ambiente."

    blocked = ["os.system", "eval(", "exec(", "__import__", "requests.", "urllib."]
    for b in blocked:
        if b in code:
            return f"❌ Operação bloqueada por segurança: {b}"

    tmp_dir = tempfile.gettempdir()
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, dir=tmp_dir) as f:
        f.write(code)
        tmp_name = f.name

    try:
        python_cmd = "python" if os.name == "nt" else "python3"
        process = await asyncio.create_subprocess_exec(
            python_cmd, tmp_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=tmp_dir,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            return "❌ Timeout na execução (10s excedidos)."

        out = stdout.decode() if stdout else ""
        err = stderr.decode() if stderr else ""
        result = out + (f"\nSTDERR: {err}" if err else "")
        return result if result.strip() else "(Código executado sem output. Use print() para ver resultados.)"
    except Exception as e:
        return f"Erro na execução: {e}"
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
