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

export const CANAIS: Record<'loja_fisica' | 'online', string> = { loja_fisica: 'Loja física', online: 'Online' }

// rótulo do canal quando a API manda o canal como texto livre (ex.: itens de transferência)
export function rotuloCanal(canal: string) {
  return canal in CANAIS ? CANAIS[canal as keyof typeof CANAIS] : canal
}

export const TIPOS_MOVIMENTACAO: Record<string, string> = {
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

export const STATUS_TRANSFERENCIA: Record<string, string> = {
  solicitada: 'Pedida',
  enviada: 'Enviada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}

export const CATEGORIAS_CHAMADO: Record<string, string> = {
  entrega: 'Entrega',
  troca_devolucao: 'Troca e devolução',
  estorno: 'Estorno',
  duvida: 'Dúvida',
  outros: 'Outros',
}

export const STATUS_CHAMADO: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído' }

export const STATUS_PEDIDO: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  pronto_para_retirada: 'Pronto para retirada',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const METODOS_PAGAMENTO: Record<string, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
}

export const STATUS_PAGAMENTO: Record<string, string> = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado' }
export const PRIORIDADES: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
export const MOTIVOS_CONCLUSAO: Record<string, string> = { resolvido: 'Resolvido', desistencia: 'Desistência', sem_resposta: 'Sem resposta' }

export const STATUS_CONTA: Record<string, string> = { pendente_ativacao: 'Convite pendente', ativa: 'Ativa', inativa: 'Desativada' }

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

// CPF digitado com a máscara 000.000.000-00 (aceita colar com ou sem pontos)
export function mascaraCpf(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

// tamanho de arquivo: "820 KB", "2,4 MB"
export function tamanhoArquivo(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}
