import { describe, expect, it } from 'vitest'

import { enderecoDoLinkDeSenha } from './linkDeSenha'

describe('enderecoDoLinkDeSenha', () => {
  it('leva o convite da equipe para criar a senha', () => {
    expect(enderecoDoLinkDeSenha('/', '#access_token=abc&type=invite')).toBe('/redefinir-senha?convite=1#access_token=abc&type=invite')
  })

  it('leva o link vencido para a tela que avisa', () => {
    expect(enderecoDoLinkDeSenha('/', '#error_code=otp_expired')).toBe('/redefinir-senha#error_code=otp_expired')
  })

  it('não mexe quando já está em /redefinir-senha', () => {
    expect(enderecoDoLinkDeSenha('/redefinir-senha', '#access_token=abc&type=invite')).toBeNull()
  })

  it('não mexe em outros endereços', () => {
    expect(enderecoDoLinkDeSenha('/loja', '')).toBeNull()
    expect(enderecoDoLinkDeSenha('/loja', '#avaliacoes')).toBeNull()
  })
})
