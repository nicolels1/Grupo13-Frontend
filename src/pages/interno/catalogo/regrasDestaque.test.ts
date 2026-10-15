import { describe, expect, it } from 'vitest'

import { problemaDoLink, trocarOrdem } from './regrasDestaque'

describe('problemaDoLink', () => {
  it('aceita páginas da loja', () => {
    expect(problemaDoLink('/loja/produtos?busca=linho')).toBeNull()
    expect(problemaDoLink(' /loja/ajuda#trocas ')).toBeNull()
  })

  it('recusa link para fora da loja', () => {
    for (const link of ['https://golpe.example', '//golpe.example', 'javascript:alert(1)', 'loja/produtos', '']) {
      expect(problemaDoLink(link)).toMatch(/página da loja/)
    }
  })
})

describe('trocarOrdem', () => {
  const slides = [
    { id_destaque: 7, ordem: 1 },
    { id_destaque: 3, ordem: 2 },
    { id_destaque: 9, ordem: 5 },
  ]

  it('troca a ordem com o vizinho de cima ou de baixo', () => {
    expect(trocarOrdem(slides, 1, -1)).toEqual([{ id_destaque: 3, ordem: 1 }, { id_destaque: 7, ordem: 2 }])
    expect(trocarOrdem(slides, 1, 1)).toEqual([{ id_destaque: 3, ordem: 5 }, { id_destaque: 9, ordem: 2 }])
  })

  it('nas pontas não há o que trocar', () => {
    expect(trocarOrdem(slides, 0, -1)).toEqual([])
    expect(trocarOrdem(slides, 2, 1)).toEqual([])
  })
})
