import React, { useState, useEffect } from 'react';
import { Type, Image as ImageIcon, Palette, X, Check } from 'lucide-react';

interface SelectedElementData {
    path: string;
    tagName: string;
    isImage: boolean;
    content: string;
    color: string;
    fontFamily: string;
    textSizeClass: string;
}

interface VisualEditorPanelProps {
    selectedElement: SelectedElementData | null;
    onUpdateElement: (payload: any) => void;
    onClose: () => void;
    onOpenDrive?: () => void;
}

const COLORS = [
    '#ffffff', '#000000', '#f8fafc', '#94a3b8',
    '#ef4444', '#f97316', '#f59e0b', '#10b981',
    '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
];

const FONTS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Playfair Display', value: '"Playfair Display", serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Outfit', value: 'Outfit, sans-serif' },
];

const SIZES = [
    { label: 'Pequeno', value: 'text-sm', icon: <Type size={12} /> },
    { label: 'Normal', value: 'text-base', icon: <Type size={14} /> },
    { label: 'Grande', value: 'text-2xl', icon: <Type size={18} /> },
    { label: 'Exagerado', value: 'text-5xl', icon: <Type size={22} /> },
];

export const VisualEditorPanel: React.FC<VisualEditorPanelProps> = ({
    selectedElement,
    onUpdateElement,
    onClose,
    onOpenDrive
}) => {
    const [localText, setLocalText] = useState('');

    useEffect(() => {
        if (selectedElement) {
            setLocalText(selectedElement.content || '');
        }
    }, [selectedElement?.path]);

    if (!selectedElement) return null;

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalText(e.target.value);
        onUpdateElement({ content: e.target.value });
    };

    const handleColorChange = (color: string) => {
        onUpdateElement({ color });
    };

    const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateElement({ fontFamily: e.target.value });
    };

    const handleSizeChange = (sizeClass: string) => {
        onUpdateElement({ textSizeClass: sizeClass });
    };

    return (
        <div className="absolute top-20 right-6 w-80 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col p-4 animate-fade-in-up">

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    {selectedElement.isImage ? <ImageIcon size={16} className="text-pink-400" /> : <Type size={16} className="text-indigo-400" />}
                    <span className="text-sm font-semibold text-white">
                        Editar {selectedElement.isImage ? 'Imagem' : 'Texto'}
                    </span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            {selectedElement.isImage ? (
                // IMAGE EDITOR
                <div className="space-y-4">
                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/10 bg-neutral-900 relative group">
                        <img src={localText} alt="Selected" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button
                                onClick={onOpenDrive}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-lg"
                            >
                                Substituir pelo Drive
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center">Clique na imagem para trocar</p>

                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium ml-1">URL da Imagem</label>
                        <input
                            value={localText}
                            onChange={(e) => {
                                setLocalText(e.target.value);
                                onUpdateElement({ content: e.target.value });
                            }}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="https://..."
                        />
                    </div>
                </div>
            ) : (
                // TEXT EDITOR
                <div className="space-y-5">
                    {/* Conteúdo */}
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium ml-1">Conteúdo</label>
                        <textarea
                            value={localText}
                            onChange={handleTextChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px] resize-none"
                        />
                    </div>

                    {/* Cores */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Palette size={12} className="text-neutral-400" />
                            <label className="text-xs text-neutral-400 font-medium">Cor</label>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleColorChange(c)}
                                    className="w-8 h-8 rounded-full border border-white/20 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Tipografia */}
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium ml-1">Tipografia</label>
                        <select
                            onChange={handleFontChange}
                            value={FONTS.find(f => selectedElement.fontFamily.includes(f.label.split(',')[0].replace(/"/g, '')))?.value || FONTS[0].value}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
                        >
                            {FONTS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tamanho */}
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium ml-1">Tamanho da Fonte</label>
                        <div className="flex bg-black/50 border border-white/10 rounded-lg p-1 gap-1">
                            {SIZES.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => handleSizeChange(s.value)}
                                    className={`flex-1 p-2 flex flex-col items-center justify-center gap-1 rounded-md transition-colors ${selectedElement.textSizeClass === s.value ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                                    title={s.label}
                                >
                                    {s.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }

            {/* Footer hint */}
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 opacity-60">
                <Check size={12} className="text-green-400" />
                <span className="text-[10px] text-neutral-400">Salvo automaticamente</span>
            </div>

        </div >
    );
};
