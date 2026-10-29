/// <reference types="vite/client" />

// variáveis do .env que o Vite expõe ao navegador (ver .env.example)
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_LINK_ASSISTENTE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
