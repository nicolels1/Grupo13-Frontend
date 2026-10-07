import { Link, Navigate, useRouteError } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'

// "/": cada tipo de conta vai para a sua plataforma; sem login, para a vitrine
export function RotaInicial() {
  const { sessao, perfil, carregando, erroPerfil } = useAuth()
  if (carregando) return <Carregando />
  if (!sessao || erroPerfil) return <Navigate to={sessao ? '/interno' : '/loja'} replace />
  return <Navigate to={perfil?.tipo_conta === 'interna' ? '/interno' : '/loja'} replace />
}

// lugar de uma tela que ainda vai ser feita
export function EmConstrucao({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <section className="space-y-2">
      <h1 className="font-heading text-2xl font-semibold">{titulo}</h1>
      <p className="text-sm text-muted-foreground">{descricao ?? 'Tela em construção.'}</p>
    </section>
  )
}

export function NaoEncontrada() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>Voltar ao início</Link>
    </main>
  )
}

// erro inesperado numa página: mostra uma mensagem em vez da tela branca
export function ErroDaPagina() {
  const erro = useRouteError()
  console.error(erro)
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Aviso titulo="Algo deu errado nesta página" mensagem="Recarregue a página. Se continuar, avise a equipe." />
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>Voltar ao início</Link>
    </main>
  )
}
