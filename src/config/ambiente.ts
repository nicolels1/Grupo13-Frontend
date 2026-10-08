// o que muda por ambiente (local, prévia, produção), num lugar só. Os valores vêm do .env
// (ver .env.example); tudo que começa com VITE_ vai para o navegador, então aqui nunca entra segredo

const semBarraNoFim = (url: string | undefined) => (url ?? '').replace(/\/$/, '')

// endereço da API (o backend no Render ou o local)
export const API_URL = semBarraNoFim(import.meta.env.VITE_API_URL)

// projeto do Supabase, usado só para o login
export const SUPABASE_URL = semBarraNoFim(import.meta.env.VITE_SUPABASE_URL)
export const SUPABASE_CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
