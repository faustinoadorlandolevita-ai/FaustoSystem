
import React, { useState, useMemo } from 'react';
import { CustomField, Client, ClientStatus } from '../types';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';

const Clients: React.FC = () => {
  const { tenant, language, clients, setClients, notify } = useApp();
  const { t } = useTranslation(language);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'history' | 'info' | 'location' | 'custom' | 'attachments'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all');

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.phone.includes(searchQuery) || 
                            c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, filterStatus]);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId) || null
  , [clients, selectedClientId]);

  const updateClientStatus = (id: string, newStatus: ClientStatus) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    notify(t('common.save'));
  };

  const handleWhatsApp = (client: Client) => {
    const message = tenant.contactTemplates.whatsapp.replace('{nome_cliente}', client.name).replace('{nome_empresa}', tenant.name);
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('clients.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('clients.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFormBuilderOpen(true)}
            className="px-4 py-2 bg-white border border-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            {t('clients.customize')}
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
            + {t('clients.addNew')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        <div className="w-1/3 flex flex-col space-y-4 min-w-[320px]">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder={t('common.search')}
                className="w-full pl-11 pr-4 py-3 border border-gray-100 bg-gray-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={`w-full text-left p-5 rounded-[2rem] border transition-all ${selectedClientId === client.id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-lg shadow-inner border-2 border-white">
                    {client.photo ? <img src={client.photo} className="w-full h-full object-cover rounded-2xl" alt="" /> : client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 truncate tracking-tight">{client.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{client.phone}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${client.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-[3rem] shadow-sm overflow-hidden">
          {selectedClient ? (
            <>
              <div className="p-10 bg-gray-50/20 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-8">
                    <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-100 flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden">
                      {selectedClient.photo ? <img src={selectedClient.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-5xl font-black text-indigo-600">{selectedClient.name.charAt(0)}</span>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedClient.name}</h3>
                        <select 
                          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm outline-none border-none cursor-pointer ${selectedClient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                          value={selectedClient.status}
                          onChange={(e) => updateClientStatus(selectedClient.id, e.target.value as any)}
                        >
                          <option value="active">ATIVO</option>
                          <option value="inactive">INATIVO</option>
                          <option value="blocked">BLOQUEADO</option>
                        </select>
                      </div>
                      <p className="text-sm font-bold text-gray-400">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => handleWhatsApp(selectedClient)} className="px-6 py-3 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-600 transition-all flex items-center gap-3">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.431 5.63 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      {t('clients.quickWhatsApp')}
                    </button>
                  </div>
                </div>

                <div className="flex gap-10 mt-12 border-b border-gray-100">
                  {[
                    { id: 'history', label: t('clients.history') },
                    { id: 'info', label: t('clients.info') },
                    { id: 'location', label: t('clients.location') }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-5 text-[10px] font-black transition-all relative uppercase tracking-widest ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {tab.label}
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {activeTab === 'history' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="p-8 bg-indigo-50/50 border border-indigo-50 rounded-[2rem] shadow-sm">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{t('clients.totalSpent')}</p>
                        <h4 className="text-3xl font-black text-indigo-900 tabular-nums">125.000,00 Kz</h4>
                      </div>
                      <div className="p-8 bg-gray-50 border border-gray-50 rounded-[2rem] shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('clients.lastService')}</p>
                        <h4 className="text-lg font-black text-gray-900">Limpeza Profunda</h4>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6">
              <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center text-gray-100">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Seleccione um Cliente</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
