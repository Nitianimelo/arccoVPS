import React, { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import { NavbarProps } from '../types/ast';

export const NavbarSection: React.FC<NavbarProps> = (props) => {
    const {
        brandName = 'Arcco',
        links = [
            { label: 'Funcionalidades', href: '#features' },
            { label: 'Preços', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
        ],
        ctaText = 'Começar Agora',
        ctaLink = '#',
    } = props;

    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .drawer-enter { animation: slide-in-right 0.28s cubic-bezier(0.4,0,0.2,1) both; }
            `}</style>

            <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-black/50 border-b border-white/10 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-18 py-4 flex items-center justify-between gap-6">

                    {/* Logo */}
                    <a href="#" className="flex items-center gap-2 shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">
                            {brandName.slice(0, -1)}
                            <span className="text-indigo-400">{brandName.slice(-1)}</span>
                        </span>
                    </a>

                    {/* Links — desktop */}
                    <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
                        {links.map((link, i) => (
                            <a
                                key={i}
                                href={link.href}
                                className="text-sm font-medium text-neutral-400 hover:text-white transition-colors duration-200"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* CTA — desktop */}
                    <a
                        href={ctaLink}
                        className="hidden md:inline-flex items-center gap-2 shrink-0 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-100 transition-all transform hover:scale-105 active:scale-95"
                    >
                        {ctaText}
                    </a>

                    {/* Hambúrguer — mobile */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* Drawer lateral — mobile */}
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer */}
                    <aside className="drawer-enter fixed top-0 right-0 z-[100] h-full w-72 bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col p-6 gap-6">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-lg text-white">{brandName}</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="Fechar menu"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="w-full h-px bg-white/10" />

                        <nav className="flex flex-col gap-2">
                            {links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        <div className="mt-auto">
                            <a
                                href={ctaLink}
                                className="block w-full text-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all"
                            >
                                {ctaText}
                            </a>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
};
