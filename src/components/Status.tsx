import { cn } from 'cn'

import { STATUS_CHAMADO, STATUS_PAGAMENTO, STATUS_PEDIDO, STATUS_TRANSFERENCIA } from '@/lib/formato'

// tons das etiquetas de status, iguais nas duas plataformas:
// neutro = esperando alguém, aço = andando, marinho = terminou bem, ferrugem = cancelado ou recusado
type Tom = 'neutro' | 'aco' | 'marinho' | 'ferrugem'

const TONS: Record<Tom, string> = {
  neutro: 'bg-superficie text-foreground',
  aco: 'bg-aco-fundo text-marinho',
  marinho: 'bg-marinho text-white',
  ferrugem: 'bg-ferrugem-fundo text-ferrugem',
}

const STATUS = {
  pedido: {
    rotulos: STATUS_PEDIDO,
    tons: {
      aguardando_pagamento: 'neutro',
      pago: 'aco',
      enviado: 'aco',
      pronto_para_retirada: 'aco',
      entregue: 'marinho',
      cancelado: 'ferrugem',
    },
  },
  pagamento: {
    rotulos: STATUS_PAGAMENTO,
    tons: { pendente: 'neutro', aprovado: 'marinho', recusado: 'ferrugem' },
  },
  chamado: {
    rotulos: STATUS_CHAMADO,
    tons: { aberto: 'neutro', em_andamento: 'aco', concluido: 'marinho' },
  },
  transferencia: {
    rotulos: STATUS_TRANSFERENCIA,
    tons: { solicitada: 'neutro', enviada: 'aco', recebida: 'marinho', cancelada: 'ferrugem' },
  },
} satisfies Record<string, { rotulos: Record<string, string>; tons: Record<string, Tom> }>

export type TipoStatus = keyof typeof STATUS

export function Status({ tipo, valor, className }: { tipo: TipoStatus; valor: string; className?: string }) {
  const { rotulos, tons } = STATUS[tipo]
  const tom: Tom = (tons as Record<string, Tom>)[valor] ?? 'neutro'
  return (
    <span className={cn('inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium whitespace-nowrap', TONS[tom], className)}>
      {rotulos[valor] ?? valor}
    </span>
  )
}
