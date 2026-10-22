// @vitest-environment jsdom
// venda na loja com pontos do cliente do CPF: o desconto vem do backend e o pagamento fecha com o total menos ele
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Esquema } from '@/lib/api'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ErroApi } = await import('@/lib/api')
const { NovaVenda } = await import('./NovaVenda')

const LOJA = { id_unidade: 7, nome: 'Vulto Pinheiros', marca: 'vulto', tipo: 'loja' } as Esquema<'UnidadeSaida'>
const PECA = {
  id_variante: 55, produto: 'Camiseta Básica', cor: 'Preta', tamanho: 'M', sku: 'VLT-CAM-001-PRE-M', disponivel: 3,
} as Esquema<'EstoqueItem'>
const CPF = '52998224725'

function responder(caminho: string, opcoes?: { metodo?: string; corpo?: { pagamentos: { valor: string }[] } }) {
  if (caminho === '/balcao/estoque') return Promise.resolve({ items: [PECA], total: 1, limit: 30, offset: 0 })
  if (caminho === '/carrinho') {
    return Promise.resolve({ itens: [{ id_variante: 55, preco_unitario: '119.90', subtotal: '119.90' }], valor_itens: '119.90' })
  }
  if (caminho === '/vendas/clientes') return Promise.reject(new ErroApi(404, 'Cliente não encontrado'))
  if (caminho === '/fidelidade/resgate/caixa') return Promise.resolve({ pontos: 400, desconto: '20.00', saldo: 1500, resgate_minimo: 100 })
  if (caminho === '/vendas/pedidos' && opcoes?.metodo === 'POST') {
    return Promise.resolve({
      id_pedido: 1, codigo_venda: 'VLT-0001', unidade: 'Vulto Pinheiros', criado_em: '2026-10-22T15:00:00Z', cpf_nota: CPF,
      valor_itens: '119.90', valor_desconto: '20.00', valor_total: '99.90', itens: [], pagamentos: [],
    })
  }
  return Promise.reject(new Error(`sem resposta para ${caminho}`))
}

async function venderComPontos() {
  render(<NovaVenda loja={LOJA} />)
  fireEvent.change(screen.getByLabelText('Buscar peça'), { target: { value: 'camiseta' } })
  fireEvent.click(await screen.findByRole('button', { name: /Camiseta Básica/ }))
  fireEvent.change(screen.getByLabelText(/CPF na nota/), { target: { value: CPF } })
  const campo = await screen.findByLabelText(/Usar pontos da Vulto/)
  fireEvent.change(campo, { target: { value: '400' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar desconto' }))
  await screen.findByText(/aplicados/)
}

describe('NovaVenda com pontos', () => {
  beforeEach(() => {
    window.print = vi.fn()
  })

  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('aplica os pontos da marca da loja e cobra o total menos o desconto', async () => {
    api.mockImplementation(responder)
    await venderComPontos()

    expect(api).toHaveBeenCalledWith('/fidelidade/resgate/caixa', { params: { cpf: CPF, marca: 'vulto', pontos: 400 } })
    // o desconto aparece nos pontos aplicados e no resumo, e o total já vem com ele
    expect(screen.getAllByText(/−R\$\s20,00/)).toHaveLength(2)
    expect(screen.getByText(/R\$\s99,90/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar venda' }))

    await vi.waitFor(() => expect(api.mock.calls.some(([c, o]) => c === '/vendas/pedidos' && o?.metodo === 'POST')).toBe(true))
    const [, envio] = api.mock.calls.find(([c, o]) => c === '/vendas/pedidos' && o?.metodo === 'POST')!
    expect(envio.corpo).toMatchObject({ cpf_nota: CPF, pontos_resgate: 400, pagamentos: [{ metodo: 'pix', valor: '99.90' }] })
    expect(await screen.findByText('Desconto em pontos')).toBeTruthy()
  })

  it('trocar o CPF tira os pontos da venda', async () => {
    api.mockImplementation(responder)
    await venderComPontos()

    fireEvent.change(screen.getByLabelText(/CPF na nota/), { target: { value: '111.444.777-35' } })

    expect(await screen.findByLabelText(/Usar pontos da Vulto/)).toBeTruthy()
    expect(screen.queryByText(/aplicados/)).toBeNull()
  })
})
