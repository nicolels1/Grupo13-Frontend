import { useSyncExternalStore } from 'react'

// as duas lojas da plataforma do cliente, como abas no topo (P1, P11): Casa Lorenzi e Vulto. A vitrine
// (início, lista e menu de categorias) mostra a loja escolhida; carrinho, checkout e conta são um só.
// A escolha fica no navegador e volta ao recarregar a página

export type Loja = 'lorenzi' | 'vulto'

const CHAVE = 'loja-escolhida'
const avisar = new Set<() => void>()

function lerGuardada(): Loja {
  try {
    return localStorage.getItem(CHAVE) === 'vulto' ? 'vulto' : 'lorenzi'
  } catch {
    return 'lorenzi'
  }
}

let atual: Loja = lerGuardada()

export function lojaEscolhida(): Loja {
  return atual
}

export function escolherLoja(loja: Loja) {
  if (loja === atual) return
  atual = loja
  try {
    localStorage.setItem(CHAVE, loja)
  } catch {
    // navegador sem armazenamento (aba anônima): a escolha vale até fechar a página
  }
  for (const aviso of avisar) aviso()
}

export function useLojaEscolhida(): Loja {
  return useSyncExternalStore(
    (aviso) => {
      avisar.add(aviso)
      return () => avisar.delete(aviso)
    },
    lojaEscolhida,
  )
}

// a marca de um produto como loja; peça de marca desconhecida fica na casa
export function lojaDaMarca(marca: string): Loja {
  return marca === 'vulto' ? 'vulto' : 'lorenzi'
}
