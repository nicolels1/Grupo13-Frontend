import { describe, expect, it, vi } from 'vitest'

import type { Esquema } from './api'

// a chamada à API é trocada por uma de mentira: aqui só importa o cache
const api = vi.fn()
vi.mock('./api', () => ({ api }))

const { buscarVariante, nomeUnidade } = await import('./listas')

type Unidade = Esquema<'UnidadeSaida'>

describe('nomeUnidade', () => {
  const unidades = [{ id_unidade: 1, nome: 'Loja Jardins' }] as Unidade[]

  it('acha o nome pelo id', () => {
    expect(nomeUnidade(unidades, 1)).toBe('Loja Jardins')
  })

  it('unidade fora da lista mostra o id', () => {
    expect(nomeUnidade(unidades, 9)).toBe('Unidade 9')
    expect(nomeUnidade(null, 9)).toBe('Unidade 9')
  })

  it('sem unidade mostra um traço', () => {
    expect(nomeUnidade(unidades, null)).toBe('—')
  })
})

describe('buscarVariante', () => {
  it('consulta cada variante uma vez só', async () => {
    api.mockResolvedValue({ items: [{ id_variante: 7, sku: 'CAM-07' }] })
    const [primeira, segunda] = await Promise.all([buscarVariante(7), buscarVariante(7)])
    expect(primeira).toEqual({ id_variante: 7, sku: 'CAM-07' })
    expect(segunda).toBe(primeira)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('falha não fica no cache: a próxima consulta tenta de novo', async () => {
    api.mockReset()
    api.mockRejectedValueOnce(new Error('sem rede')).mockResolvedValueOnce({ items: [{ id_variante: 8 }] })
    expect(await buscarVariante(8)).toBeNull()
    expect(await buscarVariante(8)).toEqual({ id_variante: 8 })
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('variante que não existe vira null', async () => {
    api.mockReset()
    api.mockResolvedValue({ items: [] })
    expect(await buscarVariante(9)).toBeNull()
  })
})
