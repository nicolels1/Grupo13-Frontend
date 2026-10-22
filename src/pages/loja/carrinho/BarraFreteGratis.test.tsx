// @vitest-environment jsdom
// o frete é um só para o carrinho, mesmo com as duas marcas: a barra conta todas as peças juntas
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ResumoCarrinho } from './useResumo'

vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { BarraFreteGratis } = await import('./ItensCarrinho')

function resumo(lorenzi: string, vulto: string, total: string): ResumoCarrinho {
  return {
    itens: [], valor_itens: total, frete_entrega: '0.00', frete_gratis_a_partir_de: '299.00', total_entrega: total,
    total_retirada: total, entrega_disponivel: true, lojas_retirada: [],
    marcas: [
      { marca: 'lorenzi', valor_itens: lorenzi, entrega_disponivel: true },
      { marca: 'vulto', valor_itens: vulto, entrega_disponivel: true },
    ],
  }
}

describe('BarraFreteGratis', () => {
  afterEach(cleanup)

  it('cada marca abaixo do mínimo, mas o carrinho acima: frete grátis, uma vez só', () => {
    render(<BarraFreteGratis resumo={resumo('200.00', '160.00', '360.00')} />)
    expect(screen.getAllByText(/frete grátis/i)).toHaveLength(1)
    expect(screen.getByText('Frete grátis na entrega garantido.')).toBeTruthy()
    expect(screen.queryByText(/Casa Lorenzi|Vulto/)).toBeNull()
  })

  it('abaixo do mínimo, mostra quanto falta para o carrinho inteiro', () => {
    render(<BarraFreteGratis resumo={resumo('100.00', '80.00', '180.00')} />)
    expect(screen.getAllByText(/para o frete grátis/)).toHaveLength(1)
    expect(screen.getByText(/R\$\s119,00/)).toBeTruthy()
  })
})
