// @vitest-environment jsdom
// horário de atendimento da loja na Gestão de unidades: a semana se salva inteira e as exceções por data
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { HorarioDaUnidade } = await import('./HorarioDaUnidade')

const HORARIO = {
  semana: [{ dia_semana: 0, abre: '10:00:00', fecha: '20:00:00' }],
  excecoes: [{ data: '2026-12-25', abre: null, fecha: null, motivo: 'Natal' }],
}

describe('HorarioDaUnidade', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('salva a semana inteira com os dias marcados', async () => {
    api.mockResolvedValue(HORARIO)
    render(<HorarioDaUnidade idUnidade={2} />)

    fireEvent.click(await screen.findByLabelText('Sábado'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar horário da semana' }))

    await waitFor(() => expect(api).toHaveBeenCalledWith('/unidades/2/horario', {
      metodo: 'PUT',
      corpo: { semana: [{ dia_semana: 0, abre: '10:00', fecha: '20:00' }, { dia_semana: 5, abre: '10:00', fecha: '20:00' }] },
    }))
    expect(await screen.findByText('Horário salvo.')).toBeTruthy()
  })

  it('não deixa salvar quando abre depois de fechar', async () => {
    api.mockResolvedValue(HORARIO)
    render(<HorarioDaUnidade idUnidade={2} />)

    fireEvent.change(await screen.findByLabelText('Segunda: abre'), { target: { value: '21:00' } })

    expect(screen.getByText('Segunda: o horário de abrir precisa ser antes do de fechar.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Salvar horário da semana' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('lista a exceção no dia certo e adiciona uma nova como dia fechado', async () => {
    api.mockResolvedValue(HORARIO)
    render(<HorarioDaUnidade idUnidade={2} />)

    expect(await screen.findByText('25 de dezembro de 2026')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2027-01-01' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Ano-Novo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar exceção' }))

    await waitFor(() => expect(api).toHaveBeenCalledWith('/unidades/2/excecoes/2027-01-01', {
      metodo: 'PUT', corpo: { motivo: 'Ano-Novo' },
    }))
  })

  it('remove a exceção', async () => {
    api.mockResolvedValue(HORARIO)
    render(<HorarioDaUnidade idUnidade={2} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover Natal' }))

    await waitFor(() => expect(api).toHaveBeenCalledWith('/unidades/2/excecoes/2026-12-25', { metodo: 'DELETE' }))
  })
})
