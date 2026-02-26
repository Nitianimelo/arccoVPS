"""
Serving de Páginas Publicadas — Arcco Pages.

Endpoint público que serve o HTML estático compilado das páginas
criadas pelos usuários no Arcco Builder.

URL pública: pages.yourdomain.com/{slug}
Mapeamento:  GET /p/{slug}  (prefixo /p adicionado em main.py)

Fluxo:
  1. Recebe o slug na URL
  2. Consulta a tabela 'pages_user' no Supabase
  3. Verifica que a página existe e está publicada
  4. Retorna o HTML com headers de cache agressivos
  5. Em caso de erro retorna uma página 404 elegante

Cache:
  - Header: Cache-Control: public, max-age=300 (5 min no cliente/nginx)
  - nginx faz proxy_cache: 5 min para 200, 1 min para 404
  - Resultado: a VPS só toca no Supabase na primeira visita de cada slug
"""

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from backend.core.config import get_config

logger = logging.getLogger(__name__)
router = APIRouter()


# ── HTML de erro 404 ───────────────────────────────────────────────────────────

NOT_FOUND_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página não encontrada — Arcco Pages</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans">
    <div class="text-center max-w-md mx-auto px-6">
        <div class="text-8xl font-black text-indigo-500/20 mb-6">404</div>
        <h1 class="text-3xl font-bold text-white mb-3">Página não encontrada</h1>
        <p class="text-neutral-400 mb-8">
            Esta página não existe ou foi despublicada pelo criador.
        </p>
        <a href="/" class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all">
            ← Voltar ao início
        </a>
        <p class="text-xs text-neutral-700 mt-8">Arcco Pages — Plataforma de landing pages com IA</p>
    </div>
</body>
</html>"""

NOT_PUBLISHED_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página não publicada — Arcco Pages</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans">
    <div class="text-center max-w-md mx-auto px-6">
        <div class="text-6xl mb-6">🔒</div>
        <h1 class="text-3xl font-bold text-white mb-3">Página privada</h1>
        <p class="text-neutral-400 mb-8">
            Esta página ainda não foi publicada pelo criador.
        </p>
        <p class="text-xs text-neutral-700">Arcco Pages — Plataforma de landing pages com IA</p>
    </div>
</body>
</html>"""


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _fetch_page_from_supabase(slug: str) -> dict | None:
    """
    Consulta a tabela 'pages_user' no Supabase via REST API.
    Retorna o registro completo ou None se não encontrado.
    """
    config = get_config()
    url = (
        f"{config.supabase_url}/rest/v1/pages_user"
        f"?url_slug=eq.{slug}&select=codepages,publicado,nome,updated_at&limit=1"
    )
    headers = {
        "apikey": config.supabase_key,
        "Authorization": f"Bearer {config.supabase_key}",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                logger.warning(f"[Pages] Supabase error {res.status_code} for slug={slug}")
                return None
            rows = res.json()
            return rows[0] if rows else None
    except Exception as e:
        logger.error(f"[Pages] Error fetching slug={slug}: {e}")
        return None


def _build_cache_headers(max_age: int = 300) -> dict:
    """Headers de cache para respostas 200 (5 minutos padrão)."""
    return {
        "Cache-Control": f"public, max-age={max_age}, s-maxage={max_age}",
        "X-Arcco-Served-By": "arcco-pages",
        "X-Arcco-Timestamp": datetime.utcnow().isoformat(),
    }


def _inject_page_meta(html: str, nome: str) -> str:
    """
    Injeta um comentário de metadados e o tag <meta name="generator"> no HTML.
    Não modifica o conteúdo visual.
    """
    meta_tag = f'<meta name="generator" content="Arcco Pages">\n    <meta name="page-name" content="{nome}">'
    if "<head>" in html:
        html = html.replace("<head>", f"<head>\n    {meta_tag}", 1)
    return html


# ── Endpoint principal ─────────────────────────────────────────────────────────

@router.get("/{slug}", response_class=HTMLResponse)
async def serve_page(slug: str):
    """
    GET /p/{slug}  →  serve o HTML da página publicada.

    Respostas possíveis:
      200 → HTML completo da página (com headers de cache)
      404 → Página não existe (HTML de erro elegante)
      403 → Página existe mas não está publicada
    """

    # Busca no Supabase
    page = await _fetch_page_from_supabase(slug)

    if page is None:
        return HTMLResponse(
            content=NOT_FOUND_HTML,
            status_code=404,
            headers={"Cache-Control": "public, max-age=60"},
        )

    if not page.get("publicado"):
        return HTMLResponse(
            content=NOT_PUBLISHED_HTML,
            status_code=403,
            headers={"Cache-Control": "no-store"},
        )

    html = page.get("codepages", "")
    if not html:
        return HTMLResponse(content=NOT_FOUND_HTML, status_code=404)

    # Injeta metadados básicos
    html = _inject_page_meta(html, page.get("nome", "Página"))

    return HTMLResponse(
        content=html,
        status_code=200,
        headers=_build_cache_headers(max_age=300),
    )


@router.get("/", response_class=HTMLResponse)
async def pages_index():
    """
    GET /p/  →  índice público (redireciona para a app principal).
    """
    return HTMLResponse(
        content='<meta http-equiv="refresh" content="0;url=/">',
        status_code=302,
    )
