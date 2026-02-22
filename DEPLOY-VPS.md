# Deploy na VPS — Arcco AI

## Pré-requisitos na VPS

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose (já incluso no Docker moderno)
docker compose version

# Instalar Git
sudo apt install git -y
```

## Setup Inicial (uma vez)

### 1. Clonar o repositório

```bash
cd ~
git clone https://github.com/SEU-USUARIO/arcco-ai.git
cd arcco-ai
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env  # Preencher todas as variáveis
```

### 3. Build e iniciar

```bash
docker compose build
docker compose up -d
```

### 4. Verificar

```bash
# Ver logs
docker compose logs -f

# Testar health
curl http://localhost/health

# Testar chat
curl -X POST http://localhost/api/agent/route \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá", "user_id": "test"}'
```

## Configurar SSL (quando tiver domínio)

### 1. Apontar domínio

No painel DNS do seu registrador, crie um registro A:
```
A  @  IP-DA-SUA-VPS
```

### 2. Editar script de SSL

```bash
nano nginx/init-letsencrypt.sh
# Trocar DOMAIN="your-domain.com" pelo seu domínio
# Trocar EMAIL="your-email@example.com" pelo seu email
```

### 3. Gerar certificado

```bash
chmod +x nginx/init-letsencrypt.sh
./nginx/init-letsencrypt.sh
```

### 4. Ativar HTTPS no Nginx

Edite `nginx/nginx.conf`:
- Descomente o bloco `server 443`
- Descomente o `return 301 https://...` no bloco 80
- Troque `your-domain.com` pelo seu domínio

```bash
docker compose up -d --build nginx
```

## Deploy Automático (GitHub Actions)

### Configurar Secrets no GitHub

No repositório GitHub → Settings → Secrets → Actions, adicione:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP ou domínio da VPS |
| `VPS_USER` | Usuário SSH (ex: root) |
| `VPS_SSH_KEY` | Chave SSH privada |

### Gerar chave SSH (se necessário)

```bash
# Na VPS:
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -N ""
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys

# Copiar a chave PRIVADA para o secret VPS_SSH_KEY:
cat ~/.ssh/github-deploy
```

### Testar

Faça um push na branch `main`:
```bash
git add .
git commit -m "feat: deploy config"
git push origin main
```

O GitHub Actions vai:
1. Conectar via SSH na VPS
2. `git pull` o código
3. `docker compose build`
4. `docker compose up -d`

## Comandos Úteis

```bash
# Ver containers rodando
docker compose ps

# Ver logs do backend
docker compose logs -f backend

# Ver logs do nginx
docker compose logs -f nginx

# Reiniciar tudo
docker compose restart

# Rebuild e reiniciar
docker compose up -d --build

# Parar tudo
docker compose down

# Limpar imagens antigas
docker image prune -f
```

## Desenvolvimento Local

```bash
# Terminal 1: Backend Python
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Frontend
npm install
npm run dev
# Acesse http://localhost:3000
```

## Arquitetura

```
Internet → VPS
           ├── Nginx (:80/:443)
           │   ├── /api/agent/* → FastAPI (:8000)
           │   └── /* → Frontend estático
           └── Certbot (renovação SSL)

Externo:
└── Supabase (PostgreSQL + Storage)
```
