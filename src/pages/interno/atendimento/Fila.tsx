import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'

import type { Esquema } from '@/lib/api'
import { haQuanto, plural, PRIORIDADES } from '@/lib/formato'

type Chamado = Esquema<'ChamadoEquipe'>

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
        {(c.mensagens_nao_lidas > 0 || altaSugerida(c) || c.prioridade === 'alta') && (
          <span className="flex flex-wrap gap-3 pt-0.5 text-xs font-medium">
            {c.mensagens_nao_lidas > 0 && <Marcador>{plural(c.mensagens_nao_lidas, 'mensagem nova', 'mensagens novas')}</Marcador>}
            {c.prioridade === 'alta' && <Marcador>Prioridade alta</Marcador>}
            {altaSugerida(c) && <Marcador>Alta · sugerida</Marcador>}
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

// a sugestão da IA só aparece enquanto ninguém definiu a prioridade: depois, vale a da pessoa
function altaSugerida(c: Chamado) {
  return !c.prioridade && c.prioridade_sugerida === 'alta'
}

// no topo do chamado: a prioridade definida ou, sem ela, a sugerida pela IA (marcada como sugerida, com o motivo)
export function Prioridade({ chamado: c }: { chamado: Chamado }) {
  if (c.prioridade === 'alta') return <span className="text-sm font-medium"><Marcador>Prioridade alta</Marcador></span>
  if (c.prioridade) return <span className="text-sm text-muted-foreground">Prioridade {PRIORIDADES[c.prioridade]?.toLowerCase()}</span>
  if (c.prioridade_sugerida) {
    const rotulo = `${PRIORIDADES[c.prioridade_sugerida]} · sugerida${c.motivo_sugerido ? `: ${c.motivo_sugerido}` : ''}`
    return c.prioridade_sugerida === 'alta'
      ? <span className="text-sm font-medium"><Marcador>{rotulo}</Marcador></span>
      : <span className="text-sm text-muted-foreground">{rotulo}</span>
  }
  return <span className="text-sm text-muted-foreground">Sem prioridade</span>
}
