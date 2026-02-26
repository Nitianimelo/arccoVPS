
import React from 'react';
import { PageAST } from '../types/ast';
import { X, Moon, Sun, Type } from 'lucide-react';

interface ThemePanelProps {
    meta: PageAST['meta'];
    onUpdate: (meta: PageAST['meta']) => void;
}

export const ThemePanel: React.FC<ThemePanelProps> = ({ meta, onUpdate }) => {

    const handleChange = (key: keyof PageAST['meta'], value: any) => {
        onUpdate({ ...meta, [key]: value });
    };

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-white/10 w-80 shadow-2xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configurações da Página</h3>
                    <p className="text-[10px] text-neutral-500 font-mono">Global Settings</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">

                {/* Theme Toggle */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-neutral-400 uppercase">Tema</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleChange('theme', 'dark')}
                            className={`flex items-center justify-center gap-2 p-2 rounded border ${meta.theme === 'dark' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                        >
                            <Moon size={14} />
                            <span className="text-xs">Dark</span>
                        </button>
                        <button
                            onClick={() => handleChange('theme', 'light')}
                            className={`flex items-center justify-center gap-2 p-2 rounded border ${meta.theme === 'light' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-neutral-900 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                        >
                            <Sun size={14} />
                            <span className="text-xs">Light</span>
                        </button>
                    </div>
                </div>

                {/* Page Title */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-neutral-400 uppercase flex items-center gap-1">
                        <Type size={12} />
                        Título da Página
                    </label>
                    <input
                        type="text"
                        value={meta.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Ex: Minha Landing Page"
                    />
                    <p className="text-[10px] text-neutral-600">Usado na tag &lt;title&gt; e SEO.</p>
                </div>

            </div>

            <div className="p-4 border-t border-white/10 bg-[#0A0A0A]">
                <div className="text-[10px] text-neutral-500 text-center">
                    Alterações globais aplicadas em tempo real
                </div>
            </div>
        </div>
    );
};
