import { describe, expect, it } from 'vitest'

import { PONTOS_DE_TESTE } from '@/lib/vultoDeTeste'
import { nomeDaCategoria, saldosPorLoja } from './pontosDaConta'

describe('saldosPorLoja', () => {
  it('mostra as duas lojas, a sem pontos vazia', () => {
    const lojas = saldosPorLoja(PONTOS_DE_TESTE.saldos)
    expect(lojas.map((l) => l.loja)).toEqual(['lorenzi', 'vulto'])
    expect(lojas[0]?.saldo).toBeNull()
    expect(lojas[1]?.saldo?.saldo).toBe(4820)
  })
})

describe('nomeDaCategoria', () => {
  it('escreve a categoria com maiúscula', () => {
    expect(nomeDaCategoria('prata')).toBe('Prata')
    expect(nomeDaCategoria('diamante')).toBe('diamante')
  })
})
