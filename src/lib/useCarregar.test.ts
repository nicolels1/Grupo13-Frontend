// @vitest-environment jsdom
// os hooks só rodam dentro de um componente React: este arquivo simula o navegador com o jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// o cliente do Supabase precisa das variáveis do .env; aqui só os hooks importam
vi.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }))

const { ErroApi } = await import('./api')
const { useAdiado, useCarregar, useEnviar, useIntervalo } = await import('./useCarregar')

// promessa que o teste resolve na hora que quiser, para controlar a ordem das respostas
function adiada<T>() {
  let resolver!: (valor: T) => void
  const promessa = new Promise<T>((r) => {
    resolver = r
  })
  return { promessa, resolver }
}

describe('useCarregar', () => {
  it('começa carregando e guarda os dados que chegam', async () => {
    const { result } = renderHook(() => useCarregar(() => Promise.resolve(['Jardins']), []))
    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.dados).toEqual(['Jardins'])
    expect(result.current.erro).toBeNull()
  })

  it('mostra a mensagem do erro da API', async () => {
    const { result } = renderHook(() => useCarregar(() => Promise.reject(new ErroApi(404, 'Pedido não encontrado')), []))
    await waitFor(() => expect(result.current.erro).toBe('Pedido não encontrado'))
    expect(result.current.dados).toBeNull()
  })

  it('erro que não é da API vira uma mensagem geral', async () => {
    const { result } = renderHook(() => useCarregar(() => Promise.reject(new Error('interno')), []))
    await waitFor(() => expect(result.current.erro).toBe('Não foi possível carregar os dados'))
  })

  it('buscar devolvendo null não carrega nada', () => {
    const { result } = renderHook(() => useCarregar(() => null, []))
    expect(result.current).toMatchObject({ dados: null, erro: null, carregando: false })
  })

  it('ignora a resposta de uma chamada antiga quando o filtro muda', async () => {
    const respostas: Record<string, ReturnType<typeof adiada<string>>> = { A: adiada(), B: adiada() }
    const { result, rerender } = renderHook(({ filtro }) => useCarregar(() => respostas[filtro]!.promessa, [filtro]), {
      initialProps: { filtro: 'A' },
    })
    rerender({ filtro: 'B' })
    await act(async () => {
      respostas.B!.resolver('dados de B')
      respostas.A!.resolver('dados de A')
    })
    expect(result.current.dados).toBe('dados de B')
  })

  it('recarregar busca de novo', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const { result } = renderHook(() => useCarregar(buscar, []))
    await waitFor(() => expect(result.current.dados).toBe(1))
    act(() => result.current.recarregar())
    await waitFor(() => expect(result.current.dados).toBe(2))
    expect(buscar).toHaveBeenCalledTimes(2)
  })
})

describe('useEnviar', () => {
  it('devolve o resultado e marca o envio enquanto ele acontece', async () => {
    const resposta = adiada<string>()
    const { result } = renderHook(() => useEnviar())
    let envio!: Promise<string | undefined>
    act(() => {
      envio = result.current.enviar(() => resposta.promessa)
    })
    expect(result.current.enviando).toBe(true)
    await act(async () => resposta.resolver('ok'))
    expect(await envio).toBe('ok')
    expect(result.current.enviando).toBe(false)
  })

  it('falha devolve undefined e guarda a mensagem para o formulário', async () => {
    const { result } = renderHook(() => useEnviar())
    let devolvido: unknown = 'nada'
    await act(async () => {
      devolvido = await result.current.enviar(() => Promise.reject(new ErroApi(409, 'CPF já cadastrado')))
    })
    expect(devolvido).toBeUndefined()
    expect(result.current.erro).toBe('CPF já cadastrado')
    act(() => result.current.limparErro())
    expect(result.current.erro).toBeNull()
  })

  it('erro que não é da API vira uma mensagem geral', async () => {
    const { result } = renderHook(() => useEnviar())
    await act(async () => {
      await result.current.enviar(() => Promise.reject(new Error('interno')))
    })
    expect(result.current.erro).toBe('Não foi possível concluir a operação.')
  })
})

describe('useAdiado', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('só troca o valor depois do tempo sem mudança', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ busca }) => useAdiado(busca, 300), { initialProps: { busca: 'ca' } })
    rerender({ busca: 'cam' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ busca: 'cami' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('ca')
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('cami')
  })
})

describe('useIntervalo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('repete a ação no intervalo e para ao sair da tela', () => {
    vi.useFakeTimers()
    const acao = vi.fn()
    const { unmount } = renderHook(() => useIntervalo(acao, 1000))
    act(() => vi.advanceTimersByTime(3000))
    expect(acao).toHaveBeenCalledTimes(3)
    unmount()
    act(() => vi.advanceTimersByTime(3000))
    expect(acao).toHaveBeenCalledTimes(3)
  })

  it('null pausa', () => {
    vi.useFakeTimers()
    const acao = vi.fn()
    renderHook(() => useIntervalo(acao, null))
    act(() => vi.advanceTimersByTime(5000))
    expect(acao).not.toHaveBeenCalled()
  })

  it('usa sempre a ação mais recente, sem reiniciar o relógio', () => {
    vi.useFakeTimers()
    const primeira = vi.fn()
    const segunda = vi.fn()
    const { rerender } = renderHook(({ acao }) => useIntervalo(acao, 1000), { initialProps: { acao: primeira } })
    act(() => vi.advanceTimersByTime(600))
    rerender({ acao: segunda })
    act(() => vi.advanceTimersByTime(400))
    expect(primeira).not.toHaveBeenCalled()
    expect(segunda).toHaveBeenCalledTimes(1)
  })
})
