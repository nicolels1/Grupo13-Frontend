import { describe, expect, it } from 'vitest'

import { ESTOQUE, FATURAMENTO, PASSIVO } from './numerosDaMigracao'
import { agruparFaturamento, confere, fechaAPonte, pecasPorUnidade } from './regrasNumeros'

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

describe('agruparFaturamento', () => {
  it('soma a loja física pela unidade e o online pelo canal, no período e por mês', () => {
    const linhas = [
      { mes: '2025-02-01', unidade: 'Vulto Pinheiros', canal_venda: 'loja', valor: '100.00' },
      { mes: '2025-01-01', unidade: 'Vulto Pinheiros', canal_venda: 'loja', valor: '50.50' },
      { mes: '2025-01-01', unidade: 'CD Cajamar', canal_venda: 'site', valor: '30.00' },
      { mes: '2025-01-01', unidade: 'CD Cajamar', canal_venda: 'app', valor: '-10.00' },
    ]
    const { porColuna, meses } = agruparFaturamento(linhas)
    expect(Object.fromEntries(porColuna)).toEqual({ 'Vulto Pinheiros': 150.5, site: 30, app: -10 })
    expect(meses.map((m) => m.mes)).toEqual(['2025-01-01', '2025-02-01'])
    expect(meses[0]?.colunas.get('Vulto Pinheiros')).toBe(50.5)
  })
})

describe('confere', () => {
  it('diz se bate, e nada enquanto a plataforma não tem o dado', () => {
    expect(confere(15233, 15233)).toBe(true)
    expect(confere(15232, 15233)).toBe(false)
    expect(confere(null, 15233)).toBeNull()
  })
})
