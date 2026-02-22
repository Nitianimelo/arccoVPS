
import React from 'react';
import { Check } from 'lucide-react';
import { PricingProps } from '../types/ast';

export const PricingSection: React.FC<PricingProps> = (props) => {
    const {
        title = "Simple Pricing",
        subtitle = "Choose the plan that fits your needs.",
        plans = []
    } = props;

    return (
        <section className="py-24 bg-[#0A0A0A] border-t border-white/5 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
                    <p className="text-neutral-400 max-w-2xl mx-auto">{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative p-8 rounded-3xl border transition-all hover:-translate-y-2 ${plan.isPopular
                                    ? 'bg-[#111] border-indigo-500/50 shadow-2xl shadow-indigo-900/20'
                                    : 'bg-[#050505] border-white/5 hover:border-white/10'
                                }`}
                        >
                            {plan.isPopular && (
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                                    POPULAR
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                                {plan.period && <span className="text-neutral-500 text-sm">/{plan.period}</span>}
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className={`mt-1 p-0.5 rounded-full ${plan.isPopular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-neutral-400'}`}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-neutral-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-3 rounded-xl font-bold transition-all ${plan.isPopular
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                }`}>
                                {plan.ctaText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
