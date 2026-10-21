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

// ---------- os dois tipos de cliente ----------

// a conta é uma só no grupo: o cliente não é de uma loja, os pedidos e os pontos é que são. A separação
// é entre quem tem conta (login, qualquer loja) e quem veio da Vulto sem conta (P2), até criá-la
export type TipoCliente = 'conta' | 'sem-conta'

export function caminhoDaFicha(tipo: TipoCliente, id: string | number) {
  return `/interno/clientes/${tipo}/${id}`
}

// o cliente nos filtros das listas da equipe (pedidos, chamados e pontos)
export function filtroDoCliente(tipo: TipoCliente, id: string): { id_cliente: string } | { id_cliente_sem_conta: number } {
  return tipo === 'conta' ? { id_cliente: id } : { id_cliente_sem_conta: Number(id) }
}

// cliente com conta (GET /vendas/clientes/{id_usuario}): o resumo e, se a pessoa veio da Vulto, o
// cadastro sem conta ligado a ela (para a origem)
export type ClienteComConta = Esquema<'ClienteComConta'>
