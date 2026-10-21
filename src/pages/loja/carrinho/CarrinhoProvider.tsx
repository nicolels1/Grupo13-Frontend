import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '@/auth/contexto'
import { useLojaEscolhida, type Loja } from '@/lib/lojaEscolhida'
import { CarrinhoContext, MAXIMO_POR_PECA, type ItemDoCarrinho, type ValorCarrinho } from './contexto'

// um carrinho por loja, cada um guardado com a sua chave (o da Casa Lorenzi mantém a de antes)
const CHAVES: Record<Loja, string> = { lorenzi: 'casa-lorenzi:carrinho', vulto: 'vulto:carrinho' }
type PorLoja = Record<Loja, ItemDoCarrinho[]>

// o carrinho fica no navegador (design: login só ao finalizar). Leitura defensiva: dado
// estragado ou de outra versão vira carrinho vazio em vez de quebrar a loja
function lerGuardado(loja: Loja): ItemDoCarrinho[] {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(CHAVES[loja]) ?? '[]')
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

const VAZIO: PorLoja = { lorenzi: [], vulto: [] }

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const loja = useLojaEscolhida()
  const [porLoja, setPorLoja] = useState<PorLoja>(() => ({ lorenzi: lerGuardado('lorenzi'), vulto: lerGuardado('vulto') }))
  const itens = porLoja[loja]
  const outra: Loja = loja === 'vulto' ? 'lorenzi' : 'vulto'
  // as mudanças valem para o carrinho da loja aberta
  const setItens = useCallback(
    (mudar: (atuais: ItemDoCarrinho[]) => ItemDoCarrinho[]) => setPorLoja((todos) => ({ ...todos, [loja]: mudar(todos[loja]) })),
    [loja],
  )
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { sessao } = useAuth()
  const idUsuario = sessao === undefined ? undefined : (sessao?.user?.id ?? null)
  const [idAnterior, setIdAnterior] = useState(idUsuario)

  // quem estava logado saiu (por qualquer botão "Sair" ou em outra aba): os carrinhos saem junto, para a
  // próxima pessoa no mesmo navegador não herdar as peças. Entrar não mexe: o visitante monta o carrinho
  // e faz login só para finalizar
  if (idUsuario !== idAnterior) {
    setIdAnterior(idUsuario)
    if (idAnterior && idUsuario === null) setPorLoja(VAZIO)
  }

  useEffect(() => {
    try {
      for (const l of Object.keys(CHAVES) as Loja[]) localStorage.setItem(CHAVES[l], JSON.stringify(porLoja[l]))
    } catch {
      // navegador sem armazenamento (aba anônima bloqueada): o carrinho vale só nesta visita
    }
  }, [porLoja])

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
  }, [setItens])

  const mudarQuantidade = useCallback((idVariante: number, quantidade: number) => {
    setItens((atuais) => atuais.map((i) => (i.id_variante === idVariante ? { ...i, quantidade: limitar(quantidade) } : i)))
  }, [setItens])

  const remover = useCallback((idVariante: number) => {
    setItens((atuais) => atuais.filter((i) => i.id_variante !== idVariante))
  }, [setItens])

  // desfazer a remoção: a peça volta para o mesmo lugar da lista
  const devolver = useCallback((item: ItemDoCarrinho, posicao: number) => {
    setItens((atuais) => {
      if (atuais.some((i) => i.id_variante === item.id_variante)) return atuais
      const copia = [...atuais]
      copia.splice(Math.min(posicao, copia.length), 0, item)
      return copia
    })
  }, [setItens])

  const esvaziar = useCallback(() => setItens(() => []), [setItens])
  const abrirGaveta = useCallback(() => setGavetaAberta(true), [])
  const fecharGaveta = useCallback(() => setGavetaAberta(false), [])

  const valor = useMemo<ValorCarrinho>(
    () => ({
      loja,
      itens,
      quantidadeTotal: itens.reduce((soma, i) => soma + i.quantidade, 0),
      pecasNaOutraLoja: porLoja[outra].reduce((soma, i) => soma + i.quantidade, 0),
      adicionar, mudarQuantidade, remover, devolver, esvaziar,
      gavetaAberta, abrirGaveta, fecharGaveta,
    }),
    [loja, itens, porLoja, outra, adicionar, mudarQuantidade, remover, devolver, esvaziar, gavetaAberta, abrirGaveta, fecharGaveta],
  )

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>
}
