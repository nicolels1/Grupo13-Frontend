import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useAuth } from '@/auth/contexto'
import { CarrinhoContext, MAXIMO_POR_PECA, type ItemDoCarrinho, type ValorCarrinho } from './contexto'

// um carrinho só para o site, com peças das duas marcas: na finalização cada marca vira um pedido (ADR 0017 do
// backend). Fica na chave do antigo carrinho da Casa Lorenzi; o antigo da Vulto entra nele uma vez
const CHAVE = 'casa-lorenzi:carrinho'
const CHAVE_ANTIGA_DA_VULTO = 'vulto:carrinho'

// o carrinho fica no navegador (design: login só ao finalizar). Leitura defensiva: dado
// estragado ou de outra versão vira carrinho vazio em vez de quebrar a loja
function lerGuardado(chave: string): ItemDoCarrinho[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]')
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

// o carrinho guardado mais o antigo da Vulto, de quando cada loja tinha o seu (a mesma peça soma)
function lerCarrinho(): ItemDoCarrinho[] {
  const itens = lerGuardado(CHAVE)
  for (const antigo of lerGuardado(CHAVE_ANTIGA_DA_VULTO)) {
    const igual = itens.find((i) => i.id_variante === antigo.id_variante)
    if (igual) igual.quantidade = limitar(igual.quantidade + antigo.quantidade)
    else itens.push(antigo)
  }
  return itens
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemDoCarrinho[]>(lerCarrinho)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { sessao } = useAuth()
  const idUsuario = sessao === undefined ? undefined : (sessao?.user?.id ?? null)
  const [idAnterior, setIdAnterior] = useState(idUsuario)

  // quem estava logado saiu (por qualquer botão "Sair" ou em outra aba): o carrinho sai junto, para a
  // próxima pessoa no mesmo navegador não herdar as peças. Entrar não mexe: o visitante monta o carrinho
  // e faz login só para finalizar
  if (idUsuario !== idAnterior) {
    setIdAnterior(idUsuario)
    if (idAnterior && idUsuario === null) setItens([])
  }

  // o que está guardado no navegador: só grava quando o carrinho desta aba mudou, para não regravar por
  // cima do que outra aba acabou de pôr
  const guardado = useRef<string | null>(null)

  useEffect(() => {
    const json = JSON.stringify(itens)
    if (json === guardado.current) return
    guardado.current = json
    try {
      localStorage.setItem(CHAVE, json)
      localStorage.removeItem(CHAVE_ANTIGA_DA_VULTO)
    } catch {
      // navegador sem armazenamento (aba anônima bloqueada): o carrinho vale só nesta visita
    }
  }, [itens])

  // outra aba mudou o carrinho (ou limpou os dados do site, key null): esta passa a mostrar o que está
  // guardado. Lê de novo em vez de usar o valor do aviso: se as duas gravaram quase juntas, ficam iguais
  useEffect(() => {
    function aoMudarEmOutraAba(evento: StorageEvent) {
      if (evento.key !== null && evento.key !== CHAVE) return
      const lidos = lerGuardado(CHAVE)
      guardado.current = JSON.stringify(lidos)
      setItens(lidos)
    }
    window.addEventListener('storage', aoMudarEmOutraAba)
    return () => window.removeEventListener('storage', aoMudarEmOutraAba)
  }, [])

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
