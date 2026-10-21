import { describe, expect, it } from 'vitest'

import { CLIENTE_SO_NOS_PONTOS_DE_TESTE, clienteVultoDeTeste } from '@/lib/vultoDeTeste'
import { nomeDoCliente, rotuloConsentimento, rotuloMovimentoPontos, telefoneFormatado } from './regrasCliente'

describe('nomeDoCliente', () => {
  it('usa o nome do cadastro', () => {
    expect(nomeDoCliente(clienteVultoDeTeste())).toBe('Bruna Teixeira')
  })

  it('sem nome nem e-mail, quem só está nos pontos aparece pelo CPF', () => {
    expect(nomeDoCliente(CLIENTE_SO_NOS_PONTOS_DE_TESTE)).toBe('CPF 730.918.246-40')
  })

  it('sem nome, o e-mail; sem nada, o número do cliente', () => {
    expect(nomeDoCliente(clienteVultoDeTeste({ nome: null }))).toBe('bruna.teixeira@exemplo.com')
    expect(nomeDoCliente({ id_cliente_sem_conta: 7, nome: null, email: null, cpf: null })).toBe('Cliente 7')
  })
})

describe('rotuloConsentimento', () => {
  it('separa o "não" do que ficou em branco no cadastro', () => {
    expect(rotuloConsentimento(true)).toBe('Aceita mensagens')
    expect(rotuloConsentimento(false)).toBe('Não aceita mensagens')
    expect(rotuloConsentimento(null)).toBe('Não informado')
  })
})

describe('telefoneFormatado', () => {
  it('mascara celular e fixo com DDD', () => {
    expect(telefoneFormatado('11987654321')).toBe('(11) 98765-4321')
    expect(telefoneFormatado('4133334444')).toBe('(41) 3333-4444')
  })

  it('deixa como veio o que não tem 10 ou 11 dígitos', () => {
    expect(telefoneFormatado('987654321')).toBe('987654321')
    expect(telefoneFormatado(null)).toBe('—')
  })
})

describe('rotuloMovimentoPontos', () => {
  it('dá nome ao tipo do movimento', () => {
    expect(rotuloMovimentoPontos('saldo_inicial')).toBe('Saldo inicial')
    expect(rotuloMovimentoPontos('outro')).toBe('outro')
  })
})
