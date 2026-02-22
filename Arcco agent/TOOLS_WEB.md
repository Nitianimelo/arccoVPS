# Tools: Pesquisa Web

## Abordagens

| Abordagem | Lib | Quando usar |
|-----------|-----|------------|
| HTTP + Parse | httpx + beautifulsoup4 | Páginas estáticas, APIs |
| Browser headless | playwright | SPAs, JS-heavy, login required |
| Search API | SerpAPI, Brave Search API | Resultados de busca estruturados |
| Anthropic web_search | tool nativa | Dentro de chamadas Claude |

## Tool Definition: Web Search

```python
register_tool(
    name="web_search",
    description="Pesquisa na internet e retorna resultados relevantes. "
                "Use para encontrar informações atualizadas, dados, artigos, "
                "e qualquer informação disponível publicamente na web. "
                "Retorna título, URL e snippet de cada resultado.",
    parameters={
        "query": {
            "type": "string",
            "description": "Termo de busca (seja específico, 2-6 palavras)",
            "required": True,
        },
        "num_results": {
            "type": "integer",
            "description": "Número de resultados (default: 5, max: 10)",
        },
    },
    handler=handle_web_search,
)
```

## Implementação: Brave Search API (recomendada)

```python
import httpx
import os

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")
BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"

def handle_web_search(query: str, num_results: int = 5) -> str:
    """Pesquisa via Brave Search API."""
    if not BRAVE_API_KEY:
        return "ERRO: BRAVE_SEARCH_API_KEY não configurada."

    try:
        response = httpx.get(
            BRAVE_URL,
            headers={"X-Subscription-Token": BRAVE_API_KEY},
            params={"q": query, "count": min(num_results, 10)},
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("web", {}).get("results", [])[:num_results]:
            results.append(
                f"**{item['title']}**\n"
                f"URL: {item['url']}\n"
                f"{item.get('description', 'Sem descrição')}\n"
            )

        if not results:
            return f"Nenhum resultado encontrado para: {query}"

        return f"Resultados para '{query}':\n\n" + "\n---\n".join(results)

    except httpx.TimeoutException:
        return f"ERRO: Timeout ao pesquisar '{query}'. Tente uma query mais específica."
    except Exception as e:
        return f"ERRO ao pesquisar: {e}"
```

## Implementação: Web Fetch (extrair conteúdo de URL)

```python
register_tool(
    name="web_fetch",
    description="Acessa uma URL e extrai o conteúdo textual da página. "
                "Use para ler artigos, documentação, ou qualquer página web. "
                "Retorna o texto limpo sem HTML.",
    parameters={
        "url": {
            "type": "string",
            "description": "URL completa da página (incluindo https://)",
            "required": True,
        },
        "max_length": {
            "type": "integer",
            "description": "Máximo de caracteres a retornar (default: 5000)",
        },
    },
    handler=handle_web_fetch,
)

def handle_web_fetch(url: str, max_length: int = 5000) -> str:
    """Busca e extrai conteúdo textual de uma URL."""
    from bs4 import BeautifulSoup

    try:
        response = httpx.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; AgentBot/1.0)"},
            timeout=20.0,
            follow_redirects=True,
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove scripts, styles, nav
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Extrai texto
        text = soup.get_text(separator="\n", strip=True)

        # Limpa linhas vazias excessivas
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        if len(clean_text) > max_length:
            clean_text = clean_text[:max_length] + "\n\n[...truncado]"

        return f"Conteúdo de {url}:\n\n{clean_text}"

    except httpx.TimeoutException:
        return f"ERRO: Timeout ao acessar {url}"
    except httpx.HTTPStatusError as e:
        return f"ERRO: HTTP {e.response.status_code} ao acessar {url}"
    except Exception as e:
        return f"ERRO ao acessar URL: {e}"
```

## Implementação: Via Claude API (web_search nativa)

Se o agente usa a API da Anthropic, a tool de web_search pode ser habilitada nativamente:

```python
response = client.messages.create(
    model="claude-sonnet-4-5-20250514",
    max_tokens=4096,
    tools=[
        {
            "type": "web_search_20250305",
            "name": "web_search",
        },
        # ... outras tools customizadas
    ],
    messages=messages,
)
```

Isso permite que o Claude faça buscas diretamente sem implementação custom.
**Vantagem**: Zero infra de search.
**Desvantagem**: Menos controle sobre fontes e formatação.

## Boas Práticas

1. **Sempre timeout** — 15-20s é razoável para web
2. **Truncar output** — Páginas web podem ter 100k+ chars. Limite a 5-10k.
3. **User-Agent** — Alguns sites bloqueiam requests sem User-Agent
4. **Rate limiting** — Respeite robots.txt e limites de APIs
5. **Cache** — Mesma query em 5min? Retorne cache
