import React from 'react';
import { Sparkles } from 'lucide-react';

interface DashboardPageProps {
  userName: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userName }) => {
  // Get current hour to personalize greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Brand Mark */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/90 to-purple-600/90 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
            <Sparkles size={36} className="text-white/90" />
          </div>
        </div>

        {/* Greeting */}
        <p className="text-sm uppercase tracking-widest text-neutral-500 mb-3">{greeting},</p>
        <h1 className="text-4xl font-semibold text-white mb-4 tracking-tight">
          {userName}
        </h1>

        {/* Subtitle */}
        <p className="text-base text-neutral-500 mb-10">
          Bem-vindo de volta ao <span className="text-neutral-200 font-medium">Arcco</span>
        </p>

        {/* Decorative Line */}
        <div className="flex items-center justify-center gap-4 text-neutral-600">
          <div className="w-12 h-px bg-neutral-800" />
          <span className="text-xs uppercase tracking-wider text-neutral-600">Sua plataforma de IA</span>
          <div className="w-12 h-px bg-neutral-800" />
        </div>
      </div>
    </div>
  );
};
