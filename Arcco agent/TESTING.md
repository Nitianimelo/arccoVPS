# 🧪 Testing Guide - Arcco Agent v2.0

Guia para testar todas as melhorias implementadas.

---

## 1️⃣ Setup Inicial

### Verificar Instalação

```bash
# Entrar no diretório
cd "C:/Users/User/Documents/arcco.ai.v4-master/Arcco agent"

# Ativar venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Verificar instalação
python -c "from lib import get_config; print('✅ Imports OK')"
```

### Verificar Configuração

```bash
# Criar .env
cp .env.example .env

# Editar .env com sua ANTHROPIC_API_KEY
# (e opcionalmente SUPABASE_URL/KEY e BRAVE_SEARCH_API_KEY)

# Verificar config
python -c "from lib import get_config; c = get_config(); is_valid, msg = c.validate(); print(msg)"
```

---

## 2️⃣ Testes Unitários

### Teste: Config Management

```python
# test_config.py
from lib import get_config, reload_config

def test_config_singleton():
    """Verifica que config é singleton."""
    c1 = get_config()
    c2 = get_config()
    assert c1 is c2
    print("✅ Config singleton OK")

def test_config_validation():
    """Verifica validação de config."""
    c = get_config()
    is_valid, msg = c.validate()
    assert is_valid, f"Config inválida: {msg}"
    print(f"✅ Config valid: {msg}")

def test_env_override():
    """Verifica override por variável de ambiente."""
    import os
    os.environ["AGENT_MAX_ITERATIONS"] = "5"

    reload_config()
    c = get_config()

    assert c.max_iterations == 5
    print("✅ Env override OK")

if __name__ == "__main__":
    test_config_singleton()
    test_config_validation()
    test_env_override()
```

Executar:
```bash
python test_config.py
```

### Teste: Document Parser

```python
# test_parser.py
import asyncio
from lib import RobustDocumentParser

async def test_web_fetch():
    """Testa web fetch com robustez."""
    # Usar URL pública segura
    url = "https://example.com"

    text, metadata = await RobustDocumentParser.fetch_and_parse(url)

    assert metadata["status"] == 200
    assert len(text) > 0
    assert metadata["parse_time_ms"] < 20000  # < 20s

    print(f"✅ Web fetch OK")
    print(f"   - URL: {metadata['url']}")
    print(f"   - Chars: {metadata['char_count']}")
    print(f"   - Time: {metadata['parse_time_ms']}ms")

async def test_large_document():
    """Testa truncagem de documentos grandes."""
    url = "https://en.wikipedia.org/wiki/Python_(programming_language)"

    text, metadata = await RobustDocumentParser.fetch_and_parse(
        url,
        max_chars=5000
    )

    assert metadata["was_truncated"]
    assert len(text) <= 5100  # 5000 + "[...truncado]"

    print(f"✅ Large doc truncation OK")
    print(f"   - Chars: {metadata['char_count']}")
    print(f"   - Truncated: {metadata['was_truncated']}")

if __name__ == "__main__":
    asyncio.run(test_web_fetch())
    asyncio.run(test_large_document())
```

Executar:
```bash
python test_parser.py
```

### Teste: Tool Registry

```python
# test_registry.py
from lib import get_tool_registry, register_tool

def test_tool_registration():
    """Testa registro de tools."""
    registry = get_tool_registry()

    # Registrar tool test
    @register_tool(
        name="test_add",
        description="Adiciona dois números",
        parameters={
            "a": {"type": "number", "required": True},
            "b": {"type": "number", "required": True}
        },
        category="math"
    )
    def add_numbers(a: int, b: int) -> str:
        return str(a + b)

    # Verificar registro
    assert len(registry.get_tools()) > 0
    assert registry.get_handler("test_add") is not None

    # Executar
    result, error = registry.execute_tool("test_add", {"a": 5, "b": 3})
    assert error is None
    assert result == "8"

    print("✅ Tool registry OK")
    print(f"   - Tools: {len(registry.get_tools())}")

def test_tool_categories():
    """Testa categorização de tools."""
    registry = get_tool_registry()

    web_tools = registry.get_tools_by_category("web")
    file_tools = registry.get_tools_by_category("files")

    assert len(web_tools) > 0
    assert len(file_tools) > 0

    print(f"✅ Tool categories OK")
    print(f"   - Web: {len(web_tools)}")
    print(f"   - Files: {len(file_tools)}")

if __name__ == "__main__":
    test_tool_registration()
    test_tool_categories()
```

Executar:
```bash
python test_registry.py
```

---

## 3️⃣ Testes de Integração

### Teste: Agent Loop Simples

```bash
# Executar agent básico com input simples
python agent_with_tools_v2.py << EOF
Qual é 2 + 2?
sair
EOF
```

