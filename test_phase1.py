
import asyncio
import os
import sys
import importlib.util
from unittest.mock import MagicMock

# Função helper para importar módulos de caminhos com espaços
def import_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Caminhos absolutos
BASE_DIR = os.getcwd()
ARCCO_AGENT_DIR = os.path.join(BASE_DIR, "Arcco agent")
LIB_DIR = os.path.join(ARCCO_AGENT_DIR, "lib")

# Importar módulos dinamicamente
# Configurar env vars fake para passar na validação do config
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test-key-123456"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_KEY"] = "public-anon-key-123"

try:
    config_mod = import_from_path("config", os.path.join(LIB_DIR, "config.py"))
    registry_mod = import_from_path("agent_tools_registry", os.path.join(LIB_DIR, "agent_tools_registry.py"))
    agent_mod = import_from_path("agent_with_tools_v2", os.path.join(ARCCO_AGENT_DIR, "agent_with_tools_v2.py"))
except ImportError as e:
    print(f"❌ Erro ao importar módulos: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erro na inicialização do módulo: {e}")
    sys.exit(1)


# Aliases
AgentConfig = config_mod.AgentConfig
registry = registry_mod.get_tool_registry()
SkillLoader = registry_mod.SkillLoader
execute_python = agent_mod.execute_python
SYSTEM_PROMPT = agent_mod.SYSTEM_PROMPT

# Mock config globalmente para o teste
config_mod._config = AgentConfig()
config_mod._config.allow_code_execution = True
config_mod._config.workspace_path = type('obj', (object,), {'resolve': lambda: os.getcwd()})

async def test_sandbox():
    print("🧪 Testando Python Sandbox...")
    
    # Teste 1: Código seguro
    code_safe = "print('Hello Sandbox')"
    # execute_python espera config global instanciada, que mockamos acima
    result = execute_python(code_safe)
    print(f"  Safe Code Output: {result.strip()[:50]}...")
    
    # Validar output (pode vir wrapado em logs ou direto)
    if "Hello Sandbox" in result or "Hello" in result:
        print("  ✅ Identificou output correto")
    else:
        print(f"  ⚠️ Output inesperado: {result}")
    
    # Teste 2: Código bloqueado
    code_unsafe = "import os; os.system('rm -rf /')"
    result = execute_python(code_unsafe)
    print(f"  Unsafe Code Output: {result.strip()[:50]}...")
    
    if "bloqueado" in result.lower() or "blocked" in result.lower():
        print("  ✅ Bloqueio de segurança funcionou")
    else:
        print(f"  ❌ Falha no bloqueio: {result}")
    
    print("✅ Sandbox Test Complete.\n")

async def test_skills():
    print("🧪 Testando SkillLoader...")
    
    # Criar diretório e arquivo de skill fake
    skill_dir = os.path.join(BASE_DIR, ".agent", "skills", "test_skill")
    os.makedirs(skill_dir, exist_ok=True)
    
    skill_file_path = os.path.join(skill_dir, "SKILL.md")
    with open(skill_file_path, "w") as f:
        f.write("---\ndescription: 'A test skill description'\n---\n# System Prompt for Test Skill\nYou are a test agent.")
        
    print(f"  Criado mock skill em: {skill_file_path}")
    
    # Executar loader
    try:
        SkillLoader.load_skills(registry, ".agent/skills")
    except Exception as e:
        print(f"  ❌ Erro no SkillLoader: {e}")
        return
    
    # Verificar se registrou
    tools = registry.get_tools()
    skill_tool = next((t for t in tools if 'test_skill' in t['name']), None)
    
    if skill_tool:
        print(f"  ✅ Skill encontrada: {skill_tool['name']}")
        print(f"  ✅ Descrição: {skill_tool['description']}")
        
        # Testar execução do handler
        handler = registry.get_handler(skill_tool['name'])
        if handler:
            res = handler(instruction="Test instruction")
            print(f"  ✅ Handler output preview: {res[:50]}...")
            if "System Prompt for Test Skill" in res:
                print("  ✅ Conteúdo da skill carregado corretamente")
            else:
                print("  ⚠️ Conteúdo da skill não encontrado no output")
    else:
        print("❌ Skill 'test_skill' não encontrada no registry.")
        print(f"Tools disponíveis: {[t['name'] for t in tools]}")

    # Limpar
    import shutil
    try:
        shutil.rmtree(os.path.join(BASE_DIR, ".agent", "skills", "test_skill"))
    except:
        pass
    print("✅ SkillLoader Test Complete.\n")

async def test_react_concept():
    print("🧪 Testando Conceito ReAct...")
    
    print("  Verificando System Prompt...")
    has_thought = "Thought" in SYSTEM_PROMPT
    has_action = "Action" in SYSTEM_PROMPT
    has_obs = "Observation" in SYSTEM_PROMPT
    
    if has_thought and has_action and has_obs:
        print("  ✅ System Prompt contém instruções ReAct (Thought/Action/Observation)")
    else:
        print(f"  ❌ System Prompt incompleto. Thought={has_thought}, Action={has_action}, Obs={has_obs}")

    print("✅ ReAct Concept Test Complete.\n")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    print("🚀 Iniciando Testes da Fase 1...\n")
    loop.run_until_complete(test_sandbox())
    loop.run_until_complete(test_skills())
    loop.run_until_complete(test_react_concept())
    print("🏁 Todos os testes finalizados.")
