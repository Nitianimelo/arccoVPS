"""
Agent Básico — Template mínimo funcional.

Agente conversacional com loop de tool-use usando a API da Anthropic.
Copie, adapte tools e system prompt, e execute.

Requisitos:
    pip install anthropic

Uso:
    export ANTHROPIC_API_KEY=sk-...
    python agent_basic.py
"""

import anthropic
import json
import sys

# ============================================================
# CONFIG
# ============================================================

MODEL = "claude-sonnet-4-5-20250514"
MAX_TOKENS = 8096
MAX_ITERATIONS = 15

SYSTEM_PROMPT = """Você é um assistente inteligente e autônomo.

Regras:
1. Use as ferramentas disponíveis para completar tarefas
2. Se uma ferramenta falhar, tente uma abordagem alternativa
3. Seja conciso e direto nas respostas
4. Ao concluir, apresente um resumo do que foi feito
"""

# ============================================================
# TOOLS REGISTRY
# ============================================================

TOOLS: list[dict] = []
HANDLERS: dict[str, callable] = {}


def tool(name: str, description: str, parameters: dict):
    """Decorator para registrar tools."""
    def decorator(func):
        schema = {
            "name": name,
            "description": description,
            "input_schema": {
                "type": "object",
                "properties": {k: {kk: vv for kk, vv in v.items() if kk != "required"}
                               for k, v in parameters.items()},
                "required": [k for k, v in parameters.items() if v.get("required")],
            },
        }
        TOOLS.append(schema)
        HANDLERS[name] = func
        return func
    return decorator


# ============================================================
# EXEMPLO: Tools básicas (substitua pelas suas)
# ============================================================

@tool(
    name="calculator",
    description="Realiza cálculos matemáticos. Aceita expressões Python válidas.",
    parameters={
        "expression": {
            "type": "string",
            "description": "Expressão matemática (ex: '2**10', 'sum(range(100))')",
            "required": True,
        },
    },
)
def calculator(expression: str) -> str:
    """Calculadora segura."""
    allowed = set("0123456789+-*/.() ,")
    allowed_funcs = {"sum", "min", "max", "abs", "round", "len", "range", "int", "float"}

    # Verificação básica de segurança
    import re
    words = set(re.findall(r'[a-zA-Z_]+', expression))
    unsafe = words - allowed_funcs
    if unsafe:
        return f"ERRO: Funções não permitidas: {unsafe}"

    try:
        result = eval(expression, {"__builtins__": {}},
                      {f: __builtins__[f] if isinstance(__builtins__, dict)
                       else getattr(__builtins__, f)
                       for f in allowed_funcs
                       if (isinstance(__builtins__, dict) and f in __builtins__)
                       or hasattr(__builtins__, f)})
        return str(result)
    except Exception as e:
        return f"ERRO: {e}"


@tool(
    name="get_current_time",
    description="Retorna data e hora atuais.",
    parameters={},
)
def get_current_time() -> str:
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ============================================================
# AGENT LOOP
# ============================================================

def agent_loop(user_message: str) -> str:
    """Loop principal do agente."""
    client = anthropic.Anthropic()
    messages = [{"role": "user", "content": user_message}]

    for iteration in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        assistant_content = response.content
        messages.append({"role": "assistant", "content": assistant_content})

        # Extrair tool calls
        tool_uses = [b for b in assistant_content if b.type == "tool_use"]

        if not tool_uses:
            text_blocks = [b.text for b in assistant_content if hasattr(b, "text")]
            return "\n".join(text_blocks)

        # Executar tools
        tool_results = []
        for tu in tool_uses:
            handler = HANDLERS.get(tu.name)
            if not handler:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": f"Tool '{tu.name}' não encontrada.",
                    "is_error": True,
                })
                continue

            try:
                result = handler(**tu.input)
                print(f"  🔧 {tu.name}({json.dumps(tu.input, ensure_ascii=False)[:80]}) → {str(result)[:100]}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": str(result),
                })
            except Exception as e:
                print(f"  ❌ {tu.name} erro: {e}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": f"ERRO: {e}",
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results})

    return "⚠️ Agente atingiu limite de iterações."


# ============================================================
# MAIN
# ============================================================

def main():
    print("🤖 Agent Basic — Digite 'sair' para encerrar\n")

    while True:
        try:
            user_input = input("Você: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Até mais!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("sair", "exit", "quit"):
            print("👋 Até mais!")
            break

        print("🔄 Processando...\n")
        response = agent_loop(user_input)
        print(f"\n🤖 Agente: {response}\n")


if __name__ == "__main__":
    main()