Esperado:
```
🤖 Arcco Agent v2.0 iniciado
📚 **Ferramentas Disponíveis:**
...
Você: Qual é 2 + 2?
🔄 Processando...
  ✅ execute_python → 4
🤖 2 + 2 = 4
📊 Stats: X iterações, 1 tools, Y cache hits, ZZZms
```

### Teste: Web Fetch

```bash
python agent_with_tools_v2.py << EOF
Resumir: https://example.com
sair
EOF
```

Esperado:
```
🔄 Processando...
  ✅ web_fetch → [Conteúdo parseado...]
🤖 [Resumo do conteúdo...]
```

### Teste: PDF Generation

```bash
python agent_with_tools_v2.py << EOF
Gerar um PDF de relatório sobre IA
sair
EOF
```

Esperado:
```
🔄 Processando...
  ✅ web_search → [Resultados...]
  ✅ web_fetch → [Conteúdo...]
  ✅ generate_pdf → PDF gerado: report.pdf (12345 bytes)
🤖 PDF gerado com sucesso!
```

---

## 4️⃣ Testes de API (FastAPI)

### Setup

```bash
# Terminal 1: Iniciar servidor
uvicorn agent_fastapi_v2:app --reload --port 8000
```

Output esperado:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
✅ Arcco Agent API v2.0 starting...
✅ API ready
```

### Teste: Health Check

```bash
curl http://localhost:8000/health | jq
```

Esperado:
```json
{
  "status": "ok",
  "model": "claude-sonnet-4-5-20250929",
  "uptime_seconds": 5,
  "sessions_active": 0,
  "tools_available": 7
}
```

### Teste: List Tools

```bash
curl http://localhost:8000/tools | jq
```

Esperado:
```json
{
  "total": 7,
  "tools": [
    {
      "name": "web_search",
      "description": "Pesquisa na internet...",
      "input_schema": {...},
      "category": "web"
    },
    ...
  ]
}
```

### Teste: Chat Request/Response

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quanto é 5 * 3?",
    "session_id": "test-user",
    "use_cache": true
  }' | jq
```

Esperado:
```json
{
  "response": "5 * 3 = 15",
  "session_id": "test-user",
  "iterations": 1,
  "tools_used": ["execute_python"],
  "cache_hit": false,
  "total_time_ms": 1234,
  "tokens_saved": 0
}
```

### Teste: Session Management

```bash
# Obter info de sessão
curl http://localhost:8000/session/test-user | jq

# Deletar sessão
curl -X DELETE http://localhost:8000/session/test-user | jq
```

### Teste: Cache

```bash
# 1ª request (cache miss)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Qual é a capital da França?"}' | jq '.cache_hit'
# → false

# 2ª request (cache hit)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Qual é a capital da França?"}' | jq '.cache_hit'
# → true
# → tokens_saved: 1200 (aproximado)

# Limpar cache
curl -X POST http://localhost:8000/cache/clear
```

---

## 5️⃣ Testes de Streaming SSE

### HTML Test Page

```html
<!-- test-sse.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Arcco Agent SSE Test</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        #output { background: #f5f5f5; padding: 20px; border-radius: 5px; max-height: 500px; overflow-y: auto; }
        .event { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
        .tool_start { border-color: #ffc107; background: #fffbf0; }
        .tool_complete { border-color: #28a745; background: #f0fff4; }
        .tool_error { border-color: #dc3545; background: #fff5f5; }
        .response_complete { border-color: #17a2b8; background: #f0f8ff; }
    </style>
</head>
<body>
    <h1>🤖 Arcco Agent SSE Test</h1>

    <div>
        <input type="text" id="message" placeholder="Mensagem..." style="width: 100%; padding: 10px;">
        <button onclick="sendMessage()" style="padding: 10px 20px; margin-top: 10px;">Enviar</button>
    </div>

    <h2>Output</h2>
    <div id="output"></div>

    <script>
        function sendMessage() {
            const message = document.getElementById('message').value;
            const output = document.getElementById('output');
            output.innerHTML = '<p>⏳ Aguardando resposta...</p>';

            const url = `/chat/stream?message=${encodeURIComponent(message)}`;
            const eventSource = new EventSource(url);

            eventSource.addEventListener('session_start', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'session_start', data);
            });

            eventSource.addEventListener('iteration_start', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'iteration_start', data);
            });

            eventSource.addEventListener('tools_identified', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'tools_identified', data);
            });

            eventSource.addEventListener('tool_start', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'tool_start', data, 'tool_start');
            });

            eventSource.addEventListener('tool_complete', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'tool_complete', data, 'tool_complete');
            });

            eventSource.addEventListener('tool_error', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'tool_error', data, 'tool_error');
            });

            eventSource.addEventListener('response_complete', (e) => {
                const data = JSON.parse(e.data);
                addEvent(output, 'response_complete', data, 'response_complete');
                eventSource.close();
            });

            eventSource.addEventListener('error', (e) => {
                addEvent(output, 'error', { error: e.message }, 'tool_error');
                eventSource.close();
            });
        }

        function addEvent(container, type, data, className) {
            const div = document.createElement('div');
            div.className = `event ${className || ''}`;
            div.innerHTML = `<strong>${type}</strong>: ${JSON.stringify(data, null, 2)}`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    </script>
</body>
</html>
```

