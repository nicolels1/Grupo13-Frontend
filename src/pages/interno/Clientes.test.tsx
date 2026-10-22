// @vitest-environment jsdom
// as duas abas da área Clientes com a API de mentira: trocar de aba não desenha a lista de uma com a
// tabela da outra (enquanto a nova não chega, aparece o carregando)
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clienteVultoDeTeste } from '@/lib/vultoDeTeste'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { Clientes } = await import('./Clientes')

const COM_CONTA = { id_usuario: 'b5d1c0de', nome: 'Carla Mendes', email: 'carla@exemplo.com', cpf: '48120376544', status_conta: 'ativa', id_cliente_sem_conta: null }
const pagina = (items: unknown[]) => ({ items, total: items.length, limit: 25, offset: 0 })

function abrir() {
  const roteador = createMemoryRouter([{ path: '/interno/clientes', element: <Clientes /> }], { initialEntries: ['/interno/clientes'] })
  render(<RouterProvider router={roteador} />)
}

describe('Clientes', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('ao trocar de aba, mostra o carregando até a lista da outra aba chegar', async () => {
    let entregarSemConta: (valor: unknown) => void = () => {}
    api.mockImplementation((caminho: string, opcoes: { params: { limit: number } }) => {
      if (opcoes.params.limit === 1) return Promise.resolve({ total: 1 })
      if (caminho === '/vendas/clientes-com-conta') return Promise.resolve(pagina([COM_CONTA]))
      return new Promise((resolver) => { entregarSemConta = resolver })
    })
    abrir()
    expect(await screen.findByText('Carla Mendes')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /Sem conta/ }))
    expect(screen.queryByText('Carla Mendes')).toBeNull()
    expect(screen.getByText('Carregando...')).toBeTruthy()

    entregarSemConta(pagina([clienteVultoDeTeste()]))
    expect(await screen.findByText('Bruna Teixeira')).toBeTruthy()
    expect(screen.getByText('Sem conta')).toBeTruthy()
  })
})
