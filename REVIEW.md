# Auditoria de Código — Arcco Agents

Revisão completa do projeto identificando bugs, vulnerabilidades de segurança, problemas de qualidade de código e sugestões de melhoria.

---

## 1. VULNERABILIDADES DE SEGURANÇA (Críticas)

### 1.1 Chave de serviço do Supabase hardcoded no frontend

**Arquivo:** `lib/supabase.ts:4`

```typescript
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIs...';
```

A **service_role key** do Supabase está exposta diretamente no código-fonte do cliente. Essa chave ignora todas as Row Level Security (RLS) policies do Supabase e dá acesso total ao banco de dados. Qualquer pessoa que inspecionar o código no navegador (DevTools > Sources) pode extraí-la e ler/escrever/deletar qualquer dado.

**Correção:** Usar a `anon key` no frontend (via variáveis de ambiente `VITE_SUPABASE_ANON_KEY`) e mover operações que precisam da service key para um backend/edge function.

---

### 1.2 Senhas armazenadas em texto puro

**Arquivos:**
- `pages/RegisterPage.tsx:89` — envia a senha sem hash para o Supabase
- `pages/LoginPage.tsx:50` — compara a senha digitada diretamente com `user.senha`

```typescript
// RegisterPage.tsx
senha: formData.password, // texto puro

// LoginPage.tsx
if (user.senha !== password) { // comparação direta
```

Qualquer comprometimento do banco expõe todas as credenciais dos usuários.

**Correção:** Usar Supabase Auth (que já faz hash com bcrypt) ao invés de autenticação custom. Alternativamente, fazer hash no servidor com bcrypt/argon2.

---

### 1.3 Página de administração sem autenticação

**Arquivo:** `App.tsx:74-77`

```typescript
if (isAdminRoute()) {
  return <AdminPage />;  // sem verificação de auth ou role
}
```

A rota `/admin` é acessível por qualquer pessoa sem login. Ela expõe dados de todos os usuários (nomes, emails, CPFs), API keys completas e templates do sistema.

**Correção:** Verificar autenticação e role de administrador antes de renderizar `AdminPage`.

---

### 1.4 XSS via iframe com `allow-scripts allow-same-origin`

**Arquivo:** `pages/arcco-pages/PagesBuilder.tsx:1280`

```typescript
sandbox="allow-scripts allow-same-origin"
```

A combinação de `allow-scripts` + `allow-same-origin` em um sandbox anula a maioria das proteções. Conteúdo malicioso pode acessar cookies, localStorage e dados de sessão da página pai.

**Correção:** Remover `allow-same-origin` ou renderizar o preview em um domínio diferente (iframe de outro origin).

---

### 1.5 Dados sensíveis logados no console

**Arquivo:** `pages/RegisterPage.tsx:95`

```typescript
console.log('Tentando salvar usuario:', userData);
// userData contém userData.senha (a senha em texto puro)
```

**Arquivo:** `lib/supabase.ts:50`

```typescript
console.log('Salvando usuario no Supabase:', userData);
// também contém a senha
```

**Correção:** Remover logs de dados sensíveis ou filtrar campos como `senha` antes de logar.

---

### 1.6 Autenticação baseada apenas em localStorage

**Arquivo:** `App.tsx:155-158`

```typescript
const authStatus = localStorage.getItem('arcco_auth');
if (authStatus === 'true') {
  setIsAuthenticated(true);
}
```

Qualquer pessoa pode abrir o console do navegador e rodar `localStorage.setItem('arcco_auth', 'true')` para "fazer login". Não há tokens, sessões ou validação no servidor.

**Correção:** Usar Supabase Auth com tokens JWT e validação de sessão.

---

## 2. BUGS (Erros de Lógica)

### 2.1 Cadastro "sucede" mesmo quando o banco falha

**Arquivo:** `pages/RegisterPage.tsx:99-119`

```typescript
if (dbError) {
  console.error('Erro ao salvar usuario:', dbError);
  // Continua mesmo com erro - salva no localStorage
}
// ...
setStep('success'); // sempre mostra sucesso
```

Se a gravação no Supabase falha (ex: email duplicado), o usuário vê "Cadastro concluído!" e tenta fazer login, que falhará porque o usuário não existe no banco.

**Correção:** Mostrar erro ao usuário e não prosseguir quando `dbError` não for nulo.

---

### 2.2 Crash na página Minha Conta — acesso a propriedade de `undefined`

**Arquivo:** `pages/MyAccountPage.tsx:58-67`

```typescript
setUserData({
  nome: data.content.nome,     // ❌ data.content pode ser undefined
  email: data.content.email,   // ❌ nome e email estão no nível raiz, não dentro de content
});
```

Os campos `nome` e `email` são salvos como colunas diretas na tabela `User` (conforme `RegisterPage.tsx:86-88`), mas o `MyAccountPage` tenta acessá-los dentro de `data.content`, causando `TypeError: Cannot read properties of undefined`.

