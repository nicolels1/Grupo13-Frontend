import { api } from './api'
import { useCarregar } from './useCarregar'

// listas curtas e públicas (unidades, categorias) buscadas uma vez por sessão do navegador.
// `limparListas` descarta o cache depois de uma alteração na Gestão ou no Catálogo.
const cache = {}

function buscarUmaVez(chave, caminho) {
  if (!cache[chave]) {
    cache[chave] = api(caminho).then((r) => r.items).catch((erro) => {
      delete cache[chave]
      throw erro
    })
  }
  return cache[chave]
}

export function limparListas(...chaves) {
  for (const chave of chaves) delete cache[chave]
}

export function useUnidades() {
  return useCarregar(() => buscarUmaVez('unidades', '/unidades'), [])
}

export function useCategorias() {
  return useCarregar(() => buscarUmaVez('categorias', '/categorias'), [])
}

// nome da unidade pelo id, a partir da lista já carregada
export function nomeUnidade(unidades, id) {
  if (id === null || id === undefined) return '—'
  return unidades?.find((u) => u.id_unidade === id)?.nome ?? `Unidade ${id}`
}

// dados de exibição (produto, cor, tamanho, SKU) das variantes, pelo estoque da rede.
// A transferência só traz o id da variante; uma consulta por variante, guardada em cache.
const variantes = {}

export function buscarVariante(idVariante) {
  if (!variantes[idVariante]) {
    variantes[idVariante] = api('/estoque', { params: { id_variante: idVariante, limit: 1 } })
      .then((r) => r.items[0] ?? null)
      .catch(() => {
        delete variantes[idVariante]
        return null
      })
  }
  return variantes[idVariante]
}

export function useVariantes(ids) {
  const chave = [...new Set(ids)].sort((a, b) => a - b).join(',')
  return useCarregar(async () => {
    const lista = chave ? chave.split(',').map(Number) : []
    const achadas = await Promise.all(lista.map(buscarVariante))
    return Object.fromEntries(lista.map((id, i) => [id, achadas[i]]))
  }, [chave])
}
