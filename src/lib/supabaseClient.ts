import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// o link do convite da equipe (e o de um link vencido) cai no endereço do site, não em
// /redefinir-senha: antes de o cliente ler o link, leva para lá, onde a pessoa cria a senha
const link = window.location.hash
if (window.location.pathname !== '/redefinir-senha' && (link.includes('type=invite') || link.includes('error_code='))) {
  const convite = link.includes('type=invite') ? '?convite=1' : ''
  window.history.replaceState(null, '', `/redefinir-senha${convite}${link}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
