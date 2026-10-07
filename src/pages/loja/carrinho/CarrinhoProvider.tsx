import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { CarrinhoContext, MAXIMO_POR_PECA, type ItemDoCarrinho, type ValorCarrinho } from './contexto'

const CHAVE = 'casa-lorenzi:carrinho'

// o carrinho fica no navegador (design: login só ao finalizar). Leitura defensiva: dado
// estragado ou de outra versão vira carrinho vazio em vez de quebrar a loja
function lerGuardado(): ItemDoCarrinho[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '[]')
    if (!Array.isArray(bruto)) return []
    return bruto.filter(
      (i): i is ItemDoCarrinho =>
        Number.isInteger(i?.id_variante) && Number.isInteger(i?.id_produto) && Number.isInteger(i?.quantidade),
    )
  } catch {
    return []
  }
}

function limitar(quantidade: number) {
  return Math.min(MAXIMO_POR_PECA, Math.max(1, Math.round(quantidade)))
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemDoCarrinho[]>(lerGuardado)
  const [gavetaAberta, setGavetaAberta] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens))
    } catch {
      // navegador sem armazenamento (aba anônima bloqueada): o carrinho vale só nesta visita
    }
  }, [itens])

  const adicionar = useCallback<ValorCarrinho['adicionar']>((item, quantidade = 1) => {
    setItens((atuais) => {
      const existente = atuais.find((i) => i.id_variante === item.id_variante)
      if (existente) {
        return atuais.map((i) =>
          i.id_variante === item.id_variante ? { ...i, quantidade: limitar(i.quantidade + quantidade) } : i,
        )
      }
      return [...atuais, { ...item, quantidade: limitar(quantidade) }]
    })
    setGavetaAberta(true)
  }, [])

  const mudarQuantidade = useCallback((idVariante: number, quantidade: number) => {
    setItens((atuais) => atuais.map((i) => (i.id_variante === idVariante ? { ...i, quantidade: limitar(quantidade) } : i)))
  }, [])

  const remover = useCallback((idVariante: number) => {
    setItens((atuais) => atuais.filter((i) => i.id_variante !== idVariante))
  }, [])

  // desfazer a remoção: a peça volta para o mesmo lugar da lista
  const devolver = useCallback((item: ItemDoCarrinho, posicao: number) => {
    setItens((atuais) => {
      if (atuais.some((i) => i.id_variante === item.id_variante)) return atuais
      const copia = [...atuais]
      copia.splice(Math.min(posicao, copia.length), 0, item)
      return copia
    })
  }, [])

  const esvaziar = useCallback(() => setItens([]), [])
  const abrirGaveta = useCallback(() => setGavetaAberta(true), [])
  const fecharGaveta = useCallback(() => setGavetaAberta(false), [])

  const valor = useMemo<ValorCarrinho>(
    () => ({
      itens,
      quantidadeTotal: itens.reduce((soma, i) => soma + i.quantidade, 0),
      adicionar, mudarQuantidade, remover, devolver, esvaziar,
      gavetaAberta, abrirGaveta, fecharGaveta,
    }),
    [itens, adicionar, mudarQuantidade, remover, devolver, esvaziar, gavetaAberta, abrirGaveta, fecharGaveta],
  )

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>
}
