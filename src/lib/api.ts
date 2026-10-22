import { API_URL } from '@/config/ambiente'
import { MARCAS } from './formato'
import { supabase } from './supabaseClient'
import type { components } from './tiposApi'

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

// o backend fala da marca pelo código ("Sem acesso à marca vulto", "Savassi é da marca lorenzi: ...");
// a tela mostra o nome, e o 403 de marca diz o que fazer
function traduzirMarcas(detalhe: string): string {
  const semAcesso = detalhe.match(/^Sem acesso à marca (.+)$/)
  if (semAcesso?.[1]) {
    const marcas = semAcesso[1].split(' e ').map((m) => MARCAS[m] ?? m).join(' e ')
    return `Isto é da ${marcas}, que você não vê. Peça ao Admin a permissão de ver essa marca.`
  }
  if (detalhe === 'Sem acesso a nenhuma marca') return 'Sua conta não vê nenhuma marca. Peça ao Admin a permissão de ver a Casa Lorenzi ou a Vulto.'
  return detalhe.replace(/\bmarca (lorenzi|vulto)\b/g, (_, m: string) => `marca ${MARCAS[m]}`)
}

// o backend responde {"detail": "..."}; na validação (422) o detail é uma lista de erros
export function mensagemDoErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail
  if (typeof detalhe === 'string') return traduzirMarcas(detalhe)
  if (Array.isArray(detalhe) && detalhe.length > 0) {
    return detalhe
      .map((erro: { msg?: unknown }) => String(erro.msg ?? '').replace(/^Value error, /, ''))
      .join('; ')
  }
  if (status >= 500) return 'Erro no servidor. Tente de novo em instantes.'
  return 'Não foi possível concluir a operação.'
}

export const SESSAO_VENCIDA = 'Sua sessão expirou. Entre de novo para continuar.'

// o VITE_API_URL é gravado no build: vazio ou sem http(s) quebraria todas as chamadas com um erro genérico.
// Devolve o que está errado (null = endereço certo)
export function erroDoEnderecoDaApi(endereco: string): string | null {
  const onde = 'Preencha no .env (ou na Vercel, e publique de novo) o endereço completo, ex.: https://grupo13-backend-megw.onrender.com'
  if (!endereco.trim()) return `O endereço da API (VITE_API_URL) não foi configurado. ${onde}`
  let url: URL
  try {
    url = new URL(endereco)
  } catch {
    return `O endereço da API (VITE_API_URL) é inválido: "${endereco}". ${onde}`
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `O endereço da API (VITE_API_URL) precisa começar com http:// ou https://: "${endereco}". ${onde}`
  }
  return null
}

// conferido uma vez, ao abrir o site: avisa no console e cada chamada mostra a mensagem na tela
const ERRO_DE_CONFIGURACAO = erroDoEnderecoDaApi(API_URL)
if (ERRO_DE_CONFIGURACAO) console.error(ERRO_DE_CONFIGURACAO)

type ValorSimples = string | number | boolean | null | undefined
// uma lista repete o parâmetro na URL (?tamanho=P&tamanho=M)
type ValorParametro = ValorSimples | ValorSimples[]

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
 *   api('/atendimento/chamados/7/anexos', { metodo: 'POST', corpo: formData })  // upload em multipart
 * Envia o token do Supabase (se houver sessão) e lança ErroApi quando a resposta não é 2xx.
 * Token recusado (401) encerra a sessão local.
 */
export async function api<T = unknown>(
  caminho: string,
  { metodo = 'GET', corpo, params, autenticado = true }: OpcoesApi = {},
): Promise<T> {
  if (ERRO_DE_CONFIGURACAO) throw new ErroApi(0, ERRO_DE_CONFIGURACAO)
  const url = new URL(API_URL + caminho)
  for (const [chave, valor] of Object.entries(params ?? {})) {
    for (const item of Array.isArray(valor) ? valor : [valor]) {
      if (item !== undefined && item !== null && item !== '') url.searchParams.append(chave, String(item))
    }
  }

  // FormData (upload de arquivo) vai como multipart: o navegador monta o Content-Type com o boundary
  const multipart = corpo instanceof FormData
  const headers: Record<string, string> = {}
  if (corpo !== undefined && !multipart) headers['Content-Type'] = 'application/json'
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
      body: corpo === undefined ? undefined : multipart ? corpo : JSON.stringify(corpo),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Confira sua internet e tente de novo.')
  }

  // 204 não tem corpo: quem chama uma rota assim usa api<null>
  if (resposta.status === 204) return null as T
  const dados: unknown = await resposta.json().catch(() => null)
  // token enviado e recusado (vencido ou inválido): a sessão não vale mais. Sair desta aba leva quem
  // está numa página protegida ao /entrar, que volta para a mesma página depois do login
  if (resposta.status === 401 && headers.Authorization) {
    void supabase.auth.signOut({ scope: 'local' })
    throw new ErroApi(401, SESSAO_VENCIDA, dados)
  }
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
