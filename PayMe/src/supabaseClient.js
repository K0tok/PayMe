import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Необходимо указать VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в переменных окружения');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);