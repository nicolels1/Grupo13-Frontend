import type { Esquema } from '@/lib/api'

type Chamado = Pick<Esquema<'ChamadoSaida'>, 'cliente' | 'id_cliente' | 'id_cliente_sem_conta' | 'canal_externo' | 'contato_externo' | 'aberto_pelo_assistente'>

// o chamado que veio do atendimento da Vulto (P6): WhatsApp, Instagram ou e-mail, com o contato de quem
// escreveu. Sem cliente identificado (A5–A7), a API manda o contato no lugar do nome

export const CANAIS_EXTERNOS: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'e-mail', telegram: 'Telegram',
}

export function nomeDoCanalExterno(canal: string) {
  return CANAIS_EXTERNOS[canal] ?? canal
}

// o chamado aberto pelo assistente virtual do cliente (frente da Nicole). Pela coluna, não pelo canal:
// whatsapp também é o canal dos chamados migrados da Vulto
export function veioDoAssistente(c: Chamado) {
  return c.aberto_pelo_assistente
}

// etiqueta do chamado com canal externo. O do assistente não diz o canal: o mesmo vale para o WhatsApp
export function origemDoChamado(c: Chamado) {
  return veioDoAssistente(c) ? 'Aberto pelo assistente virtual' : `Veio da Vulto pelo ${nomeDoCanalExterno(c.canal_externo ?? '')}`
}

// a resposta da equipe também chega na conversa do cliente com o assistente, com o nome de quem atendeu
export function respostaNaConversa(c: Chamado) {
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
