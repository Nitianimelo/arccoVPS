import React from 'react';
import {
  HelpCircle,
  MessageSquare,
  Mail,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  ChevronRight
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const supportOptions = [
    {
      title: 'Central de Ajuda',
      description: 'Encontre respostas para as perguntas mais comuns',
      icon: BookOpen,
      color: 'bg-indigo-900/30',
      iconColor: 'text-indigo-400',
      action: 'Acessar'
    },
    {
      title: 'Tutoriais em Vídeo',
      description: 'Aprenda a usar a plataforma passo a passo',
      icon: Video,
      color: 'bg-purple-900/30',
      iconColor: 'text-purple-400',
      action: 'Assistir'
    },
    {
      title: 'Documentação',
      description: 'Guias técnicos e referência da API',
      icon: FileText,
      color: 'bg-emerald-900/30',
      iconColor: 'text-emerald-400',
      action: 'Ler'
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
            <HelpCircle size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Como podemos ajudar?</h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            Estamos aqui para garantir que você tenha a melhor experiência com a Arcco.ai
          </p>
        </div>

        {/* Support Options */}
        <div className="space-y-4 mb-10">
          {supportOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={index}
                className="w-full flex items-center gap-4 p-5 bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl hover:border-[#333] transition-all text-left group"
              >
                <div className={`w-12 h-12 rounded-xl ${option.color} flex items-center justify-center shrink-0`}>
                  <Icon size={24} className={option.iconColor} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{option.title}</h3>
                  <p className="text-sm text-neutral-500">{option.description}</p>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm">{option.action}</span>
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] border border-[#1a1a1a] rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Precisa de mais ajuda?</h2>
          <p className="text-neutral-400 mb-6">
            Nossa equipe de suporte está pronta para ajudar você
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
              <MessageSquare size={18} />
              Iniciar Chat
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors">
              <Mail size={18} />
              Enviar Email
            </button>
          </div>

          <p className="text-xs text-neutral-600 mt-6">
            Horário de atendimento: Segunda a Sexta, 9h às 18h
          </p>
        </div>

        {/* FAQ Quick Links */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
            Perguntas Frequentes
          </h3>
          <div className="space-y-2">
            {[
              'Como conectar meu WhatsApp?',
              'Como criar meu primeiro agente?',
              'Como adicionar documentos à base de conhecimento?',
              'O que fazer se o agente não responder corretamente?'
            ].map((question, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-3 text-left text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors"
              >
                <span className="text-sm">{question}</span>
                <ExternalLink size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
