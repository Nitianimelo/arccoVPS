import React from 'react';
import {
  MessageSquare,
  ArrowRight,
  Sparkles,
  Workflow,
  BarChart3,
  Zap,
  Lock,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { ViewState, ToolId } from '../types';

interface ToolsPageProps {
  onNavigate: (view: ViewState) => void;
  onSelectTool: (toolId: ToolId) => void;
}

interface ToolCardProps {
  id: ToolId;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  features: string[];
  status: 'active' | 'coming_soon';
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  name,
  description,
  icon,
  gradient,
  shadowColor,
  features,
  status,
  onClick
}) => {
  const isActive = status === 'active';

  return (
    <div
      onClick={isActive ? onClick : undefined}
      className={`group relative bg-[#0A0A0A] border border-[#161616] rounded-2xl p-7 transition-all duration-300 ${isActive
        ? 'cursor-pointer hover:border-[#2a2a2a] hover:shadow-xl hover:scale-[1.01]'
        : 'opacity-50 cursor-not-allowed'
        }`}
      style={isActive ? { '--shadow-color': shadowColor } as React.CSSProperties : undefined}
    >
      {/* Coming Soon Badge */}
      {!isActive && (
        <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 bg-neutral-900/80 rounded-full text-[11px] text-neutral-500">
          <Lock size={11} />
          Em breve
        </div>
      )}

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg ${isActive ? 'group-hover:scale-105 transition-transform duration-300' : ''
          }`}
      >
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
        {name}
        {isActive && (
          <ArrowRight
            size={20}
            className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-400"
          />
        )}
      </h2>

      {/* Description */}
      <p className="text-sm text-neutral-500 mb-5 leading-relaxed">{description}</p>

      {/* Features */}
      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-neutral-500">
            <CheckCircle2 size={14} className={isActive ? 'text-green-500' : 'text-neutral-600'} />
            {feature}
          </div>
        ))}
      </div>

      {/* CTA for active tools */}
      {isActive && (
        <button className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          <Zap size={16} />
          Acessar Ferramenta
        </button>
      )}
    </div>
  );
};

export const ToolsPage: React.FC<ToolsPageProps> = ({ onNavigate, onSelectTool }) => {
  const handleArccoTalkClick = () => {
    onSelectTool('arcco_talk');
    onNavigate('ARCCO_TALK');
  };

  const handleArccoPagesClick = () => {
    onSelectTool('arcco_pages');
    onNavigate('ARCCO_PAGES');
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-[#1a1a1a] rounded-full mb-6">
            <Sparkles size={14} className="text-neutral-400" />
            <span className="text-xs text-neutral-400 uppercase tracking-wider">Ferramentas</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-3 tracking-tight">
            Escolha sua ferramenta
          </h1>
          <p className="text-sm text-neutral-500 max-w-lg mx-auto">
            Cada ferramenta foi criada para resolver um problema específico do seu negócio
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Arcco Talk - Active */}
          <ToolCard
            id="arcco_talk"
            name="Arcco Talk"
            description="Atendimento inteligente via WhatsApp. Crie agentes de IA para vendas, suporte ou educação."
            icon={<MessageSquare size={32} className="text-white" />}
            gradient="from-indigo-500 to-purple-600"
            shadowColor="rgba(99, 102, 241, 0.2)"
            features={[
              'Agente de Vendas',
              'Agente de Suporte',
              'Agente Educacional',
              'Planilhas Integradas'
            ]}
            status="active"
            onClick={handleArccoTalkClick}
          />

          {/* Arcco Pages - Active */}
          <ToolCard
            id="arcco_pages"
            name="Arcco Pages"
            description="Construtor de páginas com IA. Crie landing pages, sites e muito mais conversando."
            icon={<FileCode size={32} className="text-white" />}
            gradient="from-pink-500 to-rose-600"
            shadowColor="rgba(236, 72, 153, 0.2)"
            features={[
              'Chat com IA para criar',
              'Preview responsivo',
              'Publicação instantânea',
              'Código exportável'
            ]}
            status="active"
            onClick={handleArccoPagesClick}
          />

          {/* Arcco Analytics - Coming Soon */}
          <ToolCard
            id="arcco_analytics"
            name="Arcco Analytics"
            description="Métricas e insights em tempo real sobre o desempenho do seu negócio."
            icon={<BarChart3 size={32} className="text-white" />}
            gradient="from-amber-500 to-orange-600"
            shadowColor="rgba(245, 158, 11, 0.2)"
            features={[
              'Dashboards personalizados',
              'Relatórios automáticos',
              'Previsões com IA',
              'Exportação de dados'
            ]}
            status="coming_soon"
            onClick={() => { }}
          />

          {/* More Tools Placeholder */}
          <div className="relative bg-[#0A0A0A] border border-dashed border-[#1a1a1a] rounded-2xl p-7 flex flex-col items-center justify-center min-h-[280px]">
            <div className="w-12 h-12 rounded-xl bg-[#0F0F0F] border border-[#1a1a1a] flex items-center justify-center mb-5">
              <Sparkles size={22} className="text-neutral-700" />
            </div>
            <p className="text-sm font-medium text-neutral-600 mb-1">
              Mais ferramentas
            </p>
            <p className="text-xs text-neutral-700 text-center max-w-[180px]">
              Novas ferramentas estão sendo desenvolvidas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
