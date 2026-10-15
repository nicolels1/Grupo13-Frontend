// @vitest-environment jsdom
// proteção das rotas com o roteador de verdade: o useAuth() é de mentira (ver authDeTeste)
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { AREAS, type Area } from './areas'
import { authDeTeste, perfilDeTeste, SESSAO_DE_TESTE } from './authDeTeste'
import { AuthContext, type ValorAuth } from './contexto'
import { ExigeArea, ExigeLogin } from './Protecao'

const area = (caminho: string) => AREAS.find((a) => a.caminho === caminho) as Area

// mostra para onde o login vai voltar, para o teste conferir o state da navegação
function TelaEntrar() {
  const estado = useLocation().state as { voltarPara?: string } | null
  return <p>login, depois volta para {estado?.voltarPara}</p>
}

function abrir(auth: ValorAuth, endereco: string) {
  const roteador = createMemoryRouter(
    [
      { path: '/', element: <p>início</p> },
      { path: '/entrar', element: <TelaEntrar /> },
      { path: '/loja/pedidos', element: <ExigeLogin tipo="cliente"><p>meus pedidos</p></ExigeLogin> },
      { path: '/interno', element: <ExigeLogin tipo="interna"><p>interno</p></ExigeLogin> },
      { path: '/interno/estoque', element: <ExigeLogin tipo="interna"><ExigeArea area={area('estoque')}><p>estoque</p></ExigeArea></ExigeLogin> },
    ],
    { initialEntries: [endereco] },
  )
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={roteador} />
    </AuthContext.Provider>,
  )
  return roteador
}

describe('proteção das rotas', () => {
  afterEach(() => {
    cleanup()
  })

  it('sem login, manda para /entrar lembrando a página e os filtros', () => {
    const roteador = abrir(authDeTeste(), '/loja/pedidos?aba=entregues')
    expect(roteador.state.location.pathname).toBe('/entrar')
    expect(screen.getByText('login, depois volta para /loja/pedidos?aba=entregues')).toBeTruthy()
  })

  it('cliente logado vê a página dele', () => {
    abrir(authDeTeste({ sessao: SESSAO_DE_TESTE, perfil: perfilDeTeste() }), '/loja/pedidos')
    expect(screen.getByText('meus pedidos')).toBeTruthy()
  })

  it('conta do outro tipo vai para o início, que leva à plataforma dela', () => {
    const roteador = abrir(authDeTeste({ sessao: SESSAO_DE_TESTE, perfil: perfilDeTeste() }), '/interno')
    expect(roteador.state.location.pathname).toBe('/')
  })

  it('enquanto lê a conta, mostra o carregando', () => {
    abrir(authDeTeste({ carregando: true }), '/loja/pedidos')
    expect(screen.getByText('Carregando sua conta...')).toBeTruthy()
  })

  it('falha ao carregar o perfil deixa tentar de novo ou sair', () => {
    const auth = authDeTeste({ sessao: SESSAO_DE_TESTE, erroPerfil: 'Erro no servidor.' })
    abrir(auth, '/loja/pedidos')
    expect(screen.getByText('Não foi possível abrir sua conta')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(auth.recarregarPerfil).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(auth.sair).toHaveBeenCalled()
  })

  it('área sem permissão avisa em vez de abrir', () => {
    const vendedor = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['registrar_venda_fisica'] })
    abrir(authDeTeste({ sessao: SESSAO_DE_TESTE, perfil: vendedor }), '/interno/estoque')
    expect(screen.getByText('Sem acesso')).toBeTruthy()
    expect(screen.queryByText('estoque')).toBeNull()
  })

  it('área com permissão abre', () => {
    const estoquista = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['movimentar_estoque'] })
    abrir(authDeTeste({ sessao: SESSAO_DE_TESTE, perfil: estoquista }), '/interno/estoque')
    expect(screen.getByText('estoque')).toBeTruthy()
  })
})
