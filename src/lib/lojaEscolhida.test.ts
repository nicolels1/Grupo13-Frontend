// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

describe('loja escolhida', () => {
  it('começa na Casa Lorenzi e guarda a troca no navegador', async () => {
    localStorage.clear()
    vi.resetModules()
    const { escolherLoja, lojaEscolhida } = await import('./lojaEscolhida')
    expect(lojaEscolhida()).toBe('lorenzi')
    escolherLoja('vulto')
    expect(lojaEscolhida()).toBe('vulto')
    expect(localStorage.getItem('loja-escolhida')).toBe('vulto')
  })

  it('volta para a loja guardada quando a página abre de novo', async () => {
    localStorage.setItem('loja-escolhida', 'vulto')
    vi.resetModules()
    const { lojaEscolhida } = await import('./lojaEscolhida')
    expect(lojaEscolhida()).toBe('vulto')
  })

  it('trata marca desconhecida como a casa', async () => {
    const { lojaDaMarca } = await import('./lojaEscolhida')
    expect(lojaDaMarca('vulto')).toBe('vulto')
    expect(lojaDaMarca('lorenzi')).toBe('lorenzi')
    expect(lojaDaMarca('outra')).toBe('lorenzi')
  })
})
