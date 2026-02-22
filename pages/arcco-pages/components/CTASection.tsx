
import React from 'react';

export const CTASection: React.FC<any> = (props) => {
    const {
        title = "Ready to get started?",
        description = "Join thousands of users today.",
        ctaText = "Start Now",
        ctaLink = "#"
    } = props;

    return (
        <section className="py-24 bg-gradient-to-br from-indigo-900/20 via-[#050505] to-purple-900/20 border-t border-white/5 relative">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">{title}</h2>
                <p className="text-lg text-neutral-400 mb-10 max-w-2xl mx-auto">{description}</p>
                <a href={ctaLink} className="inline-block px-10 py-4 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-transform transform hover:scale-105">
                    {ctaText}
                </a>
            </div>
        </section>
    );
};
