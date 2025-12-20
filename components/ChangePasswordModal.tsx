
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false }
      });

      if (updateError) throw updateError;

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-[#1a2634] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden">
        <header className="px-8 py-6 border-b border-gray-100 dark:border-[#2a3644] text-center">
          <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px] font-semibold">lock_reset</span>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">Atualize sua Senha</h2>
          <p className="text-sm text-[#617289] mt-2">Este é o seu primeiro acesso. Por segurança, você deve criar uma nova senha pessoal.</p>
        </header>

        <form className="p-8 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-[#617289]">Nova Senha</label>
            <input
              required
              type="password"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-[#617289]">Confirmar Nova Senha</label>
            <input
              required
              type="password"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-[#111418] rounded-xl font-bold uppercase tracking-widest text-xs mt-4 shadow-lg shadow-primary/20 hover:bg-secondary disabled:opacity-50"
          >
            {isLoading ? 'ATUALIZANDO...' : 'DEFINIR NOVA SENHA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
