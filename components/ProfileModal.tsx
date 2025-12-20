
import React from 'react';
import { UserRole } from '../types';

interface ProfileModalProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ userName, userEmail, userRole, onClose }) => {
  const user = {
    role: userRole,
    company: "RadarIPTU Gestão",
    lastLogin: "Sessão Atual",
    since: "Ativo"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-[#1a2634] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-32 bg-gradient-to-r from-primary to-primary/60">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-4">
            <div className="size-24 rounded-2xl bg-cover bg-center border-4 border-white dark:border-[#1a2634] shadow-lg bg-gray-200" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/initials/svg?seed=${userName}')` }}></div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#111418] dark:text-white truncate">{userName}</h2>
            <p className="text-sm font-medium text-primary uppercase tracking-widest text-[10px]">{user.role}</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#22303e] border border-gray-100 dark:border-[#2a3644]">
                <p className="text-[10px] font-semibold text-[#617289] uppercase mb-1">Status</p>
                <p className="text-sm font-bold text-emerald-500 uppercase">{user.since}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#22303e] border border-gray-100 dark:border-[#2a3644]">
                <p className="text-[10px] font-semibold text-[#617289] uppercase mb-1">Acesso</p>
                <p className="text-[10px] font-bold text-[#111418] dark:text-white truncate uppercase">{user.role}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 text-sm text-[#617289] dark:text-[#9ca3af]">
                <span className="material-symbols-outlined text-[20px] text-primary">mail</span>
                <span className="truncate">{userEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#617289] dark:text-[#9ca3af]">
                <span className="material-symbols-outlined text-[20px] text-primary">business</span>
                <span>{user.company}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#2a3644] flex gap-3">
            <button
              onClick={onClose}
              className="w-full h-11 bg-primary text-[#111418] rounded-xl text-sm font-bold hover:bg-secondary shadow-lg shadow-primary/20 transition-all uppercase tracking-widest text-[11px]"
            >
              Fechar Perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
