import type { Esquema } from '@/lib/api'
import type { Passo } from './numerosDaMigracao'

type LinhaFaturamento = Pick<Esquema<'LinhaDoFaturamento'>, 'mes' | 'unidade' | 'canal_venda' | 'valor'>
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

// a coluna de cada linha do faturamento: a loja física pelo nome da unidade; o online pelo canal (site, app)
export function colunaDoFaturamento(l: Pick<LinhaFaturamento, 'unidade' | 'canal_venda'>) {
  return l.canal_venda === 'loja' ? l.unidade : l.canal_venda
}

// faturamento da plataforma somado por coluna (no período inteiro) e por mês e coluna
export function agruparFaturamento(linhas: LinhaFaturamento[]) {
  const porColuna = new Map<string, number>()
  const porMes = new Map<string, Map<string, number>>()
  for (const l of linhas) {
    const coluna = colunaDoFaturamento(l)
    const valor = Number(l.valor)
    porColuna.set(coluna, (porColuna.get(coluna) ?? 0) + valor)
    const mes = porMes.get(l.mes) ?? new Map<string, number>()
    mes.set(coluna, (mes.get(coluna) ?? 0) + valor)
    porMes.set(l.mes, mes)
  }
  const meses = [...porMes.keys()].sort().map((mes) => ({ mes, colunas: porMes.get(mes)! }))
  return { porColuna, meses }
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
