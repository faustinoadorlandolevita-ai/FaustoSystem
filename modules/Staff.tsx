
import React, { useState, useMemo, useEffect } from 'react';
// Import SYSTEM_NAME to fix the reference error in the receipt preview footer.
import { Staff, StaffStatus, AttendanceRecord, AttendanceStatus, CommissionType, StaffPayment, SYSTEM_NAME } from '../types';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';
import { getGeminiInsights } from '../services/gemini';

const INITIAL_STAFF_STATE: Partial<Staff> = {
  name: '',
  phone: '',
  whatsapp: '',
  photo: '',
  email: '',
  role: '',
  position: '',
  department: '',
  team: '',
  salary: 0,
  commissionValue: 0,
  commissionType: 'percentage',
  status: 'active',
  tags: [],
  experienceDescription: '',
  experienceTime: '',
  workingHours: {
    start: '08:00',
    end: '17:00',
    daysOff: [0, 6]
  },
  location: {
    city: '',
    address: ''
  },
  hiredAt: new Date().toISOString().split('T')[0]
};

const StaffModule: React.FC = () => {
  const { tenant, language, staff, setStaff, attendance, setAttendance, staffPayments, setStaffPayments, notify } = useApp();
  const { t } = useTranslation(language);

  // UI States
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(staff[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'performance' | 'financial'>('details');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPreviewReceiptOpen, setIsPreviewReceiptOpen] = useState(false);
  
  const [editingStaff, setEditingStaff] = useState<Partial<Staff>>(INITIAL_STAFF_STATE);
  const [newAttendance, setNewAttendance] = useState<Partial<AttendanceRecord>>({ 
    status: 'present', 
    absenceDiscount: 0,
    date: new Date().toISOString().split('T')[0],
    justificationStatus: 'pending'
  });
  const [newPayment, setNewPayment] = useState<Partial<StaffPayment>>({ 
    type: 'salary', 
    status: 'pending', 
    deductions: 0,
    extras: 0,
    period: new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })
  });
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<StaffPayment | null>(null);

  // AI State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDept === 'all' || s.department === filterDept;
      return matchesSearch && matchesDept;
    });
  }, [staff, searchQuery, filterDept]);

  const selectedStaff = useMemo(() => 
    staff.find(s => s.id === selectedStaffId) || null
  , [staff, selectedStaffId]);

  const currentAttendance = useMemo(() => 
    attendance.filter(a => a.staffId === selectedStaffId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [attendance, selectedStaffId]);

  const currentPayments = useMemo(() => 
    staffPayments.filter(p => p.staffId === selectedStaffId).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  , [staffPayments, selectedStaffId]);

  const latePaymentsCount = useMemo(() => 
    currentPayments.filter(p => p.status === 'late').length
  , [currentPayments]);

  const pendingAbsenceDiscounts = useMemo(() => {
    if (!selectedStaffId) return 0;
    return attendance
      .filter(a => a.staffId === selectedStaffId && a.status === 'absent' && !a.discountProcessed)
      .reduce((sum, a) => sum + (a.absenceDiscount || 0), 0);
  }, [attendance, selectedStaffId]);

  // --- Auto Calculations for Attendance ---
  useEffect(() => {
    if (newAttendance.status === 'present' && newAttendance.checkIn && newAttendance.checkOut) {
      const [h1, m1] = newAttendance.checkIn.split(':').map(Number);
      const [h2, m2] = newAttendance.checkOut.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      setNewAttendance(prev => ({ ...prev, totalHours: Math.max(0, diff / 60) }));
    }
    if ((newAttendance.status === 'vacation' || newAttendance.status === 'sick_leave') && newAttendance.startDate && newAttendance.endDate) {
      const d1 = new Date(newAttendance.startDate);
      const d2 = new Date(newAttendance.endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setNewAttendance(prev => ({ ...prev, totalDays: diffDays }));
    }
  }, [newAttendance.checkIn, newAttendance.checkOut, newAttendance.status, newAttendance.startDate, newAttendance.endDate]);

  const handleWhatsApp = (s: Staff) => {
    const targetPhone = s.whatsapp || s.phone;
    const message = tenant.contactTemplates.staffWhatsApp
      .replace('{nome_staff}', s.name)
      .replace('{nome_empresa}', tenant.name);
    window.open(`https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendReceiptWhatsApp = (payment: StaffPayment, staffMember: Staff) => {
    const targetPhone = staffMember.whatsapp || staffMember.phone;
    const liquid = (payment.baseSalary || 0) + (payment.extras || 0) - (payment.deductions || 0);
    const message = `Olá *${staffMember.name}*, segue o resumo do seu recibo de pagamento:
    
📄 *Recibo de Salário*
📅 *Período:* ${payment.period || payment.description}
💰 *Salário Base:* ${(payment.baseSalary || 0).toLocaleString()} ${tenant.currency}
✨ *Extras/Bónus:* ${(payment.extras || 0).toLocaleString()} ${tenant.currency}
📉 *Descontos:* ${(payment.deductions || 0).toLocaleString()} ${tenant.currency}
💵 *Valor Líquido:* ${liquid.toLocaleString()} ${tenant.currency}

Obrigado pela sua dedicação!
*${tenant.name}*`;
    window.open(`https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    notify("Resumo do recibo enviado via WhatsApp");
  };

  const handleSendReceiptEmail = (payment: StaffPayment, staffMember: Staff) => {
    const liquid = (payment.baseSalary || 0) + (payment.extras || 0) - (payment.deductions || 0);
    const subject = `Recibo de Pagamento - ${payment.period || payment.description} - ${tenant.name}`;
    const body = `Olá ${staffMember.name},\n\nConfirmamos o processamento do seu pagamento referente a ${payment.period || payment.description}.\n\n--- DETALHES ---\nSalário Base: ${(payment.baseSalary || 0).toLocaleString()} ${tenant.currency}\nExtras/Bónus: ${(payment.extras || 0).toLocaleString()} ${tenant.currency}\nDescontos: ${(payment.deductions || 0).toLocaleString()} ${tenant.currency}\nVALOR LÍQUIDO: ${liquid.toLocaleString()} ${tenant.currency}\n\nO documento oficial em PDF pode ser solicitado no RH.\n\nAtenciosamente,\nEquipa ${tenant.name}`;
    window.location.href = `mailto:${staffMember.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    notify("Cliente de e-mail aberto");
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff.name || !editingStaff.role || !editingStaff.phone) {
      notify("Nome, Cargo e Telefone são obrigatórios", "error");
      return;
    }

    const staffToSave: Staff = {
      ...INITIAL_STAFF_STATE,
      ...editingStaff,
      id: editingStaff.id || `st-${Date.now()}`
    } as Staff;

    if (editingStaff.id) {
      setStaff(prev => prev.map(s => s.id === staffToSave.id ? staffToSave : s));
      notify("Funcionário atualizado");
    } else {
      setStaff(prev => [...prev, staffToSave]);
      notify("Funcionário cadastrado com sucesso!");
      setSelectedStaffId(staffToSave.id);
    }
    setIsStaffModalOpen(false);
  };

  const handleMarkAttendance = () => {
    if (!selectedStaffId) return;

    // Validations based on type
    if (newAttendance.status === 'resignation' && !newAttendance.reason) {
      notify("Motivo da desistência é obrigatório", "error");
      return;
    }
    if (newAttendance.status === 'late' && !newAttendance.notes) {
      notify("Justificativa de atraso é obrigatória", "error");
      return;
    }

    const record: AttendanceRecord = {
      ...newAttendance,
      id: `att-${Date.now()}`,
      staffId: selectedStaffId,
      date: newAttendance.date || new Date().toISOString().split('T')[0],
      status: newAttendance.status as AttendanceStatus,
    } as AttendanceRecord;

    // If it's a resignation, inactivate staff automatically
    if (record.status === 'resignation') {
      setStaff(prev => prev.map(s => s.id === selectedStaffId ? { ...s, status: 'inactive' } : s));
      notify("Colaborador marcado como inativo devido a desistência.");
    }

    setAttendance(prev => [record, ...prev]);
    setIsAttendanceModalOpen(false);
    notify("Registro de ponto efetuado com sucesso.");
  };

  const handleDeleteAttendance = (id: string) => {
    if (!tenant.isAdmin) {
      notify("Apenas administradores podem excluir registros.", "error");
      return;
    }
    if (window.confirm("Confirmar exclusão definitiva deste registro de ponto? Esta ação será registrada no log de auditoria.")) {
      setAttendance(prev => prev.filter(a => a.id !== id));
      notify("Registro excluído com sucesso.");
      // Simulated audit log
      console.log(`[AUDIT LOG] ${new Date().toISOString()} - Registro de ponto ${id} excluído por Administrador.`);
    }
  };

  const handleCreatePayment = () => {
    if (!selectedStaffId) return;
    const baseAmount = selectedStaff?.salary || 0;
    const extras = newPayment.extras || 0;
    const deductions = pendingAbsenceDiscounts + (newPayment.deductions || 0);
    const finalAmount = Math.max(0, baseAmount + extras - deductions);

    const payment: StaffPayment = {
      ...newPayment,
      id: `pay-${Date.now()}`,
      staffId: selectedStaffId,
      status: 'pending',
      amount: finalAmount, // Líquido
      baseSalary: baseAmount,
      extras: extras,
      deductions: deductions,
      period: newPayment.period,
      description: newPayment.description || `Pagamento ${newPayment.period}`,
      dueDate: newPayment.dueDate || new Date().toISOString().split('T')[0]
    } as StaffPayment;

    setAttendance(prev => prev.map(a => 
      (a.staffId === selectedStaffId && a.status === 'absent' && !a.discountProcessed) 
      ? { ...a, discountProcessed: true } 
      : a
    ));

    setStaffPayments(prev => [payment, ...prev]);
    setIsPaymentModalOpen(false);
    notify(`Recibo de ${finalAmount.toLocaleString()} ${tenant.currency} gerado e salvo.`);
  };

  const markAsPaid = (paymentId: string) => {
    setStaffPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p));
    notify("Pagamento concluído e recibo oficializado.", "success");
  };

  const toggleStatus = (staffId: string) => {
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
  };

  const runPerformanceAnalysis = async () => {
    if (!selectedStaff) return;
    setLoadingAi(true);
    const context = {
      staffName: selectedStaff.name,
      role: selectedStaff.role,
      attendance: currentAttendance.slice(0, 5),
      payments: currentPayments.slice(0, 3),
      experience: selectedStaff.experienceDescription,
      tenure: selectedStaff.experienceTime
    };
    const result = await getGeminiInsights("Analise o desempenho deste funcionário considerando sua experiência prévia e histórico atual. Identifique pontos fortes.", context);
    setAiInsight(result.text);
    setLoadingAi(false);
  };

  const getStatusColor = (status: StaffStatus) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-600';
      case 'terminated': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getAttendanceStatusBadge = (status: AttendanceStatus) => {
    switch(status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'late': return 'bg-yellow-100 text-yellow-700';
      case 'vacation': return 'bg-indigo-100 text-indigo-700';
      case 'sick_leave': return 'bg-orange-100 text-orange-700';
      case 'resignation': return 'bg-zinc-800 text-white';
      case 'justified_absence': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusTranslation = (status: AttendanceStatus) => {
    const map: Record<string, string> = {
      present: 'Presente',
      absent: 'Falta',
      late: 'Atraso',
      vacation: 'Férias',
      sick_leave: 'Doença',
      resignation: 'Desistência',
      justified_absence: 'Falta Justificada'
    };
    return map[status] || status;
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('staff.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('staff.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingStaff(INITIAL_STAFF_STATE); setIsStaffModalOpen(true); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
          >
            + Adicionar Novo Funcionário
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Sidebar: Staff List */}
        <div className="w-1/3 flex flex-col space-y-4 min-w-[320px]">
          <div className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
             <div className="relative">
              <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder={t('common.search')}
                className="w-full pl-10 pr-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredStaff.map((person) => (
              <button
                key={person.id}
                onClick={() => setSelectedStaffId(person.id)}
                className={`w-full text-left p-5 rounded-[2.5rem] border transition-all ${selectedStaffId === person.id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center font-black text-indigo-600 text-lg">
                    {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : person.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 truncate tracking-tight">{person.name}</h4>
                    <p className="text-[10px] text-gray-500 font-black uppercase truncate tracking-widest">{person.role}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${getStatusColor(person.status)}`}>
                      {person.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Panel: Staff 360 View */}
        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-[3rem] shadow-sm overflow-hidden min-w-0">
          {selectedStaff ? (
            <>
              {/* Profile Header */}
              <div className="p-10 bg-gray-50/20 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-8">
                    <div className="w-32 h-32 rounded-[3rem] bg-white border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center text-5xl font-black text-indigo-600">
                      {selectedStaff.photo ? <img src={selectedStaff.photo} alt="" className="w-full h-full object-cover" /> : selectedStaff.name.charAt(0)}
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedStaff.name}</h3>
                        <div className="flex gap-2">
                           <button onClick={() => toggleStatus(selectedStaff.id)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${getStatusColor(selectedStaff.status)}`}>
                              {selectedStaff.status}
                           </button>
                           <button onClick={() => { setEditingStaff(selectedStaff); setIsStaffModalOpen(true); }} className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                           </button>
                        </div>
                      </div>
                      <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">{selectedStaff.position}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedStaff.department} • {selectedStaff.team}</p>
                      <div className="flex gap-2 pt-2">
                         {selectedStaff.tags.map(tag => (
                           <span key={tag} className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400 shadow-sm">{tag}</span>
                         ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleWhatsApp(selectedStaff)}
                      className="flex items-center gap-3 px-6 py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-green-100"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      {t('staff.quickWhatsApp')}
                    </button>
                    <button className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 shadow-sm transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {t('staff.quickEmail')}
                    </button>
                  </div>
                </div>

                <div className="flex gap-10 mt-12 border-b border-gray-100 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'details', label: t('staff.details') },
                    { id: 'attendance', label: t('staff.attendance') },
                    { id: 'financial', label: t('staff.financial') },
                    { id: 'performance', label: t('staff.performance') },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-5 text-[10px] font-black transition-all relative whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.label}
                        {tab.id === 'financial' && (latePaymentsCount > 0 || pendingAbsenceDiscounts > 0) && (
                          <span className={`${pendingAbsenceDiscounts > 0 ? 'bg-amber-500' : 'bg-red-500'} text-white text-[9px] px-1.5 py-0.5 rounded-full animate-bounce`}>
                            {pendingAbsenceDiscounts > 0 ? '!' : latePaymentsCount}
                          </span>
                        )}
                      </div>
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-gray-50/10">
                
                {activeTab === 'details' && (
                  <div className="grid grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-8">
                       <div>
                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Remuneração Base</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                               <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Salário Mensal</p>
                               <p className="text-xl font-black text-gray-900">{selectedStaff.salary.toLocaleString(tenant.locale)} {tenant.currency}</p>
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                               <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Comissão</p>
                               <p className="text-xl font-black text-indigo-600">
                                 {selectedStaff.commissionValue}{selectedStaff.commissionType === 'percentage' ? '%' : ` ${tenant.currency}`}
                               </p>
                            </div>
                         </div>
                       </div>
                       <div>
                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Dados de Contratação</h5>
                         <div className="p-6 bg-white border border-gray-100 rounded-[2rem] space-y-4">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-bold text-gray-400">Data de Entrada:</span>
                               <span className="text-xs font-black text-gray-900 uppercase">{new Date(selectedStaff.hiredAt).toLocaleDateString(language)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-bold text-gray-400">WhatsApp Profissional:</span>
                               <span className="text-xs font-black text-indigo-600">{selectedStaff.whatsapp || selectedStaff.phone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-bold text-gray-400">Horário Previsto:</span>
                               <span className="text-xs font-black text-gray-900">{selectedStaff.workingHours.start} - {selectedStaff.workingHours.end}</span>
                            </div>
                         </div>
                       </div>
                    </div>
                    <div className="space-y-8">
                       <div>
                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Experiência & Perfil</h5>
                         <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-4">
                            <div>
                               <p className="text-[9px] font-black text-gray-400 uppercase">Tempo de Experiência</p>
                               <p className="text-sm font-black text-gray-900">{selectedStaff.experienceTime || 'Não informado'}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-gray-400 uppercase">Resumo Profissional</p>
                               <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                                  {selectedStaff.experienceDescription || 'Nenhuma descrição detalhada fornecida.'}
                               </p>
                            </div>
                         </div>
                       </div>
                       <div>
                         <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Notas Internas</h5>
                         <div className="p-8 bg-indigo-50/30 border border-indigo-50 rounded-[2.5rem] shadow-inner">
                            <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">
                              {selectedStaff.internalNotes || 'Nenhuma nota registada pela administração.'}
                            </p>
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center">
                       <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registro Biométrico / Presença</h5>
                       <button 
                        onClick={() => { 
                          setNewAttendance({ 
                            staffId: selectedStaff.id, 
                            status: 'present', 
                            date: new Date().toISOString().split('T')[0], 
                            absenceDiscount: 0,
                            justificationStatus: 'pending'
                          }); 
                          setIsAttendanceModalOpen(true); 
                        }}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm"
                       >
                         + Marcar Ponto
                       </button>
                    </div>
                    <div className="bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-50">
                          <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="px-8 py-5">Data</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-center">Info Tempo/Duração</th>
                            <th className="px-8 py-5">Dedução/Métrica</th>
                            <th className="px-8 py-5">Obs/Status Aprovação</th>
                            {tenant.isAdmin && <th className="px-8 py-5 text-right">Ação</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {currentAttendance.map(rec => (
                            <tr key={rec.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-8 py-5 text-xs font-black text-gray-900">{new Date(rec.date).toLocaleDateString(language)}</td>
                              <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${getAttendanceStatusBadge(rec.status)}`}>
                                  {getStatusTranslation(rec.status)}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-center text-xs font-bold text-gray-600 font-mono">
                                {rec.status === 'present' ? `${rec.checkIn || '--'} às ${rec.checkOut || '--'} (${rec.totalHours?.toFixed(1) || 0}h)` :
                                 rec.status === 'late' ? `Real: ${rec.checkIn || '--'} (Prev: ${rec.expectedCheckIn || '--'})` :
                                 rec.status === 'vacation' || rec.status === 'sick_leave' ? `${rec.totalDays || 0} dias (${rec.startDate?.split('-')[2]}/${rec.startDate?.split('-')[1]} - ${rec.endDate?.split('-')[2]}/${rec.endDate?.split('-')[1]})` :
                                 '---'}
                              </td>
                              <td className="px-8 py-5">
                                {rec.absenceDiscount ? (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-red-600">-{rec.absenceDiscount.toLocaleString()} {tenant.currency}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${rec.discountProcessed ? 'text-green-500' : 'text-amber-500'}`}>
                                      {rec.discountProcessed ? 'Debitado' : 'Pendente'}
                                    </span>
                                  </div>
                                ) : rec.status === 'resignation' ? (
                                   <span className="text-[9px] font-black text-red-600 uppercase">DESISTIU</span>
                                ) : '---'}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-400 italic font-medium truncate max-w-[150px]">{rec.notes || rec.reason || '---'}</span>
                                  {rec.justificationStatus && (
                                    <span className={`text-[8px] font-black uppercase ${rec.justificationStatus === 'approved' ? 'text-green-500' : 'text-amber-500'}`}>
                                      • {rec.justificationStatus}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {tenant.isAdmin && (
                                <td className="px-8 py-5 text-right">
                                   <button onClick={() => handleDeleteAttendance(rec.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Excluir Registro">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                   </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center">
                       <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Recibos & Folha de Pagamento</h5>
                       <button 
                        onClick={() => { 
                          setNewPayment({ 
                            staffId: selectedStaff.id, 
                            amount: selectedStaff.salary, 
                            baseSalary: selectedStaff.salary,
                            extras: 0,
                            type: 'salary', 
                            status: 'pending',
                            deductions: pendingAbsenceDiscounts,
                            period: new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })
                          }); 
                          setIsPaymentModalOpen(true); 
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                       >
                         + Lançar Novo Recibo
                       </button>
                    </div>

                    {pendingAbsenceDiscounts > 0 && (
                      <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Descontos de Faltas Pendentes (Automático)</p>
                              <p className="text-lg font-black text-amber-900 tracking-tighter">-{pendingAbsenceDiscounts.toLocaleString()} {tenant.currency}</p>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                       {currentPayments.map(p => (
                         <div key={p.id} className={`flex items-center justify-between p-6 rounded-[2.5rem] border transition-all ${p.status === 'paid' ? 'bg-white border-gray-100' : 'bg-red-50/50 border-red-100 shadow-xl shadow-red-50'}`}>
                            <div className="flex items-center gap-6">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${p.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {p.status === 'paid' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                               </div>
                               <div>
                                  <h6 className="text-sm font-black text-gray-900 tracking-tight">{p.period || p.description}</h6>
                                  <div className="flex gap-2 items-center mt-0.5">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.type} • Venc: {new Date(p.dueDate).toLocaleDateString(language)}</p>
                                    {(p.deductions || 0) > 0 && (
                                      <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Dedução: {p.deductions?.toLocaleString()}</span>
                                    )}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right mr-4">
                                  <p className="text-xl font-black text-gray-900 tabular-nums">{(p.amount).toLocaleString(tenant.locale)} {tenant.currency}</p>
                                  {p.paidAt && <p className="text-[8px] text-green-500 font-black uppercase">Pago em: {new Date(p.paidAt).toLocaleDateString(language)}</p>}
                               </div>
                               <div className="flex gap-2">
                                 <button 
                                    onClick={() => { setSelectedPaymentForReceipt(p); setIsPreviewReceiptOpen(true); }}
                                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                                    title="Ver Recibo Completo"
                                 >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                 </button>
                                 {p.status !== 'paid' && (
                                   <button 
                                    onClick={() => markAsPaid(p.id)}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                   >
                                     Pagar
                                   </button>
                                 )}
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Registros de Ponto</p>
                          <h4 className="text-4xl font-black text-gray-900 tracking-tighter">{currentAttendance.length}</h4>
                       </div>
                       <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">Total Recebido (Bruto)</p>
                          <h4 className="text-4xl font-black text-indigo-600 tracking-tighter tabular-nums">{currentPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}</h4>
                       </div>
                    </div>

                    <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                           <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-xl shadow-indigo-500/50" />
                              <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fausto Intelligence</h5>
                           </div>
                           <button onClick={runPerformanceAnalysis} disabled={loadingAi} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                              {loadingAi ? 'Analisando...' : 'Atualizar Insights AI'}
                           </button>
                        </div>
                        <div className="min-h-[100px] flex items-center">
                           {aiInsight ? <p className="text-lg font-bold leading-relaxed tracking-tight text-indigo-50/90 animate-in fade-in duration-700">{aiInsight}</p> : <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest text-center w-full">Clique para gerar análise inteligente.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6">
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-gray-100 shadow-xl border border-gray-50">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Seleccione um Colaborador</h3>
            </div>
          )}
        </div>
      </div>

      {/* STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
              <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{editingStaff.id ? 'Gerir Perfil 360°' : 'Adicionar Novo Funcionário'}</h3>
                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">FaustoSystem HR Hub • Admissão Oficial</p>
                </div>
                <button onClick={() => setIsStaffModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleSaveStaff} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                
                {/* Seção 1: Identificação Mestra */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 px-1">1. Identificação Mestra</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nome Completo *</label>
                      <input type="text" required value={editingStaff.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Nome completo do Funcionário" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Telefone Principal *</label>
                      <input type="tel" required value={editingStaff.phone} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" placeholder="+244 ..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">WhatsApp *</label>
                      <input type="tel" value={editingStaff.whatsapp} onChange={e => setEditingStaff({...editingStaff, whatsapp: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" placeholder="WhatsApp Profissional" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">URL da Foto (Upload Digital)</label>
                      <div className="flex gap-4 items-center">
                        <input type="text" value={editingStaff.photo} onChange={e => setEditingStaff({...editingStaff, photo: e.target.value})} className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" placeholder="https://..." />
                        <div className="w-14 h-14 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                           {editingStaff.photo ? <img src={editingStaff.photo} className="w-full h-full object-cover" /> : <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Experiência & Cargo */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 px-1">2. Experiência & Cargo</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Cargo / Função *</label>
                      <input type="text" required value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} placeholder="Ex: Mestre de Limpeza Senior" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tempo de Experiência</label>
                      <input type="text" value={editingStaff.experienceTime} onChange={e => setEditingStaff({...editingStaff, experienceTime: e.target.value})} placeholder="Ex: 5 anos e 2 meses" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Experiência Profissional (Descrição)</label>
                      <textarea value={editingStaff.experienceDescription} onChange={e => setEditingStaff({...editingStaff, experienceDescription: e.target.value})} placeholder="Descreva brevemente a trajetória do mestre..." className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none h-32 resize-none" />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Condições Contratuais */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 px-1">3. Condições Contratuais</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-1">Salário Base ({tenant.currency}) *</label>
                      <input type="number" required value={editingStaff.salary} onChange={e => setEditingStaff({...editingStaff, salary: parseFloat(e.target.value)})} className="w-full px-6 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-sm font-black outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Data de Início *</label>
                      <input type="date" required value={editingStaff.hiredAt} onChange={e => setEditingStaff({...editingStaff, hiredAt: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                  </div>
                </div>
              </form>
              <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
                <button type="submit" onClick={handleSaveStaff} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Efetivar Cadastro</button>
              </div>
           </div>
        </div>
      )}

      {/* ATTENDANCE MODAL (DINÂMICO) */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-300 overflow-y-auto">
           <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl my-auto animate-in zoom-in-95 flex flex-col">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30 text-center">
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Registro de Ponto / Atividade</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Colaborador: {selectedStaff?.name}</p>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Selecione a Modalidade *</label>
                    <select value={newAttendance.status} onChange={e => setNewAttendance({...newAttendance, status: e.target.value as any})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10">
                      <option value="present">1. Presente (Dia de Trabalho)</option>
                      <option value="absent">2. Falta (Ausência não justificada)</option>
                      <option value="late">3. Atraso (Entrada fora do horário)</option>
                      <option value="vacation">4. Férias (Período de descanso)</option>
                      <option value="sick_leave">5. Doente (Atestado médico)</option>
                      <option value="resignation">6. Desistência (Fim de contrato)</option>
                      <option value="justified_absence">7. Justificar Falta (Retroativo)</option>
                    </select>
                 </div>

                 {/* Campos comuns: Data */}
                 {newAttendance.status !== 'vacation' && newAttendance.status !== 'sick_leave' && (
                    <div className="animate-in slide-in-from-top-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Data do Registro</label>
                       <input type="date" value={newAttendance.date} onChange={e => setNewAttendance({...newAttendance, date: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold" />
                    </div>
                 )}

                 {/* Presente */}
                 {newAttendance.status === 'present' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 mb-1">Entrada</label>
                             <input type="time" value={newAttendance.checkIn} onChange={e => setNewAttendance({...newAttendance, checkIn: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 mb-1">Saída</label>
                             <input type="time" value={newAttendance.checkOut} onChange={e => setNewAttendance({...newAttendance, checkOut: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl" />
                          </div>
                       </div>
                       <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                          <span className="text-[10px] font-black text-indigo-600 uppercase">Cálculo Horas:</span>
                          <span className="text-sm font-black text-indigo-900">{newAttendance.totalHours?.toFixed(1) || 0}h Total</span>
                       </div>
                       <textarea placeholder="Observações..." value={newAttendance.notes} onChange={e => setNewAttendance({...newAttendance, notes: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-20 resize-none" />
                    </div>
                 )}

                 {/* Atraso */}
                 {newAttendance.status === 'late' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-[10px] font-black text-amber-600 mb-1">Hora Prevista</label>
                             <input type="time" value={newAttendance.expectedCheckIn} onChange={e => setNewAttendance({...newAttendance, expectedCheckIn: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-amber-600 mb-1">Hora Real</label>
                             <input type="time" value={newAttendance.checkIn} onChange={e => setNewAttendance({...newAttendance, checkIn: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl" />
                          </div>
                       </div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Justificativa Obrigatória *</label>
                       <textarea required value={newAttendance.notes} onChange={e => setNewAttendance({...newAttendance, notes: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-20" />
                    </div>
                 )}

                 {/* Falta (Funcionalidade original mantida) */}
                 {newAttendance.status === 'absent' && (
                    <div className="animate-in slide-in-from-top-2">
                       <label className="block text-[10px] font-black text-red-600 uppercase mb-2 px-1">Desconto Salarial ({tenant.currency})</label>
                       <input type="number" value={newAttendance.absenceDiscount} onChange={e => setNewAttendance({...newAttendance, absenceDiscount: parseFloat(e.target.value)})} className="w-full px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-black" />
                    </div>
                 )}

                 {/* Justificar Falta */}
                 {newAttendance.status === 'justified_absence' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <label className="block text-[10px] font-black text-blue-600 uppercase mb-1 px-1">Justificativa de Falta Retroativa</label>
                       <textarea required value={newAttendance.notes} onChange={e => setNewAttendance({...newAttendance, notes: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-28" />
                       <div className="flex items-center gap-4">
                          <label className="text-[10px] font-black uppercase text-gray-400">Aprovação Admin:</label>
                          <select value={newAttendance.justificationStatus} onChange={e => setNewAttendance({...newAttendance, justificationStatus: e.target.value as any})} className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold">
                             <option value="pending">Pendente</option>
                             <option value="approved">Aprovada</option>
                          </select>
                       </div>
                    </div>
                 )}

                 {/* Férias / Doente */}
                 {(newAttendance.status === 'vacation' || newAttendance.status === 'sick_leave') && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 mb-1">Início</label>
                             <input type="date" value={newAttendance.startDate} onChange={e => setNewAttendance({...newAttendance, startDate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 mb-1">Fim</label>
                             <input type="date" value={newAttendance.endDate} onChange={e => setNewAttendance({...newAttendance, endDate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" />
                          </div>
                       </div>
                       <div className="p-3 bg-indigo-50 rounded-xl text-center">
                          <span className="text-xs font-black text-indigo-700">{newAttendance.totalDays || 0} Dias Registrados</span>
                       </div>
                       <textarea placeholder={newAttendance.status === 'sick_leave' ? "Descrição/Justificativa Médica..." : "Observações de Férias..."} value={newAttendance.notes} onChange={e => setNewAttendance({...newAttendance, notes: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm h-20" />
                       <div className="flex items-center gap-4">
                          <label className="text-[10px] font-black uppercase text-gray-400">Status:</label>
                          <select value={newAttendance.justificationStatus} onChange={e => setNewAttendance({...newAttendance, justificationStatus: e.target.value as any})} className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl text-xs font-bold">
                             <option value="pending">Pendente</option>
                             <option value="approved">Aprovada</option>
                             <option value="completed">Concluída</option>
                          </select>
                       </div>
                    </div>
                 )}

                 {/* Desistência */}
                 {newAttendance.status === 'resignation' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                          <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          <p className="text-[10px] font-bold text-red-700 leading-tight">ATENÇÃO: Ao confirmar a desistência, o funcionário será marcado como INATIVO no sistema imediatamente.</p>
                       </div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo Obrigatório *</label>
                       <textarea required value={newAttendance.reason} onChange={e => setNewAttendance({...newAttendance, reason: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm h-32" />
                    </div>
                 )}
              </div>
              <div className="p-8 bg-gray-50 flex gap-4">
                 <button onClick={() => setIsAttendanceModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500">Cancelar</button>
                 <button onClick={handleMarkAttendance} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100">Registrar Ponto</button>
              </div>
           </div>
        </div>
      )}

      {/* PAYMENT MODAL (LANÇAR RECIBO) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
              <div className="p-10 border-b border-gray-50 bg-gray-50/30 text-center">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Gerar Recibo de Pagamento</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Colaborador: {selectedStaff?.name}</p>
              </div>
              <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Período de Referência (Ex: Janeiro/2025)</label>
                       <input type="text" value={newPayment.period} onChange={e => setNewPayment({...newPayment, period: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Salário Base (Fixo)</label>
                       <div className="w-full px-5 py-4 bg-gray-100 border border-gray-100 rounded-2xl text-sm font-black text-gray-500">{selectedStaff?.salary.toLocaleString()} {tenant.currency}</div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-indigo-600 uppercase mb-2">Extras / Bónus</label>
                       <input type="number" value={newPayment.extras} onChange={e => setNewPayment({...newPayment, extras: parseFloat(e.target.value)})} className="w-full px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-black outline-none" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-red-600 uppercase mb-2">Descontos de Faltas</label>
                       <div className="w-full px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-black text-red-600">{pendingAbsenceDiscounts.toLocaleString()} {tenant.currency}</div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-red-600 uppercase mb-2">Outros Descontos</label>
                       <input type="number" value={newPayment.deductions} onChange={e => setNewPayment({...newPayment, deductions: parseFloat(e.target.value)})} className="w-full px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-black outline-none text-red-700" />
                    </div>
                 </div>

                 <div className="p-8 bg-gray-900 rounded-[2.5rem] text-center space-y-2">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Estimativa de Valor Líquido</p>
                    <h4 className="text-3xl font-black text-white tabular-nums">
                       {((selectedStaff?.salary || 0) + (newPayment.extras || 0) - (pendingAbsenceDiscounts + (newPayment.deductions || 0))).toLocaleString()} {tenant.currency}
                    </h4>
                 </div>
              </div>
              <div className="p-10 bg-gray-50 flex gap-4 shrink-0">
                 <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500">Cancelar</button>
                 <button onClick={handleCreatePayment} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100">Guardar e Gerar Recibo</button>
              </div>
           </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL (PROFISSIONAL PDF STYLE) */}
      {isPreviewReceiptOpen && selectedPaymentForReceipt && selectedStaff && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-[850px] shadow-2xl rounded-sm p-12 my-auto relative animate-in zoom-in-95 print:p-0 print:shadow-none print:m-0 print:max-w-none">
             {/* Toolbar Ações - Oculta na Impressão */}
             <div className="absolute -top-14 left-0 right-0 flex justify-between items-center no-print">
               <div className="flex gap-3">
                  <button onClick={() => handleSendReceiptWhatsApp(selectedPaymentForReceipt, selectedStaff)} className="px-6 py-2.5 bg-green-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-600 flex items-center gap-2 transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> WhatsApp
                  </button>
                  <button onClick={() => handleSendReceiptEmail(selectedPaymentForReceipt, selectedStaff)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> E-mail
                  </button>
                  <button onClick={() => window.print()} className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black flex items-center gap-2 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Baixar PDF / Imprimir
                  </button>
               </div>
               <button onClick={() => setIsPreviewReceiptOpen(false)} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/40 transition-all shadow-xl">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             {/* CONTEÚDO DO RECIBO (LAYOUT A4) */}
             <div className="space-y-12">
                {/* Header Empresa */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-10 relative">
                   <div>
                      <img src={tenant.logo} className="w-20 h-20 rounded-2xl mb-4 grayscale" alt="Empresa" />
                      <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{tenant.name}</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sede: Luanda, Angola • NIF: 5000123456</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">E-mail: rh@faustohub.ao • Tel: +244 927 735 274</p>
                   </div>
                   <div className="text-right">
                      <h1 className="text-4xl font-black text-gray-200 uppercase tracking-tighter mb-2">Recibo de Salário</h1>
                      <div className="space-y-1">
                         <p className="text-sm font-black text-gray-900">Nº {selectedPaymentForReceipt.id.split('-')[1].toUpperCase()}</p>
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Data de Emissão: {new Date().toLocaleDateString('pt-AO')}</p>
                         <p className="text-[10px] text-indigo-600 font-black uppercase bg-indigo-50 px-3 py-1 inline-block rounded-md mt-2">Período: {selectedPaymentForReceipt.period || 'Mês Atual'}</p>
                      </div>
                   </div>
                   
                   {/* Marca D'água Pago */}
                   {selectedPaymentForReceipt.status === 'paid' && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] pointer-events-none opacity-[0.04]">
                        <span className="text-[12rem] font-black border-[30px] border-indigo-600 text-indigo-600 px-20 py-8 rounded-[4rem]">PAGO</span>
                     </div>
                   )}
                </div>

                {/* Dados Funcionário */}
                <div className="grid grid-cols-2 gap-12 bg-gray-50 p-8 border border-gray-100 rounded-sm">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Dados do Colaborador</h4>
                      <div className="space-y-1">
                         <p className="text-lg font-black text-gray-900 uppercase">{selectedStaff.name}</p>
                         <p className="text-xs font-bold text-gray-500 uppercase">{selectedStaff.role} • {selectedStaff.department}</p>
                         <p className="text-[10px] font-bold text-gray-400 italic">Data de Admissão: {new Date(selectedStaff.hiredAt).toLocaleDateString('pt-AO')}</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">Informações da Conta</h4>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-gray-400 uppercase">Método de Pagamento:</span>
                            <span className="text-gray-900 uppercase">Transferência Bancária</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-gray-400 uppercase">Status do Documento:</span>
                            <span className={`px-2 py-0.5 rounded-sm uppercase ${selectedPaymentForReceipt.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedPaymentForReceipt.status}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Tabela de Verbas */}
                <table className="w-full">
                   <thead>
                      <tr className="border-b-2 border-gray-900 text-left text-[11px] font-black uppercase tracking-widest">
                         <th className="py-4 px-2">Código</th>
                         <th className="py-4 px-2">Descrição das Verbas</th>
                         <th className="py-4 px-2 text-right">Referência</th>
                         <th className="py-4 px-2 text-right">Proventos (+)</th>
                         <th className="py-4 px-2 text-right">Descontos (-)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {/* Salário Base */}
                      <tr className="text-xs font-bold text-gray-700">
                         <td className="py-4 px-2 text-gray-400">001</td>
                         <td className="py-4 px-2 font-black">Salário Base Mensal / Contratual</td>
                         <td className="py-4 px-2 text-right">30 Dias</td>
                         <td className="py-4 px-2 text-right font-black">{(selectedPaymentForReceipt.baseSalary || 0).toLocaleString(tenant.locale)}</td>
                         <td className="py-4 px-2 text-right text-gray-300">0.00</td>
                      </tr>
                      {/* Extras */}
                      {(selectedPaymentForReceipt.extras || 0) > 0 && (
                        <tr className="text-xs font-bold text-indigo-700">
                           <td className="py-4 px-2 text-indigo-200">008</td>
                           <td className="py-4 px-2">Remuneração Extra / Gratificações / Bónus</td>
                           <td className="py-4 px-2 text-right">--</td>
                           <td className="py-4 px-2 text-right font-black">{(selectedPaymentForReceipt.extras || 0).toLocaleString(tenant.locale)}</td>
                           <td className="py-4 px-2 text-right text-gray-300">0.00</td>
                        </tr>
                      )}
                      {/* Descontos */}
                      {(selectedPaymentForReceipt.deductions || 0) > 0 && (
                        <tr className="text-xs font-bold text-red-600 bg-red-50/20">
                           <td className="py-4 px-2 text-red-200">015</td>
                           <td className="py-4 px-2 italic">Descontos por Faltas / Atrasos / Outros</td>
                           <td className="py-4 px-2 text-right">--</td>
                           <td className="py-4 px-2 text-right text-gray-300">0.00</td>
                           <td className="py-4 px-2 text-right font-black">-{selectedPaymentForReceipt.deductions?.toLocaleString(tenant.locale)}</td>
                        </tr>
                      )}
                   </tbody>
                </table>

                {/* Resumo Final */}
                <div className="flex justify-end pt-10">
                   <div className="w-80 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                         <span className="uppercase">Total Proventos (+)</span>
                         <span className="text-gray-900">{((selectedPaymentForReceipt.baseSalary || 0) + (selectedPaymentForReceipt.extras || 0)).toLocaleString(tenant.locale)} {tenant.currency}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-red-500">
                         <span className="uppercase">Total Descontos (-)</span>
                         <span>-{selectedPaymentForReceipt.deductions?.toLocaleString(tenant.locale) || '0.00'} {tenant.currency}</span>
                      </div>
                      <div className="pt-6 border-t-2 border-gray-900 bg-gray-50 p-6 rounded-xl shadow-inner flex justify-between items-end">
                         <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Líquido Disponível</p>
                            <span className="text-xs font-bold text-gray-400">Transferido em: {selectedPaymentForReceipt.paidAt ? new Date(selectedPaymentForReceipt.paidAt).toLocaleDateString('pt-AO') : 'Pendente'}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-3xl font-black tracking-tighter text-indigo-900 tabular-nums">
                               {(selectedPaymentForReceipt.amount).toLocaleString(tenant.locale)}
                            </span>
                            <span className="text-sm font-black text-indigo-900 ml-1">{tenant.currency}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Assinaturas */}
                <div className="grid grid-cols-2 gap-20 pt-20 pb-10">
                   <div className="text-center space-y-4">
                      <div className="h-20 border-b border-gray-300 relative flex items-center justify-center overflow-hidden">
                         <span className="text-indigo-600 font-mono text-[8px] rotate-[-2deg] border border-indigo-600/30 p-2 opacity-30 uppercase font-black tracking-tighter bg-white/50">
                            AUTENTICADO DIGITALMENTE • FAUSTOSYSTEM SECURITY HUB
                         </span>
                         <img src={tenant.logo} className="absolute inset-0 w-full h-full object-contain opacity-5 grayscale" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pela Entidade Empregadora</p>
                   </div>
                   <div className="text-center space-y-4">
                      <div className="h-20 border-b border-gray-300"></div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assinatura do Colaborador (Confirmação)</p>
                   </div>
                </div>

                {/* Footer Documento */}
                <div className="pt-10 border-t border-gray-100 text-center">
                   <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">Este documento é um comprovativo oficial gerado pelo {SYSTEM_NAME} Enterprise v4.0</p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffModule;
