
import React, { useState, useMemo } from 'react';
import { Staff, StaffStatus, AttendanceRecord, AttendanceStatus, CommissionType, StaffPayment } from '../types';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';

const StaffModule: React.FC = () => {
  const { tenant, language } = useApp();
  const { t } = useTranslation(language);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>('1');
  const [activeTab, setActiveTab] = useState<'details' | 'schedule' | 'attendance' | 'performance' | 'financial'>('details');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  // Mock Staff Database (Partially localized for display)
  const [staffList] = useState<Staff[]>([
    {
      id: '1',
      name: 'Sarah Martins',
      photo: 'https://i.pravatar.cc/150?u=sarah',
      phone: '+244 923 888 777',
      email: 'sarah.m@faustohub.com',
      role: language === 'pt' ? 'Técnica Sénior' : 'Senior Technician',
      position: language === 'pt' ? 'Especialista em Estética' : 'Esthetics Specialist',
      department: language === 'pt' ? 'Beleza' : 'Beauty',
      team: language === 'pt' ? 'Equipa A' : 'Team A',
      salary: 150000,
      commissionValue: 15,
      commissionType: 'percentage',
      status: 'active',
      tags: [language === 'pt' ? 'Líder' : 'Leader', language === 'pt' ? 'Experiente' : 'Expert'],
      hiredAt: '2023-05-10',
      workingHours: {
        start: '08:00',
        end: '17:00',
        daysOff: [0, 6] // Sun, Sat
      },
      location: {
        city: 'Luanda',
        address: 'Rua Direita de Talatona'
      },
      internalNotes: language === 'pt' ? 'Alta performance, feedback positivo constante.' : 'High performance, constant positive feedback.'
    },
    {
      id: '2',
      name: 'João Pedro',
      photo: 'https://i.pravatar.cc/150?u=joao',
      phone: '+244 912 444 555',
      email: 'joao.p@faustohub.com',
      role: language === 'pt' ? 'Manutenção' : 'Maintenance',
      position: language === 'pt' ? 'Técnico de AC' : 'AC Technician',
      department: language === 'pt' ? 'Operações' : 'Operations',
      team: language === 'pt' ? 'Equipa B' : 'Team B',
      salary: 120000,
      commissionValue: 5000,
      commissionType: 'fixed',
      status: 'active',
      tags: [language === 'pt' ? 'Campo' : 'Field'],
      hiredAt: '2024-01-15',
      workingHours: {
        start: '09:00',
        end: '18:00',
        daysOff: [0, 1] // Sun, Mon
      },
      location: {
        city: 'Viana',
        address: 'Zango 0'
      }
    }
  ]);

  // Mock Attendance History
  const [attendanceRecords] = useState<AttendanceRecord[]>([
    { id: 'a1', staffId: '1', date: '2025-02-18', status: 'present', checkIn: '07:55', checkOut: '17:05' },
    { id: 'a2', staffId: '1', date: '2025-02-17', status: 'late', checkIn: '08:15', checkOut: '17:00', notes: language === 'pt' ? 'Trânsito intenso' : 'Heavy traffic' },
    { id: 'a3', staffId: '1', date: '2025-02-16', status: 'present', checkIn: '07:50', checkOut: '17:10' },
  ]);

  // Mock Payments History
  const [payments, setPayments] = useState<StaffPayment[]>([
    { id: 'p1', staffId: '1', description: language === 'pt' ? 'Salário Janeiro/2025' : 'Salary January/2025', amount: 150000, dueDate: '2025-01-31', status: 'paid', paidAt: '2025-01-30', type: 'salary' },
    { id: 'p2', staffId: '1', description: language === 'pt' ? 'Comissões Jan/2025' : 'Commission Jan/2025', amount: 22500, dueDate: '2025-02-05', status: 'late', type: 'commission' },
    { id: 'p3', staffId: '1', description: language === 'pt' ? 'Bónus Meta Batida' : 'Performance Bonus', amount: 10000, dueDate: '2025-02-10', status: 'late', type: 'bonus' },
  ]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = filterDept === 'all' || s.department === filterDept;
      return matchesSearch && matchesDept;
    });
  }, [staffList, searchQuery, filterDept]);

  const selectedStaff = useMemo(() => 
    staffList.find(s => s.id === selectedStaffId) || null
  , [staffList, selectedStaffId]);

  const staffPayments = useMemo(() => 
    payments.filter(p => p.staffId === selectedStaffId)
  , [payments, selectedStaffId]);

  const latePaymentsCount = useMemo(() => 
    staffPayments.filter(p => p.status === 'late').length
  , [staffPayments]);

  const handleWhatsApp = (staff: Staff) => {
    const message = tenant.contactTemplates.staffWhatsApp
      .replace('{nome_staff}', staff.name)
      .replace('{nome_empresa}', tenant.name);
    window.open(`https://wa.me/${staff.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const markAsPaid = (paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid', paidAt: new Date().toISOString().split('T')[0] } : p));
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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'late': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('staff.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('staff.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            {t('staff.customize')}
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
            + {t('staff.addNew')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Sidebar: Staff List */}
        <div className="w-1/3 flex flex-col space-y-4 min-w-[300px]">
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
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
                className={`w-full text-left p-5 rounded-[2rem] border transition-all ${selectedStaffId === person.id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 overflow-hidden border-2 border-white shadow-sm">
                    {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-indigo-600 text-lg">{person.name.charAt(0)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 truncate tracking-tight">{person.name}</h4>
                    <p className="text-[10px] text-gray-500 font-black uppercase truncate tracking-widest">{person.role}</p>
                    <div className="flex gap-1 mt-1.5">
                      {person.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white text-gray-400 text-[8px] font-black rounded-md border border-gray-50 uppercase tracking-tighter shadow-sm">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${person.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
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
                    <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-100 overflow-hidden shadow-2xl border-4 border-white">
                      {selectedStaff.photo ? <img src={selectedStaff.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-indigo-600 text-5xl">{selectedStaff.name.charAt(0)}</div>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedStaff.name}</h3>
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(selectedStaff.status)}`}>
                          {t(`status.${selectedStaff.status}`)}
                        </span>
                      </div>
                      <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">{selectedStaff.position}</p>
                      <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{selectedStaff.department} • {selectedStaff.team}</p>
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
                    { id: 'financial', label: t('staff.financial') },
                    { id: 'attendance', label: t('staff.attendance') },
                    { id: 'performance', label: t('staff.performance') },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-5 text-[10px] font-black transition-all relative whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.label}
                        {tab.id === 'financial' && latePaymentsCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-bounce">
                            {latePaymentsCount}
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
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Contratação & Finanças</h5>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('staff.salary')}</p>
                            <p className="text-sm font-black text-gray-900">{selectedStaff.salary.toLocaleString(tenant.locale)} {tenant.currency}</p>
                          </div>
                          <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('staff.commission')}</p>
                            <p className="text-sm font-black text-indigo-700">
                              {selectedStaff.commissionValue}{selectedStaff.commissionType === 'percentage' ? '%' : ` ${tenant.currency}`}
                            </p>
                          </div>
                          <div className="p-5 bg-white border border-gray-100 rounded-3xl col-span-2 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('staff.hiredDate')}</p>
                            <p className="text-sm font-black text-gray-900">{new Date(selectedStaff.hiredAt).toLocaleDateString(language)}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Notas da Administração</h5>
                        <div className="p-6 bg-indigo-50/30 border border-indigo-50 rounded-3xl shadow-inner">
                          <p className="text-xs text-indigo-900 font-bold leading-relaxed italic">"{selectedStaff.internalNotes || '---'}"</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Escala & Residência</h5>
                        <div className="p-6 bg-white border border-gray-100 rounded-[2.5rem] space-y-6 shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{t('staff.workHours')}</p>
                              <p className="text-sm font-black text-gray-900 tracking-tight">{selectedStaff.workingHours.start} - {selectedStaff.workingHours.end}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Endereço Registado</p>
                              <p className="text-sm font-black text-gray-900 tracking-tight leading-snug">{selectedStaff.location.city}, {selectedStaff.location.address}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {latePaymentsCount > 0 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-200" />
                          <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t('staff.latePayments')}</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {staffPayments.filter(p => p.status === 'late').map(p => (
                            <div key={p.id} className="flex items-center justify-between p-6 bg-red-50/30 border border-red-100 rounded-3xl group transition-all hover:shadow-xl hover:shadow-red-50/50">
                              <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                  <h6 className="text-base font-black text-gray-900 tracking-tight">{p.description}</h6>
                                  <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-0.5">Vencimento: {new Date(p.dueDate).toLocaleDateString(language)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="text-right">
                                  <p className="text-xl font-black text-gray-900 tabular-nums">{p.amount.toLocaleString(tenant.locale)} {tenant.currency}</p>
                                </div>
                                <button 
                                  onClick={() => markAsPaid(p.id)}
                                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                                >
                                  Marcar Pago
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-5">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('staff.paymentHistory')}</h5>
                      <div className="bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <table className="w-full">
                          <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <th className="px-8 py-5">Descrição</th>
                              <th className="px-8 py-5 text-center">Data Vencimento</th>
                              <th className="px-8 py-5 text-center">Status</th>
                              <th className="px-8 py-5 text-right">Valor Líquido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {staffPayments.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-900">{p.description}</span>
                                    <span className="text-[9px] text-indigo-400 uppercase font-black tracking-tighter mt-0.5">{p.type}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center text-xs font-bold text-gray-600">
                                  {new Date(p.dueDate).toLocaleDateString(language)}
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${getPaymentStatusBadge(p.status)}`}>
                                    {t(`status.${p.status}`)}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-right text-xs font-black text-gray-900 tabular-nums">
                                  {p.amount.toLocaleString(tenant.locale)} {tenant.currency}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">{t('staff.stats.services')}</p>
                        <h4 className="text-4xl font-black text-gray-900 tracking-tighter">124</h4>
                        <p className="text-[10px] text-green-500 font-black mt-2 uppercase">+12% vs mês anterior</p>
                      </div>
                      <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">{t('staff.stats.presenceRate')}</p>
                        <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">98.2%</h4>
                        <p className="text-[10px] text-gray-400 font-black mt-2 uppercase">Altamente Consistente</p>
                      </div>
                      <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3">{t('staff.stats.revenueGenerated')}</p>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight tabular-nums">1.450.000 Kz</h4>
                        <p className="text-[10px] text-indigo-500 font-black mt-2 uppercase">Bónus Disponível</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('staff.aiAnalysis')}</h5>
                        </div>
                        <p className="text-lg font-bold leading-relaxed max-w-2xl tracking-tight">
                          {language === 'pt' 
                            ? `"Sarah mantém uma consistência excecional na retenção de clientes de estética. Recomenda-se atribuir mentorias para novos membros para escalar o seu método de atendimento premium."`
                            : `"Sarah maintains exceptional consistency in client retention. We recommend assigning her mentorship roles for new members to scale her premium service methodology."`}
                        </p>
                      </div>
                      <div className="absolute -right-32 -bottom-32 w-80 h-80 bg-indigo-600/20 blur-[100px] rounded-full" />
                      <div className="absolute left-[-10%] top-[-10%] w-40 h-40 bg-white/5 blur-3xl rounded-full" />
                    </div>
                  </div>
                )}
                
                {activeTab === 'attendance' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('staff.attendance')}</h5>
                      <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 shadow-sm transition-all">Ver Relatório Anual</button>
                    </div>
                    <div className="bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-50">
                          <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="px-8 py-5">{t('common.date')}</th>
                            <th className="px-8 py-5">{t('common.status')}</th>
                            <th className="px-8 py-5">Entrada</th>
                            <th className="px-8 py-5">Saída</th>
                            <th className="px-8 py-5">{t('common.notes')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {attendanceRecords.map(rec => (
                            <tr key={rec.id} className="hover:bg-gray-50/30 transition-colors">
                              <td className="px-8 py-5 text-xs font-black text-gray-900">{new Date(rec.date).toLocaleDateString(language)}</td>
                              <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${getAttendanceStatusBadge(rec.status)}`}>
                                  {t(`status.${rec.status}`)}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-xs font-bold text-gray-600">{rec.checkIn || '--:--'}</td>
                              <td className="px-8 py-5 text-xs font-bold text-gray-600">{rec.checkOut || '--:--'}</td>
                              <td className="px-8 py-5 text-xs text-gray-400 italic font-medium">{rec.notes || '---'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6 bg-gray-50/20">
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-gray-100 shadow-xl border border-gray-50">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Seleccione um Colaborador</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">Gerencie as presenças, avalie a produtividade com IA e acompanhe pagamentos em atraso num só lugar.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffModule;
