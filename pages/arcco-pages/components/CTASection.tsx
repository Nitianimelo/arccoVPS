import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CTAProps {
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
}

export const CTASection: React.FC<CTAProps> = (props) => {
    const {
        title = 'Pronto para transformar seu negócio?',
        description = 'Junte-se a milhares de empresas que já usam nossa plataforma para crescer mais rápido.',
        ctaText = 'Começar Agora — Grátis',
        ctaLink = '#',
        secondaryCtaText,
        secondaryCtaLink,
    } = props;

    return (
        <section className="relative py-28 overflow-hidden border-t border-white/5">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#05050a] via-[#0d0a1a] to-[#050505] -z-10" />

            {/* Decorative blobs */}
            <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDuration: '5s' }} />
                <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDuration: '7s', animationDelay: '1s' }} />
            </div>

            {/* Border glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
                {/* Icon badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8">
                    <Sparkles className="w-3.5 h-3.5" />
                    Comece hoje mesmo
                </div>

                {/* Title */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                    {title}
                </h2>

                {/* Description */}
                <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {description}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                        href={ctaLink}
                        className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-neutral-100 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] w-full sm:w-auto justify-center"
                    >
                        {ctaText}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>

                    {secondaryCtaText && (
                        <a
                            href={secondaryCtaLink || '#'}
                            className="inline-flex items-center justify-center px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-semibold text-lg transition-all w-full sm:w-auto"
                        >
                            {secondaryCtaText}
                        </a>
                    )}
                </div>

                {/* Social proof micro-text */}
                <p className="mt-8 text-xs text-neutral-600">
                    Sem necessidade de cartão de crédito • Plano grátis disponível • Cancele quando quiser
                </p>
            </div>
        </section>
    );
};
