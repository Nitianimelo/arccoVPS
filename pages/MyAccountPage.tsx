import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  CreditCard,
  Calendar,
  Edit2,
  Check,
  X,
  AlertCircle,
  Crown
} from 'lucide-react';
import { userService, CreateUserInput } from '../lib/supabase';

interface MyAccountPageProps {
  userEmail: string;
}

interface UserData {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  ocupacao: string;
  plano: string;
  created_at?: string;
}

export const MyAccountPage: React.FC<MyAccountPageProps> = ({ userEmail }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CreateUserInput>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userEmail]);

  const loadUserData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await userService.getUserByEmail(userEmail);

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
        // Fallback to localStorage if Supabase fails
        loadFromLocalStorage();
        return;
      }

      if (data) {
        setUserData({
          id: data.id || '',
          nome: data.nome || '',
          email: data.email || '',
          telefone: data.content?.telefone || '',
          ocupacao: data.content?.ocupacao || '',
          plano: data.plano || 'free',
          created_at: data.created_at
        });
      } else {
        // No user found in Supabase, try localStorage
        loadFromLocalStorage();
      }
    } catch (err) {
      console.error('Error:', err);
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const savedName = localStorage.getItem('arcco_user_name');
    const savedEmail = localStorage.getItem('arcco_user_email') || userEmail;
    const savedPhone = localStorage.getItem('arcco_user_phone');
    const savedOccupation = localStorage.getItem('arcco_user_occupation');

    setUserData({
      id: '',
      nome: savedName || 'Usuário',
      email: savedEmail,
      telefone: savedPhone || '',
      ocupacao: savedOccupation || '',
      plano: 'free'
    });
  };

  const handleEdit = () => {
    if (userData) {
      setEditData({
        nome: userData.nome,
        telefone: userData.telefone,
        ocupacao: userData.ocupacao
      });
    }
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setError('');
  };

  const handleSave = async () => {
    if (!userData) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (userData.id) {
        // Update in Supabase
        const { error: updateError } = await userService.updateUser(userData.id, editData);

        if (updateError) {
          setError('Erro ao atualizar dados. Tente novamente.');
          setIsSaving(false);
          return;
        }
      }

      // Update localStorage
      if (editData.nome) localStorage.setItem('arcco_user_name', editData.nome);
      if (editData.telefone) localStorage.setItem('arcco_user_phone', editData.telefone);
      if (editData.ocupacao) localStorage.setItem('arcco_user_occupation', editData.ocupacao);

      // Update local state
      setUserData({
        ...userData,
        nome: editData.nome || userData.nome,
        telefone: editData.telefone || userData.telefone,
        ocupacao: editData.ocupacao || userData.ocupacao
      });

      setIsEditing(false);
      setSuccess('Dados atualizados com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getPlanDetails = (plan: string) => {
    const plans: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
      free: { name: 'Gratuito', color: 'text-neutral-400', icon: null },
      starter: { name: 'Starter', color: 'text-blue-400', icon: null },
      pro: { name: 'Pro', color: 'text-purple-400', icon: <Crown size={14} /> },
      enterprise: { name: 'Enterprise', color: 'text-amber-400', icon: <Crown size={14} /> }
    };
    return plans[plan] || plans.free;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const planDetails = getPlanDetails(userData?.plano || 'free');

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Minha Conta</h1>
          <p className="text-neutral-400">Gerencie suas informações pessoais</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-950/30 border border-green-900/50 rounded-xl p-4 flex items-center gap-3">
            <Check size={18} className="text-green-400" />
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {/* Avatar Section */}
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-500/20">
                {userData?.nome
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{userData?.nome || 'Usuário'}</h2>
                <div className={`flex items-center gap-1.5 text-sm ${planDetails.color}`}>
                  {planDetails.icon}
                  <span>Plano {planDetails.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-6">
            {/* Edit Button */}
            <div className="flex justify-end mb-4">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-600/10 rounded-lg transition-all"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:bg-white/5 rounded-lg transition-all"
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Salvar
                  </button>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Nome */}
              <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <User size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">Nome completo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.nome || ''}
                      onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <p className="text-white">{userData?.nome || '-'}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <Mail size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">E-mail</label>
                  <p className="text-white">{userData?.email || '-'}</p>
                  <p className="text-xs text-neutral-600 mt-1">O e-mail não pode ser alterado</p>
                </div>
              </div>

              {/* Telefone */}
              <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <Phone size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">Telefone (WhatsApp)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.telefone || ''}
                      onChange={(e) => setEditData({ ...editData, telefone: formatPhone(e.target.value) })}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      placeholder="(11) 99999-9999"
                    />
                  ) : (
                    <p className="text-white">{userData?.telefone || '-'}</p>
                  )}
                </div>
              </div>

              {/* Ocupacao */}
              <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <Briefcase size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">Ocupacao</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.ocupacao || ''}
                      onChange={(e) => setEditData({ ...editData, ocupacao: e.target.value })}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Ex: Empresario, Medico..."
                    />
                  ) : (
                    <p className="text-white">{userData?.ocupacao || '-'}</p>
                  )}
                </div>
              </div>

              {/* Plano */}
              <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                  <CreditCard size={18} className="text-neutral-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">Plano atual</label>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${planDetails.color}`}>
                      {planDetails.name}
                    </span>
                    {planDetails.icon}
                  </div>
                  <button className="mt-2 text-sm text-indigo-400 hover:underline">
                    Fazer upgrade
                  </button>
                </div>
              </div>

              {/* Data de criacao */}
              {userData?.created_at && (
                <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[#141414] flex items-center justify-center">
                    <Calendar size={18} className="text-neutral-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1">Membro desde</label>
                    <p className="text-white">
                      {new Date(userData.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-[#0F0F0F] border border-red-900/30 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Zona de Perigo</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Acoes irreversiveis relacionadas a sua conta.
          </p>
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão perdidos.')) {
                // TODO: implementar exclusão de conta no backend
                console.log('Exclusão de conta solicitada');
              }
            }}
            className="px-4 py-2 text-sm border border-red-900/50 text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
          >
            Excluir minha conta
          </button>
        </div>
      </div>
    </div>
  );
};
