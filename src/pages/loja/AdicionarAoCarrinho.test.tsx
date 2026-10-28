// @vitest-environment jsdom
// link do atendimento por mensagem: a peça entra no carrinho e a pessoa cai no carrinho, ou vê o aviso se esgotou
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CarrinhoContext, type ValorCarrinho } from './carrinho/contexto'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { AdicionarAoCarrinho } = await import('./AdicionarAoCarrinho')

function variante(id_variante: number, ativo = true, disponivel: boolean | null = true) {
  return { id_variante, id_produto: 5, sku: `CAM-${id_variante}`, ean: '2000000000000', cor: 'Azul', tamanho: 'M',
    preco: '99.90', ativo, disponivel }
}

const PRODUTO = {
  id_produto: 5, id_categoria: 1, nome: 'Camisa', descricao_tecnica: null, descricao_cliente: 'Camisa de botão',
  marca: 'lorenzi', ativo: true, imagens: [],
  variantes: [variante(50), variante(51, true, false), variante(52, false)],
}

function abrir(endereco: string) {
  const carrinho = { adicionar: vi.fn(), fecharGaveta: vi.fn() } as unknown as ValorCarrinho
  const roteador = createMemoryRouter(
    [
      { path: '/loja/carrinho/adicionar', element: <AdicionarAoCarrinho /> },
      { path: '/loja/carrinho', element: <p>tela do carrinho</p> },
    ],
    { initialEntries: [endereco] },
  )
  render(
    <CarrinhoContext.Provider value={carrinho}>
      <RouterProvider router={roteador} />
    </CarrinhoContext.Provider>,
  )
  return carrinho
}

describe('AdicionarAoCarrinho', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('põe a peça no carrinho uma vez e abre o carrinho', async () => {
    api.mockResolvedValue(PRODUTO)

    const carrinho = abrir('/loja/carrinho/adicionar?produto=5&variante=50')

    expect(await screen.findByText('tela do carrinho')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/produtos/5')
    expect(carrinho.adicionar).toHaveBeenCalledTimes(1)
    expect(carrinho.adicionar).toHaveBeenCalledWith({ id_variante: 50, id_produto: 5 })
  })

  it('peça que esgotou mostra o aviso e o caminho para o produto', async () => {
    api.mockResolvedValue(PRODUTO)

    const carrinho = abrir('/loja/carrinho/adicionar?produto=5&variante=51')

    expect(await screen.findByText('Peça indisponível')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver o produto' }).getAttribute('href')).toBe('/loja/produtos/5')
    expect(carrinho.adicionar).not.toHaveBeenCalled()
  })

  it('link quebrado não consulta a API', async () => {
    abrir('/loja/carrinho/adicionar?produto=abc')

    expect(await screen.findByText('Peça indisponível')).toBeTruthy()
    expect(api).not.toHaveBeenCalled()
  })
})
