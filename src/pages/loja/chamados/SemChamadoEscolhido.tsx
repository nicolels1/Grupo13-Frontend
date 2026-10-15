import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router'

import { CATEGORIAS_CHAMADO } from '@/lib/formato'
import { IconeDaCategoria } from './IconeDaCategoria'

// lado direito sem chamado aberto (só no computador): convite com atalhos por assunto
export function SemChamadoEscolhido() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-aco text-white">
        <MessageCircle className="size-8" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-2">
        <p className="font-titulo text-2xl">Fale com a equipe</p>
        <p className="text-sm text-muted-foreground">
          Escolha um chamado na lista para ver a conversa, ou comece um novo pelo assunto. Uma pessoa da equipe responde por aqui.
        </p>
      </div>
      <ul className="flex max-w-lg flex-wrap justify-center gap-2">
        {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => (
          <li key={valor}>
            <Link
              to={`/loja/chamados/novo?categoria=${valor}`}
              className="flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:border-aco hover:bg-aco-fundo"
            >
              <IconeDaCategoria categoria={valor} className="size-4 text-aco" />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
