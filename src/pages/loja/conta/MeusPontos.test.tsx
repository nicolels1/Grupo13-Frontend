// @vitest-environment jsdom
// lembrete de pontos vencendo na aba Meus pontos: o cliente liga e desliga o e-mail
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { MeusPontos } = await import('./MeusPontos')

// responde cada rota da tela; o lembrete começa no valor pedido e muda com o PUT
function apiDaTela(aceitaNoComeco: boolean) {
  let aceita = aceitaNoComeco
  api.mockImplementation(async (caminho: string, opcoes?: { metodo?: string; corpo?: { aceita: boolean } }) => {
    if (caminho === '/fidelidade/meus-pontos/lembrete') {
      if (opcoes?.metodo === 'PUT') aceita = opcoes.corpo!.aceita
      return { aceita }
    }
    if (caminho === '/fidelidade/meus-pontos') return { saldos: [] }
    return { items: [], total: 0, limit: 20, offset: 0 }
  })
}

describe('MeusPontos: lembrete de pontos', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('sem aceite, oferece o lembrete e liga com um clique', async () => {
    apiDaTela(false)
    render(<MeusPontos />)

    fireEvent.click(await screen.findByRole('button', { name: 'Quero receber' }))

    expect(await screen.findByRole('button', { name: 'Parar de receber' })).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/fidelidade/meus-pontos/lembrete', { metodo: 'PUT', corpo: { aceita: true } })
    expect(screen.getByText(/Você recebe um e-mail duas semanas antes/)).toBeTruthy()
  })

  it('com aceite, deixa parar de receber', async () => {
    apiDaTela(true)
    render(<MeusPontos />)

    fireEvent.click(await screen.findByRole('button', { name: 'Parar de receber' }))

    expect(await screen.findByRole('button', { name: 'Quero receber' })).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/fidelidade/meus-pontos/lembrete', { metodo: 'PUT', corpo: { aceita: false } })
  })
})
