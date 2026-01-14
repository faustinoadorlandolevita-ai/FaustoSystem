
import React, { useState, useMemo, useRef } from 'react';
import { CustomField, Client, ClientStatus, ClientType, Appointment, Invoice } from '../types';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';

const INITIAL_CLIENT_STATE: Partial<Client> = {
  name: '',
  type: 'individual' as ClientType,
  phone: '',
  email: '',
  status: 'active' as ClientStatus,
  tags: [],
  location: {
    country: 'Angola',
    state: 'Luanda',
    city: 'Luanda',
    neighborhood: '',
    address: '',
  },
  customData: {},
  attachments: [],
  whatsappSameAsPhone: true,
};

const Clients: React.FC = () => {
  const { tenant, language, clients, setClients, appointments, invoices, notify } = useApp();
  const { t } = useTranslation(language);
  
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<Partial<Client>>(INITIAL_CLIENT_STATE);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'history' | 'billing' | 'info' | 'custom'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all');

  // CSV Import States
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientFields = [
    { key: 'name', label: 'Nome Completo (Obrigatório)', required: true },
    { key: 'phone', label: 'Telefone Principal (Obrigatório)', required: true },
    { key: 'email', label: 'E-mail', required: false },
    { key: 'taxId', label: 'NIF / Tax ID', required: false },
    { key: 'address', label: 'Endereço / Rua', required: false },
    { key: 'neighborhood', label: 'Bairro', required: false },
    { key: 'city', label: 'Cidade', required: false },
  ];

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

  const clientAppointments = useMemo(() => 
    appointments.filter(a => a.clientId === selectedClientId).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
  , [appointments, selectedClientId]);

  const clientInvoices = useMemo(() => 
    invoices.filter(i => i.clientId === selectedClientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [invoices, selectedClientId]);

  const totalSpent = useMemo(() => 
    clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0)
  , [clientInvoices]);

  const updateClientStatus = (id: string, newStatus: ClientStatus) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    notify("Status atualizado com sucesso");
  };

  const deleteClient = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.")) {
      setClients(prev => prev.filter(c => c.id !== id));
      setSelectedClientId(clients.find(c => c.id !== id)?.id || null);
      notify("Cliente removido", "success");
    }
  };

  const handleWhatsApp = (client: Client) => {
    const message = tenant.contactTemplates.whatsapp.replace('{nome_cliente}', client.name).replace('{nome_empresa}', tenant.name);
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name || !newClientData.phone) {
      notify("Nome e Telefone são obrigatórios", "error");
      return;
    }

    const clientToAdd: Client = {
      ...INITIAL_CLIENT_STATE,
      ...newClientData,
      id: `cl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customData: newClientData.customData || {}
    } as Client;

    setClients(prev => [clientToAdd, ...prev]);
    setIsNewClientModalOpen(false);
    setNewClientData(INITIAL_CLIENT_STATE);
    setSelectedClientId(clientToAdd.id);
    notify("Cliente registrado com sucesso!", "success");
  };

  // CSV Import Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        notify("O arquivo está vazio", "error");
        return;
      }

      const rows = lines.map(line => {
        // Handle basic quoted CSV splitting
        return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
      });

      setCsvHeaders(rows[0]);
      setCsvRows(rows.slice(1));
      
      // Auto-mapping attempt
      const newMapping: Record<string, number> = {};
      rows[0].forEach((header, index) => {
        const h = header.toLowerCase();
        if (h.includes('nome')) newMapping['name'] = index;
        if (h.includes('telef') || h.includes('phone') || h.includes('celu')) newMapping['phone'] = index;
        if (h.includes('email') || h.includes('e-mail')) newMapping['email'] = index;
        if (h.includes('nif') || h.includes('tax')) newMapping['taxId'] = index;
        if (h.includes('ender') || h.includes('rua') || h.includes('address')) newMapping['address'] = index;
        if (h.includes('bairro')) newMapping['neighborhood'] = index;
        if (h.includes('cidad') || h.includes('city')) newMapping['city'] = index;
      });
      setMapping(newMapping);
    };
    reader.readAsText(file);
  };

  const handleFinalizeImport = () => {
    if (mapping['name'] === undefined || mapping['phone'] === undefined) {
      notify("Mapeie pelo menos os campos Nome e Telefone", "error");
      return;
    }

    const importedClients: Client[] = csvRows.map((row, idx) => {
      return {
        ...INITIAL_CLIENT_STATE,
        id: `cl-imp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        name: row[mapping['name']] || `Importado ${idx + 1}`,
        phone: row[mapping['phone']] || '---',
        email: mapping['email'] !== undefined ? row[mapping['email']] : '',
        taxId: mapping['taxId'] !== undefined ? row[mapping['taxId']] : '',
        location: {
          ...INITIAL_CLIENT_STATE.location!,
          address: mapping['address'] !== undefined ? row[mapping['address']] : '',
          neighborhood: mapping['neighborhood'] !== undefined ? row[mapping['neighborhood']] : '',
          city: mapping['city'] !== undefined ? row[mapping['city']] : 'Luanda',
        },
        createdAt: new Date().toISOString(),
        customData: {}
      } as Client;
    });

    setClients(prev => [...importedClients, ...prev]);
    setIsImportModalOpen(false);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    notify(`${importedClients.length} clientes importados com sucesso!`, "success");
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('clients.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('clients.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            Importar CSV
          </button>
          <button 
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
          >
            + {t('clients.addNew')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Lista de Clientes */}
        <div className="w-1/3 flex flex-col space-y-4 min-w-[340px]">
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
                className={`w-full text-left p-5 rounded-[2.5rem] border transition-all ${selectedClientId === client.id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-indigo-600 text-lg shadow-sm">
                    {client.photo ? <img src={client.photo} className="w-full h-full object-cover rounded-2xl" alt="" /> : client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 truncate tracking-tight">{client.name}</h4>
                    <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{client.phone}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Painel de Detalhes 360° */}
        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-[3rem] shadow-sm overflow-hidden">
          {selectedClient ? (
            <>
              <div className="p-10 bg-gray-50/20 border-b border-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-8">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white border-4 border-white shadow-2xl overflow-hidden">
                      {selectedClient.photo ? <img src={selectedClient.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-indigo-600 bg-indigo-50">{selectedClient.name.charAt(0)}</div>}
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedClient.name}</h3>
                        <select 
                          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm outline-none border-none cursor-pointer ${selectedClient.status === 'active' ? 'bg-green-100 text-green-700' : selectedClient.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
                          value={selectedClient.status}
                          onChange={(e) => updateClientStatus(selectedClient.id, e.target.value as any)}
                        >
                          <option value="active">ATIVO</option>
                          <option value="inactive">INATIVO</option>
                          <option value="blocked">BLOQUEADO</option>
                        </select>
                      </div>
                      <p className="text-sm font-bold text-gray-400">{selectedClient.email} • {selectedClient.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-10 mt-12 border-b border-gray-100">
                  {[
                    { id: 'history', label: 'Histórico de Serviços' },
                    { id: 'billing', label: 'Faturas & Pagamentos' },
                    { id: 'info', label: 'Info & Localização' },
                    { id: 'custom', label: 'Campos Personalizados' }
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

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-gray-50/10">
                {activeTab === 'history' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Agendamentos</p>
                        <h4 className="text-3xl font-black text-gray-900">{clientAppointments.length}</h4>
                      </div>
                      <div className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Investido</p>
                        <h4 className="text-3xl font-black text-indigo-600 tabular-nums">{totalSpent.toLocaleString(tenant.locale)} {tenant.currency}</h4>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'info' && (
                   <div className="grid grid-cols-2 gap-10 animate-in fade-in duration-300">
                      <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-6">
                         <div>
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Endereço Principal</h5>
                            <p className="text-sm font-bold text-gray-900">{selectedClient.location.address || '---'}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bairro</h5>
                               <p className="text-sm font-bold text-gray-900">{selectedClient.location.neighborhood || '---'}</p>
                            </div>
                            <div>
                               <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cidade</h5>
                               <p className="text-sm font-bold text-gray-900">{selectedClient.location.city || '---'}</p>
                            </div>
                         </div>
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
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Seleccione um Cliente</h3>
            </div>
          )}
        </div>
      </div>

      {/* Modal Importar CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[85vh]">
            <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Importação Mestre via CSV</h3>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1">Sincronize a sua base de dados externa</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {csvHeaders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 border-2 border-dashed border-gray-200 rounded-[3rem]">
                   <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                     <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                   </div>
                   <div className="text-center">
                     <h4 className="text-lg font-black text-gray-900 uppercase">Selecione o seu arquivo .csv</h4>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">A primeira linha deve conter os cabeçalhos</p>
                   </div>
                   <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                   <button onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Explorar Arquivos</button>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                   <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                     <div>
                       <p className="text-[10px] font-black text-indigo-600 uppercase">Arquivo Detectado</p>
                       <p className="text-sm font-black text-indigo-900 uppercase">{csvRows.length} Clientes Identificados</p>
                     </div>
                     <button onClick={() => setCsvHeaders([])} className="text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase">Trocar Arquivo</button>
                   </div>

                   <div>
                     <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Mapeamento de Colunas</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {clientFields.map(field => (
                          <div key={field.key} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-3">
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.label}</label>
                             <select 
                               value={mapping[field.key] ?? ""}
                               onChange={(e) => setMapping({...mapping, [field.key]: e.target.value === "" ? -1 : parseInt(e.target.value)})}
                               className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold outline-none ${mapping[field.key] !== undefined && mapping[field.key] !== -1 ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-100'}`}
                             >
                               <option value="">-- Não Mapear --</option>
                               {csvHeaders.map((header, idx) => (
                                 <option key={idx} value={idx}>{header}</option>
                               ))}
                             </select>
                          </div>
                        ))}
                     </div>
                   </div>

                   <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Pré-visualização do 1º Registro</h4>
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 overflow-x-auto">
                        <div className="grid grid-cols-4 gap-4">
                           {clientFields.filter(f => mapping[f.key] !== undefined && mapping[f.key] !== -1).map(f => (
                             <div key={f.key}>
                               <p className="text-[8px] font-black text-gray-400 uppercase">{f.label.split('(')[0]}</p>
                               <p className="text-xs font-black text-gray-900 truncate">{csvRows[0][mapping[f.key]]}</p>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>

            {csvHeaders.length > 0 && (
              <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
                <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500">Cancelar</button>
                <button onClick={handleFinalizeImport} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100">Confirmar e Importar Agora</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[85vh]">
            <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Registo Mestre de Cliente</h3>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">FaustoSystem CRM v2.0</p>
              </div>
              <button onClick={() => setIsNewClientModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <form onSubmit={handleSaveNewClient} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nome Completo / Razão Social</label>
                  <input type="text" required value={newClientData.name} onChange={(e) => setNewClientData({...newClientData, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">E-mail</label>
                  <input type="email" required value={newClientData.email} onChange={(e) => setNewClientData({...newClientData, email: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Telefone Principal</label>
                  <input type="tel" required value={newClientData.phone} onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">NIF / Tax ID</label>
                  <input type="text" value={newClientData.taxId} onChange={(e) => setNewClientData({...newClientData, taxId: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tipo de Cliente</label>
                  <select value={newClientData.type} onChange={(e) => setNewClientData({...newClientData, type: e.target.value as any})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
                    <option value="individual">Pessoa Física</option>
                    <option value="company">Empresa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-2">Endereço & Localização</h4>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <input type="text" placeholder="Rua, Edifício, Nº Porta" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setNewClientData({...newClientData, location: {...newClientData.location!, address: e.target.value}})} />
                    </div>
                    <input type="text" placeholder="Bairro" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setNewClientData({...newClientData, location: {...newClientData.location!, neighborhood: e.target.value}})} />
                    <input type="text" placeholder="Cidade" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setNewClientData({...newClientData, location: {...newClientData.location!, city: e.target.value}})} />
                 </div>
              </div>
            </form>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
               <button type="button" onClick={() => setIsNewClientModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500">Cancelar</button>
               <button type="submit" onClick={handleSaveNewClient} className="flex-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Registar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
