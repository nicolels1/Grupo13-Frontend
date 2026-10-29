import { describe, expect, it } from 'vitest'

import { chamadoVultoDeTeste } from '@/lib/vultoDeTeste'
import {
  comoChamar, nomeDoCanalExterno, origemDoChamado, quemAbriu, respostaNaoChega, respostaPorEmail, semCadastro, veioDoAssistente,
} from './regrasChamado'

describe('chamado migrado sem cadastro', () => {
  const chamado = chamadoVultoDeTeste({ cliente: '+5541999990000' })

  it('aparece pelo contato e é chamado pelo contato inteiro', () => {
    expect(semCadastro(chamado)).toBe(true)
    expect(quemAbriu(chamado)).toBe('+5541999990000')
    expect(comoChamar(chamado)).toBe('+5541999990000')
    expect(respostaNaoChega(chamado)).toBe(true)
  })

  it('sem nem o contato, diz que não há identificação', () => {
    const anonimo = chamadoVultoDeTeste({ cliente: null, contato_externo: null })
    expect(quemAbriu(anonimo)).toBe('Cliente sem identificação')
    expect(comoChamar(anonimo)).toBe('o cliente')
  })
})

describe('chamado com cliente', () => {
  it('da Vulto sem conta: pelo primeiro nome, mas a resposta não chega pela plataforma', () => {
    const c = chamadoVultoDeTeste({ id_cliente_sem_conta: 301, cliente: 'Bruna Teixeira' })
    expect(semCadastro(c)).toBe(false)
    expect(comoChamar(c)).toBe('Bruna')
    expect(respostaNaoChega(c)).toBe(true)
  })

  it('com conta: a resposta chega', () => {
    const c = chamadoVultoDeTeste({ id_cliente: 'b5d1c0de', cliente: 'Bruna Teixeira', canal_externo: null, contato_externo: null })
    expect(respostaNaoChega(c)).toBe(false)
  })
})

describe('nomeDoCanalExterno', () => {
  it('escreve o canal como a equipe fala', () => {
    expect(nomeDoCanalExterno('whatsapp')).toBe('WhatsApp')
    expect(nomeDoCanalExterno('email')).toBe('e-mail')
    expect(nomeDoCanalExterno('telegram')).toBe('Telegram')
  })
})

describe('chamado aberto pelo assistente no Telegram', () => {
  const c = chamadoVultoDeTeste({ id_cliente: 'b5d1c0de', cliente: 'Bruna Teixeira', canal_externo: 'telegram', contato_externo: null })

  it('não aparece como vindo da Vulto', () => {
    expect(veioDoAssistente(c)).toBe(true)
    expect(origemDoChamado(c)).toBe('Aberto pelo assistente no Telegram')
  })

  it('a resposta chega por e-mail', () => {
    expect(respostaPorEmail(c)).toBe(true)
  })
})

describe('chamado migrado da Vulto', () => {
  it('continua dizendo de onde veio, e a resposta não vai por e-mail', () => {
    const c = chamadoVultoDeTeste({ id_cliente: 'b5d1c0de', cliente: 'Bruna Teixeira' })
    expect(origemDoChamado(c)).toBe(`Veio da Vulto pelo ${nomeDoCanalExterno(c.canal_externo!)}`)
    expect(respostaPorEmail(c)).toBe(false)
  })
})
