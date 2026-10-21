import { createContext, useContext } from 'react'

import type { Loja } from '@/lib/lojaEscolhida'

// o navegador guarda só o necessário para refazer o carrinho; preço, nome e frete vêm sempre
// da API (POST /carrinho), para valer o preço do momento
export type ItemDoCarrinho = { id_variante: number; id_produto: number; quantidade: number }

// o carrinho é o da loja aberta na aba do topo: um pedido sai de uma unidade só, e cada rede tem o seu
// CD, então peças das duas redes não fecham um pedido juntas
export type ValorCarrinho = {
  loja: Loja
  itens: ItemDoCarrinho[]
  quantidadeTotal: number
  // peças guardadas no carrinho da outra loja, para avisar que elas continuam lá
  pecasNaOutraLoja: number
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