Uso:
```bash
# 1. Salvar como test-sse.html na raiz do projeto
# 2. Abrir no navegador: http://localhost:8000/test-sse.html
# 3. Digitar mensagem e clicar "Enviar"
# 4. Observar eventos SSE em tempo real
```

---

## 6️⃣ Testes de Performance

### Bench: Model Selection

```python
# bench_model_selection.py
from lib import SmartModelSelector
from lib import get_config

config = get_config()

test_cases = [
    ("Qual é a capital da França?", 0, "haiku"),
    ("Qual é a população de Portugal?", 0, "haiku"),
    ("Resumir artigo: https://...", 0, "sonnet"),
    ("Analisar arquitetura de sistema completo", 0, "opus"),
    ("Design pattern para microserviços", 5, "opus"),
]

for message, history_len, expected_model in test_cases:
    selected = SmartModelSelector.select_model(message, history_len, config)
    match = "✅" if expected_model in selected else "❌"
    print(f"{match} {message[:50]}... → {selected}")
```

### Bench: Cache Hit Rate

```python
# bench_cache.py
import asyncio
from agent_fastapi_v2 import chat

async def test_cache_hit_rate():
    """Testa economia com cache."""

    queries = [
        "Qual é a capital da França?",
        "Qual é a capital da França?",  # Repetida
        "Qual é a população de Portugal?",
        "Qual é a população de Portugal?",  # Repetida
    ]

    total_tokens = 0
    cache_hits = 0

    for query in queries:
        response = await chat(ChatRequest(
            message=query,
            use_cache=True
        ))

        total_tokens += response.total_time_ms
        if response.cache_hit:
            cache_hits += 1

    hit_rate = (cache_hits / len(queries)) * 100
    print(f"✅ Cache hit rate: {hit_rate}%")
    print(f"   Queries: {len(queries)}")
    print(f"   Cache hits: {cache_hits}")
    print(f"   Economia: ~{cache_hits * 1200} tokens (~${cache_hits * 0.0036})")

asyncio.run(test_cache_hit_rate())
```

---

## 7️⃣ Checklist Final

- [ ] Config valida com ANTHROPIC_API_KEY
- [ ] agent_with_tools_v2.py executa sem erros
- [ ] agent_fastapi_v2.py inicia e responde a /health
- [ ] Chat simples funciona (ex: "2 + 2")
- [ ] Web fetch funciona
- [ ] PDF generation funciona
- [ ] Cache funciona (2ª request mais rápida)
- [ ] Streaming SSE emite eventos corretos
- [ ] Sessions são gerenciadas corretamente
- [ ] Logs são estruturados (JSON)

---

## 🐛 Troubleshooting

### Erro: "ANTHROPIC_API_KEY not configured"
```bash
# Verificar .env existe e tem a chave
cat .env | grep ANTHROPIC_API_KEY

# Se faltando, adicionar à .env
echo "ANTHROPIC_API_KEY=sk-..." >> .env
```

### Erro: "Module not found: lib"
```bash
# Verificar que __init__.py existe
ls lib/__init__.py

# Se faltar, criar vazio
touch lib/__init__.py
```

### Erro: "Connection timeout"
```bash
# Se web_fetch tem timeout, aumentar em .env
echo "WEB_TIMEOUT=30.0" >> .env
```

### Sessão não persiste
```bash
# Sessions em v2.0 são em-memória por padrão
# Para persistência, usar Supabase (veja README_V2.md)
```

---

## 📊 Relatório de Testes

Template para documentar resultados:

```markdown
# Test Report - Agent v2.0

**Data**: 2025-02-17
**Testador**: [Nome]
**Ambiente**: Windows 10, Python 3.9, venv

## Resultados

| Teste | Status | Observações |
|-------|--------|------------|
| Config validation | ✅ PASS | - |
| Document parser | ✅ PASS | 234ms para example.com |
| Tool registry | ✅ PASS | 7 tools registradas |
| Agent loop | ✅ PASS | 2 iterações, 1 tool |
| FastAPI /health | ✅ PASS | Response <50ms |
| Chat endpoint | ✅ PASS | Cache funciona |
| SSE streaming | ✅ PASS | 8 eventos emitidos |
| Cache hit rate | ✅ PASS | 50% economia |

## Problemas Encontrados

(Nenhum)

## Performance

- Agent loop: ~1-3s por query
- Web fetch: ~200-500ms
- Document parser: ~100-300ms
- Modelo: Sonnet 4.5

## Notas

Todas as melhorias funcionando como esperado!
```

---

**🎉 Testes Completos!**
