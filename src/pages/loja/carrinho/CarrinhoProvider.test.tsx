// @vitest-environment jsdom
// carrinho único no site: mantém peças de ambas as marcas no mesmo carrinho (ADR 0017)
import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { escolherLoja } = await import('@/lib/lojaEscolhida')
const { CarrinhoProvider } = await import('./CarrinhoProvider')
const { useCarrinho } = await import('./contexto')

function comCarrinho({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={authDeTeste()}>
      <CarrinhoProvider>{children}</CarrinhoProvider>
    </AuthContext.Provider>
  )
}

describe('carrinho único', () => {
  beforeEach(() => {
    localStorage.clear()
    escolherLoja('lorenzi')
  })
  afterEach(cleanup)

  it('guarda as peças das duas marcas no mesmo carrinho', () => {
    const { result } = renderHook(() => useCarrinho(), { wrapper: comCarrinho })
    act(() => result.current.adicionar({ id_variante: 1, id_produto: 10 }, 2))
    expect(result.current.itens).toHaveLength(1)
    expect(result.current.quantidadeTotal).toBe(2)

    // Trocar de loja na aba do site não esconde as peças: o carrinho é um só
    act(() => escolherLoja('vulto'))
    expect(result.current.itens).toHaveLength(1)

    act(() => result.current.adicionar({ id_variante: 901, id_produto: 90 }))
    expect(result.current.itens).toEqual([
      { id_variante: 1, id_produto: 10, quantidade: 2 },
      { id_variante: 901, id_produto: 90, quantidade: 1 },
    ])
    expect(result.current.quantidadeTotal).toBe(3)
    expect(JSON.parse(localStorage.getItem('casa-lorenzi:carrinho') ?? '[]')).toHaveLength(2)
  })

  it('migra as peças do antigo carrinho da Vulto para o carrinho único', () => {
    localStorage.setItem('casa-lorenzi:carrinho', JSON.stringify([{ id_variante: 1, id_produto: 10, quantidade: 1 }]))
    localStorage.setItem('vulto:carrinho', JSON.stringify([{ id_variante: 901, id_produto: 90, quantidade: 2 }]))

    const { result } = renderHook(() => useCarrinho(), { wrapper: comCarrinho })
    expect(result.current.itens).toEqual([
      { id_variante: 1, id_produto: 10, quantidade: 1 },
      { id_variante: 901, id_produto: 90, quantidade: 2 },
    ])
    expect(result.current.quantidadeTotal).toBe(3)
    expect(localStorage.getItem('vulto:carrinho')).toBeNull()
  })

  it('esvaziar limpa todo o carrinho único', () => {
    const { result } = renderHook(() => useCarrinho(), { wrapper: comCarrinho })
    act(() => result.current.adicionar({ id_variante: 1, id_produto: 10 }))
    act(() => result.current.adicionar({ id_variante: 901, id_produto: 90 }))
    expect(result.current.itens).toHaveLength(2)

    act(() => result.current.esvaziar())
    expect(result.current.itens).toEqual([])
    expect(result.current.quantidadeTotal).toBe(0)
  })
})
