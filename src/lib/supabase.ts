import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vcaisuhqogmlyrhgzzzc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Fe0-PlU83RZUvxqBz0T1Rw_BEz3d4vs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
