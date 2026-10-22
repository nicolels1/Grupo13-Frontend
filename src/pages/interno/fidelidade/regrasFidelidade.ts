import type { Marca } from '@/auth/areas'
import type { Esquema } from '@/lib/api'

type Regra = Esquema<'RegraSaida'>

// regras do programa de pontos de cada marca (GET e POST /fidelidade/regras). A regra nunca muda depois
// de criada: uma regra nova vale a partir de uma data futura e não mexe em ponto já ganho

export type Situacao = 'vigente' | 'agendada' | 'anterior'

export const SITUACOES: Record<Situacao, string> = { vigente: 'Vale hoje', agendada: 'Começa depois', anterior: 'Substituída' }

// hoje e as datas no formato AAAA-MM-DD do horário de Brasília (hojeIso)
export function situacaoDaRegra(regra: Pick<Regra, 'vigente' | 'valida_desde'>, hoje: string): Situacao {
  if (regra.vigente) return 'vigente'
  return regra.valida_desde > hoje ? 'agendada' : 'anterior'
}

// a regra que vale hoje, ou null se a marca ainda não tem programa
export function regraVigente<R extends Pick<Regra, 'vigente'>>(regras: R[]): R | null {
  return regras.find((r) => r.vigente) ?? null
}

export type FormRegra = {
  valida_desde: string
  valor_ponto: string
  pontos_por_real: string
  multiplicador_online: string
  bonus_ouro: string
  vence: boolean
  validade_meses: string
  validade_meses_ouro: string
  limite_prata: string
  limite_ouro: string
  resgate_minimo: string
}

// decimal da API ("0.0500") como a equipe escreve ("0,05")
export function decimalParaTela(valor: string | number) {
  return String(Number(valor)).replace('.', ',')
}

function decimalDaTela(texto: string) {
  const limpo = texto.trim().replace(',', '.')
  return limpo === '' ? Number.NaN : Number(limpo)
}

function inteiroDaTela(texto: string) {
  const limpo = texto.trim()
  return /^\d+$/.test(limpo) ? Number(limpo) : Number.NaN
}

// a regra nova parte da que vale hoje (muda-se só o que mudou) e começa amanhã
export function formDaRegra(base: Regra | null, amanha: string): FormRegra {
  return {
    valida_desde: amanha,
    valor_ponto: base ? decimalParaTela(base.valor_ponto) : '',
    pontos_por_real: base ? decimalParaTela(base.pontos_por_real) : '1',
    multiplicador_online: base ? decimalParaTela(base.multiplicador_online) : '1',
    bonus_ouro: base ? decimalParaTela(base.bonus_ouro) : '0',
    vence: base ? base.validade_meses !== null : true,
    validade_meses: base?.validade_meses ? String(base.validade_meses) : '',
    validade_meses_ouro: base?.validade_meses_ouro ? String(base.validade_meses_ouro) : '',
    limite_prata: base ? String(base.limite_prata) : '',
    limite_ouro: base ? String(base.limite_ouro) : '',
    resgate_minimo: base ? String(base.resgate_minimo) : '',
  }
}

// as mesmas regras que o backend confere (RegraCriar), com a mensagem de como corrigir
export function erroDaRegra(form: FormRegra, hoje: string): string | null {
  if (!form.valida_desde || form.valida_desde <= hoje) return 'A regra nova vale a partir de amanhã ou de uma data futura.'
  const valor = decimalDaTela(form.valor_ponto)
  if (!(valor > 0)) return 'Informe quanto vale um ponto em reais, por exemplo 0,05.'
  if (!(decimalDaTela(form.pontos_por_real) >= 0)) return 'Informe quantos pontos cada real gasto rende.'
  if (!(decimalDaTela(form.multiplicador_online) >= 1)) return 'O multiplicador do site e do app é 1 ou mais (2 é o dobro).'
  if (!(decimalDaTela(form.bonus_ouro) >= 0)) return 'O bônus do Ouro é 0 ou mais (0,5 é mais 50%).'
  if (form.vence) {
    const meses = inteiroDaTela(form.validade_meses)
    const mesesOuro = inteiroDaTela(form.validade_meses_ouro)
    if (!(meses > 0) || !(mesesOuro > 0)) return 'Informe em quantos meses os pontos vencem, nas outras categorias e no Ouro.'
    if (mesesOuro < meses) return 'A validade no Ouro não pode ser menor que a das outras categorias.'
  }
  const prata = inteiroDaTela(form.limite_prata)
  const ouro = inteiroDaTela(form.limite_ouro)
  if (!(prata > 0) || !(ouro > 0)) return 'Informe quantos pontos no ano levam à Prata e ao Ouro.'
  if (prata >= ouro) return 'O limite do Ouro precisa ser maior que o da Prata.'
  if (!(inteiroDaTela(form.resgate_minimo) > 0)) return 'Informe o mínimo de pontos de um resgate.'
  return null
}

// o corpo do POST /fidelidade/regras; só chame depois de erroDaRegra devolver null
export function corpoDaRegra(form: FormRegra, marca: Marca): Esquema<'RegraCriar'> {
  return {
    marca,
    valida_desde: form.valida_desde,
    valor_ponto: String(decimalDaTela(form.valor_ponto)),
    pontos_por_real: String(decimalDaTela(form.pontos_por_real)),
    multiplicador_online: String(decimalDaTela(form.multiplicador_online)),
    bonus_ouro: String(decimalDaTela(form.bonus_ouro)),
    validade_meses: form.vence ? inteiroDaTela(form.validade_meses) : null,
    validade_meses_ouro: form.vence ? inteiroDaTela(form.validade_meses_ouro) : null,
    limite_prata: inteiroDaTela(form.limite_prata),
    limite_ouro: inteiroDaTela(form.limite_ouro),
    resgate_minimo: inteiroDaTela(form.resgate_minimo),
  }
}
