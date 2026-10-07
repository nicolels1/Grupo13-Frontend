// formatos de exibição usados nas duas plataformas (pt-BR, horário de Brasília)

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const FUSO = 'America/Sao_Paulo'

// datas da API em ISO; sem data, as funções mostram "—"
type Data = string | null | undefined

// a API manda dinheiro como texto ("349.90"): converte só na hora de mostrar
export function moeda(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return MOEDA.format(Number(valor))
}

export function dataCurta(iso: Data) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: FUSO }).replace('.', '')
}

export function dataHora(iso: Data) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
  return `${dia} ${hora}`
}

export function hora(iso: Data) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
}

export function dataLonga(iso: Data) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSO })
}

// "há 25 min", "há 3 h", "ontem", "12 set"
export function haQuanto(iso: Data) {
  if (!iso) return '—'
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  if (horas < 48) return 'ontem'
  return dataCurta(iso)
}

export function plural(n: number, singular: string, pluralTexto = `${singular}s`) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralTexto}`
}

// ---------- rótulos dos valores aceitos pela API ----------

export const CANAIS = { loja_fisica: 'Loja física', online: 'Online' }

export const TIPOS_MOVIMENTACAO = {
  saldo_inicial: 'Saldo inicial',
  recebimento: 'Recebimento',
  avaria: 'Avaria',
  perda: 'Perda',
  ajuste: 'Ajuste',
  venda: 'Venda',
  retorno_cancelamento: 'Voltou de pedido cancelado',
  devolucao: 'Devolução',
  saida_troca: 'Saída por troca',
  saida_transferencia: 'Saiu em transferência',
  entrada_transferencia: 'Chegou de transferência',
  saida_realocacao: 'Passou para o outro canal',
  entrada_realocacao: 'Veio do outro canal',
}

export const STATUS_TRANSFERENCIA = {
  solicitada: 'Pedida',
  enviada: 'Enviada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}

export const CATEGORIAS_CHAMADO = {
  entrega: 'Entrega',
  troca_devolucao: 'Troca e devolução',
  estorno: 'Estorno',
  duvida: 'Dúvida',
  outros: 'Outros',
}

export const STATUS_CHAMADO = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído' }
export const PRIORIDADES = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
export const MOTIVOS_CONCLUSAO = { resolvido: 'Resolvido', desistencia: 'Desistência', sem_resposta: 'Sem resposta' }

export const STATUS_CONTA = { pendente_ativacao: 'Convite pendente', ativa: 'Ativa', inativa: 'Desativada' }

export function codigoTransferencia(id: number) {
  return `TR-${String(id).padStart(4, '0')}`
}

// "AAAA-MM-DDTHH:MM" no horário de Brasília, formato que a API aceita nos filtros de data
export function paraApi(data: string, horaTexto?: string) {
  return horaTexto ? `${data}T${horaTexto}` : data
}

export function hojeIso() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: FUSO })
}
