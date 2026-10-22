import { describe, expect, it } from 'vitest'

import { descontoCabe, pontosDoCpf, valorAPagar } from './pontosNoCaixa'

const APLICADOS = { cpf: '52998224725', pontos: 500, desconto: '25.00', saldo: 1200 }

describe('pontosDoCpf', () => {
  it('mantém os pontos só no CPF em que foram calculados', () => {
    expect(pontosDoCpf(APLICADOS, '52998224725')).toBe(APLICADOS)
    expect(pontosDoCpf(APLICADOS, '11144477735')).toBeNull()
    expect(pontosDoCpf(null, '52998224725')).toBeNull()
  })
})

describe('valorAPagar', () => {
  it('tira o desconto do total sem perder centavos', () => {
    expect(valorAPagar('219.90', '25.00')).toBe('194.90')
    expect(valorAPagar('0.30', '0.10')).toBe('0.20')
    expect(valorAPagar('149.90', null)).toBe('149.90')
  })

  it('sem total ainda não tem valor', () => {
    expect(valorAPagar(null, '25.00')).toBeNull()
    expect(valorAPagar(undefined, null)).toBeNull()
  })
})

describe('descontoCabe', () => {
  it('aceita só desconto menor que as peças', () => {
    expect(descontoCabe('25.00', '219.90')).toBe(true)
    expect(descontoCabe('219.90', '219.90')).toBe(false)
    expect(descontoCabe('25.00', null)).toBe(false)
  })
})
