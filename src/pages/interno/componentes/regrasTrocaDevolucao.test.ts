import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Esquema } from '@/lib/api'
import { estornaveis, motivoBloqueio, prazoTroca, repartirEstorno } from './regrasTrocaDevolucao'

type Pedido = Esquema<'PedidoSaida'>
type Pagamento = Esquema<'PagamentoSaida'>
type Unidade = Esquema<'UnidadeSaida'>

// só os campos que as regras leem; o resto do pedido não importa aqui
function pedido(dados: Partial<Pedido> = {}): Pedido {
  return {
    status: 'entregue',
    entregue_em: '2026-10-01T12:00:00Z',
    devolucao: 'nenhuma',
    pagamentos: [],
    ...dados,
  } as Pedido
}

function pagamento(dados: Partial<Pagamento>): Pagamento {
  return { tipo: 'pagamento', status: 'aprovado', id_pagamento_original: null, metodo: 'pix', valor: '0', ...dados } as Pagamento
}

const loja = { tipo: 'loja' } as Unidade
const centro = { tipo: 'cd' } as Unidade

describe('prazoTroca', () => {
  it('vence 30 dias depois da entrega', () => {
    expect(prazoTroca(pedido())?.toISOString()).toBe('2026-10-31T12:00:00.000Z')
  })

  it('pedido não entregue não tem prazo', () => {
    expect(prazoTroca(pedido({ entregue_em: null }))).toBeNull()
  })
})

describe('motivoBloqueio', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pedido entregue, no prazo e numa loja aceita troca', () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00Z') })
    expect(motivoBloqueio(pedido(), loja)).toBeNull()
  })

  it('só pedido entregue tem troca', () => {
    expect(motivoBloqueio(pedido({ status: 'enviado' }), loja)).toBe('Só pedido entregue tem troca ou devolução.')
  })

  it('recusa depois do prazo', () => {
    vi.useFakeTimers({ now: new Date('2026-11-01T12:00:00Z') })
    expect(motivoBloqueio(pedido(), loja)).toBe('Passou o prazo de 30 dias após a entrega.')
  })

  it('recusa pedido já devolvido por inteiro', () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00Z') })
    expect(motivoBloqueio(pedido({ devolucao: 'total' }), loja)).toBe('Todas as peças deste pedido já foram devolvidas.')
  })

  it('troca só acontece numa loja', () => {
    vi.useFakeTimers({ now: new Date('2026-10-10T12:00:00Z') })
    expect(motivoBloqueio(pedido(), centro)).toBe('Troca e devolução são feitas numa loja.')
  })
})

describe('estornaveis', () => {
  it('desconta os estornos já feitos e ignora os recusados', () => {
    const p = pedido({
      pagamentos: [
        pagamento({ id_pagamento: 1, valor: '100.00' }),
        pagamento({ id_pagamento: 2, tipo: 'estorno', id_pagamento_original: 1, valor: '30.00' }),
        pagamento({ id_pagamento: 3, tipo: 'estorno', id_pagamento_original: 1, valor: '50.00', status: 'recusado' }),
      ],
    })
    expect(estornaveis(p).map((e) => e.restante)).toEqual([70])
  })

  it('deixa de fora pagamento recusado e pagamento já estornado por inteiro', () => {
    const p = pedido({
      pagamentos: [
        pagamento({ id_pagamento: 1, valor: '50.00', status: 'recusado' }),
        pagamento({ id_pagamento: 2, valor: '40.00' }),
        pagamento({ id_pagamento: 3, tipo: 'estorno', id_pagamento_original: 2, valor: '40.00' }),
      ],
    })
    expect(estornaveis(p)).toEqual([])
  })
})

describe('repartirEstorno', () => {
  const p = pedido({
    pagamentos: [
      pagamento({ id_pagamento: 1, metodo: 'cartao', valor: '60.00' }),
      pagamento({ id_pagamento: 2, metodo: 'pix', valor: '40.00' }),
    ],
  })

  it('usa os pagamentos na ordem em que foram feitos', () => {
    expect(repartirEstorno(p, 80)).toEqual({
      estornos: [
        { id_pagamento: 1, metodo: 'cartao', valor: '60.00' },
        { id_pagamento: 2, metodo: 'pix', valor: '20.00' },
      ],
      falta: 0,
    })
  })

  it('sobra o que passa do total pago', () => {
    expect(repartirEstorno(p, 120.5).falta).toBe(20.5)
  })

  it('arredonda os centavos sem erro de ponto flutuante', () => {
    const quebrado = pedido({ pagamentos: [pagamento({ id_pagamento: 1, valor: '0.30' })] })
    expect(repartirEstorno(quebrado, 0.1 + 0.2)).toEqual({ estornos: [{ id_pagamento: 1, metodo: 'pix', valor: '0.30' }], falta: 0 })
  })
})
