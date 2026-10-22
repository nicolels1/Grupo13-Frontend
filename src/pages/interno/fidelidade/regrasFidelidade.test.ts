import { describe, expect, it } from 'vitest'

import type { Esquema } from '@/lib/api'
import { corpoDaRegra, decimalParaTela, erroDaRegra, formDaRegra, regraVigente, situacaoDaRegra } from './regrasFidelidade'

const HOJE = '2026-10-22'
const AMANHA = '2026-10-23'

function regra(campos: Partial<Esquema<'RegraSaida'>> = {}): Esquema<'RegraSaida'> {
  return {
    id_regra: 1, marca: 'vulto', valida_desde: '2025-03-01', valor_ponto: '0.0500', pontos_por_real: '1.00',
    multiplicador_online: '2.00', bonus_ouro: '0.50', validade_meses: 12, validade_meses_ouro: 24,
    limite_prata: 1000, limite_ouro: 5000, resgate_minimo: 100, id_criado_por: null,
    criado_em: '2026-10-21T22:00:00Z', vigente: true, ...campos,
  }
}

describe('situacaoDaRegra', () => {
  it('separa a que vale hoje, a que começa depois e a substituída', () => {
    expect(situacaoDaRegra(regra(), HOJE)).toBe('vigente')
    expect(situacaoDaRegra(regra({ vigente: false, valida_desde: '2026-11-01' }), HOJE)).toBe('agendada')
    expect(situacaoDaRegra(regra({ vigente: false, valida_desde: '2025-01-01' }), HOJE)).toBe('anterior')
  })
})

describe('regraVigente', () => {
  it('acha a que vale hoje, ou nenhuma', () => {
    const vigente = regra({ id_regra: 2 })
    expect(regraVigente([regra({ id_regra: 3, vigente: false }), vigente])).toBe(vigente)
    expect(regraVigente([regra({ vigente: false })])).toBeNull()
  })
})

describe('formDaRegra', () => {
  it('parte da regra de hoje, com a vírgula da tela, começando amanhã', () => {
    const form = formDaRegra(regra(), AMANHA)
    expect(form.valida_desde).toBe(AMANHA)
    expect(form.valor_ponto).toBe('0,05')
    expect(form.bonus_ouro).toBe('0,5')
    expect(form.vence).toBe(true)
    expect(form.validade_meses_ouro).toBe('24')
  })

  it('sem regra ainda, começa quase vazia', () => {
    const form = formDaRegra(null, AMANHA)
    expect(form.valor_ponto).toBe('')
    expect(form.multiplicador_online).toBe('1')
  })
})

describe('decimalParaTela', () => {
  it('tira os zeros e usa vírgula', () => {
    expect(decimalParaTela('0.1000')).toBe('0,1')
    expect(decimalParaTela('2.00')).toBe('2')
  })
})

describe('erroDaRegra', () => {
  const valida = () => formDaRegra(regra(), AMANHA)

  it('aceita a regra coerente', () => {
    expect(erroDaRegra(valida(), HOJE)).toBeNull()
  })

  it('recusa começar hoje ou antes', () => {
    expect(erroDaRegra({ ...valida(), valida_desde: HOJE }, HOJE)).toMatch(/amanhã/)
  })

  it('confere os limites e a validade como o backend', () => {
    expect(erroDaRegra({ ...valida(), limite_ouro: '1000' }, HOJE)).toMatch(/Ouro precisa ser maior/)
    expect(erroDaRegra({ ...valida(), validade_meses_ouro: '6' }, HOJE)).toMatch(/não pode ser menor/)
    expect(erroDaRegra({ ...valida(), validade_meses_ouro: '' }, HOJE)).toMatch(/vencem/)
    expect(erroDaRegra({ ...valida(), vence: false, validade_meses: '', validade_meses_ouro: '' }, HOJE)).toBeNull()
    expect(erroDaRegra({ ...valida(), multiplicador_online: '0,5' }, HOJE)).toMatch(/1 ou mais/)
    expect(erroDaRegra({ ...valida(), valor_ponto: '0' }, HOJE)).toMatch(/vale um ponto/)
    expect(erroDaRegra({ ...valida(), resgate_minimo: '1,5' }, HOJE)).toMatch(/mínimo/)
  })
})

describe('corpoDaRegra', () => {
  it('manda os decimais com ponto e sem validade quando o ponto não vence', () => {
    const corpo = corpoDaRegra({ ...formDaRegra(regra(), AMANHA), vence: false }, 'lorenzi')
    expect(corpo).toMatchObject({
      marca: 'lorenzi', valida_desde: AMANHA, valor_ponto: '0.05', bonus_ouro: '0.5',
      validade_meses: null, validade_meses_ouro: null, limite_prata: 1000, resgate_minimo: 100,
    })
  })
})
