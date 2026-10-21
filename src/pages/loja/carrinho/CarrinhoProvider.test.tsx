// @vitest-environment jsdom
// um carrinho por loja: a aba do topo escolhe qual aparece, e o da outra loja fica guardado
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

describe('carrinho por loja', () => {
  beforeEach(() => {
    localStorage.clear()
    escolherLoja('lorenzi')
  })
  afterEach(cleanup)

  it('guarda as peças de cada loja no carrinho dela', () => {
    const { result } = renderHook(() => useCarrinho(), { wrapper: comCarrinho })
    act(() => result.current.adicionar({ id_variante: 1, id_produto: 10 }, 2))
    act(() => escolherLoja('vulto'))
    expect(result.current.loja).toBe('vulto')
    expect(result.current.itens).toEqual([])
    expect(result.current.pecasNaOutraLoja).toBe(2)

    act(() => result.current.adicionar({ id_variante: 901, id_produto: 90 }))
    expect(result.current.itens).toEqual([{ id_variante: 901, id_produto: 90, quantidade: 1 }])
    expect(JSON.parse(localStorage.getItem('vulto:carrinho') ?? '[]')).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('casa-lorenzi:carrinho') ?? '[]')).toHaveLength(1)
  })

  it('esvaziar depois do pedido limpa só o carrinho da loja que fechou', () => {
    const { result } = renderHook(() => useCarrinho(), { wrapper: comCarrinho })
    act(() => result.current.adicionar({ id_variante: 1, id_produto: 10 }))
    act(() => escolherLoja('vulto'))
    act(() => result.current.adicionar({ id_variante: 901, id_produto: 90 }))
    act(() => result.current.esvaziar())
    expect(result.current.itens).toEqual([])
    act(() => escolherLoja('lorenzi'))
    expect(result.current.itens).toHaveLength(1)
  })
})
