import { afterEach, describe, expect, it, vi } from 'vitest'

import { buscarCep, mascaraCep } from './cep'

describe('mascaraCep', () => {
  it('põe o traço depois do quinto dígito', () => {
    expect(mascaraCep('01310100')).toBe('01310-100')
    expect(mascaraCep('013101')).toBe('01310-1')
  })

  it('aceita só dígitos e no máximo 8', () => {
    expect(mascaraCep('0131a')).toBe('0131')
    expect(mascaraCep('01310-100999')).toBe('01310-100')
  })
})

describe('buscarCep', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const respostaViaCep = (corpo: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => corpo })

  it('traduz a resposta do ViaCEP para os campos do endereço', async () => {
    const buscar = respostaViaCep({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' })
    vi.stubGlobal('fetch', buscar)
    expect(await buscarCep('01310-100')).toEqual({ rua: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' })
    expect(buscar).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/')
  })

  it('CEP incompleto nem chama o ViaCEP', async () => {
    const buscar = vi.fn()
    vi.stubGlobal('fetch', buscar)
    expect(await buscarCep('0131')).toBeNull()
    expect(buscar).not.toHaveBeenCalled()
  })

  it('CEP que não existe devolve null', async () => {
    vi.stubGlobal('fetch', respostaViaCep({ erro: true }))
    expect(await buscarCep('99999999')).toBeNull()
  })

  it('falha do ViaCEP devolve null para a pessoa preencher à mão', async () => {
    vi.stubGlobal('fetch', respostaViaCep(null, false))
    expect(await buscarCep('01310100')).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('sem rede')))
    expect(await buscarCep('01310100')).toBeNull()
  })
})
