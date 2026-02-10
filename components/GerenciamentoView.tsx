import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logAction } from '../lib/auditLogger';

// Configuração do Supabase (mesmos dados do singleton, mas instanciado localmente)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://aqwuxqfsxnzfyhvjvugu.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd3V4cWZzeG56Znlodmp2dWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTA5MTgsImV4cCI6MjA4MTc4NjkxOH0.YyR9T2DS5vgbIVid1mb7dAqXgh_a8TRnJPqGrfzlOb0';

interface GerenciamentoViewProps {
  userRole: UserRole;
}

const GerenciamentoView: React.FC<GerenciamentoViewProps> = ({ userRole }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === 'Administrador';
  const isManager = userRole === 'Gestor';
  const canManageUsers = isAdmin || isManager;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) {
        if (fetchError.message.includes('infinite recursion')) {
          throw new Error('Erro de recursão nas políticas RLS. Verifique o SQL de correção enviado.');
        }
        throw fetchError;
      }

      if (data) {
        const mappedUsers: AppUser[] = data.map((u: any) => ({
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          role: u.role as UserRole,
          status: u.status || 'Ativo',
          lastAccess: u.last_access || 'Nunca',
          mustChangePassword: u.must_change_password
        }));
        setUsers(mappedUsers);
      }
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setError(err.message || 'Não foi possível carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (newUser: any) => {
    try {
      setError(null);
      setLoading(true);

      // SOLUÇÃO PROFISSIONAL: 
      // Criamos um cliente temporário COM persistência de sessão DESATIVADA.
      // Isso permite que o signUp aconteça sem que o Supabase troque a sua sessão local de administrador.
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 1. Criar o usuário no Supabase Auth usando o cliente isolado
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
            role: newUser.role,
            must_change_password: true
          }
        }
      });

      if (authError) {
        throw new Error(`Erro na criação da conta: ${authError.message}`);
      }

      if (authData.user) {
        alert("Usuário criado com sucesso!");
        logAction('Criação de Usuário', `Nome: ${newUser.fullName}, E-mail: ${newUser.email}, Role: ${newUser.role}`);

        // Recarregar lista (o trigger no banco cuidou do insert na tabela pública)
        fetchUsers();
        setIsAddUserModalOpen(false);
      }
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      // Garante que o erro seja uma string amigável
      let finalMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));

      if (finalMsg.includes('User already registered')) {
        finalMsg = "Este e-mail já está registrado no sistema de autenticação. Se você acabou de tentar criar um perfil e falhou, pode haver um usuário órfão. Delete o usuário no painel de Autenticação do Supabase antes de tentar novamente.";
      }

      setError(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111418] dark:text-white">Gerenciamento de Equipe</h1>
          <p className="text-[#617289] dark:text-[#9ca3af] font-medium">Controle de acessos e permissões do sistema.</p>
        </div>
        {userRole !== 'Visitante' && (
          <button
            onClick={() => canManageUsers && setIsAddUserModalOpen(true)}
            disabled={!canManageUsers || loading}
            className={`flex items-center justify-center gap-2 rounded-xl h-11 px-6 font-semibold shadow-lg transition-all ${canManageUsers
              ? 'bg-primary hover:bg-[#a64614] text-white shadow-primary/30'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
              }`}
          >
            <span className="material-symbols-outlined">{loading ? 'sync' : (canManageUsers ? 'person_add' : 'lock')}</span>
            <span>{loading ? 'Processando...' : (canManageUsers ? 'Novo Usuário' : 'Acesso Restrito')}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-sm font-semibold flex flex-col gap-2 animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5">warning</span>
            <div className="flex-1">
              <p className="font-semibold uppercase text-[10px] mb-1">Atenção - Erro de Sistema</p>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs bg-red-100 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors">Fechar</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a2634] border border-[#e5e7eb] dark:border-[#2a3644] rounded-2xl overflow-hidden shadow-sm">
        {loading && users.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-[#617289] uppercase tracking-widest">Sincronizando banco de dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-[#22303e] border-b-2 border-primary">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Nível de Acesso</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase text-[#111418] dark:text-[#9ca3af]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#2a3644]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1a2634] shadow-sm bg-gray-200" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}')` }}></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#111418] dark:text-white">{user.fullName}</span>
                          <span className="text-[11px] font-medium text-[#617289] dark:text-[#9ca3af]">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase border ${user.role === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        user.role === 'Gestor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          user.role === 'Visitante' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${user.status === 'Ativo' ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className={`size-2 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {userRole !== 'Visitante' && (
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a3644] rounded-lg transition-colors text-[#617289]">
                          <span className="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm font-semibold text-[#617289] italic">
                      Nenhum usuário cadastrado na tabela pública.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddUserModalOpen && (
        <AddUserModal
          onClose={() => setIsAddUserModalOpen(false)}
          onAdd={handleAddUser}
        />
      )}
    </div>
  );
};

interface AddUserModalProps {
  onClose: () => void;
  onAdd: (user: any) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Usuário' as UserRole,
    password: ''
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a2634] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a3644] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="px-8 py-6 border-b border-gray-100 dark:border-[#2a3644] flex justify-between items-center">
          <h2 className="text-lg font-semibold uppercase tracking-tight">Novo Usuário</h2>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#2a3644]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>
        <form className="p-8 space-y-4" onSubmit={(e) => { e.preventDefault(); onAdd(formData); }}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase text-[#617289]">Nome Completo</label>
            <input required className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase text-[#617289]">E-mail</label>
            <input required type="email" className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase text-[#617289]">Nível de Acesso</label>
            <select className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-primary" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
              <option value="Usuário" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Usuário</option>
              <option value="Gestor" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Gestor</option>
              <option value="Administrador" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Administrador</option>
              <option value="Visitante" className="bg-white dark:bg-[#1a2634] text-[#111418] dark:text-white">Visitante</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase text-[#617289]">Senha Temporária</label>
            <input required type="password" placeholder="Defina a senha inicial" className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-primary" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg">
            * O usuário será obrigado a trocar esta senha no primeiro login.
          </p>
          <button type="submit" className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs mt-4 shadow-lg shadow-primary/30 hover:bg-[#a64614]">CRIAR CONTA</button>
        </form>
      </div>
    </div>
  );
};

export default GerenciamentoView;
