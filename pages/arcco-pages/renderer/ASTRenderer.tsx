
import React from 'react';
import { PageAST, SectionNode } from '../types/ast';
import { SECTION_COMPONENTS } from '../components/registry';

import { Trash2, ArrowUp, ArrowDown, Copy, Edit2 } from 'lucide-react';

interface ASTRendererProps {
    ast: PageAST | null;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    onMove?: (id: string, direction: 'up' | 'down') => void;
    onDuplicate?: (id: string) => void;
}

export const ASTRenderer: React.FC<ASTRendererProps> = ({
    ast,
    selectedId,
    onSelect,
    onDelete,
    onMove,
    onDuplicate
}) => {
    if (!ast || !ast.sections || ast.sections.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <h2 className="text-xl font-bold mb-2 text-neutral-400">Página vazia</h2>
                <p className="text-sm text-neutral-600">Peça ao agente para adicionar seções ou criar um template.</p>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen bg-[#050505] text-white font-sans antialiased selection:bg-indigo-500 selection:text-white ${ast.meta.theme === 'light' ? 'bg-white text-black' : ''} pb-32`}
            onClick={() => onSelect?.('')}
        >
            {/* Meta info could be used later (head title, meta description) */}

            {ast.sections.map((section: SectionNode, index: number) => {
                // Find component in registry
                const Component = SECTION_COMPONENTS[section.type];
                const isSelected = selectedId === section.id;

                if (!Component) {
                    console.warn(`Unknown section type: ${section.type}`);
                    return (
                        <div key={section.id} className="p-4 m-4 border border-red-500/20 bg-red-900/10 text-red-400 rounded-lg text-center">
                            Componente desconhecido: {section.type}
                        </div>
                    );
                }

                return (
                    <div
                        key={section.id}
                        id={section.id}
                        className={`relative group/section transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 z-10' : 'hover:ring-1 hover:ring-indigo-500/30'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(section.id);
                        }}
                    >
                        {/* Section Component */}
                        <Component {...section.props} />

                        {/* Action Toolbar (Visible on Hover or Seekected) */}
                        <div className={`absolute top-4 right-4 flex items-center gap-1 bg-neutral-900/90 backdrop-blur border border-white/10 rounded-lg shadow-xl p-1 transition-opacity duration-200 ${isSelected || 'group-hover/section:opacity-100 opacity-0'} z-50`}>
                            <div className="px-2 text-xs font-mono text-neutral-400 border-r border-white/10 mr-1">
                                {section.type}
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMove?.(section.id, 'up'); }}
                                disabled={index === 0}
                                className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para cima"
                            >
                                <ArrowUp size={14} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onMove?.(section.id, 'down'); }}
                                disabled={index === ast.sections.length - 1}
                                className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para baixo"
                            >
                                <ArrowDown size={14} />
                            </button>

                            <div className="w-px h-4 bg-white/10 mx-0.5" />

                            <button
                                onClick={(e) => { e.stopPropagation(); onDuplicate?.(section.id); }}
                                className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"
                                title="Duplicar"
                            >
                                <Copy size={14} />
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(section.id); }}
                                className="p-1.5 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400"
                                title="Remover"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Selection Label */}
                        {isSelected && (
                            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-t pointer-events-none">
                                {section.type} Selected
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
