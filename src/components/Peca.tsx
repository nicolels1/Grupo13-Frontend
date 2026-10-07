import type { ReactNode } from 'react'
import { cn } from 'cn'

import { corDaPeca } from '@/lib/cores'

// bloco na cor da peça, no lugar da foto
export function Miniatura({ cor, className }: { cor: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block size-10 shrink-0', className)}
      style={{ backgroundColor: corDaPeca(cor) }}
    />
  )
}

// código da peça (SKU) ou referência, como uma etiqueta
export function Etiqueta({ children, alerta, className }: { children: ReactNode; alerta?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 font-mono text-xs font-medium tracking-tight',
        alerta ? 'bg-ferrugem-fundo text-ferrugem' : 'bg-superficie text-foreground',
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
