import { supabase } from './supabaseClient'
import type { components } from './tiposApi'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

// formato de um schema da API pelo nome, gerado do OpenAPI do backend (npm run tipos:api)
//   type Perfil = Esquema<'Perfil'>
export type Esquema<Nome extends keyof components['schemas']> = components['schemas'][Nome]

// erro de uma chamada à API; `message` já vem pronta para mostrar na tela
export class ErroApi extends Error {
  status: number
  corpo: unknown

  constructor(status: number, mensagem: string, corpo?: unknown) {
    super(mensagem)
    this.status = status
    this.corpo = corpo
  }
}

// o backend responde {"detail": "..."}; na validação (422) o detail é uma lista de erros
function mensagemDoErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail
  if (typeof detalhe === 'string') return detalhe
  if (Array.isArray(detalhe) && detalhe.length > 0) {
    return detalhe
      .map((erro: { msg?: unknown }) => String(erro.msg ?? '').replace(/^Value error, /, ''))
      .join('; ')
  }
  if (status >= 500) return 'Erro no servidor. Tente de novo em instantes.'
  return 'Não foi possível concluir a operação.'
}

type ValorParametro = string | number | boolean | null | undefined

export type OpcoesApi = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  corpo?: unknown
  params?: Record<string, ValorParametro>
  autenticado?: boolean
}

/**
 * Chama a API do backend.
 *   api<Esquema<'Lista_UnidadeSaida_'>>('/unidades')
 *   api('/categorias', { metodo: 'POST', corpo: { nome: 'Camisas' } })
 * Envia o token do Supabase (se houver sessão) e lança ErroApi quando a resposta não é 2xx.
 */
export async function api<T = unknown>(
  caminho: string,
  { metodo = 'GET', corpo, params, autenticado = true }: OpcoesApi = {},
): Promise<T> {
  const url = new URL(BASE + caminho)
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, String(valor))
  }

  const headers: Record<string, string> = {}
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (autenticado) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let resposta: Response
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira sua internet e tente de novo.')
  }

  // 204 não tem corpo: quem chama uma rota assim usa api<null>
  if (resposta.status === 204) return null as T
  const dados: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) throw new ErroApi(resposta.status, mensagemDoErro(dados, resposta.status), dados)
  return dados as T
}

const LIMITE_MAXIMO = 200

/**
 * Busca todas as páginas de uma lista paginada ({ items, total }) e junta os itens.
 *   const linhas = await todasAsPaginas<Esquema<'EstoqueItem'>>('/estoque', { id_unidade: 3 })
 * A primeira página diz o total; as outras vão em paralelo.
 */
export async function todasAsPaginas<T>(caminho: string, params: OpcoesApi['params'] = {}): Promise<T[]> {
  type Pagina = { items: T[]; total: number }
  const primeira = await api<Pagina>(caminho, { params: { ...params, limit: LIMITE_MAXIMO, offset: 0 } })
  const offsets: number[] = []
  for (let offset = LIMITE_MAXIMO; offset < primeira.total; offset += LIMITE_MAXIMO) offsets.push(offset)
  const resto = await Promise.all(offsets.map((offset) => api<Pagina>(caminho, { params: { ...params, limit: LIMITE_MAXIMO, offset } })))
  return [primeira, ...resto].flatMap((pagina) => pagina.items)
}
