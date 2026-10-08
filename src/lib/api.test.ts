import { describe, expect, it, vi } from 'vitest'

// o cliente do Supabase precisa das variáveis do .env; aqui só a mensagem de erro importa
vi.mock('./supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }))

const { mensagemDoErro } = await import('./api')

describe('mensagemDoErro', () => {
  it('usa o texto que o backend mandou', () => {
    expect(mensagemDoErro({ detail: 'Pedido não encontrado' }, 404)).toBe('Pedido não encontrado')
  })

  it('junta os erros de validação (422) sem o prefixo do Pydantic', () => {
    const corpo = { detail: [{ msg: 'Value error, CPF inválido' }, { msg: 'Campo obrigatório' }] }
    expect(mensagemDoErro(corpo, 422)).toBe('CPF inválido; Campo obrigatório')
  })

  it('erro do servidor sem texto vira uma mensagem para tentar de novo', () => {
    expect(mensagemDoErro(null, 500)).toBe('Erro no servidor. Tente de novo em instantes.')
  })

  it('erro sem texto e sem ser do servidor tem uma mensagem geral', () => {
    expect(mensagemDoErro({}, 400)).toBe('Não foi possível concluir a operação.')
  })
})
