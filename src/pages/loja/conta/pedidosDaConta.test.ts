import { describe, expect, it } from 'vitest'

import type { Esquema } from '@/lib/api'
import { pecasParaAvaliar, pedidosDoCliente, resumoDosPedidos } from './pedidosDaConta'

type Pedido = Esquema<'PedidoSaida'>
type Item = Esquema<'ItemPedidoSaida'>

// só os campos que as regras leem; o resto do pedido não importa aqui
const item = (id_item: number, id_avaliacao: number | null = null) => ({ id_item, id_avaliacao }) as Item
const pedido = (id_pedido: number, status: Pedido['status'], dados: Partial<Pedido> = {}) =>
  ({ id_pedido, status, pago_em: '2026-10-01T12:00:00Z', itens: [], ...dados }) as Pedido

describe('pedidosDoCliente', () => {
  it('esconde o pedido cancelado que nunca foi pago', () => {
    const pedidos = [pedido(1, 'pago'), pedido(2, 'cancelado', { pago_em: null }), pedido(3, 'cancelado')]
    expect(pedidosDoCliente(pedidos).map((p) => p.id_pedido)).toEqual([1, 3])
  })
})

describe('pecasParaAvaliar', () => {
  it('lista só as peças de pedidos entregues ainda sem avaliação', () => {
    const pedidos = [
      pedido(1, 'entregue', { itens: [item(10), item(11, 5)] }),
      pedido(2, 'enviado', { itens: [item(20)] }),
    ]
    expect(pecasParaAvaliar(pedidos).map((p) => p.item.id_item)).toEqual([10])
  })
})

describe('resumoDosPedidos', () => {
  it('conta os pedidos de cada situação', () => {
    const pedidos = [
      pedido(1, 'aguardando_pagamento'),
      pedido(2, 'pago'),
      pedido(3, 'enviado'),
      pedido(4, 'pronto_para_retirada'),
      pedido(5, 'entregue', { itens: [item(50), item(51)] }),
      pedido(6, 'cancelado'),
    ]
    expect(resumoDosPedidos(pedidos)).toEqual({ aguardando: 1, aCaminho: 3, entregues: 1, cancelados: 1, paraAvaliar: 2 })
  })
})
