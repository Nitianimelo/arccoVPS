# Relatório de Diagnóstico do Backend e Banco de Dados

## 1. Status da Arquitetura

O sistema Arcco AI opera em um modelo híbrido:

1.  **Frontend (React/Vite)**: 
    *   Roda na porta `3060` (atualmente).
    *   Conecta-se **diretamente** ao Supabase para Autenticação e Dados de Usuário (via `lib/supabase.ts`).
    *   Conecta-se ao **Backend Python** via Proxy (configurado no `vite.config.ts`) para rotas `/api/agent/*`.

2.  **Backend (Python/FastAPI)**:
    *   **Estado Atual**: Provavelmente **PARADO**. O frontend não consegue realizar ações de Agente (Chat, Busca, Arquivos) se este servidor não estiver rodando.
    *   **Porta Esperada**: `8000`.
    *   **Função**: Processamento de IA, Busca e OCR.

## 2. Diagnóstico de Problemas

### A. Backend Não Iniciado
O erro principal "algo não funciona" (ex: chat não responde, busca falha) ocorre porque o servidor Python não está rodando. O frontend tenta chamar `/api/agent/...`, o proxy tenta repassar para `localhost:8000`, mas falha se o servidor estiver desligado.

**Solução**: Criei um arquivo `start_backend.bat` na raiz do projeto. Execute-o para iniciar o servidor.

### B. Credenciais Expostas (Risco de Segurança)
Encontrei chaves de API "hardcoded" (fixas no código) em dois lugares críticos:
1.  `lib/supabase.ts` (Frontend)
2.  `backend/core/config.py` (Backend)

**Risco**: A chave `supabaseServiceKey` usada é do tipo `service_role`. Isso dá acesso **TOTAL** ao seu banco de dados, ignorando regras de segurança. Se alguém inspecionar o código do site no navegador, poderá roubar essa chave e deletar seu banco dados.

**Recomendação**:
1.  Crie um arquivo `.env` na raiz.
2.  Mova as chaves para lá.
3.  No frontend, use apenas a `ANON_KEY` (chave pública), não a `SERVICE_ROLE_KEY`.

## 3. Ações Realizadas

1.  **Script de Inicialização**: Criei o arquivo `start_backend.bat`. Basta dar dois cliques nele para rodar o backend. Ele irá:
    *   Criar um ambiente virtual Python (se não existir).
    *   Instalar as dependências.
    *   Iniciar o servidor na porta 8000.

2.  **Verificação de Proxy**: Confirmei que o `vite.config.ts` está corretamente configurado para redirecionar chamadas de API para o backend.

## 4. Próximos Passos (Manual)

Para deixar a aplicação 100% funcional e segura, você deve preencher o arquivo `.env` (crie-o na raiz do projeto) com o seguinte modelo:

```env
# Configurações do Supabase
SUPABASE_URL="https://gfkycxdbbzczrwikhcpr.supabase.co"
SUPABASE_KEY="sua-chave-anon-publica-aqui"
SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role-aqui" (SOMENTE PARA O BACKEND PYTHON)

# Chaves de IA (Opcional se estiver usando tabela ApiKeys no banco)
OPENROUTER_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."
```

**Resumo**: Para testar agora, apenas execute o `start_backend.bat` e mantenha a janela aberta enquanto usa o site.
