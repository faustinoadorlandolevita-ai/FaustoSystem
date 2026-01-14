
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { SYSTEM_NAME } from '../types';

interface AuthProps {
  onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isResetPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setSuccessMsg("Enviamos as instruções de recuperação para o seu e-mail.");
        return;
      }

      if (!isLogin && password !== confirmPassword) {
        setError("As palavras-passe não coincidem.");
        setLoading(false);
        return;
      }

      if (!isLogin && password.length < 6) {
        setError("A palavra-passe deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        onSuccess();
      } else {
        const { error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        if (authError) throw authError;
        setNeedsEmailVerification(true);
      }
    } catch (err: any) {
      if (err.message.includes('Email not confirmed')) {
        setError("Por favor, confirme o seu e-mail antes de entrar.");
      } else if (err.message === 'Invalid login credentials') {
        setError('Credenciais inválidas. Verifique o seu e-mail e palavra-passe.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (needsEmailVerification) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-12 border border-white/5 animate-in fade-in zoom-in duration-500 relative z-10 text-center space-y-8">
          <div className="w-24 h-24 bg-indigo-600/20 rounded-full mx-auto flex items-center justify-center border border-indigo-500/30 animate-bounce">
            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tighter">Verifique o seu e-mail</h2>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
              Enviamos um link de confirmação para <span className="text-white font-bold">{email}</span>.
              <br /><br />
              Por favor, clique no link para ativar a sua conta mestre e começar a usar o {SYSTEM_NAME}.
            </p>
          </div>
          <button 
            onClick={() => {
              setNeedsEmailVerification(false);
              setIsLogin(true);
            }}
            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="p-10 sm:p-12 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 rotate-3">
              <span className="text-white text-3xl font-black italic">F</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">{SYSTEM_NAME}</h1>
            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
              {isResetPassword ? 'Recuperação de Acesso' : isLogin ? 'Bem-vindo de volta' : 'Crie a sua conta mestre'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">E-mail Corporativo</label>
              <input 
                type="email" 
                required
                className="w-full px-6 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-zinc-600"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {!isResetPassword && (
              <div className="relative">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Palavra-passe</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full px-6 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-[38px] text-zinc-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            )}

            {!isLogin && !isResetPassword && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Confirmar Palavra-passe</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full px-6 py-4 bg-zinc-800/50 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-500/20 animate-shake">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-green-500/20">
                {successMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>A processar...</span>
                </div>
              ) : isResetPassword ? 'Enviar Link de Recuperação' : isLogin ? 'Entrar no Sistema' : 'Criar Minha Conta'}
            </button>

            {isLogin && !isResetPassword && (
              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setIsResetPassword(true)}
                  className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                >
                  Esqueceu-se da palavra-passe?
                </button>
              </div>
            )}
          </form>

          <div className="text-center pt-4">
            <button 
              onClick={() => {
                if (isResetPassword) {
                  setIsResetPassword(false);
                } else {
                  setIsLogin(!isLogin);
                }
                setError(null);
                setSuccessMsg(null);
              }}
              className="group text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
            >
              {isResetPassword ? (
                <>Voltar ao <span className="text-indigo-400 group-hover:underline">Login</span></>
              ) : isLogin ? (
                <>Não tem conta? <span className="text-indigo-400 group-hover:underline">Registe-se aqui</span></>
              ) : (
                <>Já tem conta? <span className="text-indigo-400 group-hover:underline">Faça Login</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
