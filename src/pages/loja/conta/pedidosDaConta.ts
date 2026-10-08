import type { Esquema } from '@/lib/api'

type Pedido = Esquema<'PedidoSaida'>

// grupos de status que a conta usa nos filtros, no resumo e na visão geral
export const EM_ANDAMENTO = ['aguardando_pagamento', 'pago', 'enviado', 'pronto_para_retirada']
export const A_CAMINHO = ['pago', 'enviado', 'pronto_para_retirada']

// o que o cliente vê como pedido: cancelado sem nunca ter sido pago (reserva vencida, "Alterar entrega"
// no checkout ou cancelado antes de pagar) foi só uma ida ao pagamento, não uma compra. Ele continua na
// API e na plataforma interna; só não aparece na conta
export function pedidosDoCliente(pedidos: Pedido[]) {
  return pedidos.filter((p) => p.status !== 'cancelado' || p.pago_em !== null)
}

// peças de pedidos entregues que ainda não foram avaliadas
export function pecasParaAvaliar(pedidos: Pedido[]) {
  return pedidos
    .filter((p) => p.status === 'entregue')
    .flatMap((p) => p.itens.filter((i) => i.id_avaliacao === null).map((i) => ({ pedido: p, item: i })))
}

export function resumoDosPedidos(pedidos: Pedido[]) {
  return {
    aguardando: pedidos.filter((p) => p.status === 'aguardando_pagamento').length,
    aCaminho: pedidos.filter((p) => A_CAMINHO.includes(p.status)).length,
    entregues: pedidos.filter((p) => p.status === 'entregue').length,
    cancelados: pedidos.filter((p) => p.status === 'cancelado').length,
    paraAvaliar: pecasParaAvaliar(pedidos).length,
  }
}
