
import React, { useState } from 'react';
import { useApp } from '../App';
import { useTranslation } from '../services/i18n';

const Header: React.FC = () => {
  const { currentView, language, user, handleLogout } = useApp();
  const { t } = useTranslation(language);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getTitle = () => {
    return t(`sidebar.${currentView}`);
  };

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 md:px-10">
      <div className="flex items-center gap-6">
        <button className="md:hidden p-3 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-2xl font-black text-gray-900 tracking-tighter">{getTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center bg-gray-50 rounded-2xl px-5 py-2.5 gap-3 border border-gray-100 shadow-inner group">
          <svg className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={t('common.search')}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 w-32 md:w-64 text-gray-700 placeholder:text-gray-300" 
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-100">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none mb-1">Conta Ativa</p>
              <p className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">{user?.email}</p>
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-4 w-64 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-gray-50 mb-2">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Logado como</p>
                <p className="text-xs font-bold text-gray-900 truncate">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Terminar Sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
