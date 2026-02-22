
import React from 'react';
import { FeaturesProps } from '../types/ast';
import { resolveIcon } from './registry';

export const FeaturesSection: React.FC<FeaturesProps> = (props) => {
    const {
        title = "Our Features",
        subtitle = "Discover what makes us unique.",
        items = [],
        columns = 3
    } = props;

    const gridcols = {
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4"
    }[columns] || "md:grid-cols-3";

    return (
        <section className="py-24 bg-[#050505] relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
                    <p className="text-neutral-400 max-w-2xl mx-auto">{subtitle}</p>
                </div>

                <div className={`grid grid-cols-1 ${gridcols} gap-8`}>
                    {items.map((item, index) => (
                        <div key={index} className="p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-indigo-500/30 transition-all group hover:-translate-y-2">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                                {resolveIcon(item.icon)}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                            <p className="text-neutral-400 leading-relaxed text-sm">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
