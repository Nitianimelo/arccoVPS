import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ChevronLeft, Download, Plus, Trash2, Save, Undo, Redo, X, Copy, Layers,
    Image as ImageIcon, Type, Square
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { PostAST, SlideNode, SectionNode, PostFormat } from './types/ast';
import { useToast } from '../../components/Toast';
import { useCanvasDrag } from './editor/useCanvasDrag';
import { FloatingToolbar } from './editor/FloatingToolbar';
import { ElementLibrary } from './editor/ElementLibrary';
import { CanvasPropertyPanel } from './editor/CanvasPropertyPanel';

interface PostBuilderProps {
    initialState?: PostAST;
    onBack: () => void;
    onSave?: (ast: PostAST) => void;
}

const DEFAULT_POST: PostAST = {
    id: 'new-post', format: 'square',
    meta: { title: 'Novo Post', theme: 'dark' },
    slides: [{ id: 'slide-1', elements: [] }],
};

const GOOGLE_FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Playfair+Display:wght@400;700;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Oswald:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700;800;900&family=Lato:wght@300;400;700;900&family=Bebas+Neue&family=Dancing+Script:wght@400;700&display=swap';

export const PostBuilder: React.FC<PostBuilderProps> = ({ initialState, onBack, onSave }) => {
    const { showToast } = useToast();

    // State
    const [post, setPost] = useState<PostAST>(initialState || DEFAULT_POST);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
    const [exportScale, setExportScale] = useState(2);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [scale, setScale] = useState(1);
    const [showLibrary, setShowLibrary] = useState(true);

    // Undo / Redo
    const [history, setHistory] = useState<PostAST[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canvasRef = useRef<HTMLDivElement>(null);
    const hiddenRenderRef = useRef<HTMLDivElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);

    const currentSlide = post.slides[currentSlideIndex];
    const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId) || null;

    // Google Fonts
    useEffect(() => {
        if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = GOOGLE_FONTS_LINK;
            document.head.appendChild(link);
        }
    }, []);

    // Canvas auto-scale
    useEffect(() => {
        const resize = () => {
            const parent = canvasWrapperRef.current;
            if (!parent) return;
            const ah = parent.clientHeight - 60;
            const aw = parent.clientWidth - 60;
            const tw = 1080;
            const th = post.format === 'square' ? 1080 : post.format === 'portrait' ? 1350 : 1920;
            setScale(Math.min(ah / th, aw / tw, 0.75));
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, [post.format]);

    // History push
    const pushHistory = useCallback((newPost: PostAST) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newPost]);
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const undo = () => {
        if (historyIndex <= 0) return;
        setHistoryIndex(prev => prev - 1);
        setPost(history[historyIndex - 1]);
    };
    const redo = () => {
        if (historyIndex >= history.length - 1) return;
        setHistoryIndex(prev => prev + 1);
        setPost(history[historyIndex + 1]);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
            if (e.key === 'Delete' && selectedElementId) { handleDeleteElement(selectedElementId); }
            if (e.key === 'Escape') { setSelectedElementId(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    // ------ ACTIONS ------
    const handleUpdateElement = useCallback((elementId: string, updates: Partial<SectionNode>) => {
        setPost(prev => {
            const newSlides = prev.slides.map((slide, idx) => {
                if (idx !== currentSlideIndex) return slide;
                return {
                    ...slide,
                    elements: slide.elements.map(el => {
                        if (el.id !== elementId) return el;
                        return {
                            ...el,
                            ...updates,
                            props: { ...el.props, ...(updates.props || {}) },
                            styles: { ...el.styles, ...(updates.styles || {}) },
                        };
                    }),
                };
            });
            const newPost = { ...prev, slides: newSlides };
            return newPost;
        });
    }, [currentSlideIndex]);

    const handleDeleteElement = (id: string) => {
        setPost(prev => {
            const newSlides = [...prev.slides];
            newSlides[currentSlideIndex] = {
                ...newSlides[currentSlideIndex],
                elements: newSlides[currentSlideIndex].elements.filter(e => e.id !== id),
            };
            const newPost = { ...prev, slides: newSlides };
            pushHistory(newPost);
            return newPost;
        });
        setSelectedElementId(null);
    };

    const handleDuplicateElement = (id: string) => {
        const el = currentSlide.elements.find(e => e.id === id);
        if (!el) return;
        const newEl = {
            ...el,
            id: `${el.type.toLowerCase()}-${Date.now()}`,
            styles: { ...el.styles, top: `${(parseFloat(el.styles?.top || '0') + 30)}px`, left: `${(parseFloat(el.styles?.left || '0') + 30)}px` },
        };
        handleAddElement(newEl);
    };

    const handleAddElement = (el: SectionNode) => {
        setPost(prev => {
            const newSlides = [...prev.slides];
            newSlides[currentSlideIndex] = {
                ...newSlides[currentSlideIndex],
                elements: [...newSlides[currentSlideIndex].elements, el],
            };
            const newPost = { ...prev, slides: newSlides };
            pushHistory(newPost);
            return newPost;
        });
        setSelectedElementId(el.id);
    };

    const handleUpdateFormat = (format: PostFormat) => {
        const newPost = { ...post, format };
        setPost(newPost);
        pushHistory(newPost);
    };

    const handleAddSlide = () => {
        const newSlide: SlideNode = { id: `slide-${Date.now()}`, elements: [] };
        setPost(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
        setCurrentSlideIndex(post.slides.length);
    };

    const handleDeleteSlide = (index: number) => {
        if (post.slides.length <= 1) return;
        setPost(prev => ({ ...prev, slides: prev.slides.filter((_, i) => i !== index) }));
        if (currentSlideIndex >= index && currentSlideIndex > 0) setCurrentSlideIndex(prev => prev - 1);
    };

    const handleUpdateSlideStyles = (styles: Record<string, any>) => {
        setPost(prev => {
            const newSlides = [...prev.slides];
            newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], styles };
            return { ...prev, slides: newSlides };
        });
    };

    // ------ DRAG & DROP ------
    const { dragState, snapLines, startDrag, startResize, onMouseMove, onMouseUp, setCanvasSize } = useCanvasDrag(scale, handleUpdateElement);

    useEffect(() => {
        const tw = 1080;
        const th = post.format === 'square' ? 1080 : post.format === 'portrait' ? 1350 : 1920;
        setCanvasSize(tw, th);
    }, [post.format, setCanvasSize]);

    useEffect(() => {
        if (dragState.isDragging || dragState.isResizing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
        }
    }, [dragState.isDragging, dragState.isResizing, onMouseMove, onMouseUp]);

    // Canvas rect for floating toolbar
    const getCanvasRect = () => canvasRef.current?.getBoundingClientRect() || null;

    // ------ EXPORT ------
    const exportPost = async () => {
        if (!hiddenRenderRef.current) return;
        setIsExporting(true);
        setShowExportMenu(false);
        try {
            const opts = { quality: 1.0, pixelRatio: exportScale };
            const capture = async (node: HTMLElement, fmt: 'png' | 'jpeg') =>
                fmt === 'jpeg' ? htmlToImage.toJpeg(node, { ...opts, backgroundColor: '#fff' }) : htmlToImage.toPng(node, opts);
            const name = post.meta.title || 'design';
            if (post.slides.length === 1) {
                setSelectedElementId(null);
                await new Promise(r => setTimeout(r, 100));
                if (exportFormat === 'pdf') {
                    const d = await capture(canvasRef.current!, 'png');
                    const pdf = new jsPDF({ orientation: post.format === 'story' ? 'portrait' : 'landscape', unit: 'px', format: [canvasRef.current!.offsetWidth, canvasRef.current!.offsetHeight] });
                    pdf.addImage(d, 'PNG', 0, 0, canvasRef.current!.offsetWidth, canvasRef.current!.offsetHeight);
                    pdf.save(`${name}.pdf`);
                } else {
                    const d = await capture(canvasRef.current!, exportFormat);
                    const a = document.createElement('a'); a.download = `${name}.${exportFormat}`; a.href = d; a.click();
                }
            } else {
                const nodes = Array.from(hiddenRenderRef.current.children) as HTMLElement[];
                if (exportFormat === 'pdf') {
                    const f = nodes[0];
                    const pdf = new jsPDF({ orientation: post.format === 'story' ? 'portrait' : 'landscape', unit: 'px', format: [f.offsetWidth, f.offsetHeight] });
                    for (let i = 0; i < nodes.length; i++) {
                        const d = await capture(nodes[i], 'png');
                        if (i > 0) pdf.addPage([f.offsetWidth, f.offsetHeight]);
                        pdf.addImage(d, 'PNG', 0, 0, f.offsetWidth, f.offsetHeight);
                    }
                    pdf.save(`${name}.pdf`);
                } else {
                    const zip = new JSZip();
                    for (let i = 0; i < nodes.length; i++) {
                        const d = await capture(nodes[i], exportFormat);
                        zip.file(`slide-${i + 1}.${exportFormat}`, d.split(',')[1], { base64: true });
                    }
                    const blob = await zip.generateAsync({ type: 'blob' });
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.zip`; a.click();
                }
            }
            showToast('Download concluído!', 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Erro ao exportar.', 'error');
        } finally { setIsExporting(false); }
    };

    // ------ RENDER ELEMENT ------
    const renderElement = (el: SectionNode, isEditable = false) => {
        const isSelected = selectedElementId === el.id;
        const style: React.CSSProperties = { ...el.styles, position: 'absolute' };

        const handleClick = (e: React.MouseEvent) => {
            if (!isEditable) return;
            e.stopPropagation();
            setSelectedElementId(el.id);
        };

        const resizeHandles = isEditable && isSelected ? (
            <>
                {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => (
                    <div key={h}
                        onMouseDown={e => startResize(e, el.id, h, el.styles)}
                        className="absolute bg-white border-2 border-indigo-500 z-[60]"
                        style={{
                            width: ['n', 's'].includes(h) ? 20 : 8, height: ['e', 'w'].includes(h) ? 20 : 8,
                            cursor: `${h}-resize`,
                            ...(h.includes('n') ? { top: -4 } : {}),
                            ...(h.includes('s') ? { bottom: -4 } : {}),
                            ...(h.includes('w') ? { left: -4 } : {}),
                            ...(h.includes('e') ? { right: -4 } : {}),
                            ...(h === 'n' || h === 's' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                            ...(h === 'e' || h === 'w' ? { top: '50%', transform: 'translateY(-50%)' } : {}),
                            borderRadius: 2,
                        }}
                    />
                ))}
            </>
        ) : null;

        const wrapperClass = isEditable && isSelected
            ? 'ring-2 ring-indigo-500 ring-offset-0 z-50'
            : isEditable ? 'hover:ring-1 hover:ring-indigo-500/30' : '';

        if (el.type === 'ImageOverlay') {
            return (
                <div key={el.id} onClick={handleClick}
                    onMouseDown={isEditable && isSelected ? e => startDrag(e, el.id, el.styles) : undefined}
                    style={style} className={`${wrapperClass} cursor-${isEditable ? (isSelected ? 'move' : 'pointer') : 'default'}`}>
                    <img src={el.props.src} alt={el.props.alt || ''} draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: (style.objectFit as any) || 'cover', opacity: el.props.opacity, borderRadius: style.borderRadius }} />
                    {resizeHandles}
                </div>
            );
        }

        if (el.type === 'TextOverlay') {
            return (
                <div key={el.id} onClick={handleClick}
                    onMouseDown={isEditable && isSelected ? e => startDrag(e, el.id, el.styles) : undefined}
                    style={style} className={`${wrapperClass} cursor-${isEditable ? (isSelected ? 'move' : 'pointer') : 'default'} p-2`}>
                    <div style={{ margin: 0, fontFamily: style.fontFamily, lineHeight: style.lineHeight || '1.3' }}>
                        {el.props.text}
                    </div>
                    {resizeHandles}
                </div>
            );
        }

        if (el.type === 'Shape') {
            return (
                <div key={el.id} onClick={handleClick}
                    onMouseDown={isEditable && isSelected ? e => startDrag(e, el.id, el.styles) : undefined}
                    style={{ ...style, backgroundColor: el.props.color, background: el.props.gradient || el.props.color }}
                    className={`${wrapperClass} cursor-${isEditable ? (isSelected ? 'move' : 'pointer') : 'default'}`}>
                    {resizeHandles}
                </div>
            );
        }
        return null;
    };

    // Canvas dimensions
    const canvasW = 1080;
    const canvasH = post.format === 'square' ? 1080 : post.format === 'portrait' ? 1350 : 1920;

    return (
        <div className="flex w-full h-full bg-[#050505] text-white overflow-hidden select-none">

            {/* LEFT SIDEBAR - Element Library */}
            <div className={`${showLibrary ? 'w-64' : 'w-0'} border-r border-[#262626] bg-[#0a0a0a] transition-all overflow-hidden flex flex-col z-20`}>
                <div className="p-3 border-b border-[#262626] flex items-center justify-between">
                    <button onClick={onBack} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center hover:text-white text-neutral-400">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Elementos</span>
                    <button onClick={() => setShowLibrary(false)} className="text-neutral-500 hover:text-white"><X size={16} /></button>
                </div>
                <ElementLibrary onAddElement={handleAddElement} />
            </div>

            {/* CENTER - CANVAS */}
            <div className="flex-1 relative bg-[#0f0f0f] bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px] flex flex-col">

                {/* Top Bar */}
                <div className="h-12 border-b border-[#262626] bg-[#0a0a0a]/95 backdrop-blur flex items-center justify-between px-4 z-10 gap-3">
                    <div className="flex items-center gap-2">
                        {!showLibrary && (
                            <button onClick={() => setShowLibrary(true)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-neutral-400 hover:text-white">
                                <Layers size={16} />
                            </button>
                        )}
                        <button onClick={undo} disabled={historyIndex <= 0} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30"><Undo size={14} /></button>
                        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30"><Redo size={14} /></button>
                    </div>

                    <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-0.5">
                        {(['square', 'portrait', 'story'] as PostFormat[]).map(f => (
                            <button key={f} onClick={() => handleUpdateFormat(f)}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${post.format === f ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}>
                                {f === 'square' ? '1:1' : f === 'portrait' ? '4:5' : '9:16'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedElementId && (
                            <>
                                <button onClick={() => handleDuplicateElement(selectedElementId)}
                                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-neutral-400 hover:text-white"><Copy size={14} /></button>
                                <button onClick={() => handleDeleteElement(selectedElementId)}
                                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                            </>
                        )}
                        {onSave && (
                            <button onClick={() => { onSave(post); showToast('Salvo!', 'success'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 text-xs"><Save size={14} /> Salvar</button>
                        )}
                        <div className="relative">
                            <button onClick={() => setShowExportMenu(!showExportMenu)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showExportMenu ? 'bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                                {isExporting ? <span className="animate-spin text-xs">⏳</span> : <Download size={14} />}
                            </button>
                            {showExportMenu && (
                                <div className="absolute top-10 right-0 w-44 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-3 z-50 space-y-3">
                                    <div className="grid grid-cols-3 gap-1">
                                        {(['png', 'jpeg', 'pdf'] as const).map(f => (
                                            <button key={f} onClick={() => setExportFormat(f)}
                                                className={`py-1 rounded text-[10px] font-medium ${exportFormat === f ? 'bg-indigo-500 text-white' : 'bg-[#222] text-neutral-400'}`}>{f.toUpperCase()}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        {[1, 2, 3].map(s => (
                                            <button key={s} onClick={() => setExportScale(s)}
                                                className={`py-1 rounded text-[10px] font-medium ${exportScale === s ? 'bg-indigo-500 text-white' : 'bg-[#222] text-neutral-400'}`}>{s}x</button>
                                        ))}
                                    </div>
                                    <button onClick={exportPost} disabled={isExporting}
                                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold">
                                        {isExporting ? 'Processando...' : 'Baixar'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div ref={canvasWrapperRef} className="flex-1 overflow-auto flex items-center justify-center relative"
                    onClick={() => setSelectedElementId(null)}>

                    {/* Snap guides */}
                    {snapLines.map((line, i) => (
                        <div key={i} className="absolute z-[90] bg-pink-500"
                            style={line.axis === 'x'
                                ? { left: (canvasRef.current?.getBoundingClientRect().left || 0) + line.pos * scale, top: canvasRef.current?.getBoundingClientRect().top, width: 1, height: canvasH * scale }
                                : { left: canvasRef.current?.getBoundingClientRect().left, top: (canvasRef.current?.getBoundingClientRect().top || 0) + line.pos * scale, width: canvasW * scale, height: 1 }}
                        />
                    ))}

                    <div ref={canvasRef}
                        style={{
                            width: canvasW, height: canvasH,
                            transform: `scale(${scale})`, transformOrigin: 'center center',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            backgroundColor: currentSlide?.styles?.backgroundColor || '#121212',
                            background: currentSlide?.styles?.background || currentSlide?.styles?.backgroundColor || '#121212',
                        }}
                        className="relative overflow-hidden transition-all duration-200">
                        {currentSlide?.elements.map(el => renderElement(el, true))}
                    </div>
                </div>

                {/* Bottom - Slide Navigation */}
                <div className="h-14 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-center gap-3 z-10">
                    {post.slides.map((s, idx) => (
                        <div key={s.id} onClick={() => setCurrentSlideIndex(idx)}
                            className={`relative w-10 h-10 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center
                            ${currentSlideIndex === idx ? 'border-indigo-500 scale-110 bg-indigo-500/10' : 'border-[#333] hover:border-neutral-500 bg-[#1a1a1a]'}`}>
                            <span className="text-[10px] text-neutral-400 font-bold">{idx + 1}</span>
                            {post.slides.length > 1 && currentSlideIndex === idx && (
                                <button onClick={e => { e.stopPropagation(); handleDeleteSlide(idx); }}
                                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <X size={8} className="text-white" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddSlide}
                        className="w-10 h-10 rounded-lg border border-dashed border-[#333] flex items-center justify-center text-neutral-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* RIGHT - Property Panel */}
            <div className="w-72 border-l border-[#262626] bg-[#0a0a0a] flex flex-col overflow-y-auto z-20">
                <div className="p-3 border-b border-[#262626]">
                    <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {selectedElement ? `${selectedElement.type}` : 'Propriedades do Slide'}
                    </h3>
                </div>
                <CanvasPropertyPanel
                    element={selectedElement}
                    onUpdate={handleUpdateElement}
                    slideStyles={currentSlide?.styles}
                    onUpdateSlide={handleUpdateSlideStyles}
                />
            </div>

            {/* Floating Toolbar */}
            {selectedElement && (
                <FloatingToolbar
                    element={selectedElement}
                    canvasRect={getCanvasRect()}
                    scale={scale}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                />
            )}

            {/* Hidden render for export */}
            <div ref={hiddenRenderRef} style={{ position: 'fixed', left: '-9999px', top: '-9999px', display: 'flex', flexDirection: 'column' }}>
                {post.slides.map(slide => (
                    <div key={slide.id}
                        style={{ width: canvasW, height: canvasH, backgroundColor: slide.styles?.backgroundColor || '#121212', background: slide.styles?.background || slide.styles?.backgroundColor || '#121212', position: 'relative', overflow: 'hidden' }}>
                        {slide.elements.map(el => renderElement(el, false))}
                    </div>
                ))}
            </div>
        </div>
    );
};
