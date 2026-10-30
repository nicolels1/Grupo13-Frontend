// @vitest-environment jsdom
// o filtro de prioridade da fila: "Alta" pede a prioridade que vale (definida ou, sem ela, a sugerida pela IA)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { Atendimento } = await import('./Atendimento')

function abrir() {
  api.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 })
  const roteador = createMemoryRouter([{
    path: '/interno/atendimento',
    element: <Outlet context={{ unidade: '', setUnidade: () => {}, unidades: [] }} />,
    children: [{ index: true, element: <Atendimento /> }],
  }], { initialEntries: ['/interno/atendimento'] })
  const perfil = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['atender_chamado', 'ver_marca_lorenzi', 'ver_marca_vulto'] })
  render(<AuthContext.Provider value={authDeTeste({ perfil })}><RouterProvider router={roteador} /></AuthContext.Provider>)
}

// os parâmetros da última busca da lista (as contagens pedem limit 1)
const ultimaLista = () => api.mock.calls.map((c) => c[1]?.params).filter((p) => p?.limit !== 1).at(-1)

describe('Atendimento: filtro de prioridade', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('tem alta, média, baixa e sem prioridade, e manda a escolhida para a fila', async () => {
    abrir()
    const seletor = await screen.findByRole('combobox', { name: 'Prioridade' }) as HTMLSelectElement
    expect([...seletor.options].map((o) => o.textContent)).toEqual([
      'Todas as prioridades', 'Alta (definida ou sugerida)', 'Média (definida ou sugerida)',
      'Baixa (definida ou sugerida)', 'Sem prioridade',
    ])

    fireEvent.change(seletor, { target: { value: 'alta' } })
    await waitFor(() => expect(ultimaLista()?.prioridade).toBe('alta'))

    fireEvent.change(seletor, { target: { value: 'sem' } })
    await waitFor(() => expect(ultimaLista()?.prioridade).toBe('sem'))
  })
})

describe('Atendimento: ordem e chamados do assistente', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('a fila começa pela prioridade e pode mostrar os mais recentes primeiro', async () => {
    abrir()
    await waitFor(() => expect(ultimaLista()?.ordem).toBe('prioridade'))

    fireEvent.change(await screen.findByRole('combobox', { name: 'Ordem' }), { target: { value: 'recentes' } })
    await waitFor(() => expect(ultimaLista()?.ordem).toBe('recentes'))
  })

  it('"Abertos pelo assistente" mostra os chamados do chatbot, o último primeiro', async () => {
    abrir()
    const [fila] = await screen.findAllByRole('button', { name: /Abertos pelo assistente/ })
    fireEvent.click(fila)

    await waitFor(() => expect(ultimaLista()).toMatchObject({ aberto_pelo_assistente: true, ordem: 'recentes' }))
    expect(ultimaLista()?.status).toBeUndefined()
  })
})
