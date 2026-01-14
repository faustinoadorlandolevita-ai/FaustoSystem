
import React from 'react';
import { useApp } from '../App';
import { AppView, SYSTEM_NAME } from '../types';

const SubscriptionGate: React.FC = () => {
  const { tenant, setCurrentView, handleLogout } = useApp();
  const sub = tenant.subscription;

  const getReason = () => {
    if (sub.status === 'expired') return "A sua assinatura expirou.";
    if (sub.status === 'suspended') return "A sua conta está suspensa por atraso de pagamento.";
    if (sub.status === 'trial') return "O seu período de teste grátis de 14 dias terminou.";
    return "É necessária uma assinatura ativa para aceder ao sistema.";
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-zinc-900/80 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full mx-auto flex items-center justify-center text-red-500 animate-pulse">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-white tracking-tighter">Acesso Bloqueado</h1>
          <p className="text-zinc-400 text-sm leading-relaxed font-medium">
            {getReason()} 
            <br />
            Para continuar a gerir o seu negócio no <span className="text-white font-bold">{SYSTEM_NAME}</span>, 
            por favor realize a renovação da sua assinatura.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-4">
          <button 
            onClick={() => setCurrentView(AppView.SUBSCRIPTION)}
            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
          >
            Ver Planos de Assinatura
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all"
          >
            Terminar Sessão
          </button>
        </div>

        <div className="pt-6 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">FaustoSystem Security Layer v2.5</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
