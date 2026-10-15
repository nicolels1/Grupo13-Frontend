import { describe, expect, it } from 'vitest'

import { novaLinha, VARIANTE_VAZIA, varianteParaApi } from './regrasVariante'

describe('varianteParaApi', () => {
  it('sem cor e sem tamanho vira peça única', () => {
    const enviada = varianteParaApi({ ...VARIANTE_VAZIA, cor: '  ', sku: 'CAM-01', preco: '199.90' })
    expect(enviada).toEqual({ cor: 'Única', tamanho: 'U', sku: 'CAM-01', preco: '199.90', estoque_inicial: [] })
  })

  it('tira os espaços da cor e do tamanho', () => {
    const enviada = varianteParaApi({ ...VARIANTE_VAZIA, cor: ' Azul ', tamanho: ' M ' })
    expect(enviada.cor).toBe('Azul')
    expect(enviada.tamanho).toBe('M')
  })

  it('manda o estoque inicial em números e ignora linha sem unidade ou sem quantidade', () => {
    const enviada = varianteParaApi({
      ...VARIANTE_VAZIA,
      estoque_inicial: [
        { id_unidade: '3', canal: 'loja_fisica', quantidade: '5' },
        { id_unidade: '', canal: 'loja_fisica', quantidade: '2' },
        { id_unidade: '4', canal: 'online', quantidade: '0' },
        { id_unidade: '4', canal: 'online', quantidade: '' },
      ],
    })
    expect(enviada.estoque_inicial).toEqual([{ id_unidade: 3, canal: 'loja_fisica', quantidade: 5 }])
  })
})

describe('novaLinha', () => {
  it('começa vazia e cada linha tem a própria chave', () => {
    const primeira = novaLinha()
    const segunda = novaLinha()
    expect(primeira).toMatchObject(VARIANTE_VAZIA)
    expect(primeira.chave).not.toBe(segunda.chave)
  })
})
