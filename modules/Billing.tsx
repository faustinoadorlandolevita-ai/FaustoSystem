
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';
import { Invoice, InvoiceItem, InvoiceType, InvoiceStatus, Service, Client } from '../types';

const BillingModule: React.FC = () => {
  const { tenant, language, clients, services, invoices, setInvoices, notify } = useApp();
  const { t } = useTranslation(language);
  
  const [activeTab, setActiveTab] = useState<InvoiceStatus | 'all'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Partial<Invoice> | null>(null);

  const filteredInvoices = useMemo(() => {
    if (activeTab === 'all') return invoices;
    return invoices.filter(inv => inv.status === activeTab);
  }, [invoices, activeTab]);

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
    const taxableSubtotal = Math.max(0, subtotal - discountTotal);
    const taxTotal = taxableSubtotal * 0.14; // Default 14% IVA
    const total = taxableSubtotal + taxTotal;
    return { subtotal, taxTotal, total, discountTotal };
  };

  const handleSave = () => {
    if (!selectedInvoice || !selectedInvoice.clientId) {
      notify("Por favor, selecione um cliente.", "error");
      return;
    }
    const totals = calculateTotals(selectedInvoice.items || []);
    const fullInvoice = { 
      ...selectedInvoice, 
      ...totals,
      id: selectedInvoice.id || Date.now().toString()
    } as Invoice;
    
    if (invoices.find(i => i.id === fullInvoice.id)) {
      setInvoices(prev => prev.map(i => i.id === fullInvoice.id ? fullInvoice : i));
    } else {
      setInvoices(prev => [...prev, fullInvoice]);
    }
    
    setIsEditorOpen(false);
    notify(t('common.save'));
  };

  const openEditor = (invoice: Partial<Invoice> | null = null) => {
    setSelectedInvoice(invoice || {
      number: `${invoice?.type === 'proforma' ? 'PRO' : 'FT'} ${new Date().getFullYear()}/${(invoices.length + 1).toString().padStart(3, '0')}`,
      clientId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'invoice',
      status: 'draft',
      items: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      paidAmount: 0,
      discountTotal: 0,
      isElectronicallySigned: false
    });
    setIsEditorOpen(true);
  };

  const convertToInvoice = (proforma: Invoice) => {
    const newInvoice: Invoice = {
      ...proforma,
      id: Date.now().toString(),
      type: 'invoice',
      status: 'pending',
      number: `FT ${new Date().getFullYear()}/${(invoices.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [...prev, newInvoice]);
    notify("Estimativa convertida para Fatura!");
  };

  const generateReceipt = (invoice: Invoice) => {
    const receipt: Invoice = {
      ...invoice,
      id: Date.now().toString(),
      type: 'receipt',
      number: `RC ${new Date().getFullYear()}/${(invoices.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      status: 'paid'
    };
    setInvoices(prev => [...prev, receipt]);
    notify("Recibo gerado com sucesso!");
  };

  const handleSign = (invoiceId: string) => {
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, isElectronicallySigned: true, signatureClient: 'Carlos Oliveira (Digital)' } : i));
    notify("Documento assinado eletronicamente.");
    if (selectedInvoice?.id === invoiceId) {
       setSelectedInvoice(prev => prev ? { ...prev, isElectronicallySigned: true, signatureClient: 'Carlos Oliveira (Digital)' } : null);
    }
  };

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getClientName = (id: string) => getClient(id)?.name || "Cliente Desconhecido";

  const addItemFromService = (service: Service) => {
    if (!selectedInvoice) return;
    const items = [...(selectedInvoice.items || [])];
    const newItem: InvoiceItem = {
      id: Date.now().toString() + Math.random(),
      description: service.name,
      quantity: 1,
      unitPrice: service.price,
      taxPercent: 14,
      discount: 0
    };
    setSelectedInvoice({ ...selectedInvoice, items: [...items, newItem] });
  };

  const removeItem = (idx: number) => {
    if (!selectedInvoice) return;
    const items = [...(selectedInvoice.items || [])];
    items.splice(idx, 1);
    setSelectedInvoice({ ...selectedInvoice, items });
  };

  const updateItemQty = (idx: number, qty: number) => {
    if (!selectedInvoice) return;
    const items = [...(selectedInvoice.items || [])];
    items[idx].quantity = Math.max(1, qty);
    setSelectedInvoice({ ...selectedInvoice, items });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('billing.title')}</h2>
          <p className="text-sm text-gray-500 font-medium">Gestão profissional estilo Invoice Bee para faturas, proformas e recibos.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => openEditor()} 
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            {t('billing.newInvoice')}
          </button>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm self-start inline-flex gap-1 overflow-x-auto no-scrollbar">
        {['all', 'draft', 'pending', 'paid', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'all' ? 'Ver Todos' : t(`status.${tab}`)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5 text-left">{t('billing.invoiceNumber')}</th>
              <th className="px-8 py-5 text-left">{t('schedule.client')}</th>
              <th className="px-8 py-5 text-center">{t('common.status')}</th>
              <th className="px-8 py-5 text-right">{t('billing.total')}</th>
              <th className="px-8 py-5 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="group hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900">{inv.number}</span>
                    <span className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter">{t(`billing.${inv.type}`)}</span>
                  </div>
                </td>
                <td className="px-8 py-5 font-bold text-gray-600">{getClientName(inv.clientId)}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' : 
                    inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {t(`status.${inv.status}`)}
                  </span>
                </td>
                <td className="px-8 py-5 text-right font-black text-gray-900 tabular-nums">
                  {inv.total.toLocaleString(tenant.locale)} {tenant.currency}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    {inv.type === 'proforma' && (
                      <button onClick={() => convertToInvoice(inv)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100" title="Converter em Fatura">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </button>
                    )}
                    <button onClick={() => { setSelectedInvoice(inv); setIsPreviewOpen(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                    <button onClick={() => openEditor(inv)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
            <div className="p-10 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {selectedInvoice.id ? 'Editar Documento' : 'Novo Documento Financeiro'}
                </h3>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{selectedInvoice.number}</p>
              </div>
              <button onClick={() => setIsEditorOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 flex gap-10 custom-scrollbar">
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Documento</label>
                    <select 
                      value={selectedInvoice.type}
                      onChange={(e) => setSelectedInvoice({...selectedInvoice, type: e.target.value as any})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="proforma">Fatura Proforma (Estimativa)</option>
                      <option value="invoice">Fatura Definitiva</option>
                      <option value="receipt">Recibo de Pagamento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</label>
                    <select 
                      value={selectedInvoice.clientId}
                      onChange={(e) => setSelectedInvoice({...selectedInvoice, clientId: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Selecione o Cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data de Emissão</label>
                    <input 
                      type="date"
                      value={selectedInvoice.date}
                      onChange={(e) => setSelectedInvoice({...selectedInvoice, date: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data de Vencimento</label>
                    <input 
                      type="date"
                      value={selectedInvoice.dueDate}
                      onChange={(e) => setSelectedInvoice({...selectedInvoice, dueDate: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Itens & Serviços</h4>
                    <span className="text-[10px] text-gray-400 font-bold">Clique no (+) para adicionar do catálogo</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {services.filter(s => s.isActive).map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => addItemFromService(s)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {(selectedInvoice.items || []).map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => {
                              const items = [...(selectedInvoice.items || [])];
                              items[idx].description = e.target.value;
                              setSelectedInvoice({...selectedInvoice, items});
                            }}
                            className="w-full bg-transparent font-black text-gray-900 text-sm border-none focus:ring-0 p-0"
                          />
                        </div>
                        <div className="w-20">
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value))}
                            className="w-full bg-gray-50 rounded-xl px-3 py-1 text-center font-bold text-xs border border-gray-100 focus:ring-0"
                          />
                        </div>
                        <div className="w-32 text-right">
                          <span className="text-sm font-black text-gray-900">{(item.unitPrice * item.quantity).toLocaleString(tenant.locale)} {tenant.currency}</span>
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Panel */}
              <div className="w-80 space-y-8">
                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Resumo Financeiro</h4>
                  <div className="space-y-3">
                    {(() => {
                      const totals = calculateTotals(selectedInvoice.items || []);
                      return (
                        <>
                          <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Subtotal</span>
                            <span>{totals.subtotal.toLocaleString(tenant.locale)} {tenant.currency}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-red-400">
                            <span>Descontos</span>
                            <span>-{totals.discountTotal.toLocaleString(tenant.locale)} {tenant.currency}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-indigo-300">
                            <span>IVA (14%)</span>
                            <span>{totals.taxTotal.toLocaleString(tenant.locale)} {tenant.currency}</span>
                          </div>
                          <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase">Total a Pagar</span>
                            <span className="text-2xl font-black tabular-nums">{totals.total.toLocaleString(tenant.locale)} {tenant.currency}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white p-8 border border-gray-100 rounded-[2.5rem] shadow-sm space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Assinatura Digital</label>
                  {selectedInvoice.isElectronicallySigned ? (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Assinado: {selectedInvoice.signatureClient}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSign(selectedInvoice.id!)}
                      className="w-full py-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      Clique para Assinar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex gap-4">
               <button onClick={() => setIsEditorOpen(false)} className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500">Cancelar</button>
               <button onClick={handleSave} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">Guardar & Gerar Documento</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-[800px] shadow-2xl rounded-sm p-12 my-auto relative animate-in zoom-in-95">
             <button onClick={() => setIsPreviewOpen(false)} className="absolute -top-12 right-0 p-3 bg-white/10 text-white rounded-full hover:bg-white/20">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             
             {/* PDF Header Simulation */}
             <div className="flex justify-between items-start mb-16">
               <div>
                 <img src={tenant.logo} className="w-16 h-16 rounded-xl mb-4 grayscale" alt="Logo" />
                 <h2 className="text-xl font-black uppercase tracking-tight">{tenant.name}</h2>
                 <p className="text-[10px] text-gray-500 font-bold">NIF: 5000123456 • Luanda, Angola</p>
               </div>
               <div className="text-right">
                 <h1 className="text-3xl font-black text-gray-300 uppercase tracking-tighter mb-2">{t(`billing.${selectedInvoice.type}`)}</h1>
                 <p className="text-sm font-black">{selectedInvoice.number}</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase">{selectedInvoice.date}</p>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-20 mb-16">
               <div>
                 <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">Emitido Para</h4>
                 <p className="text-sm font-black text-gray-900">{getClientName(selectedInvoice.clientId!)}</p>
                 <p className="text-xs font-bold text-gray-500">{getClient(selectedInvoice.clientId!)?.email}</p>
                 <p className="text-xs font-bold text-gray-500">{getClient(selectedInvoice.clientId!)?.location.address}</p>
               </div>
               <div className="bg-gray-50 p-6 rounded-sm">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Informações de Pagamento</h4>
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Vencimento:</span>
                    <span className="text-xs font-black">{selectedInvoice.dueDate}</span>
                 </div>
                 <div className="flex justify-between items-end mt-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Status:</span>
                    <span className="text-xs font-black uppercase">{selectedInvoice.status}</span>
                 </div>
               </div>
             </div>

             <table className="w-full mb-16">
                <thead>
                  <tr className="border-b-2 border-gray-900 text-left text-[10px] font-black uppercase tracking-widest">
                    <th className="py-4">Descrição do Serviço</th>
                    <th className="py-4 text-center">Qtd</th>
                    <th className="py-4 text-right">Unitário</th>
                    <th className="py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoice.items?.map(item => (
                    <tr key={item.id} className="text-xs font-bold text-gray-700">
                      <td className="py-4">{item.description}</td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">{item.unitPrice.toLocaleString(tenant.locale)}</td>
                      <td className="py-4 text-right font-black">{(item.unitPrice * item.quantity).toLocaleString(tenant.locale)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>

             <div className="flex justify-end mb-20">
               <div className="w-64 space-y-3">
                 <div className="flex justify-between text-xs font-bold text-gray-500">
                   <span>Subtotal</span>
                   <span>{selectedInvoice.subtotal?.toLocaleString(tenant.locale)} {tenant.currency}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-gray-500">
                   <span>Impostos (IVA 14%)</span>
                   <span>{selectedInvoice.taxTotal?.toLocaleString(tenant.locale)} {tenant.currency}</span>
                 </div>
                 <div className="pt-3 border-t-2 border-gray-900 flex justify-between items-end">
                   <span className="text-xs font-black uppercase">Total Documento</span>
                   <span className="text-xl font-black tracking-tight">{selectedInvoice.total?.toLocaleString(tenant.locale)} {tenant.currency}</span>
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-20 border-t border-gray-100 pt-16">
               <div className="text-center space-y-4">
                 <div className="h-16 border-b border-gray-300 relative flex items-center justify-center">
                    {selectedInvoice.isElectronicallySigned && <span className="text-indigo-600 font-mono text-[10px] rotate-[-5deg] border-2 border-indigo-600 p-1 opacity-50 uppercase font-black">ASSINADO DIGITALMENTE</span>}
                 </div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assinatura do Cliente</p>
               </div>
               <div className="text-center space-y-4">
                 <div className="h-16 border-b border-gray-300"></div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pela {tenant.name}</p>
               </div>
             </div>

             <div className="mt-20 flex justify-center gap-4 no-print">
               <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Imprimir / PDF</button>
               <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Fechar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingModule;
