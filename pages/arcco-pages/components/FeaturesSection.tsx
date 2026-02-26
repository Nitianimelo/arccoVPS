import React from 'react';
import { FeaturesProps } from '../types/ast';
import { resolveIcon } from './registry';

const ACCENT_COLORS = [
    { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: '0_0_40px_rgba(99,102,241,0.15)', border: 'hover:border-indigo-500/30' },
    { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: '0_0_40px_rgba(168,85,247,0.15)', border: 'hover:border-purple-500/30' },
    { bg: 'bg-pink-500/10',   text: 'text-pink-400',   glow: '0_0_40px_rgba(236,72,153,0.15)',  border: 'hover:border-pink-500/30'   },
    { bg: 'bg-emerald-500/10',text: 'text-emerald-400',glow: '0_0_40px_rgba(16,185,129,0.15)', border: 'hover:border-emerald-500/30' },
    { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   glow: '0_0_40px_rgba(6,182,212,0.15)',   border: 'hover:border-cyan-500/30'   },
    { bg: 'bg-amber-500/10',  text: 'text-amber-400',  glow: '0_0_40px_rgba(245,158,11,0.15)',  border: 'hover:border-amber-500/30'  },
];

export const FeaturesSection: React.FC<FeaturesProps> = (props) => {
    const {
        title = 'Our Features',
        subtitle = 'Discover what makes us unique.',
        items = [],
        columns = 3,
    } = props;

    const gridcols: Record<number, string> = {
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <section id="features" className="py-24 bg-[#050505] relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
                    {subtitle && (
                        <p className="text-neutral-400 max-w-2xl mx-auto">{subtitle}</p>
                    )}
                </div>

                {/* Bento Box Grid */}
                <div className={`grid grid-cols-1 ${gridcols[columns] ?? 'md:grid-cols-3'} gap-6`}>
                    {items.map((item, index) => {
                        const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
                        return (
                            <div
                                key={index}
                                className={`group relative p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 ${accent.border}
                                    transition-all duration-300 hover:-translate-y-2 cursor-default`}
                                style={{
                                    boxShadow: 'none',
                                    transition: 'box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px rgba(0,0,0,0), 0 ${accent.glow.replace(/_/g, ' ')}`;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                }}
                            >
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl ${accent.bg} flex items-center justify-center mb-6 ${accent.text} group-hover:scale-110 transition-transform duration-300`}>
                                    {resolveIcon(item.icon)}
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-neutral-400 leading-relaxed text-sm">
                                    {item.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
