import type { Esquema } from '@/lib/api'
import type { Loja } from '@/lib/lojaEscolhida'

type Saldo = Esquema<'SaldoPontosSaida'>

// os pontos do cliente nas duas lojas (GET /fidelidade/meus-pontos): cada marca tem o seu programa e o
// seu saldo, e a conta mostra as duas, mesmo a que ainda não tem ponto

export const LOJAS_DOS_PONTOS: Loja[] = ['lorenzi', 'vulto']

const CATEGORIAS: Record<string, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' }

export function nomeDaCategoria(categoria: string) {
  return CATEGORIAS[categoria] ?? categoria
}

// o saldo de cada loja, na ordem das abas; loja sem saldo na resposta fica null
export function saldosPorLoja(saldos: Saldo[]): { loja: Loja; saldo: Saldo | null }[] {
  return LOJAS_DOS_PONTOS.map((loja) => ({ loja, saldo: saldos.find((s) => s.marca === loja) ?? null }))
}
