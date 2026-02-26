import React from 'react';
import { ArrowRight } from 'lucide-react';
import { HeroProps } from '../types/ast';

export const HeroSection: React.FC<HeroProps> = (props) => {
    const {
        title = 'Welcome to our Platform',
        subtitle = 'The best solution for your business needs.',
        ctaText = 'Get Started',
        ctaLink = '#',
        secondaryCtaText,
        secondaryCtaLink,
        backgroundImage,
    } = props;

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#050505] text-white">
            {/* Animated blob backgrounds */}
            {!backgroundImage && (
                <div className="absolute inset-0 overflow-hidden -z-10">
                    <div
                        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full blur-[120px] animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div
                        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse"
                        style={{ animationDuration: '6s', animationDelay: '2s' }}
                    />
                    <div
                        className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-pink-600/20 rounded-full blur-[100px] animate-pulse"
                        style={{ animationDuration: '8s', animationDelay: '1s' }}
                    />
                </div>
            )}

            {/* Custom background image */}
            {backgroundImage && (
                <div className="absolute inset-0 z-0">
                    <img src={backgroundImage} alt="Hero Background" className="w-full h-full object-cover opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Nova Era do Design Digital
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                    <style>{`.gradient-hero { background: linear-gradient(135deg, #fff 30%, #a5b4fc 60%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }`}</style>
                    <span className="gradient-hero">{title}</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {subtitle}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                        href={ctaLink}
                        className="group inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 w-full sm:w-auto justify-center"
                    >
                        {ctaText}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>

                    {secondaryCtaText && (
                        <a
                            href={secondaryCtaLink || '#'}
                            className="inline-flex items-center justify-center px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm w-full sm:w-auto"
                        >
                            {secondaryCtaText}
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};
