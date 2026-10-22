import { afterAll, describe, expect, it, vi } from 'vitest'

// site publicado sem o VITE_API_URL: o aviso sai no console ao abrir e cada chamada traz a mensagem clara,
// sem tentar a rede (o endereço é lido quando o módulo carrega, por isso este arquivo à parte)
const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }))
vi.mock('./supabaseClient', () => ({ supabase: { auth } }))
vi.mock('@/config/ambiente', () => ({ API_URL: '' }))

const avisoNoConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
const buscar = vi.fn()
vi.stubGlobal('fetch', buscar)

const { api, ErroApi, todasAsPaginas } = await import('./api')
// o vitest zera o histórico dos mocks antes de cada teste: guarda o que saiu ao carregar
const avisosAoCarregar = [...avisoNoConsole.mock.calls]

describe('api sem o VITE_API_URL', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
    avisoNoConsole.mockRestore()
  })

  it('avisa no console ao abrir o site', () => {
    expect(avisosAoCarregar).toEqual([[expect.stringContaining('VITE_API_URL')]])
  })

  it('a chamada falha com a mensagem da configuração, sem ir à rede', async () => {
    const falha = api('/me').catch((erro: unknown) => erro)
    expect(await falha).toBeInstanceOf(ErroApi)
    await expect(api('/me')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('VITE_API_URL') })
    await expect(todasAsPaginas('/estoque')).rejects.toThrow('não foi configurado')
    expect(buscar).not.toHaveBeenCalled()
    expect(auth.getSession).not.toHaveBeenCalled()
  })
})
