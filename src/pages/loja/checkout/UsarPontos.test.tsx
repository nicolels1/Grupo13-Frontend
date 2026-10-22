// @vitest-environment jsdom
// pontos no checkout da compra: cada marca usa os pontos dela, com o valor que o backend calcula
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Esquema } from '@/lib/api'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ErroApi } = await import('@/lib/api')
const { UsarPontos } = await import('./UsarPontos')

function saldo(marca: string, pontos: number, reais: string): Esquema<'SaldoPontosSaida'> {
  return {
    marca, saldo: pontos, valor_em_reais: reais, categoria: 'bronze', categoria_desde: '2026-01-01T03:00:00Z',
    ganhos_no_ano: pontos, proximo_vencimento: null, pontos_no_proximo_vencimento: 0,
  }
}

const DUAS_MARCAS: Esquema<'ResumoMarca'>[] = [
  { marca: 'lorenzi', valor_itens: '100.00', entrega_disponivel: true },
  { marca: 'vulto', valor_itens: '350.00', entrega_disponivel: true },
]

// meus-pontos com o saldo dado; o resgate vale R$ 0,10 por ponto
function servir(saldos: Esquema<'SaldoPontosSaida'>[], resgate?: (marca: string, pontos: number) => unknown) {
  api.mockImplementation((caminho: string, opcoes?: { params?: { marca: string; pontos: number } }) => {
    if (caminho === '/fidelidade/meus-pontos') return Promise.resolve({ saldos })
    const { marca, pontos } = opcoes!.params!
    if (resgate) return resgate(marca, pontos)
    return Promise.resolve({ pontos, desconto: (pontos / 10).toFixed(2), saldo: 1000, resgate_minimo: 100 })
  })
}

// cada marca tem o seu formulário: envia o do campo escolhido
function aplicar(rotulo: string, pontos: string) {
  const campo = screen.getByLabelText(rotulo)
  fireEvent.change(campo, { target: { value: pontos } })
  fireEvent.submit(campo.closest('form')!)
}

describe('UsarPontos', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('mostra só as marcas do carrinho em que o cliente tem pontos', async () => {
    servir([saldo('lorenzi', 0, '0.00'), saldo('vulto', 800, '80.00')])
    render(<UsarPontos marcas={DUAS_MARCAS} aplicados={{}} aoMudar={vi.fn()} />)

    expect(await screen.findByLabelText('Pontos da Vulto')).toBeTruthy()
    expect(screen.queryByLabelText('Pontos da Casa Lorenzi')).toBeNull()
    expect(screen.getByText(/Você tem 800 pontos, que valem R\$\s80,00/)).toBeTruthy()
  })

  it('aplica os pontos de uma marca com o desconto calculado pelo backend', async () => {
    servir([saldo('lorenzi', 1000, '100.00'), saldo('vulto', 1000, '100.00')])
    const aoMudar = vi.fn()
    render(<UsarPontos marcas={DUAS_MARCAS} aplicados={{}} aoMudar={aoMudar} />)
    await screen.findByLabelText('Pontos da Vulto')

    aplicar('Pontos da Vulto', '500')

    await vi.waitFor(() => expect(aoMudar).toHaveBeenCalledWith({ vulto: { pontos: 500, desconto: '50.00' } }))
    expect(api).toHaveBeenCalledWith('/fidelidade/resgate', { params: { marca: 'vulto', pontos: 500 } })
  })

  it('recusa desconto do tamanho das peças da marca', async () => {
    servir([saldo('lorenzi', 2000, '200.00')])
    const aoMudar = vi.fn()
    render(<UsarPontos marcas={DUAS_MARCAS} aplicados={{}} aoMudar={aoMudar} />)
    await screen.findByLabelText('Pontos da Casa Lorenzi')

    // 1000 pontos valem R$ 100, o valor inteiro da camisa da Casa Lorenzi
    aplicar('Pontos da Casa Lorenzi', '1000')

    expect(await screen.findByText(/precisa ser menor que as peças da Casa Lorenzi/)).toBeTruthy()
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('mostra a regra do programa quando o backend recusa', async () => {
    servir([saldo('vulto', 1000, '100.00')], () => Promise.reject(new ErroApi(422, 'O resgate mínimo é de 100 pontos')))
    const aoMudar = vi.fn()
    render(<UsarPontos marcas={DUAS_MARCAS} aplicados={{}} aoMudar={aoMudar} />)
    await screen.findByLabelText('Pontos da Vulto')

    aplicar('Pontos da Vulto', '50')

    expect(await screen.findByText('O resgate mínimo é de 100 pontos')).toBeTruthy()
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('remove os pontos aplicados de uma marca e mantém os da outra', async () => {
    servir([saldo('lorenzi', 1000, '100.00'), saldo('vulto', 1000, '100.00')])
    const aoMudar = vi.fn()
    const aplicados = { lorenzi: { pontos: 200, desconto: '20.00' }, vulto: { pontos: 500, desconto: '50.00' } }
    render(<UsarPontos marcas={DUAS_MARCAS} aplicados={aplicados} aoMudar={aoMudar} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover os pontos da Vulto' }))

    expect(aoMudar).toHaveBeenCalledWith({ lorenzi: { pontos: 200, desconto: '20.00' }, vulto: undefined })
  })

  it('sem pontos nas marcas do carrinho, não mostra nada', async () => {
    servir([])
    const { container } = render(<UsarPontos marcas={DUAS_MARCAS} aplicados={{}} aoMudar={vi.fn()} />)
    await vi.waitFor(() => expect(api).toHaveBeenCalledWith('/fidelidade/meus-pontos'))
    expect(container.textContent).toBe('')
  })
})
