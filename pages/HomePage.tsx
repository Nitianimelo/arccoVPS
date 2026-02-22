
import React, { useState } from 'react';
import {
    MessageSquare,
    FileText,
    Image as ImageIcon,
    Zap,
    Send
} from 'lucide-react';

interface HomePageProps {
    userName: string;
    onSendIntent: (intent: string, initialMessage?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ userName, onSendIntent }) => {
    const [inputValue, setInputValue] = useState('');

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = userName.split(' ')[0];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim()) {
                onSendIntent('chat', inputValue);
            }
        }
    };

    const quickActions = [
        {
            icon: ImageIcon,
            label: 'Criar Post para Instagram',
            intent: 'design',
            prompt: 'Gostaria de criar um post para o Instagram sobre...'
        },
        {
            icon: FileText,
            label: 'Analisar Documento',
            intent: 'analysis',
            prompt: 'Quero analisar um documento. Vou anexar...'
        },
        {
            icon: Zap,
            label: 'Escrever Proposta',
            intent: 'copy',
            prompt: 'Preciso escrever uma proposta comercial para...'
        }
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#050505] text-white relative overflow-hidden">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-3xl w-full z-10 flex flex-col items-center">

                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
                        <span className="text-neutral-500">{greeting}, </span>
                        <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                            {firstName}
                        </span>
                    </h1>
                    <p className="text-lg text-neutral-400">
                        O que vamos criar hoje?
                    </p>
                </div>

                {/* Central Input */}
                <div className="w-full relative group mb-12">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative bg-[#0F0F0F] rounded-2xl border border-neutral-800 p-2 flex items-center shadow-2xl">
                        <div className="pl-4 text-neutral-500">
                            <MessageSquare size={20} />
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Descreva o que você precisa..."
                            className="flex-1 bg-transparent border-none outline-none text-lg px-4 py-4 text-white placeholder-neutral-600"
                            autoFocus
                        />
                        <button
                            onClick={() => inputValue.trim() && onSendIntent('chat', inputValue)}
                            disabled={!inputValue.trim()}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    {quickActions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSendIntent(action.intent, action.prompt)}
                            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-neutral-800 hover:border-indigo-500/50 bg-[#0F0F0F]/50 hover:bg-[#141414] transition-all duration-300"
                        >
                            <div className="p-3 rounded-full bg-neutral-900 group-hover:bg-indigo-500/10 text-neutral-400 group-hover:text-indigo-400 transition-colors">
                                <action.icon size={24} />
                            </div>
                            <span className="text-sm font-medium text-neutral-300 group-hover:text-white">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer Text */}
            <div className="absolute bottom-8 text-neutral-600 text-xs uppercase tracking-widest opacity-50">
                Arcco AI v2.0
            </div>

        </div>
    );
};
