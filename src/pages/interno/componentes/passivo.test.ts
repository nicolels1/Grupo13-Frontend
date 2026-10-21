import { describe, expect, it } from 'vitest'

import { faixasDoPassivo, passivoPorLoja } from './passivo'

const VULTO = {
  marca: 'vulto',
  pontos: 9441236,
  reais: '653123.10',
  por_valor: [
    { valor_ponto: '0.05', pontos: 5820010, reais: '291000.50' },
    { valor_ponto: '0.10', pontos: 3621226, reais: '362122.60' },
    { valor_ponto: '0.20', pontos: 0, reais: '0.00' },
  ],
}

describe('passivoPorLoja', () => {
  it('mostra as duas marcas, a sem pontos vazia', () => {
    const lojas = passivoPorLoja([VULTO])
    expect(lojas.map((l) => l.loja)).toEqual(['lorenzi', 'vulto'])
    expect(lojas[0]?.passivo).toBeNull()
    expect(lojas[1]?.passivo?.pontos).toBe(9441236)
  })
})

describe('faixasDoPassivo', () => {
  it('põe o ponto mais caro primeiro e tira a faixa zerada', () => {
    expect(faixasDoPassivo(VULTO).map((f) => f.valor_ponto)).toEqual(['0.10', '0.05'])
  })
})
