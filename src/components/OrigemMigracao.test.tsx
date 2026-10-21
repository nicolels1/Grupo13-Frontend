// @vitest-environment jsdom
// o quadro "de onde veio" com a API de mentira: os registros de origem vêm dos exemplos da Vulto
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ORIGEM_VARIANTE_DE_TESTE } from '@/lib/vultoDeTeste'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { OrigemMigracao } = await import('./OrigemMigracao')

describe('OrigemMigracao', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('pede a origem do registro e mostra cada campo como estava na Vulto, com a decisão', async () => {
    api.mockResolvedValue({ items: ORIGEM_VARIANTE_DE_TESTE })
    render(<OrigemMigracao tabela="variante" idRegistro={901} />)

    expect(await screen.findByText('Atemporais!88')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/migracao/origem', { params: { tabela: 'variante', id_registro: '901' } })
    expect(screen.getAllByText('Planilha do catálogo')).toHaveLength(2)
    const [verao, atemporais] = screen.getAllByLabelText('Como estava na Vulto')
    expect(within(verao!).getByText('MOL001MG')).toBeTruthy()
    expect(within(verao!).getByText('J2')).toBeTruthy()
    expect(within(atemporais!).getByText(/319,90/)).toBeTruthy()
    expect(within(atemporais!).getByText('só o SKU em vermelho')).toBeTruthy()
  })

  it('com título, aparece só quando o registro veio da migração', async () => {
    api.mockResolvedValue({ items: [] })
    const { container } = render(<OrigemMigracao tabela="pedido" idRegistro={12} titulo="Origem na Vulto" />)
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    expect(container.textContent).toBe('')

    cleanup()
    api.mockResolvedValue({ items: ORIGEM_VARIANTE_DE_TESTE })
    render(<OrigemMigracao tabela="pedido" idRegistro={5012} titulo="Origem na Vulto" />)
    expect(await screen.findByRole('heading', { name: 'Origem na Vulto' })).toBeTruthy()
  })

  it('diz quando o registro não veio da migração', async () => {
    api.mockResolvedValue({ items: [] })
    render(<OrigemMigracao tabela="variante" idRegistro={12} />)
    expect(await screen.findByText('Não veio da migração da Vulto.')).toBeTruthy()
  })
})
