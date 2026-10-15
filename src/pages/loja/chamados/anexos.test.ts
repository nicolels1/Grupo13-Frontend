import { describe, expect, it } from 'vitest'

import { ehImagem, problemaDoArquivo } from './anexos'

const MB = 1024 * 1024
const arquivo = (nome: string, tipo: string, tamanho = 1) => new File([new Uint8Array(tamanho)], nome, { type: tipo })

describe('problemaDoArquivo', () => {
  it('aceita imagem e PDF de até 10 MB', () => {
    expect(problemaDoArquivo(arquivo('nota.pdf', 'application/pdf', 10 * MB))).toBeNull()
    expect(problemaDoArquivo(arquivo('foto.webp', 'image/webp'))).toBeNull()
  })

  it('recusa outro tipo de arquivo', () => {
    expect(problemaDoArquivo(arquivo('planilha.xlsx', 'application/vnd.ms-excel'))).toBe(
      'planilha.xlsx não serve: envie JPG, PNG, WEBP ou PDF.',
    )
  })

  it('recusa arquivo acima de 10 MB', () => {
    expect(problemaDoArquivo(arquivo('grande.pdf', 'application/pdf', 10 * MB + 1))).toBe('grande.pdf passa de 10 MB.')
  })
})

describe('ehImagem', () => {
  it('reconhece a imagem pela extensão, sem importar maiúsculas', () => {
    expect(ehImagem('foto.JPG')).toBe(true)
    expect(ehImagem('foto.jpeg')).toBe(true)
    expect(ehImagem('nota.pdf')).toBe(false)
  })

  it('sem nome não é imagem', () => {
    expect(ehImagem(null)).toBe(false)
    expect(ehImagem(undefined)).toBe(false)
  })
})
