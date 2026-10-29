// @vitest-environment jsdom
// a prioridade sugerida pela IA no Atendimento: aparece marcada como sugerida enquanto ninguém definiu a
// prioridade, e o responsável confirma com um clique (que grava a prioridade de verdade pela rota de sempre)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { chamadoVultoDeTeste } = await import('@/lib/vultoDeTeste')
const { ItemDaFila, Prioridade } = await import('./Fila')
const { PainelDoChamado } = await import('./PainelDoChamado')

const RESPONSAVEL = 'b5d1c0de-0000-4000-8000-000000000101'

function chamado(dados: Record<string, unknown> = {}) {
  return {
    ...chamadoVultoDeTeste({ status: 'em_andamento', motivo_encerramento: null, concluido_em: null }),
    prioridade_sugerida: 'alta' as const, motivo_sugerido: 'cobrança em dobro', sugerida_em: '2026-10-28T12:00:00Z',
    ...dados,
  }
}

function painel(c: ReturnType<typeof chamado>, idUsuario = RESPONSAVEL) {
  const aoMudar = vi.fn()
  const historico = { dados: { items: [] }, erro: null, carregando: false, recarregar: () => {} }
  const roteador = createMemoryRouter([{
    path: '/',
    element: <Outlet context={{ unidade: '', setUnidade: () => {}, unidades: [] }} />,
    children: [{ index: true, element: <PainelDoChamado chamado={c} historico={historico} aoMudar={aoMudar} /> }],
  }])
  const perfil = perfilDeTeste({ id_usuario: idUsuario, tipo_conta: 'interna', permissoes: ['atender_chamado'] })
  render(<AuthContext.Provider value={authDeTeste({ perfil })}><RouterProvider router={roteador} /></AuthContext.Provider>)
  return aoMudar
}

describe('prioridade sugerida', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('na fila, alta sugerida tem o marcador enquanto ninguém definiu a prioridade', () => {
    render(<MemoryRouter><ul><ItemDaFila chamado={chamado()} aberto={false} /></ul></MemoryRouter>)
    expect(screen.getByText('Alta · sugerida')).toBeTruthy()
    cleanup()

    render(<MemoryRouter><ul><ItemDaFila chamado={chamado({ prioridade: 'media' })} aberto={false} /></ul></MemoryRouter>)
    expect(screen.queryByText('Alta · sugerida')).toBeNull()
  })

  it('no topo do chamado, a sugerida vem marcada com o motivo; a definida vale sobre ela', () => {
    render(<Prioridade chamado={chamado({ prioridade_sugerida: 'media', motivo_sugerido: 'troca comum' })} />)
    expect(screen.getByText('Média · sugerida: troca comum')).toBeTruthy()
    cleanup()

    render(<Prioridade chamado={chamado({ prioridade: 'baixa' })} />)
    expect(screen.getByText('Prioridade baixa')).toBeTruthy()
  })

  it('o responsável confirma a sugerida e ela vira a prioridade pela rota de sempre', async () => {
    api.mockResolvedValue(chamado({ prioridade: 'alta' }))
    const aoMudar = painel(chamado())

    expect(screen.getByTestId('prioridade-sugerida').textContent).toContain('Alta: cobrança em dobro')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar alta' }))

    await waitFor(() => expect(aoMudar).toHaveBeenCalled())
    expect(api).toHaveBeenCalledWith('/atendimento/chamados/7001', { metodo: 'PATCH', corpo: { prioridade: 'alta' } })
  })

  it('quem não é o responsável vê a sugestão, mas não confirma', () => {
    painel(chamado(), 'outra-pessoa')
    expect(screen.getByTestId('prioridade-sugerida')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Confirmar/ })).toBeNull()
  })

  it('com a prioridade já definida, não há o que confirmar', () => {
    painel(chamado({ prioridade: 'media' }))
    expect(screen.queryByRole('button', { name: /Confirmar/ })).toBeNull()
  })
})
