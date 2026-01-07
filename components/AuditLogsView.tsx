
import React, { useState, useEffect } from 'react';
import { AuditLog, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuditLogsViewProps {
    userRole: UserRole;
}

const AuditLogsView: React.FC<AuditLogsViewProps> = ({ userRole }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = userRole === 'Administrador';

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            console.error('Erro ao buscar logs:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) fetchLogs();
    }, [isAdmin]);

    const filteredLogs = logs.filter(log =>
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <span className="material-symbols-outlined text-red-500 text-6xl mb-4">lock</span>
                <h2 className="text-2xl font-bold text-[#111418] dark:text-white">Acesso Restrito</h2>
                <p className="text-[#617289] dark:text-[#9ca3af]">Apenas administradores podem visualizar os logs do sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#111418] dark:text-white">Acompanhamento de Processos</h1>
                    <p className="text-[#617289] dark:text-[#9ca3af] font-medium">Histórico detalhado de ações realizadas no sistema.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Buscar nos logs..."
                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-sm font-semibold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#617289]">search</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-[#617289] uppercase tracking-widest">Carregando registros...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-[#22303e] border-b-2 border-primary">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Data/Hora</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Usuário</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Ação</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                        <td className="px-6 py-4 text-xs font-medium text-[#111418] dark:text-white whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-[#111418] dark:text-white">{log.user_name}</span>
                                                <span className="text-[10px] text-[#617289] dark:text-[#9ca3af]">{log.user_email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wide">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-[#617289] dark:text-[#9ca3af] max-w-xs break-words">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-sm font-semibold text-[#617289] italic">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogsView;
