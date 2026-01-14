
import React, { useState, useEffect, createContext, useContext } from 'react';
import { AppView, TenantConfig, Language, Client, Staff, Service, Invoice, Appointment, SubscriptionInfo } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import Schedule from './modules/Schedule';
import Clients from './modules/Clients';
import ServicesModule from './modules/Services';
import StaffModule from './modules/Staff';
import BillingModule from './modules/Billing';
import Settings from './modules/Settings';
import Reports from './modules/Reports';
import SubscriptionModule from './modules/Subscription';
import Auth from './components/Auth';
import SubscriptionGate from './components/SubscriptionGate';
import { supabase, saveUserData, loadUserData } from './services/supabase';

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  status: 'trial',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  autoRenew: false
};

const DEFAULT_TENANT: TenantConfig = {
  name: "Fausto Hub Pro",
  logo: "https://picsum.photos/seed/fausto/100/100",
  primaryColor: "#4f46e5",
  currency: "AOA",
  timezone: "Africa/Luanda",
  locale: "pt-AO",
  language: "pt",
  isAdmin: true, 
  securityKey: "Fausto142902#", // Chave de segurança padrão inalterável via código
  subscription: DEFAULT_SUBSCRIPTION,
  schedulingRules: { maxDailyAppointments: 50, minAdvanceBookingHours: 1, minCancellationHours: 12, allowClientReschedule: true },
  contactTemplates: {
    whatsapp: "Olá {nome_cliente}, falamos da {nome_empresa}...",
    emailSubject: "Agendamento - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, confirmamos seu agendamento.",
    staffWhatsApp: "Olá {nome_staff}..."
  }
};

interface AppContextType {
  tenant: TenantConfig;
  setTenant: (t: TenantConfig) => void;
  currentView: AppView;
  setCurrentView: (v: AppView) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
  user: any;
  handleLogout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App State
  const [tenant, setTenant] = useState<TenantConfig>(DEFAULT_TENANT);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [language, setLanguage] = useState<Language>('pt');
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);

  // Access Control Logic
  const hasAccess = () => {
    const sub = tenant.subscription;
    const now = new Date();
    
    // Check Manual Access first
    if (sub.manualAccessUntil && new Date(sub.manualAccessUntil) > now) return true;
    
    // Check Subscription ends
    if (sub.status === 'active' && sub.subscriptionEndsAt && new Date(sub.subscriptionEndsAt) > now) return true;
    
    // Check Trial
    if (sub.status === 'trial' && new Date(sub.trialEndsAt) > now) return true;
    
    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData(user.id).then(data => {
        if (data) {
          const sub = data.tenant?.subscription || DEFAULT_SUBSCRIPTION;
          // Merge safety for securityKey - Ensure it stays default if not set
          setTenant({ 
            ...data.tenant, 
            subscription: sub, 
            securityKey: data.tenant?.securityKey || DEFAULT_TENANT.securityKey 
          });
          setClients(data.clients || []);
          setStaff(data.staff || []);
          setServices(data.services || []);
          setInvoices(data.invoices || []);
          setAppointments(data.appointments || []);
          setLanguage(data.tenant?.language || 'pt');
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        saveUserData(user.id, { tenant, clients, staff, services, invoices, appointments });
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [tenant, clients, staff, services, invoices, appointments, user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', tenant.primaryColor);
  }, [tenant.primaryColor]);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClients([]);
    setStaff([]);
    setInvoices([]);
    setTenant(DEFAULT_TENANT);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard />;
      case AppView.SCHEDULE: return <Schedule />;
      case AppView.CLIENTS: return <Clients />;
      case AppView.SERVICES: return <ServicesModule />;
      case AppView.STAFF: return <StaffModule />;
      case AppView.BILLING: return <BillingModule />;
      case AppView.REPORTS: return <Reports />;
      case AppView.SETTINGS: return <Settings />;
      case AppView.SUBSCRIPTION: return <SubscriptionModule />;
      default: return <Dashboard />;
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest animate-pulse">Iniciando FaustoSystem...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => {}} />;
  }

  if (currentView !== AppView.SUBSCRIPTION && !hasAccess()) {
    return (
      <AppContext.Provider value={{ 
        tenant, setTenant, currentView, setCurrentView, language, setLanguage,
        clients, setClients, staff, setStaff, services, setServices, invoices, setInvoices, appointments, setAppointments,
        notify, user, handleLogout
      }}>
        <SubscriptionGate />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ 
      tenant, setTenant, currentView, setCurrentView, language, setLanguage,
      clients, setClients, staff, setStaff, services, setServices, invoices, setInvoices, appointments, setAppointments,
      notify, user, handleLogout
    }}>
      <div className="flex min-h-screen bg-gray-50 text-gray-900 overflow-hidden font-inter">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar animate-in fade-in duration-700">
            {renderView()}
          </main>

          {notification && (
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-[2rem] shadow-2xl z-[100] animate-in slide-in-from-bottom-5 font-black text-xs uppercase tracking-widest flex items-center gap-4 ${notification.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              {notification.msg}
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;
