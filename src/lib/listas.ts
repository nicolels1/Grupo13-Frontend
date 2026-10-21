import { api, type Esquema } from './api'
import { useCarregar } from './useCarregar'

type Unidade = Esquema<'UnidadeSaida'>
type Categoria = Esquema<'CategoriaSaida'>
type ItemEstoque = Esquema<'EstoqueItem'>

// listas curtas e públicas (unidades, categorias) buscadas uma vez por sessão do navegador.
// `limparListas` descarta o cache depois de uma alteração na Gestão ou no Catálogo; as categorias
// de cada loja (categorias:vulto) saem junto com as categorias
type ChaveLista = 'unidades' | 'categorias'
const cache = new Map<string, Promise<unknown>>()

function buscarUmaVez<T>(chave: string, caminho: string, params?: Record<string, string>): Promise<T[]> {
  const guardada = cache.get(chave)
  if (guardada) return guardada as Promise<T[]>
  const promessa = api<{ items: T[] }>(caminho, { params })
    .then((r) => r.items)
    .catch((erro: unknown) => {
      cache.delete(chave)
      throw erro
    })
  cache.set(chave, promessa)
  return promessa
}

export function limparListas(...chaves: ChaveLista[]) {
  for (const guardada of [...cache.keys()]) {
    if (chaves.some((chave) => guardada === chave || guardada.startsWith(`${chave}:`))) cache.delete(guardada)
  }
}

export function useUnidades() {
  return useCarregar(() => buscarUmaVez<Unidade>('unidades', '/unidades'), [])
}

// sem marca, todas as categorias; com a marca, só as que têm peça à venda nessa loja (o menu da vitrine)
export function useCategorias(marca?: string) {
  return useCarregar(
    () => (marca ? buscarUmaVez<Categoria>(`categorias:${marca}`, '/categorias', { marca }) : buscarUmaVez<Categoria>('categorias', '/categorias')),
    [marca],
  )
}

// nome da unidade pelo id, a partir da lista já carregada
export function nomeUnidade(unidades: Unidade[] | null | undefined, id: number | null | undefined) {
  if (id === null || id === undefined) return '—'
  return unidades?.find((u) => u.id_unidade === id)?.nome ?? `Unidade ${id}`
}

// dados de exibição (produto, cor, tamanho, SKU) das variantes, pelo estoque da rede.
// A transferência só traz o id da variante; uma consulta por variante, guardada em cache.
const variantes: Record<number, Promise<ItemEstoque | null>> = {}

export function buscarVariante(idVariante: number): Promise<ItemEstoque | null> {
  const guardada = variantes[idVariante]
  if (guardada) return guardada
  const promessa = api<Esquema<'Pagina_EstoqueItem_'>>('/estoque', { params: { id_variante: idVariante, limit: 1 } })
    .then((r) => r.items[0] ?? null)
    .catch(() => {
      delete variantes[idVariante]
      return null
    })
  variantes[idVariante] = promessa
  return promessa
}

export function useVariantes(ids: number[]) {
  const chave = [...new Set(ids)].sort((a, b) => a - b).join(',')
  return useCarregar(async () => {
    const lista = chave ? chave.split(',').map(Number) : []
    const achadas = await Promise.all(lista.map(buscarVariante))
    return Object.fromEntries(lista.map((id, i) => [id, achadas[i] ?? null])) as Record<number, ItemEstoque | null>
  }, [chave])
}
