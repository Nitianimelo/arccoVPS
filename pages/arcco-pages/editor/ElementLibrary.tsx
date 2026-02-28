import React, { useState } from 'react';
import { Type, Image as ImageIcon, Square, Circle, Minus, Sparkles, Search } from 'lucide-react';
import { pexelsService } from '../../../lib/pexels';
import { SectionNode } from '../types/ast';

interface ElementLibraryProps {
    onAddElement: (element: SectionNode) => void;
}

const FONT_PRESETS = [
    { label: 'Título Grande', variant: 'h1', fontSize: '64px', fontWeight: 'bold' },
    { label: 'Subtítulo', variant: 'h2', fontSize: '36px', fontWeight: '600' },
    { label: 'Corpo de Texto', variant: 'p', fontSize: '20px', fontWeight: 'normal' },
];

const SHAPE_PRESETS = [
    { label: 'Retângulo', icon: Square, borderRadius: '0px', w: 300, h: 200 },
    { label: 'Retângulo R.', icon: Square, borderRadius: '24px', w: 300, h: 200 },
    { label: 'Círculo', icon: Circle, borderRadius: '50%', w: 200, h: 200 },
    { label: 'Linha', icon: Minus, borderRadius: '0px', w: 400, h: 4 },
];

export const ElementLibrary: React.FC<ElementLibraryProps> = ({ onAddElement }) => {
    const [activeTab, setActiveTab] = useState<'text' | 'shapes' | 'images'>('text');
    const [pexelsQuery, setPexelsQuery] = useState('');
    const [pexelsResults, setPexelsResults] = useState<string[]>([]);
    const [searching, setSearching] = useState(false);

    const addText = (preset: typeof FONT_PRESETS[0]) => {
        onAddElement({
            id: `text-${Date.now()}`,
            type: 'TextOverlay',
            props: { text: 'Seu texto aqui', variant: preset.variant },
            styles: {
                color: '#ffffff', fontSize: preset.fontSize, fontWeight: preset.fontWeight,
                fontFamily: "'Inter', sans-serif",
                top: '200px', left: '100px', width: '600px', height: 'auto',
            },
        });
    };

    const addShape = (preset: typeof SHAPE_PRESETS[0]) => {
        onAddElement({
            id: `shape-${Date.now()}`,
            type: 'Shape',
            props: { color: '#6366f1' },
            styles: {
                top: '300px', left: '300px',
                width: `${preset.w}px`, height: `${preset.h}px`,
                borderRadius: preset.borderRadius,
            },
        });
    };

    const addImage = (url: string) => {
        onAddElement({
            id: `img-${Date.now()}`,
            type: 'ImageOverlay',
            props: { src: url, opacity: 1 },
            styles: { top: '0px', left: '0px', width: '100%', height: '100%' },
        });
    };

    const searchPexels = async () => {
        if (!pexelsQuery.trim()) return;
        setSearching(true);
        try {
            const res = await pexelsService.searchPhotos(pexelsQuery, { per_page: 6, orientation: 'landscape' });
            setPexelsResults(res.photos.map(p => p.src.medium));
        } catch { setPexelsResults([]); }
        finally { setSearching(false); }
    };

    const tabs = [
        { id: 'text' as const, label: 'Texto', icon: Type },
        { id: 'shapes' as const, label: 'Formas', icon: Square },
        { id: 'images' as const, label: 'Imagens', icon: ImageIcon },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-[#262626]">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${activeTab === t.id ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-neutral-500 hover:text-neutral-300'}`}>
                        <t.icon size={16} />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeTab === 'text' && FONT_PRESETS.map((p, i) => (
                    <button key={i} onClick={() => addText(p)}
                        className="w-full p-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl text-left transition-colors group">
                        <span className="text-neutral-300 group-hover:text-white" style={{ fontSize: i === 0 ? '18px' : i === 1 ? '14px' : '12px', fontWeight: p.fontWeight as any }}>
                            {p.label}
                        </span>
                        <span className="block text-[10px] text-neutral-600 mt-1">{p.fontSize}</span>
                    </button>
                ))}

                {activeTab === 'shapes' && (
                    <div className="grid grid-cols-2 gap-2">
                        {SHAPE_PRESETS.map((s, i) => (
                            <button key={i} onClick={() => addShape(s)}
                                className="p-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-xl flex flex-col items-center gap-2 transition-colors">
                                <s.icon size={24} className="text-indigo-400" />
                                <span className="text-[10px] text-neutral-500">{s.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'images' && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input value={pexelsQuery} onChange={e => setPexelsQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchPexels()}
                                placeholder="Buscar no Pexels..."
                                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                            <button onClick={searchPexels} disabled={searching}
                                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center">
                                {searching ? <Sparkles size={14} className="animate-spin text-white" /> : <Search size={14} className="text-white" />}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {pexelsResults.map((url, i) => (
                                <button key={i} onClick={() => addImage(url)}
                                    className="aspect-video rounded-lg overflow-hidden border border-[#333] hover:border-indigo-500 transition-colors">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                        {pexelsResults.length === 0 && !searching && (
                            <p className="text-xs text-neutral-600 text-center py-4">Busque fotos do Pexels acima</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
