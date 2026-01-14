
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yyrfquhqyrgrirndtwsh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fY6DdqZxFoXP-pEbY8Deiw_V3XQhFE3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const saveUserData = async (userId: string, data: any) => {
  const { error } = await supabase
    .from('user_data')
    .upsert({ 
      user_id: userId, 
      payload: data, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'user_id' });
  
  if (error) console.error("Error saving data to Supabase:", error.message || error);
};

export const loadUserData = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_data')
    .select('payload')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error("Error loading data from Supabase:", error.message || error);
    return null;
  }
  return data?.payload || null;
};
