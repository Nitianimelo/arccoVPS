-- ============================================================================
-- Migration 003: Tabela pages_user
-- Arcco Pages — armazena as landing pages criadas pelos usuários
-- ============================================================================

-- Extensão para UUID (normalmente já ativa no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela principal de páginas
CREATE TABLE IF NOT EXISTS pages_user (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identificação
    nome        TEXT NOT NULL DEFAULT 'Nova Página',
    usuario     TEXT NOT NULL,          -- Email ou ID do usuário criador
    url_slug    TEXT UNIQUE,           -- Slug da URL pública (ex: "minha-landing-abc123")

    -- Conteúdo
    codepages   TEXT,                  -- HTML compilado (resultado do astCompiler ou bundleProject)
    source_files JSONB,               -- Arquivos fonte JSON (para reedição no builder)

    -- Status
    publicado   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pages_user_usuario  ON pages_user (usuario);
CREATE INDEX IF NOT EXISTS idx_pages_user_slug     ON pages_user (url_slug) WHERE url_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_user_pub      ON pages_user (publicado) WHERE publicado = TRUE;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pages_user_updated_at ON pages_user;
CREATE TRIGGER trigger_pages_user_updated_at
    BEFORE UPDATE ON pages_user
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) — cada usuário vê/edita apenas suas próprias páginas
ALTER TABLE pages_user ENABLE ROW LEVEL SECURITY;

-- Política: usuário autenticado pode ler/criar/editar/deletar suas próprias páginas
CREATE POLICY "usuario_own_pages" ON pages_user
    FOR ALL
    USING (usuario = auth.email() OR usuario = auth.uid()::text)
    WITH CHECK (usuario = auth.email() OR usuario = auth.uid()::text);

-- Política: qualquer pessoa (inclusive anônima) pode ler páginas PUBLICADAS
-- (necessário para o endpoint público pages.arccoai.com/{slug})
CREATE POLICY "public_read_published" ON pages_user
    FOR SELECT
    USING (publicado = TRUE);

-- Tabela de configuração do Pages Builder (usada pelo PagesBuilder.tsx e AdminPage.tsx)
CREATE TABLE IF NOT EXISTS "PagesConfig" (
    id                    INTEGER PRIMARY KEY DEFAULT 1,
    modelo_criacao        TEXT    DEFAULT 'anthropic/claude-3.5-sonnet',
    system_prompt_criacao TEXT    DEFAULT '',
    modelo_edicao         TEXT    DEFAULT 'anthropic/claude-3.5-sonnet',
    system_prompt_edicao  TEXT    DEFAULT '',
    prompt_copywriter     TEXT    DEFAULT '',
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Garantir que só existe 1 registro de config
    CONSTRAINT single_config CHECK (id = 1)
);

-- Inserir registro padrão se não existir
INSERT INTO "PagesConfig" (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Como aplicar esta migration no Supabase:
--
--   1. Acesse: https://supabase.com/dashboard → seu projeto → SQL Editor
--   2. Cole este SQL e execute
--
-- OU via CLI:
--   supabase db push
-- ============================================================================
