
import { supabase } from './supabase';

export async function logAction(action: string, details?: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const user = session.user;
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                user_email: user.email,
                user_name: user.user_metadata?.full_name || 'Usuário',
                action,
                details
            });

        if (error) {
            console.warn('Erro ao gravar log de auditoria:', error.message);
        }
    } catch (err) {
        console.error('Falha crítica no logger:', err);
    }
}
