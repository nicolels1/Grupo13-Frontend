import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHAVE_PEDIDO_EM_ABERTO, guardarPedidoEmAberto, lerPedidoEmAberto } from './pedidoEmAberto'

// sessionStorage de mentira: os testes rodam no Node, sem navegador
function armazenamento() {
  const dados = new Map<string, string>()
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    removeItem: (chave: string) => void dados.delete(chave),
  }
}

describe('pedido em aberto', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('guarda e lê o pedido da aba', () => {
    vi.stubGlobal('sessionStorage', armazenamento())
    guardarPedidoEmAberto(42)
    expect(lerPedidoEmAberto()).toBe(42)
  })

  it('null apaga o pedido guardado', () => {
    vi.stubGlobal('sessionStorage', armazenamento())
    guardarPedidoEmAberto(42)
    guardarPedidoEmAberto(null)
    expect(lerPedidoEmAberto()).toBeNull()
  })

  it('valor estragado vira nenhum pedido', () => {
    const sessao = armazenamento()
    sessao.setItem(CHAVE_PEDIDO_EM_ABERTO, 'abc')
    vi.stubGlobal('sessionStorage', sessao)
    expect(lerPedidoEmAberto()).toBeNull()
  })

  it('sem armazenamento no navegador não quebra', () => {
    const bloqueado = () => {
      throw new Error('bloqueado')
    }
    vi.stubGlobal('sessionStorage', { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado })
    expect(() => guardarPedidoEmAberto(42)).not.toThrow()
    expect(lerPedidoEmAberto()).toBeNull()
  })
})
