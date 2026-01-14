
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yyrfquhqyrgrirndtwsh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fY6DdqZxFoXP-pEbY8Deiw_V3XQhFE3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_STORAGE_KEY_PREFIX = 'faustosystem_data_';

/**
 * Salva os dados do utilizador.
 * Tenta persistir no Supabase, mas sempre garante o salvamento no localStorage para resiliência.
 */
export const saveUserData = async (userId: string, data: any) => {
  // 1. Salvamento prioritário no localStorage (Garante funcionamento offline/local-first)
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
  } catch (e) {
    console.warn("Falha ao salvar no armazenamento local:", e);
  }

  // 2. Tentativa de persistência remota no Supabase
  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: userId, 
        payload: data, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' });
    
    if (error) {
      // Ignora o log se for erro de schema (tabela não criada ainda)
      if (!error.message.includes('schema cache')) {
        console.error("Erro ao sincronizar com Supabase:", error.message);
      }
    }
  } catch (err) {
    // Erros de rede ou outros são ignorados pois o localStorage já garantiu a persistência
  }
};

/**
 * Carrega os dados do utilizador.
 * Tenta carregar do Supabase; se falhar ou estiver vazio, recorre ao localStorage.
 */
export const loadUserData = async (userId: string) => {
  let remoteData = null;
  
  // 1. Tenta carregar do Supabase
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      remoteData = data.payload;
    } else if (error && error.code !== 'PGRST116' && !error.message.includes('schema cache')) {
      console.warn("Supabase remoto indisponível, usando cache local.");
    }
  } catch (e) {
    // Falha de conexão
  }

  // 2. Se falhou o remoto ou não existe, usa o localStorage
  if (!remoteData) {
    const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error("Erro ao processar dados do cache local");
        return null;
      }
    }
  }

  return remoteData;
};
