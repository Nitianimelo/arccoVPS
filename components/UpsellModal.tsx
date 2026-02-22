
import React from 'react';
import { X, Check, Star, Lock } from 'lucide-react';
import { Modal } from './Modal';

interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, featureName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl">

                {/* Background Effect */}
                <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="p-8 flex flex-col items-center text-center relative z-10">

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25">
                        <Lock size={32} className="text-white" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">
                        Desbloqueie o {featureName}
                    </h2>

                    <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                        Esta ferramenta é exclusiva para membros do plano <span className="text-indigo-400 font-semibold">Pro</span>.
                        Atualize agora para acessar recursos avançados de automação e design.
                    </p>

                    <div className="w-full space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm text-neutral-300">
                            <div className="p-1 rounded-full bg-green-500/10 text-green-500"><Check size={12} /></div>
                            <span>Construtor de Páginas Ilimitado</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-300">
                            <div className="p-1 rounded-full bg-green-500/10 text-green-500"><Check size={12} /></div>
                            <span>Agentes de WhatsApp 24/7</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-neutral-300">
                            <div className="p-1 rounded-full bg-green-500/10 text-green-500"><Check size={12} /></div>
                            <span>Suporte Prioritário</span>
                        </div>
                    </div>

                    <button className="w-full py-3 px-6 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                        <Star size={18} className="fill-black" />
                        Fazer Upgrade Agora
                    </button>

                    <p className="mt-4 text-xs text-neutral-600 cursor-pointer hover:text-neutral-400" onClick={onClose}>
                        Talvez mais tarde
                    </p>

                </div>
            </div>
        </div>
    );
};
