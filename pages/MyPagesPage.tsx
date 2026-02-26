/**
 * MyPagesPage — Minhas Páginas
 *
 * Dashboard para o usuário gerenciar as landing pages criadas no Arcco Builder.
 * Exibe grade de páginas com status, URL pública, e ações de publicar/despublicar/editar/deletar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Layout,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserPage {
  id: string;
  nome: string;
  usuario: string;
  url_slug: string | null;
  publicado: boolean;
  created_at: string;
  updated_at: string;
}

interface MyPagesPageProps {
  userEmail: string;
  onEditPage?: (pageId: string) => void;
  onNavigateToBuilder?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PAGE_DOMAIN = 'https://pages.arccoai.com';

function getPageUrl(slug: string): string {
  return `${PAGE_DOMAIN}/${slug}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ── Status Badge ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ publicado: boolean }> = ({ publicado }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      publicado
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
        : 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/20'
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${publicado ? 'bg-emerald-400' : 'bg-neutral-500'}`}
    />
    {publicado ? 'Publicada' : 'Rascunho'}
  </span>
);

// ── Page Card ──────────────────────────────────────────────────────────────────

interface PageCardProps {
  page: UserPage;
  onTogglePublish: (page: UserPage) => void;
  onDelete: (page: UserPage) => void;
  onCopyUrl: (slug: string) => void;
  copiedSlug: string | null;
  actionLoading: string | null;
}

const PageCard: React.FC<PageCardProps> = ({
  page,
  onTogglePublish,
  onDelete,
  onCopyUrl,
  copiedSlug,
  actionLoading,
}) => {
  const isBusy = actionLoading === page.id;
  const slug = page.url_slug;

  return (
    <div className="group relative bg-[#18181b] border border-[#2a2a2d] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-200 hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]">
      {/* Thumbnail placeholder */}
      <div className="h-36 bg-gradient-to-br from-[#1e1e22] to-[#141416] flex items-center justify-center border-b border-[#2a2a2d]">
        <div className="flex flex-col items-center gap-2 text-neutral-700">
          <FileText size={32} />
          <span className="text-xs">{page.nome}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white truncate flex-1" title={page.nome}>
            {page.nome}
          </h3>
          <StatusBadge publicado={page.publicado} />
        </div>

        {/* URL */}
        {slug && page.publicado ? (
          <div className="flex items-center gap-1.5 bg-[#111113] rounded-lg px-2.5 py-1.5 border border-[#2a2a2d]">
            <Globe size={12} className="text-indigo-400 shrink-0" />
            <span className="text-xs text-neutral-400 truncate flex-1 font-mono">
              {getPageUrl(slug)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onCopyUrl(slug)}
                title="Copiar URL"
                className="p-1 text-neutral-500 hover:text-white transition-colors rounded"
              >
                {copiedSlug === slug ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
              <a
                href={getPageUrl(slug)}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir página"
                className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors rounded"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-600 italic">
            {slug ? 'Página despublicada' : 'Sem slug definido'}
          </p>
        )}

        {/* Meta */}
        <p className="text-xs text-neutral-600">
          Atualizada em {formatDate(page.updated_at)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onTogglePublish(page)}
            disabled={isBusy || !slug}
            title={!slug ? 'Salve a página no Builder para publicar' : page.publicado ? 'Despublicar' : 'Publicar'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all
              ${isBusy
                ? 'opacity-50 cursor-wait'
                : !slug
                  ? 'opacity-40 cursor-not-allowed'
                  : page.publicado
                    ? 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
              }`}
          >
            {isBusy ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : page.publicado ? (
              <EyeOff size={12} />
            ) : (
              <Eye size={12} />
            )}
            {page.publicado ? 'Despublicar' : 'Publicar'}
          </button>

          <button
            onClick={() => onDelete(page)}
            disabled={isBusy}
            title="Excluir página"
            className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Confirm Delete Modal ───────────────────────────────────────────────────────

const ConfirmDeleteModal: React.FC<{
  page: UserPage;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ page, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#1a1a1d] border border-[#313134] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
          <AlertCircle size={20} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Excluir página?</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Esta ação não pode ser desfeita.</p>
        </div>
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        A página <span className="text-white font-medium">"{page.nome}"</span> será permanentemente excluída.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm text-neutral-400 bg-[#26262a] hover:bg-[#2e2e32] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors"
        >
          Excluir
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export const MyPagesPage: React.FC<MyPagesPageProps> = ({
  userEmail,
  onNavigateToBuilder,
}) => {
  const [pages, setPages] = useState<UserPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserPage | null>(null);

  // ── Load pages ─────────────────────────────────────────────────────────────

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('pages_user')
        .select('id, nome, usuario, url_slug, publicado, created_at, updated_at')
        .eq('usuario', userEmail)
        .order('updated_at', { ascending: false });

      if (err) throw err;
      setPages(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar páginas.');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTogglePublish = async (page: UserPage) => {
    if (!page.url_slug) return;
    setActionLoading(page.id);
    try {
      const { error: err } = await supabase
        .from('pages_user')
        .update({
          publicado: !page.publicado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (err) throw err;
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, publicado: !p.publicado } : p))
      );
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao alterar status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    setConfirmDelete(null);
    try {
      const { error: err } = await supabase
        .from('pages_user')
        .delete()
        .eq('id', confirmDelete.id);

      if (err) throw err;
      setPages((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao excluir página.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyUrl = (slug: string) => {
    navigator.clipboard.writeText(getPageUrl(slug)).catch(() => {});
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = pages.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'published' && p.publicado) ||
      (filter === 'draft' && !p.publicado);
    return matchSearch && matchFilter;
  });

  const publishedCount = pages.filter((p) => p.publicado).length;
  const draftCount = pages.filter((p) => !p.publicado).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#161618] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#161618]/95 backdrop-blur-md border-b border-[#262629] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Layout size={18} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Minhas Páginas</h1>
              <p className="text-xs text-neutral-500">
                {pages.length} página{pages.length !== 1 ? 's' : ''} · {publishedCount} publicada{publishedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPages}
              disabled={loading}
              className="p-2 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {onNavigateToBuilder && (
              <button
                onClick={onNavigateToBuilder}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              >
                <Plus size={16} />
                Nova Página
              </button>
            )}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar páginas..."
              className="w-full pl-8 pr-3 py-2 bg-[#1e1e22] border border-[#2a2a2d] rounded-xl text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#1e1e22] border border-[#2a2a2d] rounded-xl p-1">
            {(['all', 'published', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                {f === 'all' ? `Todas (${pages.length})` : f === 'published' ? `Publicadas (${publishedCount})` : `Rascunhos (${draftCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#18181b] border border-[#2a2a2d] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-[#222225]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#222225] rounded w-3/4" />
                  <div className="h-3 bg-[#222225] rounded w-full" />
                  <div className="h-8 bg-[#222225] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1e1e22] border border-[#2a2a2d] flex items-center justify-center mb-4">
              <Globe size={28} className="text-neutral-600" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-400 mb-1">
              {search || filter !== 'all' ? 'Nenhuma página encontrada' : 'Nenhuma página ainda'}
            </h3>
            <p className="text-xs text-neutral-600 mb-6 max-w-xs">
              {search || filter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira landing page com o Arcco Builder.'}
            </p>
            {!search && filter === 'all' && onNavigateToBuilder && (
              <button
                onClick={onNavigateToBuilder}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)]"
              >
                <Plus size={16} />
                Criar Primeira Página
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                onTogglePublish={handleTogglePublish}
                onDelete={(p) => setConfirmDelete(p)}
                onCopyUrl={handleCopyUrl}
                copiedSlug={copiedSlug}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmDeleteModal
          page={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

export default MyPagesPage;
