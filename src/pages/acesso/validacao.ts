import { soDigitos } from '@/lib/formato'

// regras dos formulários de conta: o backend confere de novo, aqui é só para avisar antes de enviar

export const SENHA_MINIMA = 6

// dígitos verificadores do CPF
export function cpfValido(texto: string) {
  const d = soDigitos(texto)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (ate: number) => {
    const soma = [...d.slice(0, ate)].reduce((total, n, i) => total + Number(n) * (ate + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

export type CamposCadastro = { nome: string; email: string; cpf: string; senha: string }

export function validarCampo(campo: keyof CamposCadastro, valor: string): string | null {
  if (campo === 'nome' && valor.trim().length < 2) return 'Escreva seu nome completo.'
  if (campo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor.trim())) return 'Confira o e-mail: falta o @ ou o domínio (ex.: nome@email.com).'
  if (campo === 'cpf' && !cpfValido(valor)) return 'Confira o CPF: os números não formam um CPF válido.'
  if (campo === 'senha' && valor.length < SENHA_MINIMA) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  return null
}
