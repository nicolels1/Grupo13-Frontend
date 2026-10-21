// @vitest-environment jsdom
// a ficha com a API de mentira: cada seção pede os dados com o filtro do tipo de cliente certo
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXTRATO_DE_TESTE, PONTOS_DE_TESTE, clienteVultoDeTeste, pedidoVultoDeTeste } from '@/lib/vultoDeTeste'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { FichaCliente } = await import('./FichaCliente')

// respostas por endereço, como a API devolveria
function responder(caminho: string) {
  if (caminho.startsWith('/vendas/clientes-sem-conta/')) return Promise.resolve(clienteVultoDeTeste())
  if (caminho === '/vendas/clientes/b5d1c0de') {
    return Promise.resolve({ id_usuario: 'b5d1c0de', nome: 'Bruna Teixeira', email: 'bruna@exemplo.com', cpf: '48120376544',
      status_conta: 'ativa', id_cliente_sem_conta: 301 })
  }
  if (caminho === '/fidelidade/clientes/pontos') return Promise.resolve(PONTOS_DE_TESTE)
  if (caminho === '/fidelidade/clientes/pontos/extrato') return Promise.resolve({ items: EXTRATO_DE_TESTE, total: 4, limit: 20, offset: 0 })
  if (caminho === '/vendas/pedidos') return Promise.resolve({ items: [pedidoVultoDeTeste()], total: 1, limit: 20, offset: 0 })
  if (caminho === '/atendimento/chamados') return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 })
  if (caminho === '/migracao/origem') return Promise.resolve({ items: [] })
  return Promise.reject(new Error(`sem resposta para ${caminho}`))
}

function abrir(endereco: string) {
  const perfil = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['atender_chamado'] })
  const roteador = createMemoryRouter(
    [
      { path: '/interno/clientes/conta/:idCliente', element: <FichaCliente tipo="conta" /> },
      { path: '/interno/clientes/sem-conta/:idCliente', element: <FichaCliente tipo="sem-conta" /> },
    ],
    { initialEntries: [endereco] },
  )
  render(
    <AuthContext.Provider value={authDeTeste({ perfil })}>
      <RouterProvider router={roteador} />
    </AuthContext.Provider>,
  )
}

const pedidoCom = (caminho: string) => api.mock.calls.filter(([c]) => c === caminho).map(([, opcoes]) => opcoes?.params)

describe('FichaCliente', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('cliente da Vulto sem conta: tudo filtrado pelo cadastro sem conta', async () => {
    api.mockImplementation(responder)
    abrir('/interno/clientes/sem-conta/301')

    expect(await screen.findByText('Bruna Teixeira')).toBeTruthy()
    expect(await screen.findAllByText('APP-104233')).toHaveLength(2)
    expect(screen.getByText('Não informado')).toBeTruthy()
    expect(pedidoCom('/vendas/pedidos')).toEqual([{ id_cliente_sem_conta: 301, limit: 20 }])
    expect(pedidoCom('/atendimento/chamados')).toEqual([{ id_cliente_sem_conta: 301, limit: 20 }])
    expect(pedidoCom('/fidelidade/clientes/pontos')).toEqual([{ id_cliente_sem_conta: 301 }])
  })

  it('cliente com conta: tudo pela conta, e a origem pelo cadastro da Vulto ligado a ela', async () => {
    api.mockImplementation(responder)
    abrir('/interno/clientes/conta/b5d1c0de')

    expect(await screen.findByText('Cliente com conta, que veio da Vulto.')).toBeTruthy()
    await screen.findAllByText('APP-104233')
    expect(pedidoCom('/vendas/pedidos')).toEqual([{ id_cliente: 'b5d1c0de', limit: 20 }])
    expect(pedidoCom('/fidelidade/clientes/pontos/extrato')).toEqual([{ id_cliente: 'b5d1c0de', limit: 20 }])
    expect(pedidoCom('/migracao/origem')).toEqual([{ tabela: 'cliente_sem_conta', id_registro: '301' }])
  })
})
