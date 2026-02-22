import React, { useState } from 'react';
import { Search, Plus, UploadCloud, FileText, File, Trash2, CheckCircle, Clock, AlertCircle, Folder, ArrowLeft, Bot, MoreHorizontal, ChevronRight, Pencil } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { KnowledgeItem, KnowledgeCollection } from '../types';

export const KnowledgePage: React.FC = () => {
  // State for Navigation
  const [selectedCollection, setSelectedCollection] = useState<KnowledgeCollection | null>(null);

  // -- MOCK DATA --
  const mockAgents = [
    { id: '1', name: 'Sales SDR', color: 'bg-orange-500' },
    { id: '2', name: 'Suporte L1', color: 'bg-blue-500' },
    { id: '3', name: 'Code Reviewer', color: 'bg-purple-500' },
  ];

  const [collections, setCollections] = useState<KnowledgeCollection[]>([
    {
      id: '1',
      title: 'Manual de Vendas e Objeções',
      description: 'Documentação completa sobre processos de vendas e matriz de objeções.',
      agentId: '1',
      agentName: 'Sales SDR',
      documentsCount: 12,
      lastUpdated: 'Há 2 dias',
      status: 'active'
    },
    {
      id: '2',
      title: 'Políticas de Atendimento',
      description: 'Diretrizes de tom de voz e procedimentos de reembolso.',
      agentId: '2',
      agentName: 'Suporte L1',
      documentsCount: 5,
      lastUpdated: 'Há 4 horas',
      status: 'active'
    },
    {
      id: '3',
      title: 'Documentação da API v2',
      description: 'Especificações técnicas, endpoints e exemplos de request/response.',
      agentId: '3',
      agentName: 'Code Reviewer',
      documentsCount: 0,
      lastUpdated: 'Agora',
      status: 'syncing'
    }
  ]);

  const [documents, setDocuments] = useState<KnowledgeItem[]>([
    {
      id: '1',
      collectionId: '1',
      title: 'Manual de Vendas 2024.pdf',
      type: 'pdf',
      size: '2.4 MB',
      status: 'indexed',
      date: '10 min atrás',
      tokens: 4500
    },
    {
      id: '2',
      collectionId: '1',
      title: 'Script de Cold Call',
      type: 'text',
      size: '12 KB',
      status: 'indexed',
      date: '2 horas atrás',
      tokens: 850
    },
    {
      id: '3',
      collectionId: '1',
      title: 'Matriz de Objeções.pdf',
      type: 'pdf',
      size: '5.1 MB',
      status: 'processing',
      date: 'Agora',
    }
  ]);

  // -- MODAL STATES --
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'upload' | 'text'>('upload');

  // -- FORM STATES (For Create/Edit Collection) --
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agentId: ''
  });

  // -- HANDLERS --
  const handleCollectionClick = (collection: KnowledgeCollection) => {
    setSelectedCollection(collection);
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
  };

  // Open modal for CREATING a new collection
  const handleOpenCreateModal = () => {
    setEditingCollectionId(null);
    setFormData({ title: '', description: '', agentId: '' });
    setIsCollectionModalOpen(true);
  };

  // Open modal for EDITING an existing collection
  const handleOpenEditModal = (e: React.MouseEvent, collection: KnowledgeCollection) => {
    e.stopPropagation(); // Prevent opening the collection details
    setEditingCollectionId(collection.id);
    setFormData({
      title: collection.title,
      description: collection.description,
      agentId: collection.agentId
    });
    setIsCollectionModalOpen(true);
  };

  const handleDeleteCollection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta base de conhecimento?')) {
      setCollections(prev => prev.filter(c => c.id !== id));
      if (selectedCollection?.id === id) {
        setSelectedCollection(null);
      }
    }
  };

  // Save (Create or Update)
  const handleSaveCollection = () => {
    const selectedAgent = mockAgents.find(a => a.id === formData.agentId);
    const agentName = selectedAgent ? selectedAgent.name : 'Não atribuído';

    if (editingCollectionId) {
      // Update existing
      setCollections(prev => prev.map(item => 
        item.id === editingCollectionId 
          ? { 
              ...item, 
              title: formData.title, 
              description: formData.description, 
              agentId: formData.agentId,
              agentName: agentName
            }
          : item
      ));
    } else {
      // Create new
      const newCollection: KnowledgeCollection = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.title,
        description: formData.description,
        agentId: formData.agentId,
        agentName: agentName,
        documentsCount: 0,
        lastUpdated: 'Agora',
        status: 'active'
      };
      setCollections(prev => [...prev, newCollection]);
    }
    setIsCollectionModalOpen(false);
  };

  // -- RENDER HELPERS --
  const getStatusBadge = (status: KnowledgeItem['status'] | KnowledgeCollection['status']) => {
    switch (status) {
      case 'active':
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/30 text-emerald-500 text-xs font-medium border border-emerald-900/50">
            <CheckCircle size={12} /> {status === 'active' ? 'Ativo' : 'Indexado'}
          </span>
        );
      case 'syncing':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/30 text-amber-500 text-xs font-medium border border-amber-900/50">
            <Clock size={12} className="animate-spin" /> {status === 'syncing' ? 'Sincronizando' : 'Processando'}
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/30 text-red-500 text-xs font-medium border border-red-900/50">
            <AlertCircle size={12} /> Falha
          </span>
        );
    }
  };

  const getIconByType = (type: KnowledgeItem['type']) => {
    return type === 'pdf' ? <File className="text-red-400" size={20} /> : <FileText className="text-indigo-400" size={20} />;
  };

  // --- VIEW: COLLECTIONS LIST ---
  const renderCollectionsList = () => (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Base de Conhecimento</h2>
          <p className="text-neutral-400">Gerencie conjuntos de dados e associe aos seus agentes.</p>
        </div>
        <Button icon={Plus} onClick={handleOpenCreateModal}>
          Nova Base
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <div 
            key={collection.id} 
            onClick={() => handleCollectionClick(collection)}
            className="group bg-[#0A0A0A] border border-[#262626] hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all hover:bg-[#0F0F0F]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Folder size={20} className="text-indigo-400" />
              </div>
              <div className="flex items-center gap-1">
                {getStatusBadge(collection.status)}
                
                {/* EDIT BUTTON */}
                <button 
                  onClick={(e) => handleOpenEditModal(e, collection)}
                  className="text-neutral-500 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors ml-1"
                  title="Editar Base"
                >
                  <Pencil size={14} />
                </button>

                 {/* DELETE BUTTON */}
                 <button 
                  onClick={(e) => handleDeleteCollection(e, collection.id)}
                  className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-950/20 transition-colors"
                  title="Excluir Base"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{collection.title}</h3>
            <p className="text-sm text-neutral-400 mb-4 line-clamp-2 h-10">{collection.description}</p>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Agente:</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#141414] border border-[#262626]">
                <Bot size={12} className="text-neutral-400" />
                <span className="text-xs text-neutral-300">{collection.agentName}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-neutral-500">
              <span>{collection.documentsCount} arquivos</span>
              <span>{collection.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // --- VIEW: DOCUMENT DETAILS ---
  const renderDocumentDetails = () => (
    <div className="flex flex-col h-full">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-6 mb-6">
        <button 
          onClick={handleBackToCollections}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Voltar para Bases
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mt-1">
              <Folder size={24} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{selectedCollection?.title}</h2>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Bot size={14} />
                  {selectedCollection?.agentName}
                </span>
                <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                <span>{selectedCollection?.description}</span>
              </div>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setIsDocumentModalOpen(true)}>
            Adicionar Arquivo
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-[#0F0F0F] p-2 rounded-xl border border-[#262626] mb-6 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input 
            type="text"
            placeholder={`Buscar arquivos em ${selectedCollection?.title}...`}
            className="w-full bg-transparent border-none text-white pl-10 pr-4 py-2 focus:outline-none focus:ring-0 placeholder-neutral-600"
          />
        </div>
      </div>

      {/* File List */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#262626] bg-[#121212] text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <div className="col-span-5">Nome</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Data</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        <div className="overflow-y-auto flex-1">
          {documents.map((doc) => (
            <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#262626] hover:bg-[#121212] transition-colors items-center group">
              <div className="col-span-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-[#1A1A1A] border border-[#262626]`}>
                  {getIconByType(doc.type)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{doc.title}</h4>
                  <span className="text-xs text-neutral-500">{doc.size} • {doc.tokens ? `${doc.tokens} tokens` : 'Calculando...'}</span>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-neutral-400 bg-[#1A1A1A] px-2 py-1 rounded uppercase">
                  {doc.type}
                </span>
              </div>
              <div className="col-span-2 text-sm text-neutral-400">
                {doc.date}
              </div>
              <div className="col-span-2">
                {getStatusBadge(doc.status)}
              </div>
              <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-neutral-500 hover:text-red-400 transition-colors p-2 hover:bg-red-950/20 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in h-full flex flex-col">
      {selectedCollection ? renderDocumentDetails() : renderCollectionsList()}

      {/* --- MODAL: CREATE / EDIT COLLECTION --- */}
      <Modal 
        isOpen={isCollectionModalOpen} 
        onClose={() => setIsCollectionModalOpen(false)}
        title={editingCollectionId ? "Editar Base de Conhecimento" : "Nova Base de Conhecimento"}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Título da Base</label>
            <input 
              type="text" 
              placeholder="Ex: Manual de Vendas"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Descrição</label>
            <textarea 
              rows={3}
              placeholder="Descreva o propósito deste conhecimento..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Vincular ao Agente</label>
            <div className="relative">
              <select 
                value={formData.agentId}
                onChange={(e) => setFormData({...formData, agentId: e.target.value})}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="">Selecione um agente...</option>
                {mockAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
            <Button variant="ghost" onClick={() => setIsCollectionModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCollection}>
              {editingCollectionId ? 'Salvar Alterações' : 'Criar Base'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: ADD DOCUMENT --- */}
      <Modal 
        isOpen={isDocumentModalOpen} 
        onClose={() => setIsDocumentModalOpen(false)}
        title={`Adicionar a: ${selectedCollection?.title}`}
      >
         <div className="flex gap-1 bg-[#1A1A1A] p-1 rounded-lg mb-6 w-fit border border-[#262626]">
          <button
            onClick={() => setActiveDocTab('upload')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeDocTab === 'upload' 
                ? 'bg-[#262626] text-white shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Upload de Arquivo
          </button>
          <button
            onClick={() => setActiveDocTab('text')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeDocTab === 'text' 
                ? 'bg-[#262626] text-white shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Colar Texto
          </button>
        </div>

        {activeDocTab === 'upload' ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#262626] hover:border-indigo-500/50 rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors bg-[#0A0A0A] hover:bg-[#121212] group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={32} className="text-neutral-500 group-hover:text-indigo-400" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">Clique ou arraste arquivos aqui</h4>
              <p className="text-sm text-neutral-500 max-w-sm">
                Suporta PDF, TXT, MD e DOCX (Máx. 25MB)
              </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsDocumentModalOpen(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Título do Documento</label>
              <input 
                type="text" 
                placeholder="Ex: Nota de Atualização"
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Conteúdo</label>
              <textarea 
                rows={10}
                placeholder="Cole o texto aqui..."
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <Button variant="ghost" onClick={() => setIsDocumentModalOpen(false)}>Cancelar</Button>
              <Button onClick={() => setIsDocumentModalOpen(false)}>Salvar Conteúdo</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};