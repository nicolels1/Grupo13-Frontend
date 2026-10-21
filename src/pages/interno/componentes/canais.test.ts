import { describe, expect, it } from 'vitest'

import { lojaFisicaEOnline, variacaoJunta } from './canais'

describe('lojaFisicaEOnline', () => {
  it('a loja é a loja física, e site mais app é o online', () => {
    const dia = { loja: { pedidos: 3, valor: '300.00' }, site: { pedidos: 2, valor: '150.50' }, app: { pedidos: 1, valor: '49.50' } }
    expect(lojaFisicaEOnline(dia)).toEqual({ loja_fisica: { pedidos: 3, valor: 300 }, online: { pedidos: 3, valor: 200 } })
  })

  it('sem app (só existe no histórico da Vulto), o online é o site', () => {
    const dia = { loja: { pedidos: 0, valor: '0' }, site: { pedidos: 2, valor: '80' }, app: null }
    expect(lojaFisicaEOnline(dia).online).toEqual({ pedidos: 2, valor: 80 })
  })
})

describe('variacaoJunta', () => {
  it('soma as bases do período anterior de cada canal', () => {
    // site: 110 agora, 100 antes (+10%); app: 90 agora, 100 antes (−10%) → 200 contra 200, 0%
    const v = variacaoJunta([{ pedidos: 1, valor: 110, variacao_valor_pct: 10 }, { pedidos: 1, valor: 90, variacao_valor_pct: -10 }])
    expect(v).toBeCloseTo(0, 6)
  })

  it('um canal só dá a variação dele', () => {
    expect(variacaoJunta([{ pedidos: 1, valor: 120, variacao_valor_pct: 20 }, null])).toBeCloseTo(20, 6)
  })

  it('sem base num canal com venda, a soma fica sem base', () => {
    expect(variacaoJunta([{ pedidos: 1, valor: 120, variacao_valor_pct: 20 }, { pedidos: 1, valor: 50, variacao_valor_pct: null }])).toBeNull()
  })

  it('canal zerado e sem base não atrapalha', () => {
    expect(variacaoJunta([{ pedidos: 1, valor: 120, variacao_valor_pct: 20 }, { pedidos: 0, valor: 0, variacao_valor_pct: null }])).toBeCloseTo(20, 6)
  })
})
