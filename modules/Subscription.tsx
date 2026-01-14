
import React, { useState } from 'react';
import { useApp } from '../App';
import { SubscriptionStatus } from '../types';

const SubscriptionModule: React.FC = () => {
  const { tenant, setTenant, notify, language, user } = useApp();
  const [activeTab, setActiveTab] = useState<'plans' | 'admin'>('plans');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(tenant.securityKey);

  const plans = [
    { id: 'weekly', name: 'Plano Semanal', duration: 7, price: 5000, desc: 'Ideal para testes de curto prazo.' },
    { id: 'monthly', name: 'Plano Mensal', duration: 30, price: 15000, desc: 'A escolha mais popular para pequenas empresas.', popular: true },
    { id: 'quarterly', name: 'Plano Trimestral', duration: 90, price: 40000, desc: 'Melhor custo-benefício para crescimento.' },
  ];

  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === tenant.securityKey) {
      setIsAdminUnlocked(true);
      notify("Acesso administrativo concedido.", "success");
    } else {
      notify("Senha administrativa incorreta.", "error");
    }
  };

  const handleSubscribe = (duration: number, type: any) => {
    setLoading(true);
    setTimeout(() => {
      const now = new Date();
      const newExpiry = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000).toISOString();
      
      setTenant({
        ...tenant,
        subscription: {
          ...tenant.subscription,
          status: 'active',
          subscriptionEndsAt: newExpiry,
          planType: type,
          lastPaymentDate: now.toISOString()
        }
      });
      setLoading(false);
      notify("Assinatura renovada com sucesso!", "success");
    }, 1500);
  };

  const handleWhatsAppContact = (plan: any) => {
    const adminPhone = "+244927735274";
    const requestDate = new Date().toLocaleString('pt-AO');
    const userName = user?.email?.split('@')[0] || 'Utilizador';
    const userEmail = user?.email || 'N/A';

    // Texto da mensagem personalizada com variáveis dinâmicas
    const message = `Olá FaustoSystem! Gostaria de solicitar a ativação do seguinte plano:

*Detalhes da Solicitação:*
- *Plano:* ${plan.name}
- *Valor:* ${plan.price.toLocaleString()} ${tenant.currency}
- *Duração:* ${plan.duration} dias

*Dados do Usuário:*
- *Nome:* ${userName}
- *E-mail:* ${userEmail}
- *Data da Solicitação:* ${requestDate}

Aguardo as instruções para pagamento e ativação.`.trim();

    // Registro de clique no sistema (Simulado via Log e Notificação)
    console.log(`[SUBSCRIPTION_EVENT] Usuário ${userEmail} clicou em contacto WhatsApp para o plano ${plan.id} em ${requestDate}`);
    notify(`Solicitação de contacto registada para o ${plan.name}.`, 'success');

    // Construção da URL do WhatsApp para Mobile e Desktop
    const waUrl = `https://wa.me/${adminPhone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    
    // Abertura do link
    window.open(waUrl, '_blank');
  };

  const handleAdminRelease = (days: number) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    
    setTenant({
      ...tenant,
      subscription: {
        ...tenant.subscription,
        status: 'active',
        manualAccessUntil: futureDate
      }
    });
    notify(`Acesso manual libertado por ${days} dias.`, "success");
  };

  const handleSaveSecurityKey = () => {
    if (tempKey.length < 8) {
      notify("A chave de segurança deve ter pelo menos 8 caracteres.", "error");
      return;
    }
    setTenant({ ...tenant, securityKey: tempKey });
    notify("Chave de segurança atualizada com sucesso!", "success");
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const styles = {
      trial: 'bg-amber-100 text-amber-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      suspended: 'bg-zinc-100 text-zinc-700'
    };
    return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Assinatura & Acesso</h2>
          <p className="text-sm text-gray-500 font-medium">Controle o ciclo de vida da sua conta FaustoSystem.</p>
        </div>
        {tenant.isAdmin && (
          <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
            <button 
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
            >
              Meus Planos
            </button>
            <button 
              onClick={() => {
                setActiveTab('admin');
              }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
            >
              Administração
            </button>
          </div>
        )}
      </div>

      {activeTab === 'plans' ? (
        <div className="space-y-10">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black text-gray-900 uppercase">Estado do Sistema</h3>
                  {getStatusBadge(tenant.subscription.status)}
                </div>
                <p className="text-xs font-bold text-gray-400">
                  {tenant.subscription.status === 'trial' 
                    ? `Expira em: ${new Date(tenant.subscription.trialEndsAt).toLocaleDateString(language)}`
                    : tenant.subscription.subscriptionEndsAt 
                      ? `Válido até: ${new Date(tenant.subscription.subscriptionEndsAt).toLocaleDateString(language)}`
                      : 'Nenhuma assinatura ativa.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div key={plan.id} className={`bg-white rounded-[3rem] p-10 border shadow-sm transition-all hover:shadow-xl relative overflow-hidden flex flex-col ${plan.popular ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100'}`}>
                {plan.popular && (
                  <div className="absolute top-8 -right-12 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-12 py-1 rotate-45">
                    Recomendado
                  </div>
                )}
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-gray-900 tabular-nums">{plan.price.toLocaleString()}</span>
                  <span className="text-xs font-black text-gray-400">{tenant.currency}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8 flex-1">{plan.desc}</p>
                <ul className="space-y-3 mb-10">
                  {['Acesso Total', 'Gestão CRM', 'Relatórios Pro', 'Suporte 24/7'].map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleSubscribe(plan.duration, plan.id)}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                  >
                    {loading ? 'Processando...' : `Ativar Agora (${plan.duration} Dias)`}
                  </button>
                  
                  <button 
                    onClick={() => handleWhatsAppContact(plan)}
                    className="w-full py-4 bg-green-50 text-green-600 border border-green-200 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-1 group"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>Contactar via WhatsApp</span>
                    </div>
                    <span className="text-[7px] text-green-700 font-mono opacity-60">+244 927 735 274</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {!isAdminUnlocked ? (
            <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-[3rem] p-12 shadow-2xl text-center space-y-8">
              <div className="w-20 h-20 bg-gray-900 text-white rounded-[2rem] mx-auto flex items-center justify-center shadow-xl">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase">Acesso Restrito</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Insira a chave mestra para gerir utilizadores e segurança.</p>
              </div>
              <form onSubmit={handleAdminUnlock} className="space-y-4">
                <input 
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Senha Administrativa"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Desbloquear Painel
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Chave de Segurança Section */}
              <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Segurança do Sistema</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Defina a sua chave mestra para autorizações manuais.</p>
                  </div>
                </div>
                <div className="p-10 space-y-6">
                  <div className="max-w-md space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Chave de Segurança Admin</label>
                    <div className="relative">
                      <input 
                        type={showKey ? "text" : "password"} 
                        value={tempKey}
                        onChange={(e) => setTempKey(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-14"
                        placeholder="••••••••••••"
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {showKey ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                    <button 
                      onClick={handleSaveSecurityKey}
                      disabled={tempKey === tenant.securityKey}
                      className="px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-30"
                    >
                      Atualizar Chave
                    </button>
                  </div>
                </div>
              </div>

              {/* Controlo de Assinantes Section */}
              <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-900 uppercase">Controlo de Assinantes</h3>
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" placeholder="Pesquisar utilizador..." className="pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-xs font-bold outline-none border border-gray-100 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="p-10">
                  <div className="space-y-4">
                    <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600">A</div>
                        <div>
                          <p className="text-sm font-black text-gray-900">Admin User (Sessão Atual)</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">admin@faustohub.com</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAdminRelease(7)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-indigo-500 transition-all">+ 7 Dias</button>
                        <button onClick={() => handleAdminRelease(30)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-indigo-500 transition-all">+ 30 Dias</button>
                        <button onClick={() => setTenant({...tenant, subscription: {...tenant.subscription, status: 'suspended'}})} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100">Suspender</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionModule;
