
import React, { useState } from 'react';
import { useApp } from '../App';
import { Language, TenantConfig, CustomField } from '../types';
import { useTranslation } from '../services/i18n';

const Settings: React.FC = () => {
  const { tenant, setTenant, language, setLanguage, notify } = useApp();
  const { t } = useTranslation(language);

  const [localTenant, setLocalTenant] = useState<TenantConfig>({ ...tenant });
  const [localLanguage, setLocalLanguage] = useState<Language>(language);
  
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');
  const [targetCollection, setTargetCollection] = useState<'client' | 'appointment'>('client');
  
  const [activeTemplateTab, setActiveTemplateTab] = useState<keyof TenantConfig['contactTemplates']>('pending');

  const colorPresets = [
    { name: 'Indigo Hub', color: '#4f46e5' },
    { name: 'Ocean Blue', color: '#2563eb' },
    { name: 'Emerald City', color: '#059669' },
    { name: 'Rose Petal', color: '#e11d48' },
    { name: 'Amber Gold', color: '#d97706' },
    { name: 'Deep Slate', color: '#334155' },
    { name: 'Violet Night', color: '#7c3aed' },
  ];

  const handleSave = () => {
    setTenant({ ...localTenant, language: localLanguage });
    setLanguage(localLanguage);
    notify(t('common.save'), 'success');
  };

  const handleDiscard = () => {
    setLocalTenant({ ...tenant });
    setLocalLanguage(language);
    notify(t('common.discard'), 'success');
  };

  const addCustomField = () => {
    if (!newFieldLabel) return;
    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
      required: false,
      options: newFieldType === 'select' ? [] : undefined
    };
    
    if (targetCollection === 'client') {
      setLocalTenant({
        ...localTenant,
        clientCustomFields: [...localTenant.clientCustomFields, newField]
      });
    } else {
      setLocalTenant({
        ...localTenant,
        appointmentCustomFields: [...localTenant.appointmentCustomFields, newField]
      });
    }
    setNewFieldLabel('');
  };

  const removeCustomField = (id: string, collection: 'client' | 'appointment') => {
    if (collection === 'client') {
      setLocalTenant({
        ...localTenant,
        clientCustomFields: localTenant.clientCustomFields.filter(f => f.id !== id)
      });
    } else {
      setLocalTenant({
        ...localTenant,
        appointmentCustomFields: localTenant.appointmentCustomFields.filter(f => f.id !== id)
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('settings.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* Branding Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">{t('settings.branding')}</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">Personalize a identidade visual completa da sua organização.</p>
        </div>
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">
          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Logotipo Principal</label>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 flex items-center justify-center shadow-inner">
                  <img src={localTenant.logo} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    value={localTenant.logo}
                    onChange={(e) => setLocalTenant({...localTenant, logo: e.target.value})}
                    placeholder="URL da Imagem..."
                    className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  />
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Recomendado: 512x512px (PNG ou SVG)</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Cor de Identidade do Sistema</label>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <input 
                      type="color" 
                      value={localTenant.primaryColor}
                      onChange={(e) => setLocalTenant({...localTenant, primaryColor: e.target.value})}
                      className="w-16 h-16 rounded-2xl cursor-pointer border-none bg-transparent p-0 overflow-hidden shadow-lg transition-transform group-hover:scale-110" 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={localTenant.primaryColor}
                      onChange={(e) => setLocalTenant({...localTenant, primaryColor: e.target.value})}
                      className="w-32 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest font-mono text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Clique no seletor ou insira o código HEX</p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Temas Predefinidos</p>
                  <div className="flex flex-wrap gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => setLocalTenant({...localTenant, primaryColor: preset.color})}
                        className={`group relative flex items-center gap-2 p-1.5 rounded-full border transition-all ${localTenant.primaryColor === preset.color ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-100 hover:border-gray-300'}`}
                        title={preset.name}
                      >
                        <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: preset.color }} />
                        <span className={`text-[9px] font-black uppercase tracking-widest pr-3 ${localTenant.primaryColor === preset.color ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome da Organização</label>
              <input 
                type="text" 
                value={localTenant.name}
                onChange={(e) => setLocalTenant({...localTenant, name: e.target.value})}
                className="w-full px-5 py-4 border border-gray-100 bg-gray-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Automatic Alarms & Lead Time */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Alarmes & Lembretes</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">Configure quando o sistema deve avisar automaticamente o cliente sem ação manual.</p>
        </div>
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
           <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Antecedência do Alarme (Horas)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="72" 
                    value={localTenant.schedulingRules.reminderLeadTimeHours}
                    onChange={(e) => setLocalTenant({
                      ...localTenant, 
                      schedulingRules: { ...localTenant.schedulingRules, reminderLeadTimeHours: parseInt(e.target.value) }
                    })}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="w-20 text-center p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <span className="text-lg font-black text-indigo-700">{localTenant.schedulingRules.reminderLeadTimeHours}h</span>
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-2">O lembrete será enviado {localTenant.schedulingRules.reminderLeadTimeHours} horas antes da marcação.</p>
              </div>
           </div>
        </div>

        {/* Contact Templates Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Comunicações & Mensagens</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">Configure os modelos de mensagens enviados automaticamente aos clientes conforme o status.</p>
        </div>
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
           <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
             {['pending', 'confirmed', 'cancelled', 'completed', 'rescheduled', 'reminder'].map((st) => (
               <button 
                 key={st}
                 onClick={() => setActiveTemplateTab(st as any)}
                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTemplateTab === st ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
               >
                 {st === 'reminder' ? '🔔 LEMBRETE' : t(`status.${st}`)}
               </button>
             ))}
           </div>

           {activeTemplateTab !== 'staffWhatsApp' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Mensagem WhatsApp / SMS</label>
                  <textarea 
                    value={(localTenant.contactTemplates[activeTemplateTab] as any).whatsapp}
                    onChange={(e) => {
                      const updated = { ...localTenant.contactTemplates };
                      (updated[activeTemplateTab] as any).whatsapp = e.target.value;
                      (updated[activeTemplateTab] as any).sms = e.target.value;
                      setLocalTenant({ ...localTenant, contactTemplates: updated });
                    }}
                    className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assunto do E-mail</label>
                   <input 
                     type="text"
                     value={(localTenant.contactTemplates[activeTemplateTab] as any).emailSubject}
                     onChange={(e) => {
                        const updated = { ...localTenant.contactTemplates };
                        (updated[activeTemplateTab] as any).emailSubject = e.target.value;
                        setLocalTenant({ ...localTenant, contactTemplates: updated });
                     }}
                     className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                   />
                </div>
                <p className="text-[9px] text-indigo-400 font-bold italic">Variáveis disponíveis: {'{nome_cliente}, {servico}, {data}, {hora}, {funcionario}, {local}'}</p>
             </div>
           )}
        </div>

        {/* Dynamic Fields Section */}
        <div className="col-span-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Campos Personalizados</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">Crie campos adicionais para Clientes ou para a Agenda para capturar dados específicos do seu nicho.</p>
        </div>
        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
           <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
             <button onClick={() => setTargetCollection('client')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetCollection === 'client' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Gestão CRM</button>
             <button onClick={() => setTargetCollection('appointment')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetCollection === 'appointment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Agenda</button>
           </div>

           <div className="space-y-4">
             {(targetCollection === 'client' ? localTenant.clientCustomFields : localTenant.appointmentCustomFields).map(field => (
               <div key={field.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                   </div>
                   <div>
                     <p className="text-xs font-black text-gray-900 uppercase">{field.label}</p>
                     <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{field.type}</p>
                   </div>
                 </div>
                 <button onClick={() => removeCustomField(field.id, targetCollection)} className="p-3 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               </div>
             ))}
           </div>
           
           <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-50 space-y-4">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Novo Campo para {targetCollection === 'client' ? 'CRM' : 'Agenda'}</h4>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Nome do Campo"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="flex-1 px-5 py-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select 
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as any)}
                  className="px-5 py-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="text">TEXTO</option>
                  <option value="number">NÚMERO</option>
                  <option value="date">DATA</option>
                  <option value="time">HORA</option>
                  <option value="select">LISTA (SELECT)</option>
                </select>
                <button onClick={addCustomField} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                  Adicionar
                </button>
              </div>
           </div>
        </div>
      </div>
      
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-gray-100 p-4 rounded-[2.5rem] shadow-2xl flex gap-4 z-50 animate-in slide-in-from-bottom-10">
        <button 
          onClick={handleDiscard}
          className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
        >
          {t('common.discard')}
        </button>
        <button 
          onClick={handleSave}
          className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
};

export default Settings;
