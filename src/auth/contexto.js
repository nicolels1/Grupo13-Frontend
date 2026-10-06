import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// sessão do Supabase, perfil da conta (GET /me) e as ações de entrar e sair
export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro do <AuthProvider>')
  return contexto
}
