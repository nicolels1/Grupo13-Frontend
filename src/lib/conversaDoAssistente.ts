// o chamado aberto pelo assistente virtual (Entrega 4, aberto_pelo_assistente): a descrição traz o resumo que
// o cliente confirmou e, depois do marcador, a conversa com o assistente, uma fala por linha ("Cliente: ..." ou
// "Assistente: ..."). É o backend que monta assim (assistente_conta._descricao). O canal fica de fora da tela:
// o mesmo vale para o Telegram de hoje e para o WhatsApp

const MARCADOR = '\n\nConversa com o assistente:\n'
const QUEM_FALOU = { 'Cliente: ': 'cliente', 'Assistente: ': 'assistente' } as const

export type Fala = { de: 'cliente' | 'assistente'; texto: string }

// a linha que não começa por "Cliente:" ou "Assistente:" é continuação da fala anterior (mensagem com
// quebra de linha)
export function separarConversa(descricao: string): { resumo: string; conversa: Fala[] } {
  const inicio = descricao.indexOf(MARCADOR)
  if (inicio === -1) return { resumo: descricao, conversa: [] }

  const conversa: Fala[] = []
  for (const linha of descricao.slice(inicio + MARCADOR.length).split('\n')) {
    const prefixo = (Object.keys(QUEM_FALOU) as (keyof typeof QUEM_FALOU)[]).find((p) => linha.startsWith(p))
    const anterior = conversa.at(-1)
    if (prefixo) conversa.push({ de: QUEM_FALOU[prefixo], texto: linha.slice(prefixo.length) })
    else if (anterior) anterior.texto += `\n${linha}`
  }
  return { resumo: descricao.slice(0, inicio), conversa }
}
