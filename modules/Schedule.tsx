
import React, { useState } from 'react';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';
import { Appointment, AppointmentStatus, BookingType } from '../types';

const Schedule: React.FC = () => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const currentMonthLabel = language === 'pt' ? 'Fevereiro 2025' : 'February 2025';
  const weekDays = language === 'pt' 
    ? ['Seg 17', 'Ter 18', 'Qua 19', 'Qui 20', 'Sex 21', 'Sab 22', 'Dom 23'] 
    : ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21', 'Sat 22', 'Sun 23'];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">{currentMonthLabel}</h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
          {[
            { id: 'day', label: t('schedule.view.day') },
            { id: 'week', label: t('schedule.view.week') },
            { id: 'month', label: t('schedule.view.month') }
          ].map((view) => (
            <button 
              key={view.id}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view.id === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid grid-cols-8 border-b border-gray-50 bg-gray-50/30">
          <div className="p-4 border-r border-gray-50 w-20"></div>
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-center border-r border-gray-50 last:border-r-0">
              <span className="text-[10px] font-black text-gray-400 block uppercase tracking-tighter mb-1">{day.split(' ')[0]}</span>
              <span className="text-xl font-black text-gray-900">{day.split(' ')[1]}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-8 relative min-w-[800px]">
            <div className="col-start-1 col-end-1 w-20 border-r border-gray-50 bg-gray-50/10">
              {hours.map((hour) => (
                <div key={hour} className="h-20 text-right pr-4 pt-2 text-[10px] text-gray-400 font-black">
                  {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div key={dayIndex} className="relative border-r border-gray-50 last:border-r-0">
                {hours.map((hour) => (
                  <div key={hour} className="h-20 border-b border-gray-50 group hover:bg-indigo-50/20 transition-colors" />
                ))}
                
                {dayIndex === 1 && (
                  <div className="absolute top-[80px] left-1.5 right-1.5 h-36 bg-white border border-indigo-100 rounded-2xl p-4 shadow-xl shadow-indigo-100/20 cursor-pointer z-10 hover:translate-y-[-2px] transition-all group overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{t('status.confirmed')}</p>
                    <h4 className="text-xs font-black text-gray-900 leading-tight mb-2">Limpeza Profunda de Estofos</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] text-indigo-600 font-bold">C</div>
                      <p className="text-[10px] font-bold text-gray-500 truncate">Carlos Oliveira</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('schedule.new')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm transition-all hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.date')}</label>
                  <input type="date" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.time')}</label>
                  <input type="time" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.client')}</label>
                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  <option>--- Seleccionar Cliente ---</option>
                  <option>Carlos Oliveira</option>
                  <option>Ana Paula Silva</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.service')}</label>
                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  <option>--- Seleccionar Serviço ---</option>
                  <option>Limpeza Profunda (120 min)</option>
                  <option>Manutenção Geral (60 min)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.staff')}</label>
                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                  <option>Qualquer Disponível</option>
                  <option>Sarah Martins</option>
                  <option>João Pedro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('schedule.notes')}</label>
                <textarea className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Detalhes adicionais..."></textarea>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors">
                {t('common.cancel')}
              </button>
              <button className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-20 group"
      >
        <svg className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
  );
};

export default Schedule;
