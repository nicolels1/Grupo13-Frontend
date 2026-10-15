import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

// cabeçalho do lado direito, igual na conversa e no chamado novo; no celular traz a volta para a lista
export function CabecalhoDoLado({ icone, titulo, children, direita }: { icone: ReactNode; titulo: ReactNode; children?: ReactNode; direita?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b px-4 py-4 sm:px-5">
      <Link
        to="/loja/chamados"
        aria-label="Voltar aos chamados"
        className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-superficie lg:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-aco text-white max-lg:hidden">{icone}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-titulo text-2xl leading-tight">{titulo}</h2>
        {children}
      </div>
      {direita}
    </header>
  )
}
