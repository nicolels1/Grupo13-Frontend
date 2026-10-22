import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHAVE_COMPRA_EM_ABERTO, guardarCompraEmAberto, lerCompraEmAberto } from './compraEmAberto'

// sessionStorage de mentira: os testes rodam no Node, sem navegador
function armazenamento() {
  const dados = new Map<string, string>()
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    removeItem: (chave: string) => void dados.delete(chave),
  }
}

describe('compra em aberto', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('guarda e lê a compra da aba', () => {
    vi.stubGlobal('sessionStorage', armazenamento())
    guardarCompraEmAberto(42)
    expect(lerCompraEmAberto()).toBe(42)
  })

  it('null apaga a compra guardada', () => {
    vi.stubGlobal('sessionStorage', armazenamento())
    guardarCompraEmAberto(42)
    guardarCompraEmAberto(null)
    expect(lerCompraEmAberto()).toBeNull()
  })

  it('valor estragado vira nenhuma compra', () => {
    const sessao = armazenamento()
    sessao.setItem(CHAVE_COMPRA_EM_ABERTO, '101,102')
    vi.stubGlobal('sessionStorage', sessao)
    expect(lerCompraEmAberto()).toBeNull()
  })

  // o pedido em aberto de antes da compra ficava em outra chave: não é lido como compra
  it('ignora o pedido guardado na chave antiga', () => {
    const sessao = armazenamento()
    sessao.setItem('casa-lorenzi:pedido-em-aberto', '42')
    vi.stubGlobal('sessionStorage', sessao)
    expect(lerCompraEmAberto()).toBeNull()
  })

  it('sem armazenamento no navegador não quebra', () => {
    const bloqueado = () => {
      throw new Error('bloqueado')
    }
    vi.stubGlobal('sessionStorage', { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado })
    expect(() => guardarCompraEmAberto(42)).not.toThrow()
    expect(lerCompraEmAberto()).toBeNull()
  })
})
