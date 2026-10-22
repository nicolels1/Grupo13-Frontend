import { afterEach, describe, expect, it, vi } from 'vitest'

// o cliente do Supabase e o endereço da API vêm do .env: aqui os dois são de mentira
const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }))
vi.mock('./supabaseClient', () => ({ supabase: { auth } }))
vi.mock('@/config/ambiente', () => ({ API_URL: 'http://api.teste' }))

const { api, mensagemDoErro, SESSAO_VENCIDA } = await import('./api')

describe('mensagemDoErro', () => {
  it('usa o texto que o backend mandou', () => {
    expect(mensagemDoErro({ detail: 'Pedido não encontrado' }, 404)).toBe('Pedido não encontrado')
  })

  it('mostra o nome da marca e o que fazer no 403 de marca', () => {
    expect(mensagemDoErro({ detail: 'Sem acesso à marca vulto' }, 403))
      .toBe('Isto é da Vulto, que você não vê. Peça ao Admin a permissão de ver essa marca.')
    expect(mensagemDoErro({ detail: 'Savassi é da marca lorenzi: só guarda peças dessa marca' }, 422))
      .toBe('Savassi é da marca Casa Lorenzi: só guarda peças dessa marca')
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

describe('api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const resposta = (status: number, corpo: unknown) => vi.fn().mockResolvedValue({ status, ok: status < 300, json: async () => corpo })
  const comSessao = () => auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-teste' } } })

  it('manda o token e devolve os dados', async () => {
    comSessao()
    const buscar = resposta(200, { nome: 'Ana' })
    vi.stubGlobal('fetch', buscar)
    expect(await api('/me')).toEqual({ nome: 'Ana' })
    expect(buscar.mock.calls[0]![1].headers.Authorization).toBe('Bearer token-de-teste')
  })

  it('token recusado encerra a sessão local e avisa', async () => {
    comSessao()
    vi.stubGlobal('fetch', resposta(401, { detail: 'Token inválido' }))
    await expect(api('/me')).rejects.toMatchObject({ status: 401, message: SESSAO_VENCIDA })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('401 sem token (ex.: login por CPF errado) não mexe na sessão', async () => {
    vi.stubGlobal('fetch', resposta(401, { detail: 'CPF ou senha inválidos' }))
    await expect(api('/login/cpf', { metodo: 'POST', corpo: {}, autenticado: false })).rejects.toThrow('CPF ou senha inválidos')
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})
