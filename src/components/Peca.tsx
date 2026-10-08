import type { ReactNode } from 'react'
import { cn } from 'cn'

import { corDaPeca } from '@/lib/cores'

// bloco na cor da peça ou, quando houver, a foto
// com `foto`, mostra a foto (a primeira do produto); sem foto, o bloco da cor
export function Miniatura({ cor, foto, className }: { cor: string | null | undefined; foto?: string | null; className?: string }) {
  if (foto) return <img src={foto} alt="" loading="lazy" className={cn('block size-10 shrink-0 object-cover', className)} />
  return (
    <span
      aria-hidden="true"
      className={cn('block size-10 shrink-0', className)}
      style={{ backgroundColor: corDaPeca(cor) }}
    />
  )
}

// código da peça (SKU) ou referência, como uma etiqueta; `alerta` marca pendência (ex.: abaixo do mínimo)
export function Etiqueta({ children, alerta, className }: { children: ReactNode; alerta?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium tabular-nums',
        alerta ? 'bg-terracota-fundo text-marinho-escuro shadow-[inset_2px_0_0_var(--terracota)]' : 'bg-superficie text-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

// nome da peça com cor e tamanho embaixo
export function NomePeca({
  produto,
  cor,
  tamanho,
  className,
}: {
  produto: ReactNode
  cor?: string | null
  tamanho?: string | null
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-3', className)}>
      <Miniatura cor={cor} />
      <span className="min-w-0">
        <span className="block truncate">{produto}</span>
        <span className="block text-xs text-muted-foreground">
          {[cor, tamanho].filter(Boolean).join(', ')}
        </span>
      </span>
    </span>
  )
}
