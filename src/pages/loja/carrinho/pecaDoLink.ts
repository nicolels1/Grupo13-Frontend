import type { Esquema } from '@/lib/api'

// a peça do link do atendimento ainda pode ir para o carrinho: variante ativa do produto e com estoque para o site
export function variantePronta(produto: Esquema<'ProdutoSaida'>, idVariante: number) {
  const variante = produto.variantes.find((v) => v.id_variante === idVariante)
  return variante?.ativo && variante.disponivel ? variante : null
}