**Correção:** Acessar `data.nome` e `data.email` diretamente.

---

### 2.3 Headers duplicados no prompt do sistema

**Arquivo:** `pages/arcco-talk/AgentDetailPage.tsx:274-275`

```typescript
prompt += `\nCOLUNAS: ${agent.spreadsheet.headers.join(', ')}`;
prompt += `\nCOLUNAS: ${agent.spreadsheet.headers.join(', ')}`; // duplicado
```

Desperdiça tokens e pode confundir o modelo de IA.

---

### 2.4 Mutação direta de estado React (Spreadsheet)

**Arquivo:** `pages/arcco-talk/SpreadsheetPage.tsx:193-202`

```typescript
const updatedRows = [...selectedSheet.rows]; // cópia rasa do array externo
updatedRows[rowIndex][colIndex] = value;     // muta o array interno original!
```

O spread (`[...]`) cria uma cópia rasa — os arrays internos (linhas) ainda são referências ao estado original. Isso viola a regra de imutabilidade do React e pode causar re-renders perdidos.

**Correção:** Fazer deep copy: `const updatedRows = selectedSheet.rows.map(row => [...row]);`

---

### 2.5 Loading spinner infinito no login bem-sucedido

**Arquivo:** `pages/LoginPage.tsx:56-62`

```typescript
// Login bem-sucedido
onLogin(user.nome, user.email);
// ❌ setIsLoading(false) nunca é chamado aqui
} catch (err) {
  setIsLoading(false); // só chamado no erro
}
```

Se `onLogin` não desmontar imediatamente o componente, o botão fica preso no estado de loading.

---

### 2.6 `fetchAgents` silenciosamente limpa agentes existentes

**Arquivo:** `App.tsx:144-147`

```typescript
if (data && data.length > 0) {
  const agents = data.map(convertToTalkAgent);
  setTalkAgents(agents);
}
// Se data for [] (lista vazia), o estado anterior permanece inalterado
```

Se o usuário deletar todos os agentes no Supabase, a lista local nunca é limpa porque a condição `data.length > 0` impede o `setTalkAgents([])`.

**Correção:** Chamar `setTalkAgents(agents)` independente do tamanho da lista.

---

### 2.7 Configurações não persistem

**Arquivo:** `pages/SettingsPage.tsx` (inteiro)

Todas as configurações (tema, idioma, timezone, notificações, densidade) são estado local React. Navegar para outra página e voltar reseta tudo. Os toggles de notificação usam `defaultChecked` (não-controlado) e não podem ser lidos programaticamente.

---

### 2.8 Classes dinâmicas do Tailwind não funcionam

**Arquivo:** `pages/arcco-talk/TalkSetupWizard.tsx:280-282`

```typescript
className={`bg-${typeConfig.color}-900/30 ...`}
```

O Tailwind CSS faz purge de classes não utilizadas em build time. Classes construídas dinamicamente como `bg-${color}-900/30` não são detectadas e o CSS correspondente não é gerado. Isso resulta em elementos sem cor de fundo.

**Correção:** Usar um mapa de classes completas:
```typescript
const colorMap = {
  green: 'bg-green-900/30 text-green-400',
  blue: 'bg-blue-900/30 text-blue-400',
  // ...
};
```

---

## 3. BOTÕES E FUNCIONALIDADES NÃO IMPLEMENTADOS

| Arquivo | Linha | Elemento | Problema |
|---------|-------|----------|----------|
| `MyAccountPage.tsx` | 396 | "Excluir minha conta" | Sem `onClick` |
| `MyAccountPage.tsx` | 362 | "Fazer upgrade" | Sem `onClick` |
| `KnowledgeBasePage.tsx` | 489 | "Adicionar" documento | Sem `onClick` |
| `TalkSetupWizard.tsx` | 422 | "Configurar Base de Conhecimento" | Sem `onClick` |
| `TalkHomePage.tsx` | 285-288 | Editar/Toggle/Excluir agente | Callbacks vazios `() => {}` |
| `WhatsAppConfigPage.tsx` | 465-479 | 3 toggles de configuração | Sem estado/handler |
| `PagesBuilder.tsx` | 1252-1260 | Botão Refresh preview | Handler vazio |
| `SettingsPage.tsx` | - | Todas as configurações | Não persistem |

---

## 4. PROBLEMAS DE QUALIDADE DE CÓDIGO

### 4.1 Memory leak em refs que crescem indefinidamente

**Arquivo:** `pages/arcco-talk/AgentDetailPage.tsx`

Os refs `contactHistoryRef` e `repliedMessagesRef` (Maps/Sets) acumulam entradas durante a sessão inteira e nunca são limpos. Para sessões longas, isso consome memória crescente.

---

### 4.2 Fire-and-forget em operações de banco

**Arquivo:** `pages/arcco-talk/AgentDetailPage.tsx:335-345`

