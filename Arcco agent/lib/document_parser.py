"""
Parser de documentos robusto e otimizado para Netlify.
Suporta HTML, Plain text, com timeout e resource limits.
"""

import asyncio
import logging
from datetime import datetime
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class RobustDocumentParser:
    """Parser otimizado para Netlify Serverless."""

    # Netlify Serverless: timeout 26s, cold start ~500ms
    MAX_TIMEOUT = 20.0  # Margem de segurança
    MAX_RESPONSE_SIZE = 2_000_000  # 2MB
    MAX_PARSED_SIZE = 50_000  # 50KB de texto final

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; AgentBot/1.0; "
            "+https://github.com/arcco-ai/v4)"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    IGNORED_TAGS = {
        "script", "style", "nav", "footer", "header",
        "aside", "meta", "link", "noscript", "iframe",
        "svg", "path", "line", "circle", "g", "defs"
    }

    IGNORED_CLASSES = {
        "ad", "advert", "ads", "advertisement",
        "cookie-notice", "cookie-banner", "cookie-consent",
        "sidebar", "widget", "related-posts", "comments"
    }

    @staticmethod
    async def fetch_and_parse(
        url: str,
        timeout: float = 20.0,
        max_chars: int = 50_000
    ) -> Tuple[str, dict]:
        """
        Busca e parseia documento com robustez.

        Returns:
            (conteúdo_parseado, metadados)
        """
        import time

        metadata = {
            "url": url,
            "status": "unknown",
            "error": None,
            "char_count": 0,
            "was_truncated": False,
            "parse_time_ms": 0,
            "fetch_time_ms": 0
        }

        start_total = time.time()

        try:
            import httpx

            # 1️⃣ Fetch com timeout curto
            start_fetch = time.time()
            timeout_obj = httpx.Timeout(timeout, pool=5.0)

            async with httpx.AsyncClient(
                timeout=timeout_obj,
                limits=httpx.Limits(
                    max_connections=1,
                    max_keepalive_connections=0
                )
            ) as client:
                response = await client.get(
                    url,
                    headers=RobustDocumentParser.HEADERS,
                    follow_redirects=True
                )
                response.raise_for_status()

                metadata["status"] = response.status_code
                metadata["fetch_time_ms"] = int(
                    (time.time() - start_fetch) * 1000
                )

                # 2️⃣ Check size antes de parsear
                content_length = len(response.content)
                if content_length > RobustDocumentParser.MAX_RESPONSE_SIZE:
                    return (
                        f"[Documento muito grande: {content_length:,} bytes]",
                        {
                            **metadata,
                            "error": "size_limit_exceeded"
                        }
                    )

                html_content = response.text

        except asyncio.TimeoutError:
            metadata["error"] = "timeout"
            logger.warning(f"Timeout fetching {url}")
            return (
                "[Timeout ao buscar documento - tente novamente]",
                metadata
            )
        except Exception as e:
            metadata["error"] = str(e)
            logger.error(f"Fetch error for {url}: {e}")
            return (f"[Erro ao buscar documento: {str(e)[:100]}]", metadata)

        # 3️⃣ Parse HTML
        try:
            start_parse = time.time()
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html_content, "html.parser")

            # Remove tags ignoradas (melhora performance)
            for tag_name in RobustDocumentParser.IGNORED_TAGS:
                for tag in soup.find_all(tag_name):
                    tag.decompose()

            # Remove elementos com classes ignoradas
            for cls_name in RobustDocumentParser.IGNORED_CLASSES:
                for elem in soup.find_all(
                    class_=lambda x: x and cls_name in x.lower()
                ):
                    elem.decompose()

            # 4️⃣ Extract texto principal
            main_content = None
            for selector in ["article", "main", "[role='main']"]:
                main_content = soup.select_one(selector)
                if main_content:
                    break

            if not main_content:
                main_content = soup.body or soup

            # 5️⃣ Extrair texto com estrutura
            text_lines = []
            for element in main_content.find_all(
                ["h1", "h2", "h3", "h4", "p", "li", "td", "blockquote"]
            ):
                text = element.get_text(strip=True)
                if text and len(text) > 5:
                    text_lines.append(text)

            full_text = "\n".join(text_lines)

            # 6️⃣ Truncar se necessário
            if len(full_text) > max_chars:
                full_text = full_text[:max_chars] + "\n\n[...truncado]"
                metadata["was_truncated"] = True

            metadata["char_count"] = len(full_text)
            metadata["parse_time_ms"] = int(
                (time.time() - start_parse) * 1000
            )

            logger.info(
                f"Parsed {metadata['url'][:60]}... "
                f"({metadata['char_count']} chars in "
                f"{metadata['parse_time_ms']}ms)"
            )

            return full_text, metadata

        except Exception as e:
            logger.error(f"Parse error for {url}: {e}")
            metadata["error"] = f"parse_error: {str(e)[:100]}"
            return ("[Erro ao parsear documento]", metadata)

    @staticmethod
    async def extract_key_info(text: str) -> dict:
        """
        Extrai informações-chave do texto.
        Economiza tokens: usuário não precisa ler tudo.
        """
        import re

        return {
            "total_chars": len(text),
            "paragraphs": text.count("\n\n"),
            "sentences": len(re.split(r'[.!?]+', text)),
            "lines": len(text.split("\n")),
            "key_numbers": [
                word for word in text.split()
                if any(c.isdigit() for c in word)
            ][:15],  # Primeiros 15 números
            "headings": len(re.findall(r'^\s*#+ ', text, re.MULTILINE)),
            "has_code": bool(re.search(r'```|<code>', text))
        }

    @staticmethod
    def create_summary_prompt(text: str, metadata: dict) -> str:
        """Cria prompt resumido para o agente."""
        key_info = asyncio.run(RobustDocumentParser.extract_key_info(text))

        summary = f"""
📄 **Documento parseado com sucesso**
- **URL**: {metadata['url'][:70]}...
- **Status**: {metadata['status']}
- **Tamanho**: {metadata['char_count']:,} caracteres (tempo: {metadata['parse_time_ms']}ms)
- **Estrutura**: {key_info['paragraphs']} parágrafos, {key_info['sentences']} sentenças
- **Truncado**: {'Sim ⚠️' if metadata['was_truncated'] else 'Não ✅'}

---
{text}
"""
        return summary


class MarkdownDocumentParser:
    """Parser especializado para arquivos Markdown."""

    @staticmethod
    async def parse_markdown(
        file_path: str,
        max_chars: int = 50_000
    ) -> Tuple[str, dict]:
        """Parseia arquivo Markdown."""
        metadata = {
            "file": file_path,
            "error": None,
            "char_count": 0,
            "was_truncated": False
        }

        try:
            from pathlib import Path

            path = Path(file_path)
            if not path.exists():
                metadata["error"] = "file_not_found"
                return "", metadata

            content = path.read_text(encoding="utf-8")

            if len(content) > max_chars:
                content = content[:max_chars] + "\n\n[...truncado]"
                metadata["was_truncated"] = True

            metadata["char_count"] = len(content)
            return content, metadata

        except Exception as e:
            logger.error(f"Markdown parse error: {e}")
            metadata["error"] = str(e)
            return "", metadata
