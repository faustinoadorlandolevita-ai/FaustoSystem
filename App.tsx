
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AppView, TenantConfig, Language, Client, Staff, Service, Invoice, Appointment, SubscriptionInfo, NotificationLog, AttendanceRecord, StaffPayment } from './types';
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

const DEFAULT_TEMPLATES = {
  pending: {
    whatsapp: "Olá {nome_cliente}, seu agendamento para {servico} em {data} às {hora} está aguardando confirmação. Status: {status_agendamento}",
    emailSubject: "Agendamento Pendente - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, recebemos seu pedido para {servico} com {funcionario}. Status: {status_agendamento}",
    sms: "{nome_empresa}: Agendamento de {servico} para {data} {hora} está pendente."
  },
  confirmed: {
    whatsapp: "Olá {nome_cliente}, confirmamos seu agendamento de {servico} para {data} às {hora}. Esperamos por si no local: {local}.",
    emailSubject: "Agendamento Confirmado - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, seu agendamento de {servico} foi confirmado para {data} às {hora} com {funcionario}.",
    sms: "{nome_empresa}: Confirmado agendamento {servico} em {data} às {hora}."
  },
  cancelled: {
    whatsapp: "Olá {nome_cliente}, informamos que seu agendamento de {servico} para {data} foi cancelado.",
    emailSubject: "Agendamento Cancelado - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, seu agendamento de {servico} em {data} foi cancelado.",
    sms: "{nome_empresa}: Seu agendamento de {servico} foi cancelado."
  },
  completed: {
    whatsapp: "Olá {nome_cliente}, seu atendimento de {servico} foi concluído. Obrigado pela preferência!",
    emailSubject: "Atendimento Concluído - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, seu serviço {servico} em {data} foi concluído com sucesso. Avalie o nosso atendimento!",
    sms: "{nome_empresa}: Atendimento {servico} concluído com sucesso."
  },
  rescheduled: {
    whatsapp: "Olá {nome_cliente}, seu agendamento de {servico} foi reagendado para {data} às {hora}.",
    emailSubject: "Agendamento Reagendado - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, informamos o novo horário para {servico}: {data} às {hora}.",
    sms: "{nome_empresa}: Seu agendamento foi reagendado para {data} às {hora}."
  },
  reminder: {
    whatsapp: "⏰ Lembrete FaustoSystem: Olá {nome_cliente}, não se esqueça da sua marcação de {servico} amanhã ({data}) às {hora}. Local: {local}. Até breve!",
    emailSubject: "Lembrete de Agendamento: {servico} - {nome_empresa}",
    emailBody: "Olá {nome_cliente}, este é um lembrete automático da sua marcação de {servico} para {data} às {hora}. Localização: {local}.",
    sms: "LEMBRETE {nome_empresa}: {servico} amanhã {data} às {hora}. Confirmamos sua presença?"
  },
  staffWhatsApp: "Olá {nome_staff}, você tem um novo agendamento de {servico} em {data} às {hora}."
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
  securityKey: "Fausto142902#",
  clientCustomFields: [
    { id: 'cf-1', label: 'Origem do Cliente', type: 'select', options: ['Instagram', 'Facebook', 'Indicação', 'Passageiro'], required: false },
    { id: 'cf-2', label: 'Data de Nascimento', type: 'date', required: false }
  ],
  appointmentCustomFields: [
    { id: 'af-1', label: 'Necessidade Especial', type: 'text', required: false },
    { id: 'af-2', label: 'Urgência', type: 'select', options: ['Baixa', 'Média', 'Alta'], required: false }
  ],
  subscription: DEFAULT_SUBSCRIPTION,
  schedulingRules: { 
    maxDailyAppointments: 50, 
    minAdvanceBookingHours: 1, 
    minCancellationHours: 12, 
    allowClientReschedule: true,
    reminderLeadTimeHours: 24 // Default 24h
  },
  contactTemplates: DEFAULT_TEMPLATES
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
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  staffPayments: StaffPayment[];
  setStaffPayments: React.Dispatch<React.SetStateAction<StaffPayment[]>>;
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
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [language, setLanguage] = useState<Language>('pt');
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const hasAccess = () => {
    const sub = tenant.subscription;
    const now = new Date();
    if (sub.manualAccessUntil && new Date(sub.manualAccessUntil) > now) return true;
    if (sub.status === 'active' && sub.subscriptionEndsAt && new Date(sub.subscriptionEndsAt) > now) return true;
    if (sub.status === 'trial' && new Date(sub.trialEndsAt) > now) return true;
    return false;
  };

  const processAutomaticReminders = useCallback(() => {
    const now = new Date();
    const leadTimeMs = tenant.schedulingRules.reminderLeadTimeHours * 60 * 60 * 1000;
    let updatedAny = false;

    const newAppointments = appointments.map(app => {
      if (app.status === 'confirmed' && !app.reminderSent) {
        const appTime = new Date(app.dateTime).getTime();
        const timeDiff = appTime - now.getTime();
        if (timeDiff > 0 && timeDiff <= leadTimeMs) {
          updatedAny = true;
          const client = clients.find(c => c.id === app.clientId);
          console.log(`[ALARM] Disparando lembrete automático para ${client?.name} (${app.id})`);
          const logEntry: NotificationLog = {
            channel: 'whatsapp',
            sentAt: new Date().toISOString(),
            status: 'sent',
            type: 'reminder'
          };
          notify(`Alarme: Lembrete automático enviado para ${client?.name}`, 'success');
          return {
            ...app,
            reminderSent: true,
            notifications: [...(app.notifications || []), logEntry],
            history: [...app.history, { status: app.status, updatedAt: new Date().toISOString(), note: 'Lembrete Automático Enviado (Alarme)' }]
          };
        }
      }
      return app;
    });
    if (updatedAny) setAppointments(newAppointments);
  }, [appointments, clients, services, staff, tenant.schedulingRules.reminderLeadTimeHours, notify]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && appointments.length > 0) processAutomaticReminders();
    }, 60000); 
    return () => clearInterval(interval);
  }, [processAutomaticReminders, user, appointments.length]);

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
          setTenant({ 
            ...data.tenant, 
            subscription: sub, 
            securityKey: data.tenant?.securityKey || DEFAULT_TENANT.securityKey,
            clientCustomFields: data.tenant?.clientCustomFields || DEFAULT_TENANT.clientCustomFields,
            appointmentCustomFields: data.tenant?.appointmentCustomFields || DEFAULT_TENANT.appointmentCustomFields,
            contactTemplates: data.tenant?.contactTemplates || DEFAULT_TEMPLATES,
            schedulingRules: {
              ...DEFAULT_TENANT.schedulingRules,
              ...data.tenant?.schedulingRules
            }
          });
          setClients(data.clients || []);
          setStaff(data.staff || []);
          setAttendance(data.attendance || []);
          setStaffPayments(data.staffPayments || []);
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
        saveUserData(user.id, { tenant, clients, staff, services, invoices, appointments, attendance, staffPayments });
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [tenant, clients, staff, services, invoices, appointments, attendance, staffPayments, user]);

  useEffect(() => {
    // Inject CSS variables for the theme
    document.documentElement.style.setProperty('--primary-color', tenant.primaryColor);
    
    // Hex to RGB conversion for Tailwind variants
    const hex = tenant.primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
    }
  }, [tenant.primaryColor]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setClients([]);
    setStaff([]);
    setAttendance([]);
    setStaffPayments([]);
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

  if (!user) return <Auth onSuccess={() => {}} />;

  if (currentView !== AppView.SUBSCRIPTION && !hasAccess()) {
    return (
      <AppContext.Provider value={{ 
        tenant, setTenant, currentView, setCurrentView, language, setLanguage,
        clients, setClients, staff, setStaff, attendance, setAttendance, staffPayments, setStaffPayments,
        services, setServices, invoices, setInvoices, appointments, setAppointments,
        notify, user, handleLogout
      }}>
        <SubscriptionGate />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ 
      tenant, setTenant, currentView, setCurrentView, language, setLanguage,
      clients, setClients, staff, setStaff, attendance, setAttendance, staffPayments, setStaffPayments,
      services, setServices, invoices, setInvoices, appointments, setAppointments,
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
