// @vitest-environment jsdom
// o seletor de unidade do topo mostra o filtro que as telas recebem: com a lista com erro, carregando, ou
// com a unidade inativa ou de fora, ele não aparece como "Todas" enquanto outra unidade filtra
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { ErroApi } = await import('@/lib/api')
const { limparListas } = await import('@/lib/listas')
const { useUnidadeEscolhida } = await import('./unidadeEscolhida')
const { LayoutInterno } = await import('./LayoutInterno')

const unidade = (id_unidade: number, nome: string, dados: { marca?: string; ativo?: boolean } = {}) =>
  ({ id_unidade, nome, marca: 'lorenzi', ativo: true, ...dados })
const lista = (...items: unknown[]) => Promise.resolve({ items })

// a tela de dentro mostra o filtro que recebeu do layout
function Tela() {
  const { unidade: filtro } = useUnidadeEscolhida()
  return <p>filtro: {filtro || 'todas'}</p>
}

// conta da Casa Lorenzi com a unidade 3 como filtro inicial
function abrir() {
  const perfil = perfilDeTeste({ tipo_conta: 'interna', id_unidade: 3, permissoes: ['ver_marca_lorenzi'] })
  const roteador = createMemoryRouter(
    [{ path: '/interno', element: <LayoutInterno />, children: [{ index: true, element: <Tela /> }] }],
    { initialEntries: ['/interno'] },
  )
  render(
    <AuthContext.Provider value={authDeTeste({ perfil })}>
      <RouterProvider router={roteador} />
    </AuthContext.Provider>,
  )
}

const seletor = () => screen.getByRole('combobox', { name: 'Unidade em foco' }) as HTMLSelectElement
const mostrado = () => seletor().selectedOptions[0]?.textContent

describe('LayoutInterno: unidade em foco', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
    limparListas('unidades')
  })

  it('unidade ativa aparece pelo nome, sem aviso', async () => {
    api.mockReturnValue(lista(unidade(3, 'Jardins'), unidade(4, 'Moema')))
    abrir()
    expect(await screen.findByRole('option', { name: 'Moema' })).toBeTruthy()
    expect(mostrado()).toBe('Jardins')
    expect(screen.getByText('filtro: 3')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('enquanto a lista carrega, não mostra "Todas"', () => {
    api.mockReturnValue(new Promise(() => {}))
    abrir()
    expect(mostrado()).toBe('Carregando unidades...')
    expect(screen.getByText('filtro: 3')).toBeTruthy()
  })

  it('erro na lista: avisa, mantém o filtro visível e tenta de novo', async () => {
    api.mockRejectedValueOnce(new ErroApi(0, 'Sem conexão com o servidor.')).mockReturnValue(lista(unidade(3, 'Jardins')))
    abrir()
    expect(await screen.findByText('Não foi possível carregar as unidades')).toBeTruthy()
    expect(screen.getByText(/As telas seguem filtradas pela unidade 3/)).toBeTruthy()
    expect(mostrado()).toBe('Unidade 3')
    expect(screen.getByText('filtro: 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('option', { name: 'Jardins' })).toBeTruthy()
    expect(mostrado()).toBe('Jardins')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('unidade inativa: aparece como inativa e dá para ver todas', async () => {
    api.mockReturnValue(lista(unidade(3, 'Jardins', { ativo: false }), unidade(4, 'Moema')))
    abrir()
    expect(await screen.findByText('Unidade fora da lista')).toBeTruthy()
    expect(mostrado()).toBe('Jardins (inativa)')
    expect(screen.getByText('filtro: 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas as unidades' }))
    expect(mostrado()).toBe('Todas as unidades')
    expect(screen.getByText('filtro: todas')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('o botão Assistente do topo abre o painel', async () => {
    api.mockReturnValue(lista(unidade(3, 'Jardins')))
    abrir()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Assistente' }))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/Os números vêm do sistema\./)).toBeTruthy()
    // a unidade do topo (Jardins, a da conta) aparece no painel
    expect(screen.getByTestId('unidade-em-foco').textContent).toContain('Unidade selecionada: Jardins.')
  })

  it('unidade de uma marca que a conta não vê aparece como indisponível', async () => {
    api.mockReturnValue(lista(unidade(3, 'Vulto Batel', { marca: 'vulto' }), unidade(4, 'Moema')))
    abrir()
    expect(await screen.findByText(/não está entre as que sua conta vê/)).toBeTruthy()
    expect(mostrado()).toBe('Unidade 3 (indisponível)')
    expect(screen.getByText('filtro: 3')).toBeTruthy()
  })
})
