import { Navigate } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Carregando } from '@/components/Estados'

// "/": cada tipo de conta vai para a sua plataforma; sem login, para a vitrine
export function RotaInicial() {
  const { sessao, perfil, carregando, erroPerfil } = useAuth()
  if (carregando) return <Carregando />
  if (!sessao || erroPerfil) return <Navigate to={sessao ? '/interno' : '/loja'} replace />
  return <Navigate to={perfil?.tipo_conta === 'interna' ? '/interno' : '/loja'} replace />
}
