import type { AuthError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { erroDaTrocaDeSenha, erroDoLinkDeSenha, erroDoLogin } from './mensagens'

// só os campos que as mensagens leem; o resto do erro do Supabase não importa aqui
const erro = (dados: { message?: string; status?: number; code?: string }) => ({ message: '', ...dados }) as AuthError

describe('erroDoLogin', () => {
  it('traduz credencial errada e e-mail não confirmado', () => {
    expect(erroDoLogin(erro({ message: 'Invalid login credentials', status: 400 }))).toBe('E-mail ou senha inválidos')
    expect(erroDoLogin(erro({ message: 'Email not confirmed', status: 400 }))).toBe('E-mail ainda não confirmado')
  })

  it('avisa do excesso de tentativas', () => {
    expect(erroDoLogin(erro({ message: 'Too many requests', status: 429 }))).toBe('Muitas tentativas. Aguarde alguns minutos e tente de novo')
  })

  it('outro erro vira uma mensagem geral', () => {
    expect(erroDoLogin(erro({ message: 'Database error', status: 500 }))).toBe('Não foi possível entrar. Tente de novo.')
  })
})

describe('erroDoLinkDeSenha', () => {
  it('avisa do excesso de pedidos', () => {
    expect(erroDoLinkDeSenha(erro({ status: 429 }))).toBe('Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.')
  })

  it('outro erro vira uma mensagem geral', () => {
    expect(erroDoLinkDeSenha(erro({ status: 500 }))).toBe('Não foi possível enviar o link. Tente de novo.')
  })
})

describe('erroDaTrocaDeSenha', () => {
  it('avisa quando a senha nova é igual à anterior', () => {
    expect(erroDaTrocaDeSenha(erro({ code: 'same_password', status: 422 }))).toBe('A nova senha precisa ser diferente da anterior.')
  })

  it('outro erro vira uma mensagem geral', () => {
    expect(erroDaTrocaDeSenha(erro({ status: 500 }))).toBe('Não foi possível salvar a senha. Tente de novo.')
  })
})
