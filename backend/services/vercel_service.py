"""
Deploy de páginas HTML estáticas na Vercel via REST API.
"""

import base64
import re
import logging

import httpx

logger = logging.getLogger(__name__)


async def deploy_to_vercel(files: dict[str, str], name: str) -> str:
    """
    Faz deploy de um projeto React+Vite ou página HTML estática na Vercel.

    Args:
        files: dicionário {path: conteúdo} — ex: {"src/App.tsx": "...", "package.json": "..."}
               Para páginas estáticas simples, use {"index.html": "<html>..."}.
        name: nome do projeto (vira subdomínio na Vercel)

    Returns:
        URL pública do deploy (ex: https://arcco-meu-app-xxx.vercel.app)
    """
    from backend.core.llm import get_vercel_key

    key = await get_vercel_key()
    if not key:
        raise ValueError(
            "Vercel API key não configurada. "
            "Adicione na tabela ApiKeys do Supabase: provider='vercel', api_key='...'."
        )

    safe_name = re.sub(r"[^a-z0-9-]", "-", name.lower())
    safe_name = re.sub(r"-+", "-", safe_name).strip("-")[:50]
    project_name = f"arcco-{safe_name}" if safe_name else "arcco-app"

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # Busca o teamId padrão da conta (necessário para contas team)
    team_id: str | None = None
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            user_resp = await client.get("https://api.vercel.com/v2/user", headers=headers)
            if user_resp.status_code == 200:
                team_id = user_resp.json().get("user", {}).get("defaultTeamId")
        except Exception as e:
            logger.warning(f"[VERCEL] Não foi possível obter teamId: {e}")

    deploy_url = "https://api.vercel.com/v13/deployments"
    if team_id:
        deploy_url += f"?teamId={team_id}"
        logger.info(f"[VERCEL] Usando teamId: {team_id}")

    # Detecta se é um projeto Vite/React (tem package.json) ou página estática
    is_vite_project = "package.json" in files
    framework = "vite" if is_vite_project else None

    # Converte todos os arquivos para base64
    vercel_files = [
        {
            "file": path,
            "data": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "encoding": "base64",
        }
        for path, content in files.items()
    ]

    logger.info(f"[VERCEL] Deployando {len(vercel_files)} arquivo(s) — framework={framework}")

    payload = {
        "name": project_name,
        "files": vercel_files,
        "projectSettings": {
            "framework": framework,
        },
        "target": "production",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(deploy_url, headers=headers, json=payload)

    if response.status_code not in (200, 201):
        error_body = response.text[:500]
        logger.error(f"[VERCEL] Deploy falhou ({response.status_code}): {error_body}")
        if response.status_code == 403:
            raise ValueError(
                "Vercel API retornou 403 (sem permissão para criar projetos). "
                "Gere um Personal Access Token em https://vercel.com/account/tokens "
                "e atualize a chave no painel admin (provider='vercel')."
            )
        raise ValueError(f"Vercel API retornou {response.status_code}: {error_body}")

    data = response.json()
    url = data.get("url", "")
    if not url:
        raise ValueError(f"Vercel não retornou URL. Resposta: {str(data)[:300]}")

    full_url = f"https://{url}" if not url.startswith("http") else url
    logger.info(f"[VERCEL] Deploy concluído: {full_url}")
    return full_url
