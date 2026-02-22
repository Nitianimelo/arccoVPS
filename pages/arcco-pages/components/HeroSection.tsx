
import React from 'react';
import { HeroProps } from '../types/ast';

export const HeroSection: React.FC<HeroProps> = (props) => {
    const {
        title = "Welcome to our Platform",
        subtitle = "The best solution for your business needs.",
        ctaText = "Get Started",
        ctaLink = "#",
        secondaryCtaText,
        secondaryCtaLink,
        backgroundImage
    } = props;

    return (
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-[#050505] text-white">
            {/* Background Gradient / Image */}
            {backgroundImage ? (
                <div className="absolute inset-0 z-0">
                    <img src={backgroundImage} alt="Hero Background" className="w-full h-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20 z-0"></div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    New Release
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                    {title}
                </h1>

                <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {subtitle}
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <a href={ctaLink} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 w-full md:w-auto flex items-center justify-center">
                        {ctaText}
                    </a>

                    {secondaryCtaText && (
                        <a href={secondaryCtaLink || "#"} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm w-full md:w-auto">
                            {secondaryCtaText}
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};
