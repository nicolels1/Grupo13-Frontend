// @vitest-environment jsdom
// o cache de variantes acompanha a pessoa logada: sair ou trocar de conta descarta o que a anterior viu
// (o estoque vem filtrado pelas marcas dela); renovar o token não
import { act, cleanup, render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AoMudar = (evento: string, sessao: Session | null) => void

const api = vi.fn()
let avisarSupabase: AoMudar = () => {}
let sessaoSalva: Session | null = null
vi.mock('@/lib/api', async (original) => ({ ...(await original<typeof import('@/lib/api')>()), api }))
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: sessaoSalva } }),
      onAuthStateChange: (aoMudar: AoMudar) => {
        avisarSupabase = aoMudar
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
  },
}))

const { AuthProvider } = await import('./AuthProvider')
const { useAuth } = await import('./contexto')
const { buscarVariante, limparVariantes } = await import('@/lib/listas')

const sessao = (id: string) => ({ user: { id } }) as Session

function QuemEsta() {
  const { sessao: atual } = useAuth()
  return <p>{atual === undefined ? 'lendo' : (atual?.user.id ?? 'ninguém')}</p>
}

// cada conta vê a variante 7 com o SKU da marca dela
function responder(caminho: string) {
  if (caminho === '/me') return Promise.resolve({ id_usuario: 'x', tipo_conta: 'interna', permissoes: [] })
  return Promise.resolve({ items: [{ id_variante: 7, sku: `visto-por-${api.mock.calls.length}` }] })
}

async function abrirComo(id: string) {
  sessaoSalva = sessao(id)
  render(<AuthProvider><QuemEsta /></AuthProvider>)
  expect(await screen.findByText(id)).toBeTruthy()
}

async function avisar(evento: string, nova: Session | null) {
  await act(async () => avisarSupabase(evento, nova))
}

const consultasDoEstoque = () => api.mock.calls.filter(([caminho]) => caminho === '/estoque').length

describe('AuthProvider e o cache de variantes', () => {
  beforeEach(() => {
    limparVariantes()
    api.mockImplementation(responder)
  })

  afterEach(() => {
    cleanup()
    api.mockReset()
  })

  it('renovar o token da mesma pessoa mantém o cache', async () => {
    await abrirComo('ana')
    const daAna = await buscarVariante(7)
    await avisar('TOKEN_REFRESHED', sessao('ana'))
    expect(await buscarVariante(7)).toBe(daAna)
    expect(consultasDoEstoque()).toBe(1)
  })

  it('sair descarta as variantes de quem estava logado', async () => {
    await abrirComo('ana')
    const daAna = await buscarVariante(7)
    await avisar('SIGNED_OUT', null)
    expect(screen.getByText('ninguém')).toBeTruthy()
    expect(await buscarVariante(7)).not.toEqual(daAna)
    expect(consultasDoEstoque()).toBe(2)
  })

  it('trocar de conta sem sair consulta de novo com a conta nova', async () => {
    await abrirComo('ana')
    const daAna = await buscarVariante(7)
    await avisar('SIGNED_IN', sessao('bruno'))
    expect(screen.getByText('bruno')).toBeTruthy()
    expect(await buscarVariante(7)).not.toEqual(daAna)
    expect(consultasDoEstoque()).toBe(2)
  })
})
