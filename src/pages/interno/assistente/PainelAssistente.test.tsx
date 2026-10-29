// @vitest-environment jsdom
// o painel do assistente interno: pergunta, resposta com link, conversa que continua, erro com "tentar de
// novo", 👍/👎 e nova conversa. A API é falsa: o que importa é o que a tela manda e mostra
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.fn()
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
// sem .env (como no GitHub), o cliente de verdade do Supabase quebra ao carregar a API
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: {} } }))

const { ErroApi } = await import('@/lib/api')
const { useConversaAssistente, VALIDADE_MS } = await import('./conversaAssistente')
const { PainelAssistente } = await import('./PainelAssistente')

const resposta = (dados: Record<string, unknown> = {}) => ({
  id_conversa: 12, resposta: 'A Savassi vendeu R$ 2.569,00 em 6 pedidos.', ferramentas: ['vendas_do_periodo'],
  numeros_conferidos: true, links: [{ rotulo: 'Abrir a Visão geral', url: '/interno' }], ...dados,
})

const aoMudar = vi.fn()
type UnidadeEmFoco = { id_unidade: number; nome: string } | null

const aoTrocarUnidade = vi.fn()
const UNIDADES = [{ id_unidade: 45, nome: 'Vulto Savassi' }, { id_unidade: 46, nome: 'Vulto Pinheiros' }]

function Painel({ unidade = null }: { unidade?: UnidadeEmFoco }) {
  const conversa = useConversaAssistente()
  const [aberto, setAberto] = useState(true)
  const mudar = (valor: boolean) => {
    setAberto(valor)
    aoMudar(valor)
  }
  return (
    <PainelAssistente
      aberto={aberto} aoMudar={mudar} conversa={conversa} unidadeEmFoco={unidade}
      unidades={UNIDADES} aoTrocarUnidade={aoTrocarUnidade}
    />
  )
}

function abrir(unidade: UnidadeEmFoco = null) {
  return render(<MemoryRouter><Painel unidade={unidade} /></MemoryRouter>)
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
    sessionStorage.clear()
    vi.useRealTimers()
  })

  it('a conversa volta depois de recarregar a página, inteira e sem animar de novo', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    escrever('quanto vendemos?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')

    // recarregar = montar tudo de novo; a sessão da aba continua
    cleanup()
    abrir()
    expect(screen.getByText('quanto vendemos?')).toBeTruthy()
    const resposta_ = screen.getByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')
    expect(resposta_.className).not.toContain('sr-only')
    expect(screen.getByRole('link', { name: /Abrir a Visão geral/ })).toBeTruthy()

    // a próxima pergunta continua a mesma conversa no backend
    escrever('e o Batel?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(corpo(1)).toMatchObject({ texto: 'e o Batel?', id_conversa: 12 }))
  })

  it('"Nova" apaga a conversa guardada na aba', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    escrever('quanto vendemos?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')

    fireEvent.click(screen.getByRole('button', { name: /Nova/ }))
    cleanup()
    abrir()
    expect(screen.queryByText('quanto vendemos?')).toBeNull()
  })

  it('conversa parada há 30 minutos não volta (o backend já começou outra)', () => {
    sessionStorage.setItem('conversa-assistente-interno', JSON.stringify({
      falas: [{ id: 1, hora: '10:00', papel: 'usuario', texto: 'pergunta antiga', unidade: null }],
      idConversa: 7, avaliacao: null, salvaEm: Date.now() - VALIDADE_MS,
    }))
    abrir()
    expect(screen.queryByText('pergunta antiga')).toBeNull()
  })

  it('sugestão vira pergunta, e a resposta vem com o link e o "Ajudou?"', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    expect(screen.queryByText('Ajudou?')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))

    expect(await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/assistente/interno/mensagens', {
      metodo: 'POST', corpo: { texto: 'Quanto a rede vendeu esta semana?', id_conversa: null, id_unidade_em_foco: null },
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
    expect(corpo(1)).toEqual({ texto: 'e ontem?', id_conversa: 12, id_unidade_em_foco: null })
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

  it('a tabela do sistema mostra o nome do cliente com o link da ficha', async () => {
    api.mockResolvedValue(resposta({
      resposta: 'O 1º cliente comprou R$ 1.739,40 em 5 pedidos. Os nomes estão na tabela.', links: [],
      tabelas: [{
        titulo: 'Maiores clientes na marca Vulto', colunas: ['Posição', 'Cliente', 'Total', 'Pedidos'],
        linhas: [{ celulas: ['1º', 'Maria Souza', 'R$ 1.739,40', '5'], url: '/interno/clientes/sem-conta/9' }],
      }],
    }))
    abrir()
    escrever('qual cliente mais comprou?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    const tabela = await screen.findByRole('table', { name: 'Maiores clientes na marca Vulto' })
    expect(tabela.textContent).toContain('R$ 1.739,40')
    expect(screen.getByRole('link', { name: 'Maria Souza' }).getAttribute('href')).toBe('/interno/clientes/sem-conta/9')
  })

  it('resposta sem tabela não mostra tabela', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    escrever('quanto vendemos?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')
    expect(screen.queryByRole('table')).toBeNull()
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

  it('mostra a unidade selecionada no topo e manda junto da pergunta', async () => {
    api.mockResolvedValue(resposta())
    const tela = abrir({ id_unidade: 45, nome: 'Vulto Savassi' })
    expect((screen.getByLabelText('Unidade selecionada') as HTMLSelectElement).value).toBe('45')
    expect(screen.getByTestId('unidade-em-foco').textContent).toBe('Perguntas sem unidade usam Vulto Savassi.')

    escrever('quanto vendemos?')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await screen.findByText('A Savassi vendeu R$ 2.569,00 em 6 pedidos.')
    expect(corpo(0)).toEqual({ texto: 'quanto vendemos?', id_conversa: null, id_unidade_em_foco: 45 })
    // a unidade fica só no topo do painel, não embaixo de cada pergunta
    expect(screen.queryByText('com Vulto Savassi selecionada')).toBeNull()

    // trocou o topo para todas: o aviso muda
    tela.rerender(<MemoryRouter><Painel unidade={null} /></MemoryRouter>)
    expect((screen.getByLabelText('Unidade selecionada') as HTMLSelectElement).value).toBe('')
    expect(screen.getByTestId('unidade-em-foco').textContent).toBe('Perguntas sem unidade valem para a rede inteira.')
  })

  it('o seletor do painel troca a unidade selecionada', () => {
    abrir({ id_unidade: 45, nome: 'Vulto Savassi' })
    const seletor = screen.getByLabelText('Unidade selecionada')

    fireEvent.change(seletor, { target: { value: '46' } })
    expect(aoTrocarUnidade).toHaveBeenLastCalledWith(46)
    fireEvent.change(seletor, { target: { value: '' } })
    expect(aoTrocarUnidade).toHaveBeenLastCalledWith(null)
  })

  it('a pergunta refeita depois de um erro usa a unidade de quando foi feita', async () => {
    api.mockRejectedValueOnce(new ErroApi(503, 'O assistente está fora do ar agora.')).mockResolvedValue(resposta())
    abrir({ id_unidade: 45, nome: 'Vulto Savassi' })
    escrever('vendas de hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(corpo(1).id_unidade_em_foco).toBe(45)
  })

  it('o link da resposta fecha o painel', async () => {
    api.mockResolvedValue(resposta())
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Quanto a rede vendeu esta semana?' }))
    fireEvent.click(await screen.findByRole('link', { name: /Abrir a Visão geral/ }))
    expect(aoMudar).toHaveBeenLastCalledWith(false)
  })
})
