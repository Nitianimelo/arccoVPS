import React from 'react';

const FONTS = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Montserrat', 'Oswald', 'Raleway', 'Lato', 'Bebas Neue', 'Dancing Script'];

interface Props {
    element: any;
    onUpdate: (id: string, updates: any) => void;
    slideStyles?: Record<string, any>;
    onUpdateSlide?: (styles: Record<string, any>) => void;
}

export const CanvasPropertyPanel: React.FC<Props> = ({ element, onUpdate, slideStyles, onUpdateSlide }) => {
    if (!element) {
        // Slide background controls
        return (
            <div className="p-4 space-y-5">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Fundo do Slide</h3>
                <div className="space-y-3">
                    <label className="text-[10px] text-neutral-500">Cor de Fundo</label>
                    <div className="flex items-center gap-2">
                        <input type="color" value={slideStyles?.backgroundColor || '#121212'}
                            onChange={e => onUpdateSlide?.({ ...slideStyles, backgroundColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-[#333] cursor-pointer" />
                        <input type="text" value={slideStyles?.backgroundColor || '#121212'}
                            onChange={e => onUpdateSlide?.({ ...slideStyles, backgroundColor: e.target.value })}
                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white" />
                    </div>
                    <label className="text-[10px] text-neutral-500 mt-3 block">Gradiente (CSS)</label>
                    <input type="text" value={slideStyles?.background || ''} placeholder="linear-gradient(135deg, #667eea, #764ba2)"
                        onChange={e => onUpdateSlide?.({ ...slideStyles, background: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white font-mono" />
                </div>
                <p className="text-[10px] text-neutral-700 mt-2">Clique num elemento para editar suas propriedades</p>
            </div>
        );
    }

    const s = (key: string, value: string) => {
        onUpdate(element.id, { styles: { ...element.styles, [key]: value } });
    };
    const p = (key: string, value: any) => {
        onUpdate(element.id, { props: { ...element.props, [key]: value } });
    };

    return (
        <div className="p-4 space-y-5 text-xs">
            {/* Position */}
            <div className="space-y-2">
                <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Posição e Tamanho</h4>
                <div className="grid grid-cols-2 gap-2">
                    {[['X', 'left'], ['Y', 'top'], ['W', 'width'], ['H', 'height']].map(([label, key]) => (
                        <div key={key} className="space-y-1">
                            <label className="text-[10px] text-neutral-500">{label}</label>
                            <input type="text" value={element.styles?.[key] || ''}
                                onChange={e => s(key, e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Text props */}
            {element.type === 'TextOverlay' && (
                <div className="space-y-3">
                    <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Texto</h4>
                    <textarea value={element.props.text} rows={3}
                        onChange={e => p('text', e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white resize-y" />
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Fonte</label>
                        <select value={element.styles?.fontFamily?.replace(/'/g, '') || 'Inter'}
                            onChange={e => s('fontFamily', `'${e.target.value}', sans-serif`)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white">
                            {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500">Tamanho</label>
                            <input type="text" value={element.styles?.fontSize || '24px'} onChange={e => s('fontSize', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500">Peso</label>
                            <select value={element.styles?.fontWeight || 'normal'} onChange={e => s('fontWeight', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white">
                                {['300', '400', '500', '600', '700', '800', '900'].map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500">Cor</label>
                            <div className="flex gap-1">
                                <input type="color" value={element.styles?.color || '#ffffff'} onChange={e => s('color', e.target.value)}
                                    className="w-8 h-8 rounded border border-[#333] cursor-pointer" />
                                <input type="text" value={element.styles?.color || '#ffffff'} onChange={e => s('color', e.target.value)}
                                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500">Entrelinha</label>
                            <input type="text" value={element.styles?.lineHeight || '1.4'} onChange={e => s('lineHeight', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Image props */}
            {element.type === 'ImageOverlay' && (
                <div className="space-y-3">
                    <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Imagem</h4>
                    <input type="text" value={element.props.src || ''} onChange={e => p('src', e.target.value)} placeholder="URL da imagem"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white font-mono text-[10px]" />
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Opacidade: {(element.props.opacity ?? 1).toFixed(1)}</label>
                        <input type="range" min="0" max="1" step="0.05" value={element.props.opacity ?? 1}
                            onChange={e => p('opacity', parseFloat(e.target.value))}
                            className="w-full accent-indigo-500" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Borda Arredondada</label>
                        <input type="text" value={element.styles?.borderRadius || '0'} onChange={e => s('borderRadius', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                    </div>
                </div>
            )}

            {/* Shape props */}
            {element.type === 'Shape' && (
                <div className="space-y-3">
                    <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Forma</h4>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Cor</label>
                        <div className="flex gap-1">
                            <input type="color" value={element.props.color || '#6366f1'} onChange={e => p('color', e.target.value)}
                                className="w-8 h-8 rounded border border-[#333] cursor-pointer" />
                            <input type="text" value={element.props.color || '#6366f1'} onChange={e => p('color', e.target.value)}
                                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Gradiente</label>
                        <input type="text" value={element.props.gradient || ''} placeholder="linear-gradient(...)"
                            onChange={e => p('gradient', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white font-mono text-[10px]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-neutral-500">Border Radius</label>
                        <input type="text" value={element.styles?.borderRadius || '0'} onChange={e => s('borderRadius', e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                    </div>
                </div>
            )}

            {/* Opacity & Rotation */}
            <div className="space-y-2 pt-3 border-t border-[#262626]">
                <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px]">Aparência</h4>
                <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500">Opacidade Geral</label>
                    <input type="range" min="0" max="1" step="0.05"
                        value={parseFloat(element.styles?.opacity) || 1}
                        onChange={e => s('opacity', e.target.value)}
                        className="w-full accent-indigo-500" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-neutral-500">Rotação (deg)</label>
                    <input type="text" value={element.styles?.transform?.replace('rotate(', '').replace(')', '') || '0deg'}
                        onChange={e => s('transform', `rotate(${e.target.value})`)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white" />
                </div>
            </div>
        </div>
    );
};
