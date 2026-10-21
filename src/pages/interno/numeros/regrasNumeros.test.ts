import { describe, expect, it } from 'vitest'

import { ESTOQUE, FATURAMENTO, PASSIVO } from './numerosDaMigracao'
import { confere, fechaAPonte, pecasPorUnidade } from './regrasNumeros'

describe('números da migração', () => {
  it('a ponte do relatório da Vulto fecha no nosso faturamento', () => {
    expect(fechaAPonte(FATURAMENTO.ponte, FATURAMENTO.nosso)).toBe(true)
  })

  it('as lojas e o online somam o faturamento', () => {
    expect(FATURAMENTO.porLoja.reduce((t, l) => t + l.valor, 0)).toBeCloseTo(FATURAMENTO.nosso, 2)
  })

  it('as unidades e o trânsito somam o estoque', () => {
    expect(ESTOQUE.porUnidade.reduce((t, u) => t + u.pecas, 0) + ESTOQUE.emTransito).toBe(ESTOQUE.nosso)
  })

  it('as parcelas do passivo somam o total, em pontos e em reais', () => {
    expect(PASSIVO.porValor.reduce((t, p) => t + p.pontos, 0)).toBe(PASSIVO.nosso.pontos)
    expect(PASSIVO.porValor.reduce((t, p) => t + p.reais, 0)).toBeCloseTo(PASSIVO.nosso.reais, 2)
  })
})

describe('pecasPorUnidade', () => {
  it('soma as peças de cada unidade, juntando os canais', () => {
    const itens = [
      { id_unidade: 1, unidade: 'Vulto Pinheiros', quantidade: 2 },
      { id_unidade: 1, unidade: 'Vulto Pinheiros', quantidade: 3 },
      { id_unidade: 5, unidade: 'CD Cajamar', quantidade: 7 },
    ]
    expect(pecasPorUnidade(itens)).toEqual([
      { id_unidade: 1, unidade: 'Vulto Pinheiros', pecas: 5 },
      { id_unidade: 5, unidade: 'CD Cajamar', pecas: 7 },
    ])
  })
})

describe('confere', () => {
  it('diz se bate, e nada enquanto a plataforma não tem o dado', () => {
    expect(confere(15233, 15233)).toBe(true)
    expect(confere(15232, 15233)).toBe(false)
    expect(confere(null, 15233)).toBeNull()
  })
})
