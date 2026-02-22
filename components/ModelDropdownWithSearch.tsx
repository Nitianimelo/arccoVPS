import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter models based on search term
  const filteredModels = availableModels.filter((model) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      model.name.toLowerCase().includes(search) ||
      model.id.toLowerCase().includes(search) ||
      (model.provider && model.provider.toLowerCase().includes(search))
    );
  });

  // Get selected model info
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);
  const selectedModelName = selectedModel?.name || selectedModelId || placeholder;

  // Handle model selection
  const handleSelectModel = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Format price for display
  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return 'Grátis';
    return `$${(numPrice * 1000000).toFixed(2)}/1M`;
  };

  // Format context length
  const formatContextLength = (length?: number): string => {
    if (!length) return '';
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M context`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K context`;
    return `${length} tokens`;
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-xl
            flex items-center justify-between transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#333] cursor-pointer'}
            ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : ''}`}
        >
          <div className="flex-1 text-left">
            <span className="text-sm text-neutral-200 line-clamp-1">
              {selectedModelName}
            </span>
            {selectedModel && showPricing && selectedModel.pricing && (
              <span className="text-xs text-neutral-500 mt-0.5 block">
                {formatPrice(selectedModel.pricing.prompt)} in • {formatPrice(selectedModel.pricing.completion)} out
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`text-neutral-400 transition-transform ml-2 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-[#262626] rounded-xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-[#262626] bg-[#0F0F0F]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar modelo..."
                  className="w-full pl-9 pr-8 py-2 bg-[#141414] border border-[#262626] rounded-lg
                    text-sm text-neutral-200 placeholder-neutral-600
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1
                      hover:bg-neutral-800 rounded transition-colors"
                  >
                    <X size={14} className="text-neutral-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Model List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {filteredModels.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500">
                  Nenhum modelo encontrado
                </div>
              ) : (
                <>
                  {filteredModels.slice(0, 100).map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModel(model.id)}
                      className={`w-full px-4 py-3 text-left transition-colors border-b border-[#1a1a1a] last:border-b-0
                        ${
                          selectedModelId === model.id
                            ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50'
                            : 'hover:bg-[#141414] text-neutral-200'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Model Name */}
                          <div className="font-medium text-sm mb-0.5 truncate">
                            {model.name}
                          </div>

                          {/* Model ID */}
                          <div className="text-xs text-neutral-500 truncate">
                            {model.id}
                          </div>

                          {/* Context Length */}
                          {model.context_length && (
                            <div className="text-xs text-neutral-600 mt-1">
                              {formatContextLength(model.context_length)}
                            </div>
                          )}
                        </div>

                        {/* Pricing Info */}
                        {showPricing && model.pricing && (
                          <div className="text-right text-xs flex-shrink-0">
                            <div className="text-emerald-400 font-medium">
                              {formatPrice(model.pricing.prompt)}
                            </div>
                            <div className="text-neutral-500 text-[10px]">prompt</div>
                            <div className="text-amber-400 font-medium mt-1">
                              {formatPrice(model.pricing.completion)}
                            </div>
                            <div className="text-neutral-500 text-[10px]">completion</div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Pagination Info */}
                  {filteredModels.length > 100 && (
                    <div className="px-4 py-3 text-xs text-neutral-500 border-t border-[#262626] text-center bg-[#0F0F0F]">
                      Mostrando 100 de {filteredModels.length} modelos. Refine sua busca para ver mais.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0F0F0F;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
};

export default ModelDropdownWithSearch;
