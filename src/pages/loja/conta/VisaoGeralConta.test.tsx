// @vitest-environment jsdom
// visão geral da conta: em Seus dados, a caixinha do lembrete de pontos salva na hora
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))
vi.mock('@/auth/contexto', () => ({
  useAuth: () => ({ perfil: { nome: 'Ana Teste', email: 'ana@email.com', tipo_conta: 'cliente' } }),
}))

const { VisaoGeralConta } = await import('./VisaoGeralConta')

describe('VisaoGeralConta: e-mails que você recebe', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('marca a caixinha e liga o lembrete de pontos', async () => {
    let aceita = false
    api.mockImplementation(async (caminho: string, opcoes?: { metodo?: string; corpo?: { aceita: boolean } }) => {
      if (caminho === '/fidelidade/meus-pontos/lembrete') {
        if (opcoes?.metodo === 'PUT') aceita = opcoes.corpo!.aceita
        return { aceita }
      }
      if (caminho === '/fidelidade/meus-pontos') return { saldos: [] }
      return { items: [], total: 0, limit: 100, offset: 0 }
    })
    const roteador = createMemoryRouter([{ path: '/loja/conta', element: <VisaoGeralConta /> }], {
      initialEntries: ['/loja/conta'],
    })
    render(<RouterProvider router={roteador} />)

    const caixinha = await screen.findByRole('checkbox', { name: /Lembrete de pontos/ })
    await waitFor(() => expect(caixinha.getAttribute('aria-disabled')).not.toBe('true'))
    fireEvent.click(caixinha)

    await waitFor(() => expect(caixinha.getAttribute('aria-checked')).toBe('true'))
    expect(api).toHaveBeenCalledWith('/fidelidade/meus-pontos/lembrete', { metodo: 'PUT', corpo: { aceita: true } })
  })
})
