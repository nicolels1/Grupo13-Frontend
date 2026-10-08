import type { Esquema } from '@/lib/api'

type Pedido = Esquema<'PedidoSaida'>
type Pagamento = Esquema<'PagamentoSaida'>
type Unidade = Esquema<'UnidadeSaida'>
type ItemPedido = Esquema<'ItemPedidoSaida'>
type ItemEstoque = Esquema<'EstoqueItem'>

export type ModoTroca = 'troca' | 'devolucao'
export type EstornoRepartido = { id_pagamento: number; metodo: string; valor: string }

// o que o formulário de troca ou devolução registrou: vai para o comprovante do balcão ou o aviso no chamado
export type TrocaFeita = {
  modo: ModoTroca
  pedido: Pedido
  linhas: { item: ItemPedido; quantidade: number; nova: ItemEstoque | null }[]
  estornos: EstornoRepartido[]
}

// regras de troca, devolução e estorno de um pedido, usadas no balcão do Caixa e no chamado do
// Atendimento. O backend confere tudo de novo; aqui elas só evitam um envio que já se sabe recusado.

// troca e devolução: até 30 dias depois da entrega (case, seção 5)
export const PRAZO_TROCA_DIAS = 30

export function prazoTroca(pedido: Pedido) {
  if (!pedido.entregue_em) return null
  return new Date(new Date(pedido.entregue_em).getTime() + PRAZO_TROCA_DIAS * 86400000)
}

// por que o pedido não aceita troca nem devolução (null = aceita)
export function motivoBloqueio(pedido: Pedido, loja: Unidade) {
  if (pedido.status !== 'entregue') return 'Só pedido entregue tem troca ou devolução.'
  const prazo = prazoTroca(pedido)
  if (prazo && prazo.getTime() < Date.now()) return `Passou o prazo de ${PRAZO_TROCA_DIAS} dias após a entrega.`
  if (pedido.devolucao === 'total') return 'Todas as peças deste pedido já foram devolvidas.'
  if (loja.tipo !== 'loja') return 'Troca e devolução são feitas numa loja.'
  return null
}

// quanto ainda dá para estornar de cada pagamento aprovado (valor menos os estornos já feitos)
export function estornaveis(pedido: Pedido): { pagamento: Pagamento; restante: number }[] {
  return pedido.pagamentos
    .filter((p) => p.tipo === 'pagamento' && p.status === 'aprovado')
    .map((p) => {
      const estornado = pedido.pagamentos
        .filter((e) => e.id_pagamento_original === p.id_pagamento && e.status !== 'recusado')
        .reduce((t, e) => t + Number(e.valor), 0)
      return { pagamento: p, restante: Math.round((Number(p.valor) - estornado) * 100) / 100 }
    })
    .filter((p) => p.restante > 0)
}

// reparte o valor da devolução pelos pagamentos, na ordem em que foram feitos (mesmo meio de pagamento)
export function repartirEstorno(pedido: Pedido, valor: number) {
  const estornos: EstornoRepartido[] = []
  let falta = Math.round(valor * 100) / 100
  for (const { pagamento, restante } of estornaveis(pedido)) {
    if (falta <= 0) break
    const parte = Math.min(falta, restante)
    estornos.push({ id_pagamento: pagamento.id_pagamento, metodo: pagamento.metodo, valor: parte.toFixed(2) })
    falta = Math.round((falta - parte) * 100) / 100
  }
  return { estornos, falta }
}
