
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';
import { Appointment, AppointmentStatus, BookingType } from '../types';

const INITIAL_APPOINTMENT_DATA: Partial<Appointment> = {
  title: '',
  clientId: '',
  serviceId: '',
  staffId: '',
  dateTime: '',
  endTime: '',
  location: '',
  status: 'pending' as AppointmentStatus,
  type: 'fixed_time' as BookingType,
  notes: '',
  customData: {},
  notifications: [],
  history: [],
  reminderSent: false
};

const Schedule: React.FC = () => {
  const { language, tenant, clients, services, staff, appointments, setAppointments, notify } = useApp();
  const { t } = useTranslation(language);
  
  // Views & UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
  
  // Form State
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment>>(INITIAL_APPOINTMENT_DATA);
  const [notifyAppointment, setNotifyAppointment] = useState<Appointment | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [useEmail, setUseEmail] = useState(false);
  const [useSMS, setUseSMS] = useState(false);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

  const currentMonthLabel = language === 'pt' ? 'Fevereiro 2025' : 'February 2025';
  const weekDays = language === 'pt' 
    ? ['Seg 17', 'Ter 18', 'Qua 19', 'Qui 20', 'Sex 21', 'Sab 22', 'Dom 23'] 
    : ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'];

  // --- Logic Helpers ---

  const checkConflict = (app: Partial<Appointment>) => {
    if (!app.dateTime || !app.endTime || !app.staffId) return false;
    const start = new Date(app.dateTime).getTime();
    const end = new Date(app.endTime).getTime();
    
    return appointments.some(existing => {
      if (existing.id === app.id) return false;
      if (existing.staffId !== app.staffId) return false;
      if (existing.status === 'cancelled') return false;
      
      const exStart = new Date(existing.dateTime).getTime();
      const exEnd = new Date(existing.endTime).getTime();
      
      return (start < exEnd) && (exStart < end);
    });
  };

  const replaceVariables = (template: string, app: Partial<Appointment>) => {
    const client = clients.find(c => c.id === app.clientId);
    const service = services.find(s => s.id === app.serviceId);
    const professional = staff.find(s => s.id === app.staffId);
    const dateObj = app.dateTime ? new Date(app.dateTime) : new Date();
    
    return template
      .replace(/{nome_cliente}/g, client?.name || 'Cliente')
      .replace(/{servico}/g, service?.name || 'Serviço')
      .replace(/{data}/g, dateObj.toLocaleDateString(language))
      .replace(/{hora}/g, dateObj.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }))
      .replace(/{status_agendamento}/g, t(`status.${app.status || 'pending'}`))
      .replace(/{local}/g, app.location || client?.location.address || 'Nosso Local')
      .replace(/{funcionario}/g, professional?.name || 'Colaborador')
      .replace(/{nome_empresa}/g, tenant.name);
  };

  // --- Action Handlers ---

  const handleOpenNew = () => {
    setEditingAppointment({
      ...INITIAL_APPOINTMENT_DATA,
      dateTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    });
    setIsModalOpen(true);
  };

  const handleEdit = (app: Appointment) => {
    setEditingAppointment({ ...app });
    setIsModalOpen(true);
  };

  const handleDuplicate = (app: Appointment) => {
    const duplicated = { 
      ...app, 
      id: undefined, 
      title: `${app.title || services.find(s => s.id === app.serviceId)?.name} (Cópia)`,
      history: [],
      notifications: [],
      reminderSent: false
    };
    setEditingAppointment(duplicated);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingAppointment.clientId || !editingAppointment.serviceId || !editingAppointment.dateTime) {
      notify("Preencha os campos obrigatórios (Cliente, Serviço, Data/Hora)", "error");
      return;
    }

    if (checkConflict(editingAppointment)) {
      notify("Conflito de horário detectado para este funcionário!", "error");
      return;
    }

    const appToSave: Appointment = {
      ...INITIAL_APPOINTMENT_DATA,
      ...editingAppointment,
      id: editingAppointment.id || `app-${Date.now()}`,
      history: editingAppointment.id 
        ? [...(editingAppointment.history || []), { status: editingAppointment.status || 'pending', updatedAt: new Date().toISOString(), note: 'Editado' }]
        : [{ status: 'pending', updatedAt: new Date().toISOString(), note: 'Criado' }]
    } as Appointment;

    if (editingAppointment.id) {
      setAppointments(prev => prev.map(a => a.id === appToSave.id ? appToSave : a));
    } else {
      setAppointments(prev => [...prev, appToSave]);
    }

    // Trigger Notification Modal for important status changes
    if (appToSave.status !== 'pending') {
      triggerNotification(appToSave);
    }

    setIsModalOpen(false);
    notify("Agendamento salvo com sucesso!");
  };

  const triggerNotification = (app: Appointment) => {
    const statusKey = app.status === 'rescheduled' ? 'rescheduled' : 
                     app.status === 'confirmed' ? 'confirmed' :
                     app.status === 'cancelled' ? 'cancelled' :
                     app.status === 'completed' ? 'completed' : 'pending';
    
    const templateSet = tenant.contactTemplates[statusKey];
    setCustomMessage(replaceVariables(templateSet.whatsapp, app));
    setNotifyAppointment(app);
    setIsNotifyModalOpen(true);
  };

  const finalizeNotificationFlow = () => {
    if (!notifyAppointment) return;
    
    const logs = [];
    const client = clients.find(c => c.id === notifyAppointment.clientId);

    if (useWhatsApp && client) {
      window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(customMessage)}`, '_blank');
      logs.push({ channel: 'whatsapp' as const, sentAt: new Date().toISOString(), status: 'sent' as const, type: 'immediate' as const });
    }
    
    if (useEmail) logs.push({ channel: 'email' as const, sentAt: new Date().toISOString(), status: 'queued' as const, type: 'immediate' as const });
    if (useSMS) logs.push({ channel: 'sms' as const, sentAt: new Date().toISOString(), status: 'queued' as const, type: 'immediate' as const });

    setAppointments(prev => prev.map(a => a.id === notifyAppointment.id ? { 
      ...a, 
      notifications: [...(a.notifications || []), ...logs]
    } : a));

    setIsNotifyModalOpen(false);
    setNotifyAppointment(null);
    notify("Notificação processada.");
  };

  const renderTimelineAppointments = (dayIdx: number) => {
    return appointments.filter(app => {
      return (dayIdx === 2 || dayIdx === 4);
    }).map((app, idx) => (
      <div 
        key={app.id} 
        onClick={() => handleEdit(app)}
        className={`absolute left-2 right-2 p-3 rounded-2xl border shadow-xl cursor-pointer hover:scale-[1.02] transition-all z-10 group overflow-hidden ${
          app.status === 'completed' ? 'bg-green-50 border-green-200' : 
          app.status === 'confirmed' ? 'bg-indigo-50 border-indigo-200' : 
          app.status === 'cancelled' ? 'bg-red-50 border-red-200 opacity-70' :
          'bg-white border-gray-100'
        }`}
        style={{ 
          top: `${(new Date(app.dateTime).getHours() - 8) * 96 + 20}px`,
          height: '140px' 
        }}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          app.status === 'completed' ? 'bg-green-600' : 
          app.status === 'cancelled' ? 'bg-red-600' :
          'bg-indigo-600'
        }`} />
        <div className="flex justify-between items-start mb-2">
           <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                app.status === 'completed' ? 'text-green-600' : 
                app.status === 'cancelled' ? 'text-red-600' :
                'text-indigo-600'
              }`}>
                {t(`status.${app.status}`)}
              </span>
              {app.reminderSent && (
                 <span className="text-[8px] font-black text-green-500 flex items-center gap-0.5" title="Alarme de lembrete já disparado">
                   <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                   ALARME
                 </span>
              )}
           </div>
           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => { e.stopPropagation(); handleDuplicate(app); }} className="p-1 bg-white rounded-md border border-gray-100 shadow-sm hover:bg-gray-50" title="Duplicar"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button>
           </div>
        </div>
        <h4 className="text-xs font-black text-gray-900 line-clamp-2 leading-tight">
          {app.title || services.find(s => s.id === app.serviceId)?.name || 'Sem Título'}
        </h4>
        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 truncate">
          {clients.find(c => c.id === app.clientId)?.name || 'Cliente'}
        </p>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[9px] font-black text-indigo-700 shadow-sm">
             {staff.find(s => s.id === app.staffId)?.name.charAt(0) || '?'}
           </div>
           <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
             {new Date(app.dateTime).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full space-y-4 pb-24">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
             <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
             <h2 className="text-lg font-black text-gray-900 tracking-tight px-2">{currentMonthLabel}</h2>
             <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <button onClick={() => setAppointments([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Limpar Tudo</button>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl gap-1 shadow-sm border border-gray-100">
          {(['day', 'week', 'month'] as const).map((view) => (
            <button 
              key={view}
              onClick={() => setCurrentView(view)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === view ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t(`schedule.view.${view}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-8 border-b border-gray-50 bg-gray-50/30">
          <div className="p-4 border-r border-gray-50 w-24"></div>
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center border-r border-gray-50 last:border-r-0">
              <span className="text-[10px] font-black text-gray-400 block uppercase tracking-tighter mb-1">{day.split(' ')[0]}</span>
              <span className="text-xl font-black text-gray-900">{day.split(' ')[1]}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-8 relative min-w-[1000px] h-full">
            {/* Hour labels */}
            <div className="col-start-1 col-end-1 w-24 border-r border-gray-50 bg-gray-50/5 shrink-0">
              {hours.map((hour) => (
                <div key={hour} className="h-24 text-right pr-4 pt-2 text-[10px] text-gray-400 font-black border-b border-gray-50 last:border-b-0">
                  {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
            
            {/* Columns for each day */}
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="relative border-r border-gray-50 last:border-r-0 flex-1">
                {hours.map((hour) => (
                  <div key={hour} className="h-24 border-b border-gray-50 group hover:bg-indigo-50/10 transition-colors" />
                ))}
                {renderTimelineAppointments(dayIndex)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[85vh]">
            <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {editingAppointment.id ? 'Gerir Agendamento' : 'Nova Marcação Mestra'}
                </h3>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Controlo Total FaustoSystem v3.0</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Renomeação Manual (Opcional)</label>
                <input 
                  type="text" 
                  value={editingAppointment.title} 
                  onChange={(e) => setEditingAppointment({...editingAppointment, title: e.target.value})}
                  placeholder="Ex: Manutenção Preventiva Geral"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-base font-black text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Serviço do Catálogo *</label>
                  <select 
                    value={editingAppointment.serviceId}
                    onChange={(e) => setEditingAppointment({...editingAppointment, serviceId: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Selecione o Serviço...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Cliente Associado *</label>
                  <select 
                    value={editingAppointment.clientId}
                    onChange={(e) => setEditingAppointment({...editingAppointment, clientId: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Selecione o Cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-50">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Início da Atividade *</label>
                  <input 
                    type="datetime-local" 
                    value={editingAppointment.dateTime}
                    onChange={(e) => setEditingAppointment({...editingAppointment, dateTime: e.target.value})}
                    className="w-full px-6 py-4 bg-white border border-indigo-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Término Previsto *</label>
                  <input 
                    type="datetime-local" 
                    value={editingAppointment.endTime}
                    onChange={(e) => setEditingAppointment({...editingAppointment, endTime: e.target.value})}
                    className="w-full px-6 py-4 bg-white border border-indigo-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Funcionário/Equipa Responsável *</label>
                  <select 
                    value={editingAppointment.staffId}
                    onChange={(e) => setEditingAppointment({...editingAppointment, staffId: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Delegar para...</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Status do Ciclo</label>
                  <select 
                    value={editingAppointment.status}
                    onChange={(e) => setEditingAppointment({...editingAppointment, status: e.target.value as any})}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-indigo-600 outline-none"
                  >
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="rescheduled">Reagendada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="completed">Concluída</option>
                  </select>
                </div>
              </div>

              {/* Reminder Alarm Status Section */}
              {editingAppointment.status === 'confirmed' && (
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${editingAppointment.reminderSent ? 'bg-green-600' : 'bg-indigo-600'}`}>
                        {editingAppointment.reminderSent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-900 uppercase">Alarme de Lembrete Automático</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">
                          {editingAppointment.reminderSent ? 'Disparado com sucesso' : `Agendado para ${tenant.schedulingRules.reminderLeadTimeHours}h antes`}
                        </p>
                     </div>
                   </div>
                   {editingAppointment.reminderSent && (
                     <span className="text-[8px] font-black bg-white px-2 py-1 rounded-md border border-green-200 text-green-600">NOTIFICADO</span>
                   )}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Local do Atendimento (Customizado)</label>
                  <input 
                    type="text" 
                    value={editingAppointment.location} 
                    onChange={(e) => setEditingAppointment({...editingAppointment, location: e.target.value})}
                    placeholder="Deixe em branco para usar o endereço do cliente"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Observações e Notas do Agendamento</label>
                  <textarea 
                    value={editingAppointment.notes}
                    onChange={(e) => setEditingAppointment({...editingAppointment, notes: e.target.value})}
                    className="w-full h-32 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none resize-none shadow-inner"
                  />
                </div>
              </div>

              {tenant.appointmentCustomFields.length > 0 && (
                <div className="space-y-6 pt-10 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Campos Configuráveis do Negócio</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    {tenant.appointmentCustomFields.map(field => (
                      <div key={field.id}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{field.label}</label>
                        {field.type === 'select' ? (
                          <select 
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                            value={editingAppointment.customData?.[field.id] || ''}
                            onChange={(e) => setEditingAppointment({
                              ...editingAppointment,
                              customData: { ...editingAppointment.customData, [field.id]: e.target.value }
                            })}
                          >
                            <option value="">Selecione...</option>
                            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input 
                            type={field.type}
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                            value={editingAppointment.customData?.[field.id] || ''}
                            onChange={(e) => setEditingAppointment({
                              ...editingAppointment,
                              customData: { ...editingAppointment.customData, [field.id]: e.target.value }
                            })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Descartar</button>
               <button onClick={handleSave} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Confirmar Marcação</button>
            </div>
          </div>
        </div>
      )}

      {isNotifyModalOpen && notifyAppointment && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[75vh]">
              <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Processar Notificação</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Envio de comprovativo para o cliente</p>
                </div>
                <button onClick={() => setIsNotifyModalOpen(false)} className="p-2 text-gray-400 hover:bg-white rounded-full shadow-sm transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                 <div className="flex gap-4">
                   <button onClick={() => setUseWhatsApp(!useWhatsApp)} className={`flex-1 p-5 rounded-3xl border transition-all flex flex-col items-center gap-2 ${useWhatsApp ? 'bg-green-50 border-green-200 text-green-600 shadow-xl shadow-green-100' : 'bg-white border-gray-100 text-gray-400 opacity-60'}`}>
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                   </button>
                   <button onClick={() => setUseEmail(!useEmail)} className={`flex-1 p-5 rounded-3xl border transition-all flex flex-col items-center gap-2 ${useEmail ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 opacity-60'}`}>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span className="text-[9px] font-black uppercase tracking-widest">E-mail</span>
                   </button>
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pré-visualização da Mensagem</label>
                    <textarea 
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full h-48 p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-xs font-medium leading-relaxed outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-inner"
                    />
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-[10px] font-bold text-amber-700 leading-tight">As variáveis já foram substituídas pelos dados reais desta marcação.</p>
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
                 <button onClick={() => setIsNotifyModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500">Pular Notificação</button>
                 <button onClick={finalizeNotificationFlow} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 transition-all">Enviar Agora</button>
              </div>
           </div>
        </div>
      )}

      <button 
        onClick={handleOpenNew}
        className="fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 text-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[90] group"
      >
        <svg className="w-10 h-10 group-hover:rotate-90 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Schedule;
