// @vitest-environment jsdom
// "Mostrar mais pedidos" com uma API de mentira que, como a de verdade, recusa limit acima de 200:
// quem tem mais de 200 pedidos chega ao último sem erro
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pedidoVultoDeTeste } from '@/lib/vultoDeTeste'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ErroApi } = await import('@/lib/api')
const { MeusPedidos } = await import('./MeusPedidos')

// 260 pedidos, os mais recentes primeiro. O mais novo está pago (a caminho): a tela abre na aba "Em andamento",
// com uma linha só, e o teste não desenha centenas de pedidos; o título conta todos os carregados
const PEDIDOS = Array.from({ length: 260 }, (_, i) =>
  pedidoVultoDeTeste({ id_pedido: 260 - i, codigo_venda: `PED-${260 - i}`, status: i === 0 ? 'pago' : 'entregue' }),
)

function servir() {
  api.mockImplementation((_caminho: string, { params }: { params: { limit: number; offset?: number } }) => {
    if (params.limit > 200) return Promise.reject(new ErroApi(422, 'Input should be less than or equal to 200'))
    const offset = params.offset ?? 0
    return Promise.resolve({ items: PEDIDOS.slice(offset, offset + params.limit), total: PEDIDOS.length, limit: params.limit, offset })
  })
}

function abrir() {
  const roteador = createMemoryRouter([{ path: '/loja/pedidos', element: <MeusPedidos /> }], { initialEntries: ['/loja/pedidos'] })
  render(<RouterProvider router={roteador} />)
}

describe('MeusPedidos', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('"Mostrar mais pedidos" chega ao último pedido sem passar do limite da API', async () => {
    servir()
    abrir()
    expect(await screen.findByText('50 pedidos')).toBeTruthy()

    for (const quantos of [100, 150, 200, 250, 260]) {
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais pedidos' }))
      expect(await screen.findByText(`${quantos} pedidos`)).toBeTruthy()
    }
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mostrar mais pedidos' })).toBeNull()
    expect(api.mock.calls.every(([, { params }]) => params.limit <= 200)).toBe(true)
  })
})
