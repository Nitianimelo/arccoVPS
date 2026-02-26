# 🚀 Guia de Deploy - Arcco Agents

## Requisitos
- Node.js 18+ instalado
- Conta em uma plataforma de deploy (Netlify, Vercel, etc.)

## 📦 Build Local

```bash
# Instalar dependências
npm install

# Fazer build
npm run build

# Testar localmente
npm run preview
```

O build gera a pasta `dist/` com os arquivos estáticos prontos para deploy.

---

## 🌐 Opções de Deploy

### 1️⃣ Netlify (Recomendado)

**Método 1: Via Interface Web (Mais Fácil)**
1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em "Add new site" → "Import an existing project"
3. Conecte com GitHub e selecione este repositório
4. As configurações serão detectadas automaticamente via `netlify.toml`
5. Clique em "Deploy site"
6. ✅ Deploy automático a cada push no GitHub!

**Método 2: Via CLI**
```bash
# Instalar CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run deploy:netlify

# Ou manualmente:
netlify deploy --prod
```

**Configurações do Netlify:**
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18+

---

### 2️⃣ Vercel

**Método 1: Via Interface Web**
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório do GitHub
3. Vercel detecta automaticamente que é um projeto Vite
4. Clique em "Deploy"

**Método 2: Via CLI**
```bash
# Instalar CLI
npm install -g vercel

# Deploy
npm run deploy:vercel

# Ou manualmente:
vercel --prod
```

---

### 3️⃣ GitHub Pages

**Configuração Automática:**
1. O workflow já está configurado em `.github/workflows/deploy.yml`
2. Vá em Settings → Pages do seu repositório
3. Source: "GitHub Actions"
4. Faça push para a branch `main`
5. ✅ Deploy automático!

**Configuração Manual:**
```bash
# Fazer build
npm run build

# Deploy (com gh-pages)
npm install -g gh-pages
gh-pages -d dist
```

---

### 4️⃣ Outros Serviços

#### **AWS S3 + CloudFront**
```bash
npm run build
aws s3 sync dist/ s3://seu-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

#### **Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

#### **Render**
1. Conecte o repositório em [render.com](https://render.com)
2. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

#### **Railway**
1. Conecte o repositório em [railway.app](https://railway.app)
2. Configure:
   - Build Command: `npm run build`
   - Start Command: `npm run preview`

---

## 🔧 Variáveis de Ambiente

Se você usar APIs externas, configure as variáveis de ambiente na plataforma:

### Netlify
```bash
# Via CLI
netlify env:set GEMINI_API_KEY your_key_here

# Ou via interface: Site settings → Environment variables
```

### Vercel
```bash
# Via CLI
vercel env add GEMINI_API_KEY

# Ou via interface: Settings → Environment Variables
```

---

## ✅ Checklist Pré-Deploy

- [ ] Build local funciona: `npm run build`
- [ ] Preview funciona: `npm run preview`
- [ ] Git está limpo: `git status`
- [ ] Código está no GitHub
- [ ] Variáveis de ambiente configuradas (se necessário)

---

## 🐛 Troubleshooting

### Erro: "Command not found: vite"
```bash
npm install
```

### Erro de Build no Netlify/Vercel
- Verifique a versão do Node.js (deve ser 18+)
- Configure em: Site settings → Build & deploy → Environment

### SPA Routing não funciona
Certifique-se que os redirects estão configurados:
- **Netlify:** `netlify.toml` (já configurado)
- **Vercel:** `vercel.json` com rewrites
- **Outros:** Configure redirect de `/*` para `/index.html`

---

## 📊 Monitoramento

Após o deploy:
- ✅ Teste todas as páginas
- ✅ Verifique console do navegador (F12)
- ✅ Teste em mobile
- ✅ Configure domínio customizado (opcional)

---

## 🔗 Links Úteis

- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Actions](https://github.com/marketplace/actions/github-pages-action)
