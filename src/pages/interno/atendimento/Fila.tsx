import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'

import type { Esquema } from '@/lib/api'
import { haQuanto, plural, PRIORIDADES } from '@/lib/formato'

type Chamado = Esquema<'ChamadoSaida'>

// fila da caixa de entrada: cada chamado na lista, com marcador e prioridade

// um chamado na lista do meio: número e há quanto tempo, assunto, cliente e pedido;
// marcador terracota para mensagem nova e prioridade alta (destaques com significado)
export function ItemDaFila({ chamado: c, aberto }: { chamado: Chamado; aberto: boolean }) {
  return (
    <li>
      <Link
        to={`/interno/atendimento/${c.id_chamado}`}
        aria-current={aberto ? 'page' : undefined}
        className={cn('block space-y-1 border-b px-2 py-3 text-sm hover:bg-superficie', aberto && 'bg-superficie')}
      >
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">Chamado {c.id_chamado}</span>
          <span>{haQuanto(c.criado_em)}</span>
        </span>
        <span className="block truncate font-medium">{c.assunto}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[c.cliente, c.id_pedido && `pedido ${c.id_pedido}`, c.responsavel && `com ${c.responsavel}`].filter(Boolean).join(', ')}
        </span>
        {(c.mensagens_nao_lidas > 0 || c.prioridade === 'alta') && (
          <span className="flex flex-wrap gap-3 pt-0.5 text-xs font-medium">
            {c.mensagens_nao_lidas > 0 && <Marcador>{plural(c.mensagens_nao_lidas, 'mensagem nova', 'mensagens novas')}</Marcador>}
            {c.prioridade === 'alta' && <Marcador>Prioridade alta</Marcador>}
          </span>
        )}
      </Link>
    </li>
  )
}

function Marcador({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-terracota" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Prioridade({ valor }: { valor: Chamado['prioridade'] }) {
  if (!valor) return <span className="text-sm text-muted-foreground">Sem prioridade</span>
  if (valor === 'alta') return <span className="text-sm font-medium"><Marcador>Prioridade alta</Marcador></span>
  return <span className="text-sm text-muted-foreground">Prioridade {PRIORIDADES[valor]?.toLowerCase()}</span>
}
