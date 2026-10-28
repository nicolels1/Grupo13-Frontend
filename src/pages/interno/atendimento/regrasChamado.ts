import type { Esquema } from '@/lib/api'

type Chamado = Pick<Esquema<'ChamadoSaida'>, 'cliente' | 'id_cliente' | 'id_cliente_sem_conta' | 'canal_externo' | 'contato_externo'>

// o chamado que veio do atendimento da Vulto (P6): WhatsApp, Instagram ou e-mail, com o contato de quem
// escreveu. Sem cliente identificado (A5–A7), a API manda o contato no lugar do nome

export const CANAIS_EXTERNOS: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'e-mail', chat: 'chat' }

export function nomeDoCanalExterno(canal: string) {
  return CANAIS_EXTERNOS[canal] ?? canal
}

// o chamado aberto pelo assistente do cliente (frente da Nicole). Até existir uma coluna de origem, só o
// chat (o chat do n8n, usado na banca) é certamente do assistente: whatsapp também aparece nos migrados
export function veioDoAssistente(c: Chamado) {
  return c.canal_externo === 'chat'
}

// etiqueta do chamado com canal externo
export function origemDoChamado(c: Chamado) {
  const canal = nomeDoCanalExterno(c.canal_externo ?? '')
  return veioDoAssistente(c) ? `Aberto pelo assistente no ${canal}` : `Veio da Vulto pelo ${canal}`
}

// o chat do assistente não recebe mensagem da equipe: a resposta chega ao cliente por e-mail
export function respostaPorEmail(c: Chamado) {
  return veioDoAssistente(c) && !respostaNaoChega(c)
}

// ninguém do cadastro: nem conta nem cliente da Vulto sem conta
export function semCadastro(c: Chamado) {
  return c.id_cliente === null && c.id_cliente_sem_conta === null
}

// quem abriu, para o título e a primeira mensagem
export function quemAbriu(c: Chamado) {
  return c.cliente ?? 'Cliente sem identificação'
}

// como chamar a pessoa na resposta: o primeiro nome; sem cadastro, o contato inteiro (não é um nome)
export function comoChamar(c: Chamado) {
  if (!c.cliente) return 'o cliente'
  return semCadastro(c) ? c.cliente : c.cliente.split(' ')[0]!
}

// a resposta pela plataforma só chega a quem tem conta. O cliente do chamado migrado sem conta (ou sem
// cadastro) conversou pelo canal da Vulto: a equipe responde por lá e registra aqui como nota interna
export function respostaNaoChega(c: Chamado) {
  return c.id_cliente === null
}
