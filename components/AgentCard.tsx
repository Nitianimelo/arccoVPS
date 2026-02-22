import React from 'react';
import { ArrowUpRight, Zap, Users, Shield, Trash2 } from 'lucide-react';
import { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  onDelete: (id: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onDelete }) => {
  const getIcon = () => {
    // Simple logic to vary icons based on role for demo purposes
    if (agent.role.includes('Sales')) return <Zap size={20} />;
    if (agent.role.includes('Support')) return <Shield size={20} />;
    return <Users size={20} />;
  };

  return (
    <div className="group relative bg-[#0F0F0F] hover:bg-[#141414] border border-[#262626] hover:border-indigo-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${agent.avatarColor} bg-opacity-10 flex items-center justify-center border border-white/5`}>
           <div className={agent.avatarColor.replace('bg-', 'text-')}>
             {getIcon()}
           </div>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
            agent.status === 'active' 
              ? 'bg-emerald-950/30 border-emerald-900 text-emerald-500' 
              : 'bg-neutral-900 border-neutral-800 text-neutral-500'
          }`}>
            {agent.status}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(agent.id);
            }}
            className="text-neutral-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-950/20"
            title="Excluir agente"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
        {agent.name}
      </h3>
      <p className="text-sm text-neutral-400 mb-4 line-clamp-2 min-h-[40px]">
        {agent.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {agent.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
        <div className="text-xs text-neutral-500 font-mono">
          {agent.model}
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-white hover:text-indigo-400 transition-colors">
          Configurar
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
};