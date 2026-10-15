// @vitest-environment jsdom
// a tela de login inteira, com o roteador de verdade: o useAuth() é de mentira (ver authDeTeste)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ValorAuth } from '@/auth/contexto'

vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, SESSAO_DE_TESTE } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { ErroApi } = await import('@/lib/api')
const { Entrar } = await import('./Entrar')

// abre /entrar como quem foi mandado para lá vindo de `voltarPara`
function abrir(auth: ValorAuth, voltarPara?: string) {
  const roteador = createMemoryRouter(
    [
      { path: '/entrar', element: <Entrar /> },
      { path: '*', element: <p>outra página</p> },
    ],
    { initialEntries: [{ pathname: '/entrar', state: voltarPara ? { voltarPara } : null }] },
  )
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={roteador} />
    </AuthContext.Provider>,
  )
  return roteador
}

function preencherEEntrar(identificacao: string, senha: string) {
  fireEvent.change(screen.getByLabelText('E-mail ou CPF'), { target: { value: identificacao } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('tela Entrar', () => {
  afterEach(() => {
    cleanup()
  })

  it('com e-mail, entra e volta para a página de onde veio', async () => {
    const auth = authDeTeste()
    const roteador = abrir(auth, '/loja/pedidos')
    preencherEEntrar(' ana@casalorenzi.example ', 'segredo1')
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/loja/pedidos'))
    expect(auth.entrarComEmail).toHaveBeenCalledWith('ana@casalorenzi.example', 'segredo1')
    expect(auth.entrarComCpf).not.toHaveBeenCalled()
  })

  it('sem "@", entra pelo CPF', async () => {
    const auth = authDeTeste()
    const roteador = abrir(auth)
    preencherEEntrar('529.982.247-25', 'segredo1')
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/'))
    expect(auth.entrarComCpf).toHaveBeenCalledWith('529.982.247-25', 'segredo1')
  })

  it('credencial errada mostra a mesma frase para e-mail e CPF', async () => {
    abrir(authDeTeste({ entrarComEmail: vi.fn().mockRejectedValue(new Error('E-mail ou senha inválidos')) }))
    preencherEEntrar('ana@casalorenzi.example', 'errada')
    expect(await screen.findByText('E-mail, CPF ou senha incorretos.')).toBeTruthy()
    cleanup()

    abrir(authDeTeste({ entrarComCpf: vi.fn().mockRejectedValue(new ErroApi(401, 'CPF ou senha inválidos')) }))
    preencherEEntrar('52998224725', 'errada')
    expect(await screen.findByText('E-mail, CPF ou senha incorretos.')).toBeTruthy()
  })

  it('outro erro diz o que fazer em vez da frase de credencial', async () => {
    abrir(authDeTeste({ entrarComCpf: vi.fn().mockRejectedValue(new ErroApi(0, 'Sem conexão com o servidor.')) }))
    preencherEEntrar('52998224725', 'segredo1')
    expect(await screen.findByText('Sem conexão com o servidor.')).toBeTruthy()
  })

  it('campos vazios avisam sem tentar entrar', () => {
    const auth = authDeTeste()
    abrir(auth)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByText('Preencha o e-mail ou CPF e a senha.')).toBeTruthy()
    expect(auth.entrarComEmail).not.toHaveBeenCalled()
    expect(auth.entrarComCpf).not.toHaveBeenCalled()
  })

  it('quem já entrou não vê o login', () => {
    const roteador = abrir(authDeTeste({ sessao: SESSAO_DE_TESTE }), '/loja/conta')
    expect(roteador.state.location.pathname).toBe('/loja/conta')
  })
})
