import React from 'react';
import { User, Mail, Lock, CreditCard, Clock, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';

export const ProfilePage: React.FC = () => {
  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in pb-20">
      <h2 className="text-3xl font-bold text-white mb-8">Minha Conta</h2>

      <div className="space-y-8">
        {/* --- SECTION 1: PERSONAL INFO --- */}
        <section className="bg-[#0A0A0A] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#262626] flex items-center gap-3">
            <User className="text-indigo-500" size={20} />
            <h3 className="font-semibold text-white">Informações Pessoais</h3>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-[#141414] border-2 border-[#262626] flex items-center justify-center text-2xl font-bold text-neutral-500 relative group cursor-pointer overflow-hidden">
                 <span className="group-hover:opacity-0 transition-opacity">JD</span>
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white">
                    Alterar
                 </div>
              </div>
              <p className="text-xs text-neutral-500">JPG ou PNG. Max 2MB.</p>
            </div>

            {/* Fields */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  defaultValue="John Doe"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Endereço de Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input 
                    type="email" 
                    defaultValue="john.doe@nexus.ai"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button>Salvar Alterações</Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2: SECURITY --- */}
        <section className="bg-[#0A0A0A] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#262626] flex items-center gap-3">
            <Lock className="text-indigo-500" size={20} />
            <h3 className="font-semibold text-white">Segurança & Senha</h3>
          </div>
          
          <div className="p-8">
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Senha Atual</label>
                <input 
                  type="password" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Nova Senha</label>
                <input 
                  type="password" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <Button variant="secondary">Atualizar Senha</Button>
           </div>
          </div>
        </section>

        {/* --- SECTION 3: BILLING --- */}
        <section className="bg-[#0A0A0A] border border-[#262626] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#262626] flex items-center gap-3">
            <CreditCard className="text-indigo-500" size={20} />
            <h3 className="font-semibold text-white">Pagamento & Plano</h3>
          </div>

          <div className="p-8">
             <div className="flex flex-col md:flex-row gap-8 mb-8">
                {/* Current Plan */}
                <div className="flex-1 bg-gradient-to-br from-indigo-900/20 to-[#141414] border border-indigo-500/30 rounded-xl p-6">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Plano Atual</span>
                        <h4 className="text-2xl font-bold text-white mt-1">Pro Plan</h4>
                      </div>
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">ATIVO</span>
                   </div>
                   <p className="text-neutral-400 text-sm mb-6">Próxima renovação em 15 de Outubro, 2024</p>
                   <div className="flex gap-3">
                      <Button variant="primary">Gerenciar Assinatura</Button>
                   </div>
                </div>

                {/* Payment Method */}
                <div className="flex-1 bg-[#141414] border border-[#262626] rounded-xl p-6 flex flex-col justify-between">
                   <div>
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Método de Pagamento</span>
                      <div className="flex items-center gap-3 mt-4">
                         <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-red-500 -mr-1"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-white font-medium">Mastercard final 4242</span>
                            <span className="text-xs text-neutral-500">Expira em 12/28</span>
                         </div>
                      </div>
                   </div>
                   <button className="text-indigo-400 text-sm hover:text-indigo-300 font-medium text-left mt-4">Alterar cartão</button>
                </div>
             </div>

             {/* Invoice History */}
             <div>
                <h4 className="text-sm font-bold text-white mb-4">Histórico de Faturas</h4>
                <div className="border border-[#262626] rounded-lg overflow-hidden">
                   {[
                     { date: '01 Out, 2024', amount: 'R$ 299,00', status: 'Pago' },
                     { date: '01 Set, 2024', amount: 'R$ 299,00', status: 'Pago' },
                     { date: '01 Ago, 2024', amount: 'R$ 299,00', status: 'Pago' }
                   ].map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[#141414] border-b border-[#262626] last:border-0 hover:bg-[#1A1A1A] transition-colors">
                         <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-emerald-900/20 text-emerald-500">
                               <CheckCircle2 size={16} />
                            </div>
                            <div>
                               <p className="text-sm text-white font-medium">Fatura Mensal</p>
                               <span className="text-xs text-neutral-500">{invoice.date}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <span className="text-sm text-white font-mono">{invoice.amount}</span>
                            <button className="text-neutral-500 hover:text-white transition-colors">
                               <Download size={18} />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};