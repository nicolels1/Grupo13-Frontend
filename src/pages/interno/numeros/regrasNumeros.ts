import type { Esquema } from '@/lib/api'
import type { Passo } from './numerosDaMigracao'

type ItemHistorico = Pick<Esquema<'EstoqueHistoricoItem'>, 'id_unidade' | 'unidade' | 'quantidade'>

// peças de cada unidade num momento (GET /estoque/historico), na ordem das unidades pedidas
export function pecasPorUnidade(itens: ItemHistorico[]): { id_unidade: number; unidade: string; pecas: number }[] {
  const por = new Map<number, { id_unidade: number; unidade: string; pecas: number }>()
  for (const i of itens) {
    const linha = por.get(i.id_unidade) ?? { id_unidade: i.id_unidade, unidade: i.unidade, pecas: 0 }
    linha.pecas += i.quantidade
    por.set(i.id_unidade, linha)
  }
  return [...por.values()]
}

// a ponte do relatório da Vulto ao nosso número fecha: a soma dos passos é o nosso número
export function fechaAPonte(ponte: Passo[], nosso: number) {
  const soma = ponte.reduce((t, p) => t + p.valor, 0)
  return Math.abs(soma - nosso) < 0.005
}

// o número da plataforma bate com o da migração? null enquanto a plataforma não tem o dado
export function confere(daPlataforma: number | null | undefined, daMigracao: number, tolerancia = 0.005) {
  if (daPlataforma === null || daPlataforma === undefined) return null
  return Math.abs(daPlataforma - daMigracao) < tolerancia
}
