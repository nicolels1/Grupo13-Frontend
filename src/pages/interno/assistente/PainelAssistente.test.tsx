// @vitest-environment jsdom
// o painel do assistente interno: pergunta, resposta com link, conversa que continua, erro com "tentar de
// novo", 👍/👎 e nova conversa. A API é falsa: o que importa é o que a tela manda e mostra
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))

const { ErroApi } = await import('@/lib/api')
const { useConversaAssistente } = await import('./conversaAssistente')
const { PainelAssistente } = await import('./PainelAssistente')

const resposta = (dados: Record<string, unknown> = {}) => ({
  id_conversa: 12, resposta: 'A Savassi vendeu R$ 2.569,00 em 6 pedidos.', ferramentas: ['vendas_do_periodo'],
  numeros_conferidos: true, links: [{ rotulo: 'Abrir a Visão geral', url: '/interno' }], ...dados,
})

const aoMudar = vi.fn()
function Painel() {
  const conversa = useConversaAssistente()
  const [aberto, setAberto] = useState(true)
  const mudar = (valor: boolean) => {
    setAberto(valor)
    aoMudar(valor)
  }
  return <PainelAssistente aberto={aberto} aoMudar={mudar} conversa={conversa} />
}

function abrir() {
  render(<MemoryRouter><Painel /></MemoryRouter>)
}

const campo = () => screen.getByLabelText('Sua pergunta') as HTMLTextAreaElement
const corpo = (chamada: number) => api.mock.calls[chamada]?.[1].corpo

function escrever(texto: string) {
  fireEvent.change(campo(), { target: { value: texto } })
}

describe('PainelAssistente', () => {
  afterEach(() => {
    cleanup()
    api.mockReset()
    aoMudar.mockReset()
  })

  it('sugestão vira pergunta, e a resposta vem com o link e o "Ajudou?"', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    expect(screen.queryByText('Ajudou?')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))

    expect(await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/assistente/interno/mensagens', {
      metodo: 'POST', corpo: { texto: 'Quanto a rede vendeu esta semana?', id_conversa: null },
    })
    expect(screen.getByRole('link', { name: /Abrir a Visão geral/ }).getAttribute('href')).toBe('/interno')
    expect(screen.getByText('Ajudou?')).toBeTruthy()
    expect(screen.queryByText('Resposta montada direto pelo sistema.')).toBeNull()
  })

  it('a próxima pergunta continua a mesma conversa', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    escrever('quanto vendeu a savassi?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')

    escrever('e ontem?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(corpo(1)).toEqual({ texto: 'e ontem?', id_conversa: 12 })
  })

  it('Enter envia e Shift+Enter não', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    escrever('primeira linha')
    fireEvent.keyDown(campo(), { key: 'Enter', shiftKey: true })
    expect(api).not.toHaveBeenCalled()

    fireEvent.keyDown(campo(), { key: 'Enter' })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(corpo(0).texto).toBe('primeira linha')
    expect(campo().value).toBe('')
  })

  it('resposta montada pelo sistema leva a nota', async () => {
    api.mockResolvedValue(resposta({ numeros_conferidos: false }))
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Qual loja vendeu mais mês passado?' }))
    expect(await screen.findByText('Resposta montada direto pelo sistema.')).toBeTruthy()
  })

  it('assistente fora do ar: mostra o motivo e tenta de novo sem repetir a pergunta', async () => {
    api.mockRejectedValueOnce(new ErroApi(503, 'O assistente está fora do ar agora. Tente de novo em instantes.'))
      .mockResolvedValue(resposta())
    abrir()
    escrever('vendas de hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('O assistente está fora do ar agora. Tente de novo em instantes.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getAllByText('vendas de hoje')).toHaveLength(1)
  })

  it('👍/👎 grava a avaliação da conversa e volta atrás se falhar', async () => {
    api.mockResolvedValueOnce(resposta())
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Quanto o site vendeu este mês?' }))
    await screen.findByText('Ajudou?')

    api.mockResolvedValueOnce(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Ajudou' }))
    await waitFor(() => expect(api).toHaveBeenLastCalledWith('/assistente/interno/conversas/12/avaliacao', {
      metodo: 'PUT', corpo: { avaliacao: 'positiva' },
    }))
    expect(screen.getByRole('button', { name: 'Ajudou' }).getAttribute('aria-pressed')).toBe('true')

    api.mockRejectedValueOnce(new ErroApi(0, 'Sem conexão com o servidor.'))
    fireEvent.click(screen.getByRole('button', { name: 'Não ajudou' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ajudou' }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.getByRole('button', { name: 'Não ajudou' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('nova conversa limpa a tela e a próxima pergunta não leva a conversa anterior', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))
    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')

    fireEvent.click(screen.getByRole('button', { name: /Nova/ }))
    expect(screen.queryByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' })).toBeTruthy()

    escrever('oi')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(corpo(1).id_conversa).toBeNull()
  })

  it('com animação, a resposta aparece aos poucos e o link só no fim', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    try {
      api.mockResolvedValue(resposta())
      abrir()
      fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))

      // o leitor de tela recebe o texto inteiro; o que se vê ainda está pela metade, e o link não entrou
      const inteiro = await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')
      expect(inteiro.className).toContain('sr-only')
      expect(screen.queryByRole('link')).toBeNull()

      expect(await screen.findByRole('link', { name: /Abrir a Visão geral/ }, { timeout: 3000 })).toBeTruthy()
      expect(screen.getAllByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toHaveLength(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  // no Chrome novo o scrollIntoView devolve uma Promise: o painel não pode tratar isso como limpeza do efeito
  it('rolar até o fim com o scrollIntoView do Chrome novo não quebra a tela', async () => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = (() => Promise.resolve()) as unknown as typeof original
    try {
      api.mockResolvedValue(resposta())
      abrir()
      fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))
      expect(await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toBeTruthy()

      escrever('e ontem?')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      await waitFor(() => expect(screen.getAllByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toHaveLength(2))
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('o link da resposta fecha o painel', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))
    fireEvent.click(await screen.findByRole('link', { name: /Abrir a Visão geral/ }))
    expect(aoMudar).toHaveBeenLastCalledWith(false)
  })
})
