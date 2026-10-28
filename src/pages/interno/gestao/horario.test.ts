import { describe, expect, it } from 'vitest'

import { corpoDaSemana, erroDaSemana, hhmm, horarioDaExcecao, semanaDoFormulario } from './horario'

describe('horário da loja no formulário', () => {
  it('monta os 7 dias: o dia sem horário vem fechado com um horário sugerido', () => {
    const dias = semanaDoFormulario([{ dia_semana: 5, abre: '10:00:00', fecha: '18:00:00' }])

    expect(dias).toHaveLength(7)
    expect(dias[5]).toEqual({ aberta: true, abre: '10:00', fecha: '18:00' })
    expect(dias[6]).toEqual({ aberta: false, abre: '10:00', fecha: '20:00' })
  })

  it('envia só os dias abertos, com o número do dia', () => {
    const dias = semanaDoFormulario([])
    dias[0] = { aberta: true, abre: '09:00', fecha: '19:30' }

    expect(corpoDaSemana(dias)).toEqual({ semana: [{ dia_semana: 0, abre: '09:00', fecha: '19:30' }] })
  })

  it('aponta o dia em que abre depois de fechar', () => {
    const dias = semanaDoFormulario([])
    expect(erroDaSemana(dias)).toBeNull()
    dias[2] = { aberta: true, abre: '20:00', fecha: '10:00' }
    expect(erroDaSemana(dias)).toBe('Quarta: o horário de abrir precisa ser antes do de fechar.')
  })

  it('formata as horas', () => {
    expect(hhmm('10:30:00')).toBe('10:30')
    expect(hhmm(null)).toBe('')
    expect(horarioDaExcecao({ data: '2026-12-24', abre: '10:00:00', fecha: '18:30:00', motivo: 'véspera' })).toBe('10h às 18h30')
    expect(horarioDaExcecao({ data: '2026-12-25', abre: null, fecha: null, motivo: 'Natal' })).toBe('fechada')
  })
})
