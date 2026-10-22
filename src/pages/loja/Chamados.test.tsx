// @vitest-environment jsdom
// a lista de chamados do cliente com uma API de mentira que pagina como a de verdade: passando de 50,
// diz quantos faltam e "Mostrar mais" traz os mais antigos, de 50 em 50
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ChamadosCliente } = await import('./Chamados')
const { useContextoChamados } = await import('./chamados/contexto')

function chamado(id: number) {
  return { id_chamado: id, assunto: `Chamado ${id}`, status: 'aberto', categoria: 'duvida', mensagens_nao_lidas: 0, atualizado_em: '2026-10-01T10:00:00Z' }
}

// os mais recentes primeiro, como a API devolve (sem offset, ela começa do 0)
function servir(quantos: number) {
  const todos = Array.from({ length: quantos }, (_, i) => chamado(quantos - i))
  api.mockImplementation((_caminho: string, { params }: { params: { limit: number; offset?: number } }) => {
    const offset = params.offset ?? 0
    return Promise.resolve({ items: todos.slice(offset, offset + params.limit), total: todos.length, limit: params.limit, offset })
  })
}

// a conversa aberta ao lado recarrega a lista (ex.: depois de ler uma resposta)
function Conversa() {
  const { recarregarLista } = useContextoChamados()
  return <button type="button" onClick={recarregarLista}>recarregar</button>
}

function abrir() {
  const roteador = createMemoryRouter(
    [{ path: '/loja/chamados', element: <ChamadosCliente />, children: [{ index: true, element: <Conversa /> }] }],
    { initialEntries: ['/loja/chamados'] },
  )
  render(<RouterProvider router={roteador} />)
}

const offsetsPedidos = () => api.mock.calls.map(([, { params }]) => params.offset ?? 0)

describe('ChamadosCliente', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('passando de 50, diz quantos faltam e mostra os mais antigos aos poucos', async () => {
    servir(120)
    abrir()
    expect(await screen.findByText('Mostrando 50 de 120 chamados.')).toBeTruthy()
    expect(screen.getByText('Chamado 120')).toBeTruthy()
    expect(screen.queryByText('Chamado 1')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais chamados' }))
    expect(await screen.findByText('Mostrando 100 de 120 chamados.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais chamados' }))
    expect(await screen.findByText('Chamado 1')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(120)
    expect(screen.queryByRole('button', { name: 'Mostrar mais chamados' })).toBeNull()
    // cada pedido fica em 50, dentro do limite da API
    expect(api.mock.calls.every(([, { params }]) => params.limit === 50)).toBe(true)
  })

  it('recarregar a lista busca de novo as páginas já abertas', async () => {
    servir(70)
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar mais chamados' }))
    expect(await screen.findByText('Chamado 1')).toBeTruthy()
    api.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'recarregar' }))
    await vi.waitFor(() => expect(offsetsPedidos()).toEqual([0, 50]))
    expect(screen.getByText('Chamado 1')).toBeTruthy()
  })

  it('com até 50 chamados não oferece mais nada', async () => {
    servir(50)
    abrir()
    expect(await screen.findByText('Chamado 1')).toBeTruthy()
    expect(screen.queryByText(/Mostrando/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mostrar mais chamados' })).toBeNull()
  })
})
