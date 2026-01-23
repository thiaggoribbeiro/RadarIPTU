import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            icon: 'delete',
            color: 'red',
            bg: 'bg-red-50 dark:bg-red-500/10',
            text: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
        },
        warning: {
            icon: 'warning',
            color: 'orange',
            bg: 'bg-orange-50 dark:bg-orange-500/10',
            text: 'text-orange-600',
            button: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
        },
        info: {
            icon: 'info',
            color: 'blue',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            text: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
        }
    }[type];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1a2634] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-[#2a3644] text-center animate-in zoom-in-95 duration-300">
                <div className={`size-16 rounded-full ${typeConfig.bg} ${typeConfig.text} flex items-center justify-center mx-auto mb-4`}>
                    <span className="material-symbols-outlined text-3xl">{typeConfig.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-sm text-[#617289] dark:text-[#9ca3af] mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 h-12 ${typeConfig.button} text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
