import { Link, useRouteError } from 'react-router'

import { Aviso } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'

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
