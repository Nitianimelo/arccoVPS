import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Download,
    Plus,
    Trash2,
    Image as ImageIcon,
    Type,
    MoreHorizontal,
    Save,
    Palette,
    Layout,
    Layers,
    Undo,
    Redo,
    Share2,
    X
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { PostAST, SlideNode, SectionNode, PostFormat } from './types/ast';
import { useToast } from '../../components/Toast';

interface PostBuilderProps {
    initialState?: PostAST;
    onBack: () => void;
    onSave?: (ast: PostAST) => void;
}

const DEFAULT_POST: PostAST = {
    id: 'new-post',
    format: 'square',
    meta: {
        title: 'Novo Post',
        theme: 'dark'
    },
    slides: [
        {
            id: 'slide-1',
            elements: []
        }
    ]
};

export const PostBuilder: React.FC<PostBuilderProps> = ({ initialState, onBack, onSave }) => {
    const { showToast } = useToast();

    // State
    const [post, setPost] = useState<PostAST>(initialState || DEFAULT_POST);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
    const [exportScale, setExportScale] = useState<number>(2);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [scale, setScale] = useState(1);

    const canvasRef = useRef<HTMLDivElement>(null);
    const hiddenRenderRef = useRef<HTMLDivElement>(null);

    // Helper Props
    const currentSlide = post.slides[currentSlideIndex];
    const selectedElement = currentSlide.elements.find(el => el.id === selectedElementId);

    // Auto-scale canvas to fit screen
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    const availableHeight = parent.clientHeight - 80; // margins
                    const availableWidth = parent.clientWidth - 80;

                    let targetHeight = 1080;
                    let targetWidth = 1080;

                    if (post.format === 'portrait') targetHeight = 1350;
                    if (post.format === 'story') {
                        targetHeight = 1920;
                        targetWidth = 1080;
                    }

                    const scaleH = availableHeight / targetHeight;
                    const scaleW = availableWidth / targetWidth;

                    setScale(Math.min(scaleH, scaleW, 0.8)); // Max scale 0.8 to give breathing room
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [post.format]);

    // --- ACTIONS ---

    const handleUpdateElement = (elementId: string, updates: Partial<SectionNode>) => {
        setPost(prev => {
            const newSlides = [...prev.slides];
            const slide = newSlides[currentSlideIndex];
            const elIndex = slide.elements.findIndex(e => e.id === elementId);
            if (elIndex === -1) return prev;

            slide.elements[elIndex] = { ...slide.elements[elIndex], ...updates };
            return { ...prev, slides: newSlides };
        });
    };

    const handleUpdateFormat = (format: PostFormat) => {
        setPost(prev => ({ ...prev, format }));
    };

    const handleAddSlide = () => {
        const newSlide: SlideNode = {
            id: `slide-${Date.now()}`,
            elements: []
        };
        setPost(prev => ({
            ...prev,
            slides: [...prev.slides, newSlide]
        }));
        setCurrentSlideIndex(post.slides.length); // Go to new slide (length is post-update index)
    };

    const handleDeleteSlide = (index: number) => {
        if (post.slides.length <= 1) return;
        setPost(prev => ({
            ...prev,
            slides: prev.slides.filter((_, i) => i !== index)
        }));
        if (currentSlideIndex >= index && currentSlideIndex > 0) {
            setCurrentSlideIndex(currentSlideIndex - 1);
        }
    };

    // --- EXPORT LOGIC ---

    const exportPost = async () => {
        if (!hiddenRenderRef.current) return;
        setIsExporting(true);
        setShowExportMenu(false);

        try {
            // Options for html-to-image
            const options = {
                quality: 1.0,
                pixelRatio: exportScale,
            };

            const captureNode = async (node: HTMLElement, format: 'png' | 'jpeg'): Promise<string> => {
                if (format === 'jpeg') {
                    return await htmlToImage.toJpeg(node, { ...options, backgroundColor: '#ffffff' });
                }
                return await htmlToImage.toPng(node, options);
            };

            const fileName = post.meta.title || 'design';

            if (post.slides.length === 1) {
                // Single Export
                setSelectedElementId(null);
                await new Promise(r => setTimeout(r, 100)); // wait for UI clear

                if (exportFormat === 'pdf') {
                    const dataUrl = await captureNode(canvasRef.current!, 'png');
                    const pdf = new jsPDF({
                        orientation: post.format === 'portrait' ? 'portrait' : post.format === 'story' ? 'portrait' : 'landscape',
                        unit: 'px',
                        format: [canvasRef.current!.offsetWidth, canvasRef.current!.offsetHeight]
                    });
                    pdf.addImage(dataUrl, 'PNG', 0, 0, canvasRef.current!.offsetWidth, canvasRef.current!.offsetHeight);
                    pdf.save(`${fileName}.pdf`);
                } else {
                    const dataUrl = await captureNode(canvasRef.current!, exportFormat);
                    const link = document.createElement('a');
                    link.download = `${fileName}.${exportFormat}`;
                    link.href = dataUrl;
                    link.click();
                }

            } else {
                // Carousel Export
                const hiddenSlidesContainer = hiddenRenderRef.current;
                const slideNodes = Array.from(hiddenSlidesContainer.children) as HTMLElement[];

                if (slideNodes.length !== post.slides.length) {
                    throw new Error("Render mismatch during export");
                }

                if (exportFormat === 'pdf') {
                    // Multi-page PDF
                    const firstNode = slideNodes[0];
                    const pdf = new jsPDF({
                        orientation: post.format === 'portrait' ? 'portrait' : post.format === 'story' ? 'portrait' : 'landscape',
                        unit: 'px',
                        format: [firstNode.offsetWidth, firstNode.offsetHeight]
                    });

                    for (let i = 0; i < slideNodes.length; i++) {
                        const dataUrl = await captureNode(slideNodes[i], 'png');
                        if (i > 0) pdf.addPage([firstNode.offsetWidth, firstNode.offsetHeight]);
                        pdf.addImage(dataUrl, 'PNG', 0, 0, firstNode.offsetWidth, firstNode.offsetHeight);
                    }
                    pdf.save(`${fileName}.pdf`);
                } else {
                    // ZIP file with images
                    const zip = new JSZip();

                    for (let i = 0; i < slideNodes.length; i++) {
                        const dataUrl = await captureNode(slideNodes[i], exportFormat);
                        zip.file(`slide-${i + 1}.${exportFormat}`, dataUrl.split(',')[1], { base64: true });
                    }

                    const content = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(content);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${fileName}.zip`;
                    link.click();
                }
            }

            showToast('Download concluído!', 'success');
        } catch (err) {
            console.error('Export failed:', err);
            showToast('Erro ao exportar. Tente novamente.', 'error');
        } finally {
            setIsExporting(false);
        }
    };


    // --- RENDERERS ---

    const renderElement = (el: SectionNode, isEditable = false) => {
        const isSelected = selectedElementId === el.id;

        // Base styles
        const style: React.CSSProperties = {
            ...el.styles,
            position: 'absolute' // Force absolute for canvas
        };

        const handleClick = (e: React.MouseEvent) => {
            if (!isEditable) return;
            e.stopPropagation();
            setSelectedElementId(el.id);
        };

        // CONTENT TYPES
        if (el.type === 'ImageOverlay') {
            return (
                <div
                    key={el.id}
                    onClick={handleClick}
                    style={style}
                    className={`${isEditable && isSelected ? 'ring-2 ring-indigo-500 z-50' : ''} cursor-pointer group`}
                >
                    <img
                        src={el.props.src}
                        alt={el.props.alt}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: (style.objectFit as any) || 'cover',
                            opacity: el.props.opacity
                        }}
                    />
                </div>
            );
        }

        if (el.type === 'TextOverlay') {
            const Tag = (el.props.variant === 'h1' ? 'h1' : el.props.variant === 'h2' ? 'h2' : 'p') as any;
            return (
                <div
                    key={el.id}
                    onClick={handleClick}
                    style={style}
                    className={`${isEditable && isSelected ? 'ring-2 ring-indigo-500 border border-indigo-500/50' : ''} cursor-pointer hover:bg-white/5 p-2 rounded`}
                >
                    <Tag style={{ margin: 0 }}>{el.props.text}</Tag>
                </div>
            );
        }

        if (el.type === 'Shape') {
            return (
                <div
                    key={el.id}
                    onClick={handleClick}
                    style={{
                        ...style,
                        backgroundColor: el.props.color,
                        background: el.props.gradient || el.props.color
                    }}
                    className={`${isEditable && isSelected ? 'ring-2 ring-indigo-500' : ''} cursor-pointer`}
                >
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex w-full h-full bg-[#050505] text-white overflow-hidden">

            {/* 1. LEFT SIDEBAR - TOOLS */}
            <div className="w-16 border-r border-[#262626] flex flex-col items-center py-4 gap-6 bg-[#0a0a0a] z-20">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:text-white text-neutral-400">
                    <ChevronLeft size={20} />
                </button>

                <div className="w-8 h-px bg-[#262626]" />

                <button className="flex flex-col items-center gap-1 text-xs text-neutral-400 hover:text-indigo-400 group">
                    <Layout size={20} className="group-hover:scale-110 transition-transform" />
                    <span>Format</span>
                </button>

                <button className="flex flex-col items-center gap-1 text-xs text-neutral-400 hover:text-indigo-400 group">
                    <Type size={20} className="group-hover:scale-110 transition-transform" />
                    <span>Texto</span>
                </button>

                <button className="flex flex-col items-center gap-1 text-xs text-neutral-400 hover:text-indigo-400 group">
                    <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                    <span>Img</span>
                </button>

                <button className="flex flex-col items-center gap-1 text-xs text-neutral-400 hover:text-indigo-400 group">
                    <Palette size={20} className="group-hover:scale-110 transition-transform" />
                    <span>Cores</span>
                </button>

                <div className="mt-auto flex flex-col gap-4 relative">
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-lg ${showExportMenu ? 'bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'}`}>
                        {isExporting ? <span className="animate-spin text-xs">⏳</span> : <Download size={20} />}
                    </button>

                    {showExportMenu && (
                        <div className="absolute bottom-12 left-14 w-48 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-4 flex flex-col gap-4 z-50">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-white text-xs font-semibold uppercase tracking-wider">Exportar</h4>
                                <button onClick={() => setShowExportMenu(false)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-400 font-medium">Formato</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {['png', 'jpeg', 'pdf'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setExportFormat(fmt as any)}
                                            className={`py-1.5 rounded text-[10px] font-medium transition-colors ${exportFormat === fmt ? 'bg-indigo-500 text-white' : 'bg-[#222] text-neutral-400 hover:bg-[#333]'}`}
                                        >
                                            {fmt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-400 font-medium">Escala / Resolução</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {[1, 2, 3].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setExportScale(s)}
                                            className={`py-1.5 rounded text-[10px] font-medium transition-colors ${exportScale === s ? 'bg-indigo-500 text-white' : 'bg-[#222] text-neutral-400 hover:bg-[#333]'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={exportPost}
                                disabled={isExporting}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex justify-center items-center gap-2 mt-2"
                            >
                                {isExporting ? 'Processando...' : 'Baixar Agora'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CENTER - CANVAS AREA */}
            <div className="flex-1 relative bg-[#0f0f0f] bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:20px_20px] flex flex-col">

                {/* Top Bar */}
                <div className="h-14 border-b border-[#262626] bg-[#0a0a0a]/90 backdrop-blur flex items-center justify-between px-6 z-10">
                    <h2 className="font-semibold text-neutral-200">{post.meta.title}</h2>

                    <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-1">
                        <button
                            onClick={() => handleUpdateFormat('square')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${post.format === 'square' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            Square
                        </button>
                        <button
                            onClick={() => handleUpdateFormat('portrait')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${post.format === 'portrait' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            Portrait
                        </button>
                        <button
                            onClick={() => handleUpdateFormat('story')}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${post.format === 'story' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                        >
                            Story
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {onSave && (
                            <button onClick={() => onSave(post)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 text-sm">
                                <Save size={16} /> Salvar
                            </button>
                        )}
                    </div>
                </div>

                {/* Canvas Scroller */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-12 relative" onClick={() => setSelectedElementId(null)}>

                    {/* The Actual Canvas */}
                    <div
                        ref={canvasRef}
                        style={{
                            width: post.format === 'story' ? 1080 : 1080,
                            height: post.format === 'square' ? 1080 : post.format === 'portrait' ? 1350 : 1920,
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}
                        className="bg-[#121212] relative overflow-hidden transition-all duration-300"
                    >
                        {/* Render Elements for Current Slide */}
                        {currentSlide.elements.map(el => renderElement(el, true))}
                    </div>

                </div>

                {/* Bottom Bar - Carousel Navigation */}
                <div className="h-16 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-center gap-4 z-10">
                    {post.slides.map((s, idx) => (
                        <div
                            key={s.id}
                            onClick={() => setCurrentSlideIndex(idx)}
                            className={`relative w-10 h-10 rounded-md border-2 cursor-pointer transition-all ${currentSlideIndex === idx ? 'border-indigo-500 scale-110' : 'border-[#333] hover:border-neutral-500'}`}
                        >
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500 font-bold">
                                {idx + 1}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddSlide}
                        className="w-10 h-10 rounded-md border border-dashed border-[#333] flex items-center justify-center text-neutral-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all"
                    >
                        <Plus size={18} />
                    </button>
                </div>

            </div>

            {/* 3. RIGHT SIDEBAR - PROPERTY PANEL (Contextual) */}
            <div className="w-72 border-l border-[#262626] bg-[#0a0a0a] flex flex-col overflow-y-auto z-20">
                <div className="p-4 border-b border-[#262626]">
                    <h3 className="font-semibold text-sm text-neutral-300 uppercase tracking-wider">Propriedades</h3>
                </div>

                {selectedElement ? (
                    <div className="p-4 space-y-6">

                        {/* Common Props */}
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-500">ID</label>
                            <div className="text-sm text-neutral-300 font-mono bg-[#1a1a1a] p-2 rounded">{selectedElement.id}</div>
                        </div>

                        {selectedElement.type === 'TextOverlay' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500">Texto</label>
                                    <textarea
                                        value={selectedElement.props.text}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { props: { ...selectedElement.props, text: e.target.value } })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500">Tipo</label>
                                    <select
                                        value={selectedElement.props.variant}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { props: { ...selectedElement.props, variant: e.target.value } })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="h1">Título (H1)</option>
                                        <option value="h2">Subtítulo (H2)</option>
                                        <option value="p">Parágrafo</option>
                                        <option value="button">Botão</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {(selectedElement.type === 'ImageOverlay' || (selectedElement.type === 'Shape' && selectedElement.props.backgroundImage)) && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500">URL da Imagem</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={selectedElement.props.src || selectedElement.props.backgroundImage || ''}
                                            onChange={(e) => handleUpdateElement(selectedElement.id, { props: { ...selectedElement.props, src: e.target.value } })}
                                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded p-2 text-xs text-white focus:border-indigo-500 outline-none"
                                            placeholder="https://"
                                        />
                                    </div>
                                    <p className="text-[10px] text-neutral-600">Cole uma URL do Unsplash ou do seu Cofre.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500">Opacidade</label>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={selectedElement.props.opacity ?? 1}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { props: { ...selectedElement.props, opacity: parseFloat(e.target.value) } })}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Style Overrides */}
                        <div className="space-y-4 pt-4 border-t border-[#262626]">
                            <h4 className="text-xs font-semibold text-neutral-400">Estilos</h4>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-500">Cor</label>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded border border-[#333]"
                                            style={{ backgroundColor: selectedElement.styles?.color || selectedElement.styles?.backgroundColor || 'transparent' }}
                                        />
                                        <input
                                            type="text"
                                            value={selectedElement.styles?.color || ''}
                                            onChange={(e) => handleUpdateElement(selectedElement.id, { styles: { ...selectedElement.styles, color: e.target.value } })}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-500">Tamanho Fonte</label>
                                    <input
                                        type="text"
                                        value={selectedElement.styles?.fontSize || ''}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { styles: { ...selectedElement.styles, fontSize: e.target.value } })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 p-8 text-center">
                        <Type size={32} className="mb-4 opacity-20" />
                        <p className="text-sm">Selecione um elemento para editar</p>
                    </div>
                )}
            </div>

            {/* HIDDEN RENDER CONTAINER FOR ZIP EXPORT */}
            {/* This renders all slides at full resolution but hidden from user view */}
            <div
                ref={hiddenRenderRef}
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px',
                    // Show all slides stacked or in row? Row is easier for debugging if needed, but stack is fine as we select by index children
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {post.slides.map(slide => (
                    <div
                        key={slide.id}
                        style={{
                            width: post.format === 'story' ? 1080 : 1080,
                            height: post.format === 'square' ? 1080 : post.format === 'portrait' ? 1350 : 1920,
                            backgroundColor: '#121212', // Ensure bg is captured
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {slide.elements.map(el => renderElement(el, false))}
                    </div>
                ))}
            </div>

        </div>
    );
};
