import React from 'react';
import { BrainCircuit, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

export interface ThoughtStep {
  label: string;
  status: 'done' | 'running' | 'pending';
}

interface AgentThoughtPanelProps {
  steps: ThoughtStep[];
  isExpanded: boolean;
  onToggle: () => void;
  elapsedSeconds: number;
}

const AgentThoughtPanel: React.FC<AgentThoughtPanelProps> = ({
  steps,
  isExpanded,
  onToggle,
  elapsedSeconds,
}) => {
  const doneCount = steps.filter(s => s.status === 'done').length;

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0F0F0F] overflow-hidden my-2 w-full transition-all duration-300">

      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#151515] transition-colors group"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={13} className="text-indigo-400 shrink-0" />
          <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors">
            Processo do Agente
          </span>
          <span className="text-[10px] text-neutral-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded-full font-mono">
            {doneCount}/{steps.length}
          </span>
          {elapsedSeconds > 0 && (
            <span className="text-[10px] text-neutral-700">{elapsedSeconds}s</span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-neutral-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Steps list */}
      {isExpanded && steps.length > 0 && (
        <div className="px-4 pb-3 pt-2 space-y-2 border-t border-[#1a1a1a]">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 transition-opacity duration-300 ${
                step.status === 'pending' ? 'opacity-25' : 'opacity-100'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.status === 'done' && (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                )}
                {step.status === 'running' && (
                  <Loader2 size={13} className="text-indigo-400 animate-spin" />
                )}
                {step.status === 'pending' && (
                  <div className="w-3 h-3 rounded-full border border-[#333]" />
                )}
              </div>
              <span
                className={`text-xs leading-relaxed ${
                  step.status === 'running'
                    ? 'text-neutral-200'
                    : step.status === 'done'
                    ? 'text-neutral-500'
                    : 'text-neutral-700'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentThoughtPanel;
