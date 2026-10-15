import { describe, expect, it } from 'vitest'

import type { Esquema } from '@/lib/api'
import { fotosDaCor } from './fotos'
import { rotuloTamanho } from './tamanhos'

type Imagem = Esquema<'ImagemSaida'>

const foto = (id_imagem: number, cor: string | null, ordem: number) => ({ id_imagem, cor, ordem }) as Imagem

describe('fotosDaCor', () => {
  const imagens = [foto(1, 'Azul', 2), foto(2, null, 3), foto(3, 'Verde', 0), foto(4, 'Azul', 1)]

  it('junta as fotos da cor com as que valem para todas, na ordem', () => {
    expect(fotosDaCor(imagens, 'Azul').map((f) => f.id_imagem)).toEqual([4, 1, 2])
  })

  it('sem cor escolhida mostra só as fotos de todas as cores', () => {
    expect(fotosDaCor(imagens, null).map((f) => f.id_imagem)).toEqual([2])
  })

  it('não muda a lista recebida', () => {
    fotosDaCor(imagens, 'Azul')
    expect(imagens.map((f) => f.id_imagem)).toEqual([1, 2, 3, 4])
  })
})

describe('rotuloTamanho', () => {
  it('mostra "Único" no lugar do U do banco', () => {
    expect(rotuloTamanho('U')).toBe('Único')
    expect(rotuloTamanho('M')).toBe('M')
  })
})
