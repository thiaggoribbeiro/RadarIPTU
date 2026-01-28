
import React from 'react';
import { ViewType, UserRole, AppNotification } from '../types';
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
    notifications: AppNotification[];
    onMarkNotificationAsRead: (id: string) => void;
    onSelectProperty: (id: string) => void;
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
    notifications,
    onMarkNotificationAsRead,
    onSelectProperty
}) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;
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
                    Painel Administrativo - <span className="font-light">Radar</span>IPTU (Modo Demonstração)
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
                                <h2 className="text-[#111418] dark:text-white text-lg tracking-tight leading-none">
                                    <span className="font-light">Radar</span><span className="font-bold">IPTU</span>
                                </h2>
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
                        {/* Notificações */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsNotificationsOpen(!isNotificationsOpen);
                                    setIsProfileMenuOpen(false);
                                }}
                                className={`flex size-10 items-center justify-center rounded-full transition-colors relative ${isNotificationsOpen ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-[#2a3644] text-[#617289]'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a2634] animate-in zoom-in duration-300">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                    <div className="p-4 border-b border-[#e5e7eb] dark:border-[#2a3644] bg-gray-50/50 dark:bg-[#22303e]/50 flex items-center justify-between">
                                        <p className="text-xs font-bold text-[#111418] dark:text-white uppercase tracking-wider">Alertas de IPTU</p>
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{notifications.length} Avisos</span>
                                    </div>
                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <span className="material-symbols-outlined text-gray-300 dark:text-gray-700 text-4xl mb-2">notifications_off</span>
                                                <p className="text-xs text-[#617289] font-medium">Nenhuma notificação no momento</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        onMarkNotificationAsRead(n.id);
                                                        onSelectProperty(n.propertyId);
                                                        setIsNotificationsOpen(false);
                                                    }}
                                                    className={`p-4 border-b border-[#e5e7eb] dark:border-[#2a3644] hover:bg-gray-50 dark:hover:bg-[#22303e] transition-colors cursor-pointer relative group ${!n.read ? 'bg-primary/[0.02]' : ''}`}
                                                >
                                                    {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                                                    <div className="flex gap-3">
                                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                {n.type === 'error' ? 'error' : 'warning'}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <h4 className="text-xs font-bold text-[#111418] dark:text-white truncate uppercase">{n.title}</h4>
                                                                <span className="text-[9px] text-[#617289] font-medium whitespace-nowrap">agora</span>
                                                            </div>
                                                            <p className="text-[11px] text-[#617289] dark:text-[#9ca3af] leading-relaxed line-clamp-2">{n.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="p-3 bg-gray-50/50 dark:bg-[#22303e]/50 text-center border-t border-[#e5e7eb] dark:border-[#2a3644]">
                                            <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Ver todos os alertas</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="h-6 w-px bg-gray-200 dark:bg-[#2a3644] mx-2"></div>

                        <div className="relative">
                            <div
                                className="flex items-center gap-3 pl-2 cursor-pointer group py-2"
                                onClick={() => {
                                    setIsProfileMenuOpen(!isProfileMenuOpen);
                                    setIsNotificationsOpen(false);
                                }}
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
                                            </>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleDarkMode(); }}
                                            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[#111418] dark:text-white hover:bg-primary/10 rounded-lg transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-primary">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                                                <span>Modo {isDarkMode ? 'Escuro' : 'Claro'}</span>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200 dark:bg-primary`}>
                                                <span className={`${isDarkMode ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                            </div>
                                        </button>
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
