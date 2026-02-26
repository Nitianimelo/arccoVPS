import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  provider?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

interface ModelDropdownWithSearchProps {
  selectedModelId: string;
  onChange: (modelId: string) => void;
  availableModels: ModelInfo[];
  showPricing?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const ModelDropdownWithSearch: React.FC<ModelDropdownWithSearchProps> = ({
  selectedModelId,
  onChange,
  availableModels,
  showPricing = false,
  label,
  placeholder = 'Selecione um modelo...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredModels = availableModels.filter((model) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      model.name.toLowerCase().includes(s) ||
      model.id.toLowerCase().includes(s) ||
      (model.provider && model.provider.toLowerCase().includes(s))
    );
  });

  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  const selectedModelName = selectedModel?.name || selectedModelId || placeholder;

  const handleSelectModel = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      )}

      {/* Trigger — clean, sem caixa */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 outline-none
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen
            ? 'bg-white/[0.06] text-white'
            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
      >
        <span className="truncate max-w-[200px] font-medium">{selectedModelName}</span>
        <ChevronDown
          size={13}
          className={`flex-shrink-0 text-neutral-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-[280px] bg-[#18181b] border border-[#2e2e32] rounded-xl shadow-2xl overflow-hidden">

          {/* Search */}
          <div className="p-2 border-b border-[#2e2e32]">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-neutral-600 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar modelo..."
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-7 pr-7 py-1.5 bg-transparent text-sm text-neutral-300 placeholder-neutral-600 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 p-1 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-neutral-600">
                Nenhum modelo encontrado
              </div>
            ) : (
              <>
                {filteredModels.slice(0, 100).map((model) => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModel(model.id)}
                      className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 transition-colors duration-100
                        ${isSelected
                          ? 'bg-indigo-500/[0.08] text-indigo-400'
                          : 'text-neutral-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{model.name}</div>
                        <div className="text-[11px] text-neutral-600 truncate mt-0.5">{model.id}</div>
                      </div>
                      {isSelected && <Check size={13} className="flex-shrink-0 text-indigo-400" />}
                    </button>
                  );
                })}

                {filteredModels.length > 100 && (
                  <div className="px-3 py-2.5 text-[11px] text-neutral-600 border-t border-[#2e2e32] text-center">
                    {filteredModels.length - 100} modelos adicionais — refine a busca
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDropdownWithSearch;
