import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQProps } from '../types/ast';

const DEFAULT_ITEMS = [
    {
        question: 'Como funciona a plataforma?',
        answer: 'Nossa plataforma usa inteligência artificial para criar páginas de alta conversão em segundos. Basta descrever sua ideia e o sistema gera o design completo automaticamente.',
    },
    {
        question: 'Preciso saber programar?',
        answer: 'Não. A plataforma foi criada para que qualquer pessoa possa criar páginas profissionais sem nenhum conhecimento técnico.',
    },
    {
        question: 'Posso cancelar a qualquer momento?',
        answer: 'Sim. Não há contratos ou taxas de cancelamento. Você pode cancelar sua assinatura quando quiser, sem burocracia.',
    },
    {
        question: 'As páginas são responsivas?',
        answer: 'Sim. Todas as páginas geradas são totalmente responsivas e otimizadas para dispositivos móveis, tablets e desktops.',
    },
];

export const FAQSection: React.FC<FAQProps> = (props) => {
    const {
        title = 'Perguntas Frequentes',
        subtitle = 'Tire suas dúvidas sobre nossa plataforma.',
        items = DEFAULT_ITEMS,
    } = props;

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i));

    return (
        <section id="faq" className="py-24 bg-[#050505] border-t border-white/5 relative">
            <div className="max-w-3xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
                    {subtitle && (
                        <p className="text-neutral-400 max-w-xl mx-auto">{subtitle}</p>
                    )}
                </div>

                {/* Accordion */}
                <div className="flex flex-col gap-3">
                    {items.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden
                                    ${isOpen
                                        ? 'border-indigo-500/40 bg-indigo-500/5'
                                        : 'border-white/5 bg-[#0a0a0a] hover:border-white/10'
                                    }`}
                            >
                                {/* Question row */}
                                <button
                                    onClick={() => toggle(i)}
                                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
                                >
                                    <span className={`font-semibold text-sm md:text-base transition-colors duration-200
                                        ${isOpen ? 'text-indigo-300' : 'text-white group-hover:text-indigo-200'}`}>
                                        {item.question}
                                    </span>
                                    <ChevronDown
                                        className={`shrink-0 w-5 h-5 transition-all duration-300
                                            ${isOpen ? 'rotate-180 text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}`}
                                    />
                                </button>

                                {/* Answer — animated */}
                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden
                                        ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <p className="px-6 pb-5 text-sm text-neutral-400 leading-relaxed">
                                        {item.answer}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
