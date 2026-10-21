import { describe, expect, it } from 'vitest'

import { chamadoVultoDeTeste } from '@/lib/vultoDeTeste'
import { comoChamar, nomeDoCanalExterno, quemAbriu, respostaNaoChega, semCadastro } from './regrasChamado'

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
  })
})
