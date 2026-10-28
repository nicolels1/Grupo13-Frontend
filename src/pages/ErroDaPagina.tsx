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
      {/* só no ambiente de desenvolvimento: o erro de verdade, para quem está programando */}
      {import.meta.env.DEV && (
        <pre className="overflow-x-auto bg-superficie p-3 text-xs whitespace-pre-wrap">
          {erro instanceof Error ? `${erro.message}\n\n${erro.stack ?? ''}` : String(erro)}
        </pre>
      )}
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>Voltar ao início</Link>
    </main>
  )
}
