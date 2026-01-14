
import React, { useState } from 'react';
import { suggestServices } from '../services/gemini';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';
import { Service, PricingType } from '../types';

const ServicesModule: React.FC = () => {
  const { language, tenant, services, setServices, notify } = useApp();
  const { t } = useTranslation(language);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    const suggestions = await suggestServices(language === 'pt' ? "Manutenção Residencial" : "Home Maintenance");
    if (suggestions.length > 0) {
      const formatted = suggestions.map((s: any, i: number) => ({
        id: `ai-${i}-${Date.now()}`,
        name: s.name,
        description: s.description || '',
        duration: s.duration || 60,
        preparationTime: 0,
        bufferTime: 0,
        price: s.estimated_price || 0,
        pricingType: 'fixed' as PricingType,
        categoryId: language === 'pt' ? 'Sugerido' : 'Suggested',
        requiresApproval: false,
        allowFileUpload: false,
        requiredFiles: false,
        staffIds: [],
        simultaneousLimit: 1,
        isActive: true
      }));
      setServices([...services, ...formatted]);
      notify("Serviços sugeridos com sucesso!");
    }
    setLoadingAi(false);
  };

  const handleSave = () => {
    if (!currentService) return;
    if (currentService.id) {
      setServices(prev => prev.map(s => s.id === currentService.id ? { ...s, ...currentService } as Service : s));
    } else {
      const newService = { ...currentService, id: Date.now().toString() } as Service;
      setServices(prev => [...prev, newService]);
    }
    setIsEditing(false);
    notify(t('common.save'));
  };

  const toggleStatus = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    notify("Estado alterado");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('services.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('services.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiSuggest} disabled={loadingAi} className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
            {loadingAi ? t('common.loading') : '✨ ' + t('services.aiSuggest')}
          </button>
          <button onClick={() => { setCurrentService({ name: '', duration: 30, price: 0, isActive: true }); setIsEditing(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
            + {t('services.addNew')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden ${!service.isActive && 'opacity-60'}`}>
            <div className="flex justify-between items-start mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                {service.categoryId || 'Geral'}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => toggleStatus(service.id)} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-xl" title="Ativar/Desativar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </button>
                <button onClick={() => { setCurrentService(service); setIsEditing(true); }} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-2 truncate">{service.name}</h3>
            <p className="text-xs text-gray-400 mb-8 line-clamp-2 h-8 leading-relaxed font-medium">
              {service.description || 'Sem descrição.'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-3xl flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('services.duration')}</span>
                <span className="text-sm font-black text-indigo-700">{service.duration} min</span>
              </div>
              <div className="p-5 bg-gray-50 rounded-3xl flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('services.price')}</span>
                <span className="text-sm font-black text-gray-900">{service.price.toLocaleString(tenant.locale)} {tenant.currency}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && currentService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{currentService.id ? t('common.edit') : t('services.addNew')}</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome</label>
                <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentService.name} onChange={(e) => setCurrentService({...currentService, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duração (min)</label>
                  <input type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentService.duration} onChange={(e) => setCurrentService({...currentService, duration: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Preço ({tenant.currency})</label>
                  <input type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={currentService.price} onChange={(e) => setCurrentService({...currentService, price: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 flex gap-4">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesModule;
