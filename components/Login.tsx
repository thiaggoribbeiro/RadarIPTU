
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';
import packageJson from '../package.json';

interface LoginProps {
  onLoginSuccess: (name: string, email: string, role?: string, isDemo?: boolean, mustChange?: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message === "Invalid login credentials") {
            throw new Error("Usuário não encontrado ou senha incorreta. Se você é novo aqui, clique em 'CRIAR CONTA'.");
          }
          throw signInError;
        }

        if (data.user) {
          const userName = data.user.user_metadata?.full_name || 'Usuário';
          const userRole = data.user.user_metadata?.role;
          const mustChange = data.user.user_metadata?.must_change_password || false;
          onLoginSuccess(userName, data.user.email || '', userRole, false, mustChange);
        }
      } else {
        if (name.length < 3) throw new Error("Insira seu nome completo.");
        if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: 'Usuário'
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          if (data.session) {
            onLoginSuccess(name, email, 'Usuário');
          } else {
            setError("CONTA CRIADA COM SUCESSO! Verifique seu e-mail para ativar.");
            setIsLoading(false);
          }
        }
      }
    } catch (err: any) {
      console.error("Erro Supabase:", err);
      let message = err.message;

      if (message === "Failed to fetch" || message.includes("fetch")) {
        message = "Erro de conexão com o servidor. Verifique sua internet.";
      } else if (message.includes("User already registered")) {
        message = "Este e-mail já está em uso.";
      } else if (message.includes("Invalid API key") || message.includes("apikey")) {
        message = "Erro de configuração do servidor.";
      }

      setError(message);
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#0f172a] relative overflow-hidden font-display p-4">
      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* Main Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 dark:border-white/5 flex flex-col relative">

          {/* Logo Section Inside Card */}
          <div className="flex flex-col items-center mb-8">
            <div className="size-24 bg-white dark:bg-[#1e293b] rounded-2xl flex items-center justify-center p-2 mb-4 overflow-hidden">
              <img src={logo} alt="RadarIPTU Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#1e293b] dark:text-white">
              RadarIPTU
            </h2>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
              Acesso ao Painel de Gestão
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 border rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-2 duration-300 ${error.includes('SUCESSO') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <span className="material-symbols-outlined text-[18px]">{error.includes('SUCESSO') ? 'check_circle' : 'error_outline'}</span>
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px]">person</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus:border-primary focus:ring-0 outline-none font-semibold transition-all text-sm placeholder:font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">E-mail</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px]">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-[#eff6ff]/50 dark:bg-slate-900/50 focus:border-primary focus:ring-0 outline-none font-semibold transition-all text-sm placeholder:font-medium placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Senha</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px]">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus:border-primary focus:ring-0 outline-none font-semibold transition-all text-sm placeholder:font-medium placeholder:text-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-[#a64614] text-white rounded-2xl font-bold shadow-[0_10px_20px_-5px_rgba(196,84,27,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-xs disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>{mode === 'login' ? 'Entrar' : 'Cadastrar'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}
              <button
                onClick={toggleMode}
                className="ml-1 text-primary hover:text-primary/80 hover:underline transition-all"
              >
                {mode === 'login' ? 'Criar uma agora' : 'Fazer login'}
              </button>
            </p>
          </div>

          {/* Version in Login Card */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
              Versão {packageJson.version}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Login;

