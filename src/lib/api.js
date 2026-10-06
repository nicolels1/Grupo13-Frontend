import { supabase } from './supabaseClient'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

// erro de uma chamada à API; `mensagem` já vem pronta para mostrar na tela
export class ErroApi extends Error {
  constructor(status, mensagem, corpo) {
    super(mensagem)
    this.status = status
    this.corpo = corpo
  }
}

// o backend responde {"detail": "..."}; na validação (422) o detail é uma lista de erros
function mensagemDoErro(corpo, status) {
  const detalhe = corpo?.detail
  if (typeof detalhe === 'string') return detalhe
  if (Array.isArray(detalhe) && detalhe.length > 0) {
    return detalhe.map((erro) => String(erro.msg ?? '').replace(/^Value error, /, '')).join('; ')
  }
  if (status >= 500) return 'Erro no servidor. Tente de novo em instantes.'
  return 'Não foi possível concluir a operação.'
}

/**
 * Chama a API do backend.
 *   api('/produtos', { params: { ativo: true } })
 *   api('/categorias', { metodo: 'POST', corpo: { nome: 'Camisas' } })
 * Envia o token do Supabase (se houver sessão) e lança ErroApi quando a resposta não é 2xx.
 */
export async function api(caminho, { metodo = 'GET', corpo, params, autenticado = true } = {}) {
  const url = new URL(BASE + caminho)
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, valor)
  }

  const headers = {}
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (autenticado) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let resposta
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira sua internet e tente de novo.')
  }

  if (resposta.status === 204) return null
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) throw new ErroApi(resposta.status, mensagemDoErro(dados, resposta.status), dados)
  return dados
}
