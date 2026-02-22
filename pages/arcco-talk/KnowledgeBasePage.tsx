import React, { useState } from 'react';
import {
  Database,
  Plus,
  Search,
  FileText,
  Link,
  Upload,
  Trash2,
  Edit3,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Clock,
  HelpCircle,
  ArrowLeft,
  FolderOpen,
  File,
  Globe,
  MessageSquareText,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { KnowledgeCollection, KnowledgeItem, TalkAgent, ViewState } from '../../types';

interface KnowledgeBasePageProps {
  agent: TalkAgent | null;
  onNavigate: (view: ViewState) => void;
}

const MOCK_COLLECTIONS: KnowledgeCollection[] = [
  {
    id: '1',
    title: 'FAQs Gerais',
    description: 'Perguntas frequentes sobre produtos e serviços',
    documentsCount: 24,
    lastUpdated: '2024-01-15',
    status: 'active',
    totalTokens: 45000
  },
  {
    id: '2',
    title: 'Políticas da Empresa',
    description: 'Termos de uso, privacidade e políticas internas',
    documentsCount: 8,
    lastUpdated: '2024-01-10',
    status: 'active',
    totalTokens: 28000
  }
];

const MOCK_DOCUMENTS: KnowledgeItem[] = [
  {
    id: '1',
    collectionId: '1',
    title: 'Guia de Produtos 2024',
    type: 'pdf',
    size: '2.4 MB',
    status: 'indexed',
    date: '2024-01-15',
    tokens: 12000
  },
  {
    id: '2',
    collectionId: '1',
    title: 'FAQ - Perguntas Frequentes',
    type: 'faq',
    size: '45 itens',
    status: 'indexed',
    date: '2024-01-14',
    tokens: 8500
  },
  {
    id: '3',
    collectionId: '1',
    title: 'https://meusite.com/produtos',
    type: 'url',
    size: '--',
    status: 'processing',
    date: '2024-01-16',
    tokens: 0
  }
];

export const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ agent, onNavigate }) => {
  const [collections, setCollections] = useState<KnowledgeCollection[]>(MOCK_COLLECTIONS);
  const [documents, setDocuments] = useState<KnowledgeItem[]>(MOCK_DOCUMENTS);
  const [selectedCollection, setSelectedCollection] = useState<KnowledgeCollection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'file' | 'url' | 'faq' | 'text' | null>(null);

  const filteredDocuments = documents.filter(
    (doc) =>
      (!selectedCollection || doc.collectionId === selectedCollection.id) &&
      doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTokens = documents.reduce((sum, doc) => sum + (doc.tokens || 0), 0);
  const indexedCount = documents.filter((d) => d.status === 'indexed').length;

  const getTypeIcon = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'pdf':
        return <File size={16} className="text-red-400" />;
      case 'text':
        return <FileText size={16} className="text-blue-400" />;
      case 'url':
        return <Globe size={16} className="text-green-400" />;
      case 'faq':
        return <MessageSquareText size={16} className="text-purple-400" />;
    }
  };

  const getStatusBadge = (status: KnowledgeItem['status']) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
            <Check size={10} />
            Indexado
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">
            <RefreshCw size={10} className="animate-spin" />
            Processando
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
            <X size={10} />
            Erro
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => onNavigate('ARCCO_TALK')}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
            <p className="text-neutral-400">
              {agent ? `Agente: ${agent.name}` : 'Gerencie os documentos e informações do seu agente'}
            </p>
          </div>
          <div className="relative group">
            <button
              disabled
              className="px-4 py-2.5 bg-neutral-800 text-neutral-500 font-medium rounded-xl flex items-center gap-2 cursor-not-allowed border border-neutral-700/50 opacity-50"
            >
              <Plus size={18} />
              Adicionar Conteúdo
            </button>
            <div className="absolute top-full mt-2 right-0 bg-black border border-neutral-800 text-neutral-300 text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Em breve
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-900/30 flex items-center justify-center">
                <Database size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{collections.length}</p>
                <p className="text-xs text-neutral-500">Coleções</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <FileText size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{documents.length}</p>
                <p className="text-xs text-neutral-500">Documentos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
                <Check size={18} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{indexedCount}</p>
                <p className="text-xs text-neutral-500">Indexados</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
                <Sparkles size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(totalTokens / 1000).toFixed(1)}k</p>
                <p className="text-xs text-neutral-500">Tokens</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Collections Sidebar */}
          <div className="w-72 shrink-0">
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Coleções</h3>
                <button className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors">
                  <Plus size={16} className="text-neutral-400" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCollection(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!selectedCollection
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                      : 'hover:bg-neutral-800 text-neutral-300'
                    }`}
                >
                  <FolderOpen size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Todos os Documentos</p>
                    <p className="text-xs text-neutral-500">{documents.length} itens</p>
                  </div>
                </button>

                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${selectedCollection?.id === collection.id
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'
                        : 'hover:bg-neutral-800 text-neutral-300'
                      }`}
                  >
                    <Database size={18} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{collection.title}</p>
                      <p className="text-xs text-neutral-500">
                        {collection.documentsCount} documentos
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="flex-1">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="w-full bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Documents */}
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#1a1a1a] text-xs text-neutral-500 uppercase tracking-wider">
                <div className="col-span-5">Documento</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Tokens</div>
                <div className="col-span-1"></div>
              </div>

              {/* Documents List */}
              {filteredDocuments.length > 0 ? (
                <div className="divide-y divide-[#1a1a1a]">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[#0F0F0F] transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        {getTypeIcon(doc.type)}
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{doc.title}</p>
                          <p className="text-xs text-neutral-500">{doc.size}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-neutral-400 capitalize">{doc.type}</span>
                      </div>
                      <div className="col-span-2">{getStatusBadge(doc.status)}</div>
                      <div className="col-span-2">
                        <span className="text-sm text-neutral-400">
                          {doc.tokens ? doc.tokens.toLocaleString() : '--'}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors">
                          <MoreVertical size={14} className="text-neutral-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} className="text-neutral-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Nenhum documento</h3>
                  <p className="text-neutral-500 text-sm mb-4">
                    {searchTerm
                      ? 'Nenhum documento encontrado para sua busca'
                      : 'Adicione documentos para o agente aprender'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Adicionar Documento
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-[#262626]">
              <h2 className="text-xl font-bold text-white">Adicionar Conteúdo</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Escolha o tipo de conteúdo para adicionar à base
              </p>
            </div>

            <div className="p-6">
              {!addType ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAddType('file')}
                    className="p-4 bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl hover:border-[#333] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center mb-3">
                      <Upload size={20} className="text-red-400" />
                    </div>
                    <h4 className="font-medium text-white mb-1">Upload de Arquivo</h4>
                    <p className="text-xs text-neutral-500">PDF, TXT, DOCX</p>
                  </button>

                  <button
                    onClick={() => setAddType('url')}
                    className="p-4 bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl hover:border-[#333] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center mb-3">
                      <Link size={20} className="text-green-400" />
                    </div>
                    <h4 className="font-medium text-white mb-1">URL de Website</h4>
                    <p className="text-xs text-neutral-500">Importar de página web</p>
                  </button>

                  <button
                    onClick={() => setAddType('faq')}
                    className="p-4 bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl hover:border-[#333] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center mb-3">
                      <HelpCircle size={20} className="text-purple-400" />
                    </div>
                    <h4 className="font-medium text-white mb-1">FAQ</h4>
                    <p className="text-xs text-neutral-500">Perguntas e respostas</p>
                  </button>

                  <button
                    onClick={() => setAddType('text')}
                    className="p-4 bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl hover:border-[#333] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center mb-3">
                      <FileText size={20} className="text-blue-400" />
                    </div>
                    <h4 className="font-medium text-white mb-1">Texto Manual</h4>
                    <p className="text-xs text-neutral-500">Digitar conteúdo</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {addType === 'file' && (
                    <div className="border-2 border-dashed border-[#262626] rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                      <Upload size={32} className="text-neutral-500 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">
                        Arraste arquivos aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-neutral-500">PDF, TXT, DOCX até 10MB</p>
                    </div>
                  )}

                  {addType === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        URL do Website
                      </label>
                      <input
                        type="url"
                        placeholder="https://meusite.com/pagina"
                        className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {addType === 'faq' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Pergunta
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Como faço para..."
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Resposta
                        </label>
                        <textarea
                          placeholder="Digite a resposta..."
                          rows={4}
                          className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {addType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Conteúdo
                      </label>
                      <textarea
                        placeholder="Digite ou cole o conteúdo aqui..."
                        rows={8}
                        className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#262626] flex justify-between">
              <button
                onClick={() => {
                  setAddType(null);
                  setShowAddModal(false);
                }}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              {addType && (
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
