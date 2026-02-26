import React from 'react';
import { MarqueeProps } from '../types/ast';

const DEFAULT_ITEMS = [
    '🚀 Rápido',
    '🔒 Seguro',
    '⚡ Inovador',
    '🎯 Focado em Conversão',
    '💎 Premium Design',
    '🌐 Multi-plataforma',
    '📈 Alta Performance',
    '🤖 Powered by AI',
];

export const MarqueeSection: React.FC<MarqueeProps> = (props) => {
    const {
        items = DEFAULT_ITEMS,
        speed = 20,
        bgColor = '#050505',
    } = props;

    // Duplicate items for seamless infinite loop
    const track = [...items, ...items];

    return (
        <div
            className="relative overflow-hidden border-y border-white/5 py-5"
            style={{ backgroundColor: bgColor }}
        >
            <style>{`
                @keyframes marquee-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .marquee-track {
                    animation: marquee-scroll ${speed}s linear infinite;
                }
                .marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>

            {/* Gradient masks on edges */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10"
                style={{ background: `linear-gradient(to right, ${bgColor}, transparent)` }} />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10"
                style={{ background: `linear-gradient(to left, ${bgColor}, transparent)` }} />

            <div
                className="marquee-track flex items-center gap-10 whitespace-nowrap"
                style={{ animationDuration: `${speed}s` }}
            >
                {track.map((item, i) => (
                    <span
                        key={i}
                        className="text-sm font-semibold text-neutral-400 tracking-wide"
                    >
                        {item}
                        {i < track.length - 1 && (
                            <span className="ml-10 text-neutral-700">•</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
};
