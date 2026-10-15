import { describe, expect, it } from 'vitest'

import { cpfValido, validarCampo } from './validacao'

describe('cpfValido', () => {
  it('aceita CPF com os dígitos verificadores certos, com ou sem máscara', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224725')).toBe(true)
  })

  it('recusa dígito verificador errado', () => {
    expect(cpfValido('529.982.247-24')).toBe(false)
  })

  it('recusa CPF incompleto e de números repetidos', () => {
    expect(cpfValido('5299822472')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
  })
})

describe('validarCampo', () => {
  it('nome precisa de pelo menos 2 letras', () => {
    expect(validarCampo('nome', ' A ')).toBe('Escreva seu nome completo.')
    expect(validarCampo('nome', 'Ana')).toBeNull()
  })

  it('e-mail precisa do @ e do domínio', () => {
    expect(validarCampo('email', 'ana@email')).toBe('Confira o e-mail: falta o @ ou o domínio (ex.: nome@email.com).')
    expect(validarCampo('email', ' ana@email.com ')).toBeNull()
  })

  it('CPF precisa ser válido', () => {
    expect(validarCampo('cpf', '123.456.789-00')).toBe('Confira o CPF: os números não formam um CPF válido.')
    expect(validarCampo('cpf', '529.982.247-25')).toBeNull()
  })

  it('senha precisa do tamanho mínimo', () => {
    expect(validarCampo('senha', '12345')).toBe('A senha precisa de pelo menos 6 caracteres.')
    expect(validarCampo('senha', '123456')).toBeNull()
  })
})
