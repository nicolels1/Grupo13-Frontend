import type { AuthError } from '@supabase/supabase-js'

// erros do Supabase Auth em português, para mostrar direto na tela

export function erroDoLogin(erro: AuthError) {
  const mensagem = erro.message
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha inválidos'
  if (mensagem.includes('Email not confirmed')) return 'E-mail ainda não confirmado'
  if (erro.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo'
  return 'Não foi possível entrar. Tente de novo.'
}

export function erroDoLinkDeSenha(erro: AuthError) {
  if (erro.status === 429) return 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.'
  return 'Não foi possível enviar o link. Tente de novo.'
}

export function erroDaTrocaDeSenha(erro: AuthError) {
  if (erro.code === 'same_password') return 'A nova senha precisa ser diferente da anterior.'
  return 'Não foi possível salvar a senha. Tente de novo.'
}
