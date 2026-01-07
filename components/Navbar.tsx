
import React from 'react';
import { ViewType, UserRole } from '../types';
import logo from '../assets/logo.png';
import packageJson from '../package.json';

interface NavbarProps {
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    userName: string;
    userEmail: string;
    userRole: UserRole;
    isProfileMenuOpen: boolean;
    setIsProfileMenuOpen: (open: boolean) => void;
    onOpenProfile: () => void;
    onLogout: () => void;
    isDemoMode?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
    currentView,
    setCurrentView,
    isDarkMode,
    toggleDarkMode,
    userName,
    userEmail,
    userRole,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    onOpenProfile,
    onLogout,
    isDemoMode = false,
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'properties', label: 'Imóveis' },
        { id: 'reports', label: 'Relatórios' },
    ];

    return (
        <>
            {isDemoMode && (
                <div className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest py-1.5 text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                    Painel Administrativo - RadarIPTU (Modo Demonstração)
                </div>
            )}

            <nav className="sticky top-0 z-40 w-full bg-white dark:bg-[#1a2634] border-b border-[#e5e7eb] dark:border-[#2a3644] shadow-sm transition-colors">
                <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                            <div className="size-10 bg-white dark:bg-[#1a2634] rounded-lg flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
                                <img src={logo} alt="RadarIPTU Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[#111418] dark:text-white text-lg font-bold tracking-tight leading-none">RadarIPTU</h2>
                                <span className="text-[10px] font-bold text-primary dark:text-primary/80 opacity-60">v{packageJson.version}</span>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((nav) => (
                                <button
                                    key={nav.id}
                                    onClick={() => setCurrentView(nav.id as ViewType)}
                                    className={`text-sm font-semibold transition-all relative py-5 ${currentView === nav.id
                                        ? 'text-[#111418] dark:text-primary border-b-2 border-primary'
                                        : 'text-[#617289] dark:text-[#9ca3af] hover:text-[#111418] dark:hover:text-primary'
                                        }`}
                                >
                                    {nav.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleDarkMode}
                            className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3644] text-[#617289] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {isDarkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                        <div className="h-6 w-px bg-gray-200 dark:bg-[#2a3644] mx-2"></div>

                        <div className="relative">
                            <div
                                className="flex items-center gap-3 pl-2 cursor-pointer group py-2"
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            >
                                <div
                                    className="size-10 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1a2634] shadow-sm group-hover:border-primary transition-all bg-gray-200"
                                    style={{ backgroundImage: `url('https://api.dicebear.com/7.x/initials/svg?seed=${userName}')` }}
                                ></div>
                                <div className="hidden lg:flex flex-col text-left max-w-[150px]">
                                    <span className="text-sm font-semibold text-[#111418] dark:text-white leading-tight truncate">
                                        {userName}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-[#617289] flex items-center gap-1">
                                        {userRole}{' '}
                                        <span
                                            className={`material-symbols-outlined text-[14px] transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''
                                                }`}
                                        >
                                            expand_more
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-4 border-b border-[#e5e7eb] dark:border-[#2a3644] bg-gray-50/50 dark:bg-[#22303e]/50">
                                        <p className="text-xs font-bold text-[#617289] uppercase tracking-wider mb-1">Conta Ativa</p>
                                        <p className="text-sm font-semibold text-[#111418] dark:text-white truncate">{userEmail}</p>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={onOpenProfile}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-[#111418] dark:text-white hover:bg-primary/10 rounded-lg transition-colors text-left"
                                        >
                                            <span className="material-symbols-outlined text-primary">person</span> Ver perfil
                                        </button>

                                        {userRole === 'Administrador' && (
                                            <>
                                                <button
                                                    onClick={() => { setCurrentView('team'); setIsProfileMenuOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-[#111418] dark:text-white hover:bg-primary/10 rounded-lg transition-colors text-left"
                                                >
                                                    <span className="material-symbols-outlined text-primary">group</span> Equipe
                                                </button>
                                                <button
                                                    onClick={() => { setCurrentView('audit'); setIsProfileMenuOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-[#111418] dark:text-white hover:bg-primary/10 rounded-lg transition-colors text-left"
                                                >
                                                    <span className="material-symbols-outlined text-primary">history</span> Acompanhamento
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-[#e5e7eb] dark:border-[#2a3644]">
                                        <button
                                            onClick={onLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-left"
                                        >
                                            <span className="material-symbols-outlined">logout</span> Sair do sistema
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Navbar;
