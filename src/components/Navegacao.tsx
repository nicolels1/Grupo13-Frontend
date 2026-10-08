import type { ReactNode } from 'react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'

type Aba<V extends string> = { valor: V; rotulo: string; contagem?: number | null }

// abas sublinhadas. A linha de baixo é uma sombra interna (não ocupa espaço): a aba ativa a cobre
// sem sair da caixa, então a lista não ganha barra de rolagem. Sem espaço, ela desliza para o lado.
export function Abas<V extends string>({
  abas,
  valor,
  aoMudar,
  rotulo,
  className,
  semLinha,
}: {
  abas: Aba<V>[]
  valor: V
  aoMudar: (valor: V) => void
  rotulo: string
  className?: string
  // sem a linha cinza de baixo (abas dentro do bloco do Cabecalho)
  semLinha?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className={cn(
        'flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        !semLinha && 'shadow-[inset_0_-1px_0_var(--border)]',
        className,
      )}
    >
      {abas.map((aba) => (
        <button
          key={aba.valor}
          type="button"
          role="tab"
          aria-selected={valor === aba.valor}
          onClick={() => aoMudar(aba.valor)}
          className={cn(
            'shrink-0 border-b-2 pb-2 text-sm transition-colors',
            valor === aba.valor
              ? 'border-foreground font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {aba.rotulo}
          {aba.contagem !== undefined && aba.contagem !== null && (
            <span className="ml-1.5 text-muted-foreground">{aba.contagem}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// navegação de uma lista paginada da API ({ total, limit, offset })
export function Paginacao({
  pagina,
  aoMudar,
  rotulo = 'itens',
}: {
  pagina: { total: number; limit: number; offset: number } | null | undefined
  aoMudar: (offset: number) => void
  rotulo?: string
}) {
  if (!pagina || pagina.total === 0) return null
  const { total, limit, offset } = pagina
  const atual = Math.floor(offset / limit)
  const ultima = Math.max(0, Math.ceil(total / limit) - 1)
  const fim = Math.min(offset + limit, total)

  return (
    <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-muted-foreground">
        {offset + 1}–{fim} de {total.toLocaleString('pt-BR')} {rotulo}
      </span>
      {ultima > 0 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={atual === 0} onClick={() => aoMudar((atual - 1) * limit)}>
            Anterior
          </Button>
          <span className="px-2 text-muted-foreground">
            {atual + 1} / {ultima + 1}
          </span>
          <Button variant="ghost" size="sm" disabled={atual >= ultima} onClick={() => aoMudar((atual + 1) * limit)}>
            Próxima
          </Button>
        </div>
      )}
    </nav>
  )
}

// cabeçalho de página da plataforma interna, num bloco aço-claro: título, subtítulo, ações à direita
// e, se a página tiver, as abas na base do bloco (passe com semLinha)
export function Cabecalho({ titulo, subtitulo, children, abas }: {
  titulo: string
  subtitulo?: ReactNode
  children?: ReactNode
  abas?: ReactNode
}) {
  return (
    <div className={cn('mb-8 border-l-4 border-aco bg-aco-fundo px-6 pt-8', !abas && 'pb-8')}>
      <div className={cn('flex flex-wrap items-end justify-between gap-4', Boolean(abas) && 'mb-6')}>
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
      {abas}
    </div>
  )
}
