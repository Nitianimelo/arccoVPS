import React, { useState } from 'react';
import { Shield, Bell, Globe, Moon, Sun, Monitor, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance'>('general');
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark');
  const [language, setLanguage] = useState('pt-BR');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Aparência</h2>
        <p className="text-neutral-400">Personalize o tema da plataforma.</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-8">
          <h3 className="text-lg font-bold text-white mb-6">Tema do Sistema</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dark Theme */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-6 rounded-xl border-2 transition-all ${theme === 'dark'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#262626] bg-[#141414] hover:border-neutral-700'
                }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-600' : 'bg-[#0A0A0A]'
                  }`}>
                  <Moon size={32} className={theme === 'dark' ? 'text-white' : 'text-neutral-500'} />
                </div>
                <div>
                  <div className="font-bold text-white text-lg">Escuro</div>
                  <div className="text-sm text-neutral-500 mt-1">Modo padrão</div>
                </div>
              </div>
            </button>

            {/* Light Theme */}
            <button
              onClick={() => setTheme('light')}
              className={`p-6 rounded-xl border-2 transition-all ${theme === 'light'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#262626] bg-[#141414] hover:border-neutral-700'
                }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-indigo-600' : 'bg-[#0A0A0A]'
                  }`}>
                  <Sun size={32} className={theme === 'light' ? 'text-white' : 'text-neutral-500'} />
                </div>
                <div>
                  <div className="font-bold text-white text-lg">Claro</div>
                  <div className="text-sm text-neutral-500 mt-1">Em breve</div>
                </div>
              </div>
            </button>

            {/* Auto Theme */}
            <button
              onClick={() => setTheme('auto')}
              className={`p-6 rounded-xl border-2 transition-all ${theme === 'auto'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#262626] bg-[#141414] hover:border-neutral-700'
                }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'auto' ? 'bg-indigo-600' : 'bg-[#0A0A0A]'
                  }`}>
                  <Monitor size={32} className={theme === 'auto' ? 'text-white' : 'text-neutral-500'} />
                </div>
                <div>
                  <div className="font-bold text-white text-lg">Automático</div>
                  <div className="text-sm text-neutral-500 mt-1">Seguir sistema</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
