import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { Aviso, Carregando } from '@/components/Estados'
import { podeVerArea, type Area } from './areas'
import { useAuth } from './contexto'

// exige login e, se `tipo` vier, o tipo de conta ('interna' ou 'cliente').
// Sem login, manda para /entrar lembrando a página de onde veio.
export function ExigeLogin({ tipo, children }: { tipo?: 'interna' | 'cliente'; children: ReactNode }) {
  const { sessao, perfil, erroPerfil, carregando, sair, recarregarPerfil } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando texto="Carregando sua conta..." />
  if (!sessao) return <Navigate to="/entrar" replace state={{ voltarPara: local.pathname + local.search }} />

  if (erroPerfil) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Aviso titulo="Não foi possível abrir sua conta" mensagem={erroPerfil}>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={recarregarPerfil}>Tentar de novo</Button>
            <Button size="sm" variant="ghost" onClick={sair}>Sair</Button>
          </div>
        </Aviso>
      </div>
    )
  }

  // conta do outro tipo vai para a plataforma dela
  if (tipo && perfil?.tipo_conta !== tipo) return <Navigate to="/" replace />
  return children
}

// exige poder ver a área da plataforma interna (permissão da área ou Admin)
export function ExigeArea({ area, children }: { area: Area; children: ReactNode }) {
  const { perfil } = useAuth()
  if (!podeVerArea(perfil, area)) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Aviso titulo="Sem acesso" mensagem={`Sua conta não tem permissão para a área ${area.rotulo}.`} />
      </div>
    )
  }
  return children
}
