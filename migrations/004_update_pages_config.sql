-- ============================================================================
-- Migration 004: Adicionando Colunas faltantes na tabela PagesConfig
-- Necessária para fazer o Painel Admin salvar as opções do Copywriter
-- e do novo Agente de Roteamento de Templates.
-- ============================================================================

ALTER TABLE "PagesConfig" 
ADD COLUMN IF NOT EXISTS "modelo_copywriter" TEXT DEFAULT 'anthropic/claude-3.5-sonnet',
ADD COLUMN IF NOT EXISTS "modelo_roteamento" TEXT DEFAULT 'google/gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS "prompt_roteamento" TEXT DEFAULT 'Você é um roteador de templates...';
