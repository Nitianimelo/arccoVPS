import React from 'react';
import { Check, Star } from 'lucide-react';
import { PricingProps } from '../types/ast';

export const PricingSection: React.FC<PricingProps> = (props) => {
    const {
        title = 'Planos Simples e Transparentes',
        subtitle = 'Escolha o plano ideal para o seu negócio.',
        plans = [],
    } = props;

    return (
        <section id="pricing" className="py-24 bg-[#0A0A0A] border-t border-white/5 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
                    {subtitle && (
                        <p className="text-neutral-400 max-w-2xl mx-auto">{subtitle}</p>
                    )}
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2
                                ${plan.isPopular
                                    ? 'bg-[#0d0d0f] border-indigo-500/50 scale-105 shadow-[0_0_60px_rgba(99,102,241,0.25)]'
                                    : 'bg-[#050505] border-white/5 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
                                }`}
                        >
                            {/* Popular badge */}
                            {plan.isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-900/50">
                                        <Star className="w-3 h-3 fill-current" />
                                        Mais Popular
                                    </div>
                                </div>
                            )}

                            {/* Plan name */}
                            <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-6 mt-4">
                                <span className={`text-4xl font-extrabold ${plan.isPopular ? 'text-indigo-300' : 'text-white'}`}>
                                    {plan.price}
                                </span>
                                {plan.period && (
                                    <span className="text-neutral-500 text-sm">/{plan.period}</span>
                                )}
                            </div>

                            {/* Divider */}
                            <div className={`w-full h-px mb-6 ${plan.isPopular ? 'bg-indigo-500/20' : 'bg-white/5'}`} />

                            {/* Features */}
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className={`shrink-0 mt-0.5 p-0.5 rounded-full
                                            ${plan.isPopular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-neutral-400'}`}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-neutral-300 text-sm leading-snug">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                                    ${plan.isPopular
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                                    }`}
                            >
                                {plan.ctaText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
