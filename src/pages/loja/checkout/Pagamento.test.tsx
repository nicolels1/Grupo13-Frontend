// @vitest-environment jsdom
// a compra das duas marcas tem uma cobrança só: Pix e cartão chamam a API uma vez pela compra inteira,
// nunca uma vez por pedido (ADR 0017 do backend)
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Esquema } from '@/lib/api'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { Pagamento } = await import('./Pagamento')

type Compra = Esquema<'CompraSaida'>

function compraDeTeste(dados: Partial<Compra> = {}): Compra {
  return {
    id_compra: 5,
    codigo_compra: 'CPABCD2345',
    status: 'aguardando_pagamento',
    valor_itens: '450.00',
    valor_frete: '19.90',
    valor_desconto: '0.00',
    valor_total: '469.90',
    reserva_expira_em: '2026-10-22T12:15:00Z',
    metodo: null,
    id_transacao_gateway: null,
    status_cobranca: null,
    pago_em: null,
    cancelado_em: null,
    criado_em: '2026-10-22T12:00:00Z',
    pedidos: [],
    ...dados,
  }
}

const PIX_PENDENTE = compraDeTeste({ metodo: 'pix', id_transacao_gateway: 'sim_abc', status_cobranca: 'pendente' })

function preencherCartao(numero: string) {
  fireEvent.change(screen.getByLabelText('Número do cartão'), { target: { value: numero } })
  fireEvent.change(screen.getByLabelText('Nome no cartão'), { target: { value: 'Marina Souza' } })
  fireEvent.change(screen.getByLabelText('Validade'), { target: { value: '0839' } })
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '123' } })
}

describe('Pagamento da compra', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
    vi.useRealTimers()
  })

  it('o Pix gera uma cobrança pelo total da compra', async () => {
    api.mockResolvedValue(PIX_PENDENTE)
    const aoAtualizar = vi.fn()
    render(<Pagamento compra={compraDeTeste()} aoAtualizar={aoAtualizar} />)

    fireEvent.click(screen.getByRole('button', { name: /Pagar R\$\s469,90 com Pix/ }))

    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(PIX_PENDENTE))
    expect(api.mock.calls).toEqual([['/compras/5/pagamentos', { metodo: 'POST', corpo: { metodo: 'pix' } }]])
  })

  it('o Pix gerado mostra um código só e é aprovado uma vez', async () => {
    vi.useFakeTimers()
    const paga = compraDeTeste({ ...PIX_PENDENTE, status: 'pago', status_cobranca: 'aprovado' })
    api.mockResolvedValue(paga)
    const aoAtualizar = vi.fn()
    render(<Pagamento compra={PIX_PENDENTE} aoAtualizar={aoAtualizar} />)

    expect(screen.getAllByLabelText('Código Pix copia e cola')).toHaveLength(1)
    expect(screen.getByText(/Pix de R\$\s469,90 gerado/)).toBeTruthy()
    await act(() => vi.advanceTimersByTimeAsync(4000))

    expect(api.mock.calls).toEqual([['/compras/5/simular', { metodo: 'POST', corpo: { aprovado: true } }]])
    expect(aoAtualizar).toHaveBeenCalledWith(paga)
  })

  it('o cartão faz uma cobrança e uma resposta para a compra inteira', async () => {
    const paga = compraDeTeste({ metodo: 'cartao_credito', id_transacao_gateway: 'sim_x', status_cobranca: 'aprovado', status: 'pago' })
    api.mockResolvedValue(paga)
    const aoAtualizar = vi.fn()
    render(<Pagamento compra={compraDeTeste()} aoAtualizar={aoAtualizar} />)

    fireEvent.click(screen.getByLabelText('Cartão de crédito'))
    preencherCartao('4111 1111 1111 1111')
    fireEvent.click(screen.getByRole('button', { name: /Pagar R\$\s469,90/ }))

    await vi.waitFor(() => expect(aoAtualizar).toHaveBeenCalledWith(paga))
    expect(api.mock.calls).toEqual([
      ['/compras/5/pagamentos', { metodo: 'POST', corpo: { metodo: 'cartao_credito' } }],
      ['/compras/5/simular', { metodo: 'POST', corpo: { aprovado: true } }],
    ])
    expect(screen.queryByText(/O banco recusou/)).toBeNull()
  })

  it('o cartão recusado avisa e mantém a compra para tentar de novo', async () => {
    const recusada = compraDeTeste({ metodo: 'cartao_debito', id_transacao_gateway: 'sim_y', status_cobranca: 'recusado' })
    api.mockResolvedValue(recusada)
    const aoAtualizar = vi.fn()
    render(<Pagamento compra={compraDeTeste()} aoAtualizar={aoAtualizar} />)

    fireEvent.click(screen.getByLabelText('Cartão de débito'))
    preencherCartao('4000 0000 0000 0002')
    fireEvent.click(screen.getByRole('button', { name: /Pagar R\$\s469,90/ }))

    expect(await screen.findByText(/O banco recusou o pagamento/)).toBeTruthy()
    expect(api.mock.calls[1]).toEqual(['/compras/5/simular', { metodo: 'POST', corpo: { aprovado: false } }])
    expect(aoAtualizar).toHaveBeenCalledWith(recusada)
  })
})
