import { cn } from 'cn'

import { Button } from '@/components/ui/button'

// abas sublinhadas; `abas` = [{ valor, rotulo, contagem? }]
export function Abas({ abas, valor, aoMudar, rotulo, className }) {
  return (
    <div role="tablist" aria-label={rotulo} className={cn('flex gap-6 overflow-x-auto border-b', className)}>
      {abas.map((aba) => (
        <button
          key={aba.valor}
          type="button"
          role="tab"
          aria-selected={valor === aba.valor}
          onClick={() => aoMudar(aba.valor)}
          className={cn(
            '-mb-px shrink-0 border-b-2 pb-2 text-sm transition-colors',
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
export function Paginacao({ pagina, aoMudar, rotulo = 'itens' }) {
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

// cabeçalho de página da plataforma interna: título, subtítulo e ações à direita
export function Cabecalho({ titulo, subtitulo, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-medium tracking-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