```typescript
spreadsheetService.updateSpreadsheet(agent.spreadsheetId, {
  rows: rowsForDb
}).then(() => { ... }).catch(err => console.error(...));
```

Operações de banco chamadas sem `await` podem falhar silenciosamente, criando divergência entre estado local e banco.

---

### 4.3 Race condition em auto-reply

**Arquivo:** `pages/arcco-talk/AgentDetailPage.tsx:451`

```typescript
processAutoReply(contactNumber, text, msgId); // sem await
```

Se `processAutoReply` demorar mais que o intervalo de polling (5s), múltiplas respostas podem ser enviadas concorrentemente para a mesma mensagem.

---

### 4.4 `any` usado em múltiplos locais

**Arquivos:**
- `pages/arcco-talk/SpreadsheetPage.tsx:146` — `catch (err: any)`
- `pages/arcco-talk/AgentDetailPage.tsx:630,681` — `as any[]`
- `lib/supabase.ts:413` — `const updateData: any`

---

### 4.5 Tailwind carregado via CDN em produção

**Arquivo:** `index.html:8`

```html
<script src="https://cdn.tailwindcss.com"></script>
```

O CDN do Tailwind é recomendado apenas para desenvolvimento/prototipagem. Em produção, causa:
- Bundle maior (CSS completo carregado)
- Latência adicional para buscar o script
- Dependência de CDN externo

**Correção:** Instalar `tailwindcss` como dependência e configurar com PostCSS.

---

### 4.6 Import map no HTML conflita com Vite

**Arquivo:** `index.html:53-62`

```html
<script type="importmap">
  { "imports": { "react": "https://esm.sh/react@^19.2.3" ... } }
</script>
```

O Vite já gerencia os imports de `react` e `react-dom` via `node_modules`. O import map aponta para esm.sh, criando potencial conflito de versões e carregamento duplicado de React.

**Correção:** Remover o import map e deixar o Vite resolver os imports.

---

## 5. PROBLEMAS DE UX

### 5.1 `alert()` nativo para feedback

Múltiplos arquivos usam `alert()` para mensagens de sucesso/erro, que quebra a experiência visual do tema dark e bloqueia a thread principal.

**Arquivos afetados:** `AgentDetailPage.tsx`, `SpreadsheetPage.tsx`, `PagesBuilder.tsx`

**Correção:** Implementar sistema de toasts/notificações inline.

---

### 5.2 Exclusão sem confirmação

**Arquivo:** `pages/arcco-talk/AgentsPage.tsx:219`

O botão de deletar na lista de agentes chama `onDeleteAgent` diretamente, sem diálogo de confirmação. Dados são perdidos com um clique.

---

### 5.3 Validação fraca de email

**Arquivos:** `LoginPage.tsx:21`, `RegisterPage.tsx:58`

```typescript
if (!email.includes('@')) { ... }
```

Strings como `@` ou `a@b` passam na validação. Usar regex mais robusta ou uma biblioteca de validação.

---

### 5.4 Copyright hardcoded "2024"

**Arquivo:** `pages/LoginPage.tsx:201`

```typescript
© 2024 Arcco Agents
```

Já está desatualizado. Usar `new Date().getFullYear()` para manter atualizado automaticamente.

---

### 5.5 Página de Knowledge Base usa apenas dados mock

**Arquivo:** `pages/arcco-talk/KnowledgeBasePage.tsx:32-84`

Toda a página é construída com dados estáticos hardcoded. Não há integração real com o backend.

---

## 6. RESUMO DE PRIORIDADES

| Prioridade | Qtd | Itens |
|------------|-----|-------|
| **Crítica** | 6 | Service key exposta, senhas em texto puro, admin sem auth, XSS via iframe, logs de senha, auth por localStorage |
| **Alta** | 6 | Cadastro falso de sucesso, crash no MyAccountPage, fetchAgents não limpa, loading infinito no login, mutação de estado, race condition auto-reply |
| **Média** | 8 | Botões sem handler, Tailwind dinâmico quebrado, fire-and-forget DB, memory leak em refs, configurações não persistem, headers duplicados no prompt |
| **Baixa** | 5 | alert() nativo, copyright hardcoded, validação fraca de email, CDN Tailwind, import map conflitante |

---

## 7. RECOMENDAÇÕES PRIORITÁRIAS

1. **Migrar para Supabase Auth** — Resolve senhas em texto puro, auth por localStorage e service key no frontend de uma vez
2. **Proteger rota admin** — Adicionar verificação de autenticação e role
3. **Corrigir crash do MyAccountPage** — Acessar campos corretos (`data.nome` ao invés de `data.content.nome`)
4. **Corrigir cadastro** — Bloquear progresso quando gravação no banco falha
5. **Remover service key do frontend** — Usar anon key + RLS policies
6. **Instalar Tailwind como dependência** — Remover CDN e import map
7. **Implementar sistema de toasts** — Substituir `alert()` por notificações visuais
8. **Corrigir mutação de estado** — Deep copy em arrays de spreadsheet
