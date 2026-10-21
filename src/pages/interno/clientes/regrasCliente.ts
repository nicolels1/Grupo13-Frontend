import type { Esquema } from '@/lib/api'
import { mascaraCpf } from '@/lib/formato'

type ClienteSemConta = Esquema<'ClienteSemContaSaida'>

// cliente da Vulto que ainda não criou conta (P2): como a equipe o reconhece na lista e na ficha

// quem só aparece nos pontos não tem nome nem e-mail (K8): fica pelo CPF
export function nomeDoCliente(c: Pick<ClienteSemConta, 'id_cliente_sem_conta' | 'nome' | 'email' | 'cpf'>) {
  if (c.nome) return c.nome
  if (c.email) return c.email
  if (c.cpf) return `CPF ${mascaraCpf(c.cpf)}`
  return `Cliente ${c.id_cliente_sem_conta}`
}

// três estados (K9b): o cadastro em branco não é "não", é "não informado"
export function rotuloConsentimento(aceita: boolean | null) {
  if (aceita === null) return 'Não informado'
  return aceita ? 'Aceita mensagens' : 'Não aceita mensagens'
}

// telefone com DDD: 11 dígitos é celular, 10 é fixo; outro tamanho fica como veio
export function telefoneFormatado(telefone: string | null) {
  if (!telefone) return '—'
  const d = telefone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return telefone
}

export const TIPOS_MOVIMENTO_PONTOS: Record<string, string> = {
  saldo_inicial: 'Saldo inicial',
  credito: 'Crédito',
  resgate: 'Resgate',
  estorno: 'Estorno',
  ajuste: 'Ajuste',
  vencimento: 'Vencimento',
}

export function rotuloMovimentoPontos(tipo: string) {
  return TIPOS_MOVIMENTO_PONTOS[tipo] ?? tipo
}
