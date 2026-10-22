// @vitest-environment jsdom
// área Fidelidade com a API de mentira: a regra de hoje, o histórico e a criação da próxima regra
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Esquema } from '@/lib/api'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { authDeTeste, perfilDeTeste } = await import('@/auth/authDeTeste')
const { AuthContext } = await import('@/auth/contexto')
const { hojeIso, diasAtras } = await import('@/lib/formato')
const { Fidelidade } = await import('./Fidelidade')

function regra(campos: Partial<Esquema<'RegraSaida'>>): Esquema<'RegraSaida'> {
  return {
    id_regra: 1, marca: 'vulto', valida_desde: '2025-03-01', valor_ponto: '0.0500', pontos_por_real: '1.00',
    multiplicador_online: '2.00', bonus_ouro: '0.50', validade_meses: 12, validade_meses_ouro: 24,
    limite_prata: 1000, limite_ouro: 5000, resgate_minimo: 100, id_criado_por: null,
    criado_em: '2026-10-21T22:00:00Z', vigente: true, ...campos,
  }
}

const REGRAS = [
  regra({ id_regra: 3, valida_desde: diasAtras(-10), vigente: false, valor_ponto: '0.0600', id_criado_por: 'a1' }),
  regra({ id_regra: 2 }),
  regra({ id_regra: 1, valida_desde: '2024-01-01', valor_ponto: '0.1000', vigente: false }),
]

function abrir() {
  // quem cuida do programa e vê só a Vulto: sem abas de marca
  const perfil = perfilDeTeste({ tipo_conta: 'interna', permissoes: ['gerenciar_fidelidade', 'ver_marca_vulto'] })
  render(
    <AuthContext.Provider value={authDeTeste({ perfil })}>
      <Fidelidade />
    </AuthContext.Provider>,
  )
}

describe('Fidelidade', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('mostra a regra de hoje e o histórico, cada uma com a situação', async () => {
    api.mockResolvedValue({ items: REGRAS })
    abrir()

    expect(await screen.findByText('Regra que vale hoje')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/fidelidade/regras', { params: { marca: 'vulto' } })
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getAllByText('Vale hoje')).toHaveLength(1)
    expect(screen.getByText('Começa depois')).toBeTruthy()
    expect(screen.getByText('Substituída')).toBeTruthy()
    expect(screen.getAllByText('Veio da migração')).toHaveLength(2)
  })

  it('cria a próxima regra a partir da de hoje, conferindo antes de enviar', async () => {
    api.mockImplementation((_caminho: string, opcoes?: { metodo?: string }) =>
      Promise.resolve(opcoes?.metodo === 'POST' ? regra({ id_regra: 9, vigente: false }) : { items: REGRAS }))
    abrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Nova regra' }))
    const ouro = await screen.findByLabelText(/Ouro a partir de/)
    fireEvent.change(ouro, { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar regra' }))
    expect(await screen.findByText('O limite do Ouro precisa ser maior que o da Prata.')).toBeTruthy()
    expect(api.mock.calls.some(([, o]) => o?.metodo === 'POST')).toBe(false)

    fireEvent.change(ouro, { target: { value: '6000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar regra' }))

    await vi.waitFor(() => expect(api.mock.calls.some(([, o]) => o?.metodo === 'POST')).toBe(true))
    const [, envio] = api.mock.calls.find(([, o]) => o?.metodo === 'POST')!
    expect(envio.corpo).toMatchObject({
      marca: 'vulto', valida_desde: diasAtras(-1), valor_ponto: '0.05', limite_ouro: 6000, validade_meses: 12,
    })
    expect(envio.corpo.valida_desde > hojeIso()).toBe(true)
    expect(await screen.findByText(/Regra criada/)).toBeTruthy()
  })
})
