import { createContext, useContext } from 'react'

// o navegador guarda só o necessário para refazer o carrinho; preço, nome e frete vêm sempre
// da API (POST /carrinho), para valer o preço do momento
export type ItemDoCarrinho = { id_variante: number; id_produto: number; quantidade: number }

export type ValorCarrinho = {
  itens: ItemDoCarrinho[]
  quantidadeTotal: number
  adicionar: (item: Omit<ItemDoCarrinho, 'quantidade'>, quantidade?: number) => void
  mudarQuantidade: (idVariante: number, quantidade: number) => void
  remover: (idVariante: number) => void
  devolver: (item: ItemDoCarrinho, posicao: number) => void
  esvaziar: () => void
  // gaveta lateral: abre ao adicionar (é a confirmação de "adicionado") e pelo ícone do topo
  gavetaAberta: boolean
  abrirGaveta: () => void
  fecharGaveta: () => void
}

export const MAXIMO_POR_PECA = 10

export const CarrinhoContext = createContext<ValorCarrinho | null>(null)

export function useCarrinho() {
  const valor = useContext(CarrinhoContext)
  if (!valor) throw new Error('useCarrinho precisa estar dentro de CarrinhoProvider')
  return valor
}
