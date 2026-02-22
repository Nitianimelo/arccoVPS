# Tools: Execução de Código

## ⚠️ SEGURANÇA PRIMEIRO

Code execution é a tool mais perigosa. O LLM pode ser manipulado via prompt injection
para executar código malicioso. SEMPRE use sandbox.

## Níveis de Isolamento

| Nível | Método | Segurança | Performance |
|-------|--------|-----------|-------------|
| Básico | subprocess + timeout | Baixa | Alta |
| Médio | subprocess + chroot + limits | Média | Média |
| Alto | Docker container | Alta | Baixa |
| Máximo | gVisor / Firecracker | Máxima | Média |

## Tool Definition

```python
register_tool(
    name="execute_code",
    description="Executa código Python e retorna o output. "
                "Use para cálculos, processamento de dados, "
                "manipulação de arquivos, e qualquer tarefa "
                "que requer execução programática. "
                "O código executa em ambiente isolado com timeout de 30s.",
    parameters={
        "code": {
            "type": "string",
            "description": "Código Python a executar",
            "required": True,
        },
        "timeout": {
            "type": "integer",
            "description": "Timeout em segundos (default: 30, max: 120)",
        },
    },
    handler=handle_execute_code,
)
```

## Implementação: Subprocess com Sandbox Básico

```python
import subprocess
import tempfile
import os

BLOCKED_IMPORTS = [
    "os.system", "subprocess", "shutil.rmtree",
    "eval(", "exec(", "__import__",
    "open('/etc", "open('/root", "open('/home",
]

ALLOWED_PACKAGES = [
    "math", "json", "re", "datetime", "collections",
    "itertools", "functools", "statistics", "csv",
    "pandas", "numpy", "requests",  # conforme necessidade
]

def handle_execute_code(code: str, timeout: int = 30) -> str:
    """Executa código Python em sandbox básico."""
    timeout = min(timeout, 120)

    # Verificação de segurança básica
    for blocked in BLOCKED_IMPORTS:
        if blocked in code:
            return f"ERRO: Código bloqueado por segurança. Uso de '{blocked}' não permitido."

    # Cria arquivo temporário
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, dir="/tmp"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        result = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd="/tmp",
            env={
                "PATH": "/usr/bin:/usr/local/bin",
                "HOME": "/tmp",
                "PYTHONPATH": "",
            },
        )

        output = ""
        if result.stdout:
            output += result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"

        if not output.strip():
            output = "(código executado sem output)"

        # Truncar output grande
        if len(output) > 10000:
            output = output[:10000] + "\n\n[...output truncado]"

        return output

    except subprocess.TimeoutExpired:
        return f"ERRO: Código excedeu timeout de {timeout}s. Otimize ou divida a tarefa."
    except Exception as e:
        return f"ERRO na execução: {e}"
    finally:
        os.unlink(tmp_path)
```

## Implementação: Docker (produção)

```python
import docker
import tempfile
import os

docker_client = docker.from_env()

def handle_execute_code_docker(code: str, timeout: int = 30) -> str:
    """Executa código em container Docker isolado."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, dir="/tmp"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        container = docker_client.containers.run(
            "python:3.11-slim",
            command=f"python /code/script.py",
            volumes={tmp_path: {"bind": "/code/script.py", "mode": "ro"}},
            mem_limit="256m",
            cpu_period=100000,
            cpu_quota=50000,  # 50% de 1 CPU
            network_mode="none",  # Sem rede
            remove=True,
            stdout=True,
            stderr=True,
            detach=False,
            timeout=timeout,
        )
        return container.decode("utf-8")[:10000]

    except docker.errors.ContainerError as e:
        return f"ERRO no container: {e.stderr.decode('utf-8')}"
    except Exception as e:
        return f"ERRO: {e}"
    finally:
        os.unlink(tmp_path)
```

## Boas Práticas

1. **Sempre timeout** — 30s default, 120s máximo
2. **Truncar output** — LLM não precisa de 1MB de output
3. **Sem rede no sandbox** — Evita exfiltração de dados
4. **Sem acesso ao filesystem do host** — Containers isolados
5. **Log tudo** — Cada execução logada para auditoria
6. **Whitelist de imports** — Melhor que blacklist
