# Tools: Manipulação de Arquivos

## Tool Definitions

```python
register_tool(
    name="read_file",
    description="Lê o conteúdo de um arquivo. Suporta texto, CSV, JSON. "
                "Para arquivos binários (imagens, PDFs), use tools específicas.",
    parameters={
        "path": {"type": "string", "description": "Caminho do arquivo", "required": True},
        "max_lines": {"type": "integer", "description": "Máximo de linhas (default: 500)"},
    },
    handler=handle_read_file,
)

register_tool(
    name="write_file",
    description="Escreve conteúdo em um arquivo. Cria o arquivo se não existir. "
                "Sobrescreve se existir. Use para salvar resultados, criar scripts, etc.",
    parameters={
        "path": {"type": "string", "description": "Caminho do arquivo", "required": True},
        "content": {"type": "string", "description": "Conteúdo a escrever", "required": True},
    },
    handler=handle_write_file,
)

register_tool(
    name="list_files",
    description="Lista arquivos em um diretório. Mostra nome, tamanho e tipo.",
    parameters={
        "path": {"type": "string", "description": "Caminho do diretório", "required": True},
        "pattern": {"type": "string", "description": "Filtro glob (ex: '*.pdf', '*.py')"},
    },
    handler=handle_list_files,
)
```

## Implementações

```python
import os
from pathlib import Path

WORKSPACE_DIR = "/tmp/agent_workspace"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def _safe_path(path: str) -> Path:
    """Resolve path dentro do workspace. Previne path traversal."""
    workspace = Path(WORKSPACE_DIR)
    workspace.mkdir(parents=True, exist_ok=True)

    resolved = (workspace / path).resolve()
    if not str(resolved).startswith(str(workspace.resolve())):
        raise ValueError(f"Path traversal detectado: {path}")
    return resolved

def handle_read_file(path: str, max_lines: int = 500) -> str:
    safe = _safe_path(path)
    if not safe.exists():
        return f"ERRO: Arquivo '{path}' não encontrado."

    size = safe.stat().st_size
    if size > MAX_FILE_SIZE:
        return f"ERRO: Arquivo muito grande ({size} bytes). Máximo: {MAX_FILE_SIZE}."

    try:
        text = safe.read_text(encoding="utf-8")
        lines = text.splitlines()
        if len(lines) > max_lines:
            text = "\n".join(lines[:max_lines])
            text += f"\n\n[...truncado, {len(lines)} linhas total]"
        return text
    except UnicodeDecodeError:
        return f"ERRO: Arquivo '{path}' não é texto. Use tool específica para binários."

def handle_write_file(path: str, content: str) -> str:
    safe = _safe_path(path)
    safe.parent.mkdir(parents=True, exist_ok=True)
    safe.write_text(content, encoding="utf-8")
    return f"Arquivo salvo: {path} ({len(content)} chars)"

def handle_list_files(path: str = ".", pattern: str = "*") -> str:
    safe = _safe_path(path)
    if not safe.is_dir():
        return f"ERRO: '{path}' não é um diretório."

    entries = []
    for item in sorted(safe.glob(pattern)):
        if item.is_file():
            size = item.stat().st_size
            entries.append(f"  📄 {item.name} ({size:,} bytes)")
        elif item.is_dir():
            entries.append(f"  📁 {item.name}/")

    if not entries:
        return f"Diretório '{path}' está vazio (filtro: {pattern})"

    return f"Conteúdo de '{path}':\n" + "\n".join(entries)
```

## Segurança

1. **Path traversal** — Sempre resolver paths dentro do workspace
2. **Tamanho máximo** — Não deixar o agente ler arquivos de 1GB
3. **Encoding** — Assumir UTF-8, rejeitar binários
4. **Workspace isolado** — Nunca escrever fora de /tmp/agent_workspace
