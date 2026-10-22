// @vitest-environment jsdom
// confirmação de uma compra com as duas marcas: um número de compra, um pagamento e os pedidos de cada unidade
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pedidoVultoDeTeste } from '@/lib/vultoDeTeste'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ConfirmacaoCompra } = await import('./Confirmacao')

const ENDERECO = {
  rua: 'Rua A', numero: '1', complemento: null, bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01000000',
}

const COMPRA = {
  id_compra: 5, codigo_compra: 'CPABCD2345', status: 'pago', valor_itens: '450.00', valor_frete: '19.90',
  valor_desconto: '0.00', valor_total: '469.90', reserva_expira_em: '2026-10-22T12:15:00Z', metodo: 'pix',
  id_transacao_gateway: 'sim_abc', status_cobranca: 'aprovado', pago_em: '2026-10-22T12:03:00Z', cancelado_em: null,
  criado_em: '2026-10-22T12:00:00Z',
  pedidos: [
    pedidoVultoDeTeste({ id_pedido: 1, codigo_venda: 'CLAAAA1111', unidade: 'CD Jundiaí', id_compra: 5, canal_venda: 'site',
      status: 'pago', endereco_entrega: ENDERECO }),
    pedidoVultoDeTeste({ id_pedido: 2, codigo_venda: 'CLBBBB2222', unidade: 'CD Cajamar', id_compra: 5, canal_venda: 'site',
      status: 'pago', endereco_entrega: ENDERECO }),
  ],
}

describe('ConfirmacaoCompra', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('mostra a compra com um pagamento e os pedidos de cada unidade', async () => {
    api.mockResolvedValue(COMPRA)
    const roteador = createMemoryRouter(
      [{ path: '/loja/compra-confirmada/:idCompra', element: <ConfirmacaoCompra /> }],
      { initialEntries: ['/loja/compra-confirmada/5'] },
    )
    render(<RouterProvider router={roteador} />)

    expect(await screen.findByText('CPABCD2345')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/compras/5')
    expect(screen.getByText(/a compra chega em 2 pedidos/)).toBeTruthy()
    expect(screen.getByText(/Vamos enviar da CD Jundiaí/)).toBeTruthy()
    expect(screen.getByText(/Vamos enviar da CD Cajamar/)).toBeTruthy()
    // um pagamento só, pelo total da compra
    expect(screen.getAllByText(/Pago com/)).toHaveLength(1)
    expect(screen.getByText(/Pago com Pix: R\$\s469,90/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acompanhar pedidos' })).toBeTruthy()
  })
})
