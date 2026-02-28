import React from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';

interface FloatingToolbarProps {
    element: any;
    canvasRect: DOMRect | null;
    scale: number;
    onUpdate: (id: string, updates: any) => void;
    onDelete: (id: string) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ element, canvasRect, scale, onUpdate, onDelete }) => {
    if (!element || !canvasRect) return null;

    const elTop = parseFloat(element.styles?.top) || 0;
    const elLeft = parseFloat(element.styles?.left) || 0;
    const elW = parseFloat(element.styles?.width) || 200;

    const toolbarX = canvasRect.left + (elLeft + elW / 2) * scale;
    const toolbarY = canvasRect.top + elTop * scale - 52;

    const isText = element.type === 'TextOverlay';

    const updateStyle = (key: string, value: string) => {
        onUpdate(element.id, { styles: { ...element.styles, [key]: value } });
    };

    return (
        <div
            className="fixed z-[100] flex items-center gap-1 bg-[#1a1a1a] border border-[#444] rounded-xl px-2 py-1.5 shadow-2xl"
            style={{ left: toolbarX, top: Math.max(toolbarY, 8), transform: 'translateX(-50%)' }}
        >
            {/* Color */}
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-[#555] cursor-pointer">
                <input
                    type="color"
                    value={element.styles?.color || '#ffffff'}
                    onChange={e => updateStyle('color', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full h-full" style={{ backgroundColor: element.styles?.color || '#ffffff' }} />
            </div>

            {isText && (
                <>
                    <div className="w-px h-5 bg-[#444] mx-1" />
                    <button onClick={() => updateStyle('fontWeight', element.styles?.fontWeight === 'bold' ? 'normal' : 'bold')}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${element.styles?.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-[#333]'}`}>
                        <Bold size={14} />
                    </button>
                    <button onClick={() => updateStyle('fontStyle', element.styles?.fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${element.styles?.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-[#333]'}`}>
                        <Italic size={14} />
                    </button>
                    <div className="w-px h-5 bg-[#444] mx-1" />
                    {['left', 'center', 'right'].map(a => (
                        <button key={a} onClick={() => updateStyle('textAlign', a)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${element.styles?.textAlign === a ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-[#333]'}`}>
                            {a === 'left' ? <AlignLeft size={14} /> : a === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                        </button>
                    ))}
                </>
            )}

            <div className="w-px h-5 bg-[#444] mx-1" />
            <button onClick={() => onDelete(element.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20">
                <Trash2 size={14} />
            </button>
        </div>
    );
};
