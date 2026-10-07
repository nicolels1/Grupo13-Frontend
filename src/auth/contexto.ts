import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

import type { Esquema } from '@/lib/api'

export type ValorAuth = {
  // undefined = ainda lendo a sessão salva; null = ninguém logado
  sessao: Session | null | undefined
  perfil: Esquema<'Perfil'> | null
  erroPerfil: string | null
  carregando: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  entrarComCpf: (cpf: string, senha: string) => Promise<void>
  sair: () => Promise<unknown>
  recarregarPerfil: () => void
}

export const AuthContext = createContext<ValorAuth | null>(null)

// sessão do Supabase, perfil da conta (GET /me) e as ações de entrar e sair
export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro do <AuthProvider>')
  return contexto
}
