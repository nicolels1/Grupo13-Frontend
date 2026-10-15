import { describe, expect, it, vi } from 'vitest'

// o cliente do Supabase precisa das variáveis do .env; aqui só a conferência do arquivo importa
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }))

const { problemaDaFoto } = await import('./regrasFoto')

const MB = 1024 * 1024
const arquivo = (nome: string, tipo: string, tamanho = 1) => new File([new Uint8Array(tamanho)], nome, { type: tipo })

describe('problemaDaFoto', () => {
  it('aceita JPG, PNG e WEBP de até 5 MB', () => {
    expect(problemaDaFoto(arquivo('a.jpg', 'image/jpeg'))).toBeNull()
    expect(problemaDaFoto(arquivo('b.png', 'image/png'))).toBeNull()
    expect(problemaDaFoto(arquivo('c.webp', 'image/webp', 5 * MB))).toBeNull()
  })

  it('recusa outro tipo de arquivo', () => {
    expect(problemaDaFoto(arquivo('foto.gif', 'image/gif'))).toBe('foto.gif: envie JPG, PNG ou WEBP.')
  })

  it('recusa foto acima de 5 MB', () => {
    expect(problemaDaFoto(arquivo('grande.jpg', 'image/jpeg', 5 * MB + 1))).toBe('grande.jpg: passa de 5 MB. Envie uma menor.')
  })
})
