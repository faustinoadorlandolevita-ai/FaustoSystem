
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getGeminiInsights } from '../services/gemini';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';

const Dashboard: React.FC = () => {
  const { language } = useApp();
  const { t } = useTranslation(language);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const MOCK_REVENUE = [
    { name: language === 'pt' ? 'Seg' : 'Mon', total: 4000 },
    { name: language === 'pt' ? 'Ter' : 'Tue', total: 3000 },
    { name: language === 'pt' ? 'Qua' : 'Wed', total: 2000 },
    { name: language === 'pt' ? 'Qui' : 'Thu', total: 2780 },
    { name: language === 'pt' ? 'Sex' : 'Fri', total: 1890 },
    { name: language === 'pt' ? 'Sab' : 'Sat', total: 2390 },
    { name: language === 'pt' ? 'Dom' : 'Sun', total: 3490 },
  ];

  const fetchInsights = async () => {
    setLoadingAi(true);
    const result = await getGeminiInsights("Analise nosso desempenho semanal e sugira melhorias para o crescimento.", { revenue: MOCK_REVENUE });
    setAiInsight(result.text);
    setLoadingAi(false);
  };

  const stats = [
    { label: t('dashboard.stats.appointments'), value: '128', change: '+12%', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: t('dashboard.stats.clients'), value: '45', change: '+5%', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: t('dashboard.stats.revenue'), value: '250.000 Kz', change: '+18%', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: t('dashboard.stats.completion'), value: '94.2%', change: '+2%', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">{t('dashboard.analytics')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
              </svg>
              {t('dashboard.aiInsights.title')}
            </h3>
            <p className="text-indigo-100 text-sm mb-6">
              {t('dashboard.aiInsights.desc')}
            </p>
            {aiInsight ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-xs leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar">
                {aiInsight}
              </div>
            ) : (
              <button 
                onClick={fetchInsights}
                disabled={loadingAi}
                className="w-full bg-white text-indigo-700 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                {loadingAi ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : t('dashboard.aiInsights.button')}
              </button>
            )}
          </div>
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold mb-4">{t('dashboard.upcoming')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <th className="pb-4">{t('schedule.client')}</th>
                <th className="pb-4">{t('schedule.service')}</th>
                <th className="pb-4">{t('schedule.date')} & {t('schedule.time')}</th>
                <th className="pb-4">{t('schedule.staff')}</th>
                <th className="pb-4">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3].map((_, i) => (
                <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold">{String.fromCharCode(65 + i)}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Cliente {i + 1}</p>
                        <p className="text-[10px] text-gray-400 font-medium">exemplo@mail.com</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-xs font-bold text-gray-600">Limpeza Profunda</td>
                  <td className="py-4 text-xs text-gray-500 font-medium">Hoje, 14:30</td>
                  <td className="py-4 text-xs text-gray-600 font-bold">Sarah Martins</td>
                  <td className="py-4">
                    <span className="text-[9px] font-black uppercase px-2 py-1 bg-amber-50 text-amber-600 rounded-md">{t('status.pending')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
