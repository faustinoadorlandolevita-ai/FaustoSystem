
import React, { useState } from 'react';
import { useApp } from '../App';
import { SYSTEM_NAME, Language, TenantConfig } from '../types';
import { useTranslation } from '../services/i18n';

const Settings: React.FC = () => {
  const { tenant, setTenant, language, setLanguage, notify } = useApp();
  const { t } = useTranslation(language);

  // Local state to hold temporary changes before committing
  const [localTenant, setLocalTenant] = useState<TenantConfig>({ ...tenant });
  const [localLanguage, setLocalLanguage] = useState<Language>(language);

  const handleSave = () => {
    // Commit local changes to global state
    setTenant({ ...localTenant, language: localLanguage });
    setLanguage(localLanguage);
    
    // Feedback to user
    notify(t('common.save'), 'success');
  };

  const handleDiscard = () => {
    setLocalTenant({ ...tenant });
    setLocalLanguage(language);
    notify(t('common.discard'), 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('settings.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Branding Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">{t('settings.branding')}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Personalize a identidade visual da sua organização dentro do ecossistema FaustoSystem.</p>
        </div>
        <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Logotipo (URL)</label>
              <div className="flex items-center gap-4">
                <img src={localTenant.logo} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-inner" />
                <input 
                  type="text" 
                  value={localTenant.logo}
                  onChange={(e) => setLocalTenant({...localTenant, logo: e.target.value})}
                  className="flex-1 px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome da Organização</label>
              <input 
                type="text" 
                value={localTenant.name}
                onChange={(e) => setLocalTenant({...localTenant, name: e.target.value})}
                className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cor de Identidade</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={localTenant.primaryColor}
                  onChange={(e) => setLocalTenant({...localTenant, primaryColor: e.target.value})}
                  className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent" 
                />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">{localTenant.primaryColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Templates Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Canais & Mensagens</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Configure as mensagens automáticas enviadas via WhatsApp e E-mail.</p>
        </div>
        <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Template WhatsApp (Clientes)</label>
              <textarea 
                value={localTenant.contactTemplates.whatsapp}
                onChange={(e) => setLocalTenant({...localTenant, contactTemplates: {...localTenant.contactTemplates, whatsapp: e.target.value}})}
                className="w-full px-5 py-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-medium h-28 resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Use {nome_cliente} e {nome_empresa} como variáveis."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Template WhatsApp (Equipa)</label>
              <textarea 
                value={localTenant.contactTemplates.staffWhatsApp}
                onChange={(e) => setLocalTenant({...localTenant, contactTemplates: {...localTenant.contactTemplates, staffWhatsApp: e.target.value}})}
                className="w-full px-5 py-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-medium h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Use {nome_staff} e {nome_empresa} como variáveis."
              />
            </div>
          </div>
        </div>

        {/* Scheduling Rules Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">{t('settings.scheduling')}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Defina os limites e restrições para a agenda automatizada.</p>
        </div>
        <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Limite Diário de Agendamentos</label>
              <input 
                type="number" 
                value={localTenant.schedulingRules.maxDailyAppointments}
                onChange={(e) => setLocalTenant({...localTenant, schedulingRules: {...localTenant.schedulingRules, maxDailyAppointments: parseInt(e.target.value)}})}
                className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Antecedência Mínima (Horas)</label>
              <input 
                type="number" 
                value={localTenant.schedulingRules.minAdvanceBookingHours}
                onChange={(e) => setLocalTenant({...localTenant, schedulingRules: {...localTenant.schedulingRules, minAdvanceBookingHours: parseInt(e.target.value)}})}
                className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="col-span-full flex items-center gap-4 p-5 bg-indigo-50/30 rounded-2xl border border-indigo-50">
              <input 
                type="checkbox" 
                checked={localTenant.schedulingRules.allowClientReschedule}
                onChange={(e) => setLocalTenant({...localTenant, schedulingRules: {...localTenant.schedulingRules, allowClientReschedule: e.target.checked}})}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-indigo-900">Permitir que clientes reagendem via link próprio</span>
            </div>
          </div>
        </div>

        {/* Localization Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">{t('settings.localization')}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Configure as preferências regionais do sistema.</p>
        </div>
        <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Idioma da Interface</label>
              <select 
                value={localLanguage}
                onChange={(e) => setLocalLanguage(e.target.value as Language)}
                className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="pt">Português (pt)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Moeda Base</label>
              <select 
                className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                value={localTenant.currency}
                onChange={(e) => setLocalTenant({...localTenant, currency: e.target.value})}
              >
                <option value="AOA">AOA (Kz)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
        <button 
          onClick={handleDiscard}
          className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all shadow-sm"
        >
          {t('common.discard')}
        </button>
        <button 
          onClick={handleSave}
          className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
};

export default Settings;
