import { useCallback, useEffect, useState } from 'react'

import { api, ErroApi, type Esquema } from '@/lib/api'

type Resposta = Esquema<'RespostaAssistente'>
export type Avaliacao = Esquema<'AvaliacaoEntrada'>['avaliacao']
export type Tabela = Esquema<'Tabela'>

// uma fala da conversa na tela. "tabelas" vêm direto do banco (podem ter o nome do cliente, que não passa pelo
// modelo). "montada" = a conferência dos números barrou o texto do modelo e veio a
// resposta fixa do backend; "erro" = a pergunta não teve resposta (assistente fora do ar, sem conexão)
// O id só serve para a tela (chave da lista e a resposta que já apareceu animada). A pergunta guarda a unidade
// do topo que valia quando foi feita, para a tela mostrar (a pessoa pode trocar no meio da conversa)
export type Fala = { id: number; hora: string } & (
  | { papel: 'usuario'; texto: string; unidade: UnidadeEmFoco | null }
  | { papel: 'assistente'; texto: string; links: Resposta['links']; tabelas: Tabela[]; montada: boolean }
  | { papel: 'erro'; texto: string; pergunta: string; unidade: UnidadeEmFoco | null }
)

// a unidade selecionada no topo da plataforma; null = "Todas as unidades"
export type UnidadeEmFoco = { id_unidade: number; nome: string }

let ultimoId = 0
const novoId = () => ++ultimoId
// a hora que aparece no balão, como num app de mensagens
const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const TAMANHO_MAXIMO = 1000
export const SUGESTOES = [
  'Quanto a rede vendeu esta semana?',
  'Qual loja vendeu mais mês passado?',
  'Quanto o site vendeu este mês?',
]

export function semATentativaQueFalhou(falas: Fala[], pergunta: string): Fala[] {
  const erro = falas.findIndex((f) => f.papel === 'erro' && f.pergunta === pergunta)
  if (erro === -1) return falas
  const anterior = falas[erro - 1]
  const inicio = anterior?.papel === 'usuario' && anterior.texto === pergunta ? erro - 1 : erro
  return [...falas.slice(0, inicio), ...falas.slice(erro + 1)]
}

export function falaDaResposta(r: Resposta): Fala {
  return { id: novoId(), hora: agora(), papel: 'assistente', texto: r.resposta, links: r.links, tabelas: r.tabelas ?? [],
    montada: r.numeros_conferidos === false }
}

// a conversa fica na sessão da aba: volta ao recarregar a página e some ao fechar a aba. Parada há 30 min, o
// backend já começou outra, então a guardada é descartada
const CHAVE = 'conversa-assistente-interno'
export const VALIDADE_MS = 30 * 60 * 1000
type Guardada = { falas: Fala[]; idConversa: number | null; avaliacao: Avaliacao | null; salvaEm: number }

export function lerConversaGuardada(agora = Date.now()): Guardada | null {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null') as Guardada | null
    if (!guardada || !Array.isArray(guardada.falas) || agora - guardada.salvaEm >= VALIDADE_MS) return null
    // os ids novos continuam depois dos guardados (são a chave da lista na tela)
    ultimoId = Math.max(ultimoId, ...guardada.falas.map((f) => f.id))
    return guardada
  } catch {
    return null
  }
}

function guardarConversa(conversa: Omit<Guardada, 'salvaEm'>) {
  try {
    if (conversa.falas.length === 0) sessionStorage.removeItem(CHAVE)
    else sessionStorage.setItem(CHAVE, JSON.stringify({ ...conversa, salvaEm: Date.now() }))
  } catch {
    // navegador sem armazenamento (aba anônima): a conversa vale até recarregar a página
  }
}

// a conversa com o assistente interno (POST /assistente/interno/mensagens). Fica no layout, então continua
// ao trocar de tela; o backend começa outra sozinho se ela ficou 30 min parada
export function useConversaAssistente() {
  const [guardada] = useState(() => lerConversaGuardada())
  const [falas, setFalas] = useState<Fala[]>(guardada?.falas ?? [])
  const [idConversa, setIdConversa] = useState<number | null>(guardada?.idConversa ?? null)
  const [enviando, setEnviando] = useState(false)
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(guardada?.avaliacao ?? null)

  useEffect(() => {
    guardarConversa({ falas, idConversa, avaliacao })
  }, [falas, idConversa, avaliacao])

  // sem unidade na pergunta, o backend usa a do topo (e a resposta diz que usou)
  const perguntar = useCallback(async (texto: string, unidade: UnidadeEmFoco | null = null) => {
    const pergunta = texto.trim().slice(0, TAMANHO_MAXIMO)
    if (!pergunta || enviando) return
    // uma pergunta que falhou e é refeita sai da lista (ela e o erro): fica só a nova tentativa
    setFalas((atuais) => [...semATentativaQueFalhou(atuais, pergunta),
      { id: novoId(), hora: agora(), papel: 'usuario', texto: pergunta, unidade }])
    setEnviando(true)
    try {
      const r = await api<Resposta>('/assistente/interno/mensagens', {
        metodo: 'POST', corpo: { texto: pergunta, id_conversa: idConversa, id_unidade_em_foco: unidade?.id_unidade ?? null },
      })
      // conversa nova no backend (a anterior ficou parada): a avaliação era da outra
      if (r.id_conversa !== idConversa) setAvaliacao(null)
      setIdConversa(r.id_conversa)
      setFalas((atuais) => [...atuais, falaDaResposta(r)])
    } catch (falha) {
      const motivo = falha instanceof ErroApi ? falha.message : 'Não foi possível falar com o assistente.'
      setFalas((atuais) => [...atuais, { id: novoId(), hora: agora(), papel: 'erro', texto: motivo, pergunta, unidade }])
    } finally {
      setEnviando(false)
    }
  }, [enviando, idConversa])

  const avaliar = useCallback(async (valor: Avaliacao) => {
    if (idConversa === null) return
    const anterior = avaliacao
    setAvaliacao(valor)
    try {
      await api(`/assistente/interno/conversas/${idConversa}/avaliacao`, { metodo: 'PUT', corpo: { avaliacao: valor } })
    } catch {
      setAvaliacao(anterior)
    }
  }, [avaliacao, idConversa])

  const novaConversa = useCallback(() => {
    setFalas([])
    setIdConversa(null)
    setAvaliacao(null)
  }, [])

  const respondeu = falas.some((f) => f.papel === 'assistente')
  return { falas, enviando, avaliacao, respondeu, perguntar, avaliar, novaConversa }
}

export type ConversaAssistente = ReturnType<typeof useConversaAssistente>
