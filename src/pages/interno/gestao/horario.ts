import type { Esquema } from '@/lib/api'

// dia_semana da API: 0 = segunda ... 6 = domingo
export const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export type DiaDoFormulario = { aberta: boolean; abre: string; fecha: string }

// a API devolve "10:00:00"; o campo de hora usa "10:00"
export function hhmm(horario: string | null | undefined) {
  return horario ? horario.slice(0, 5) : ''
}

// os 7 dias para o formulário: o dia sem horário vem fechado, com um horário sugerido para quando abrir
export function semanaDoFormulario(semana: Esquema<'DiaDeAtendimento'>[]): DiaDoFormulario[] {
  return DIAS.map((_, dia) => {
    const salvo = semana.find((d) => d.dia_semana === dia)
    return salvo ? { aberta: true, abre: hhmm(salvo.abre), fecha: hhmm(salvo.fecha) } : { aberta: false, abre: '10:00', fecha: '20:00' }
  })
}

export function corpoDaSemana(dias: DiaDoFormulario[]) {
  return {
    semana: dias.flatMap((d, dia_semana) => (d.aberta ? [{ dia_semana, abre: d.abre, fecha: d.fecha }] : [])),
  }
}

// a mesma conferência do backend, antes de enviar: dá para apontar o dia errado
export function erroDaSemana(dias: DiaDoFormulario[]) {
  const errado = dias.findIndex((d) => d.aberta && (!d.abre || !d.fecha || d.abre >= d.fecha))
  return errado === -1 ? null : `${DIAS[errado]}: o horário de abrir precisa ser antes do de fechar.`
}

// "10:00:00" e "18:00:00" → "10h às 18h"; sem horário, o dia é fechado
export function horarioDaExcecao(excecao: Esquema<'ExcecaoHorarioSaida'>) {
  if (!excecao.abre || !excecao.fecha) return 'fechada'
  const curta = (h: string) => (h.slice(3, 5) === '00' ? `${Number(h.slice(0, 2))}h` : `${Number(h.slice(0, 2))}h${h.slice(3, 5)}`)
  return `${curta(excecao.abre)} às ${curta(excecao.fecha)}`
}
