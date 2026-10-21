// o resumo da Visão Geral separa as vendas pelo canal da venda (P3): loja, site e app (o app só existe
// no histórico da Vulto). A Visão Geral mostra loja física × online: a loja é a loja física, e site e
// app somam o online

type Volume = { pedidos: number; valor: string | number }
type ComVariacao = Volume & { variacao_valor_pct: number | null }

export type Canais = { loja: Volume; site: Volume; app?: Volume | null }

function somar(...volumes: (Volume | null | undefined)[]) {
  return volumes.reduce<{ pedidos: number; valor: number }>(
    (t, v) => (v ? { pedidos: t.pedidos + v.pedidos, valor: t.valor + Number(v.valor) } : t),
    { pedidos: 0, valor: 0 },
  )
}

export function lojaFisicaEOnline(c: Canais) {
  return { loja_fisica: somar(c.loja), online: somar(c.site, c.app) }
}

// variação do online a partir da de site e app: a base de cada um (o período anterior) é valor ÷ (1 + %).
// Sem base num deles (variação vazia ou o canal zerado antes), a soma também fica sem base
export function variacaoJunta(partes: (ComVariacao | null | undefined)[]): number | null {
  let atual = 0
  let anterior = 0
  for (const p of partes) {
    if (!p) continue
    const valor = Number(p.valor)
    atual += valor
    if (valor === 0 && p.variacao_valor_pct === null) continue
    if (p.variacao_valor_pct === null || p.variacao_valor_pct <= -100) return null
    anterior += valor / (1 + p.variacao_valor_pct / 100)
  }
  if (anterior === 0) return null
  return (atual / anterior - 1) * 100
}
