import { createClient } from '@supabase/supabase-js'
import { APP } from './lib/app.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// L'app atleta non usa Supabase Auth (l'atleta entra con il suo token): niente sessione salvata,
// così non legge né tocca la sessione del PT sullo stesso telefono (su Android lo storage è condiviso).
export const supabase = createClient(supabaseUrl, supabaseAnonKey,
  APP === 'atleta'
    ? { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ptstudio-atleta-noauth' } }
    : undefined)
