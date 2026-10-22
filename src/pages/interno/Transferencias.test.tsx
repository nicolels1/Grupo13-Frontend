// @vitest-environment jsdom
// as abas "Chegando" e "Para enviar" com uma API de mentira que filtra por status e pagina como a de verdade
// (no máximo 200 por página, as mais recentes primeiro): pendente antiga não some atrás de 200 recebidas novas
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/ambiente', () => ({ API_URL: 'http://api.teste', SUPABASE_URL: '', SUPABASE_CHAVE_PUBLICA: '' }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { Transferencias } = await import('./Transferencias')

const ORIGEM = 1
const DESTINO = 2

function transferencia(id: number, status: string) {
  return {
    id_transferencia: id, id_unidade_origem: ORIGEM, id_unidade_destino: DESTINO, status,
    id_solicitante: null, id_enviado_por: null, id_recebido_por: null, id_cancelado_por: null, motivo_cancelamento: null,
    solicitada_em: '2026-09-01T10:00:00Z', enviada_em: null, recebida_em: null, cancelada_em: null,
    itens: [{ id_item_transferencia: id, id_variante: 9, canal_saida: 'loja_fisica', canal_entrada: 'loja_fisica',
      quantidade_solicitada: 1, quantidade_enviada: 1, quantidade_recebida: null }],
  }
}

// 205 enviadas antigas (mais de uma página), uma solicitada antiga e 250 recebidas mais novas que todas elas
const BANCO = [
  ...Array.from({ length: 205 }, (_, i) => transferencia(i + 1, 'enviada')),
  transferencia(300, 'solicitada'),
  ...Array.from({ length: 250 }, (_, i) => transferencia(1000 + i, 'recebida')),
].sort((a, b) => b.id_transferencia - a.id_transferencia)

const pedidos: URL[] = []

function responder(endereco: string | URL) {
  const url = new URL(endereco)
  pedidos.push(url)
  const corpo = (dados: unknown) => Promise.resolve(new Response(JSON.stringify(dados), { status: 200 }))
  if (url.pathname === '/transferencias') {
    const status = url.searchParams.get('status')
    const limit = Number(url.searchParams.get('limit'))
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const filtradas = BANCO.filter((t) => !status || t.status === status)
    return corpo({ items: filtradas.slice(offset, offset + limit), total: filtradas.length, limit, offset })
  }
  return corpo({ items: [], total: 0, limit: 1, offset: 0 })
}

function abrir() {
  const perfil = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['enviar_transferencia', 'receber_transferencia'] })
  const contexto = { unidade: '', setUnidade: () => {}, unidades: [] }
  const roteador = createMemoryRouter(
    [{ element: <Outlet context={contexto} />, children: [{ path: '/interno/transferencias', element: <Transferencias /> }] }],
    { initialEntries: ['/interno/transferencias'] },
  )
  render(
    <AuthContext.Provider value={authDeTeste({ perfil })}>
      <RouterProvider router={roteador} />
    </AuthContext.Provider>,
  )
}

describe('Transferencias', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(responder))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    pedidos.length = 0
  })

  it('mostra as pendentes antigas que ficam fora das 200 mais recentes', async () => {
    abrir()
    const chegando = await screen.findByRole('tab', { name: /Chegando/ })
    expect(chegando.textContent).toContain('205')
    // a mais antiga das enviadas, da segunda página
    expect(screen.getAllByText('TR-0001').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('tab', { name: /Para enviar/ }))
    expect(screen.getAllByText('TR-0300').length).toBeGreaterThan(0)
  })

  it('não carrega o histórico inteiro: só as pendentes passam da primeira página', async () => {
    abrir()
    await screen.findByRole('tab', { name: /Chegando/ })
    const transferencias = pedidos.filter((url) => url.pathname === '/transferencias')
    const historico = transferencias.filter((url) => !url.searchParams.get('status'))
    expect(historico).toHaveLength(1)
    expect(historico[0]?.searchParams.get('limit')).toBe('200')
    expect(transferencias.filter((url) => url.searchParams.get('status') === 'enviada').map((url) => url.searchParams.get('offset')))
      .toEqual(['0', '200'])
  })
})
