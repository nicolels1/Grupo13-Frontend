// enquanto não há fotos dos produtos, a peça aparece como um bloco na cor dela (como no design)
const CORES = {
  areia: '#d6cab5',
  'off-white': '#eae6de',
  branco: '#edebe7',
  bege: '#dad0bf',
  caramelo: '#bfa38b',
  camelo: '#bfa38b',
  terracota: '#c59a87',
  rosa: '#c7a08e',
  vinho: '#9a7c7c',
  'verde-oliva': '#a3a189',
  verde: '#a3a189',
  'azul claro': '#c7cfd5',
  azul: '#8a9bb3',
  marinho: '#4a5670',
  cinza: '#bfbdba',
  grafite: '#757983',
  preto: '#3a3a3a',
}

const NEUTRAS = ['#dad0bf', '#c7cfd5', '#bfa38b', '#eae6de', '#a3a189', '#c59a87', '#9a7c7c']

function normalizar(texto) {
  return String(texto ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function corDaPeca(cor, semente = 0) {
  const chave = normalizar(cor)
  if (CORES[chave]) return CORES[chave]
  const parcial = Object.keys(CORES).find((nome) => chave.includes(nome))
  if (parcial) return CORES[parcial]
  // cor sem mapa: um tom neutro estável para a mesma peça
  const soma = [...chave].reduce((total, letra) => total + letra.charCodeAt(0), Number(semente) || 0)
  return NEUTRAS[soma % NEUTRAS.length]
}

// cores e tamanhos distintos das variantes, na ordem em que aparecem
export function coresDoProduto(produto) {
  return [...new Set((produto?.variantes ?? []).map((v) => v.cor))]
}

const ORDEM_TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U']

export function ordenarTamanhos(tamanhos) {
  return [...tamanhos].sort((a, b) => {
    const ia = ORDEM_TAMANHOS.indexOf(a)
    const ib = ORDEM_TAMANHOS.indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1
    return String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
  })
}

export function faixaDePreco(produto) {
  const precos = (produto?.variantes ?? []).filter((v) => v.ativo !== false).map((v) => Number(v.preco))
  if (precos.length === 0) return null
  return { menor: Math.min(...precos), maior: Math.max(...precos) }
}
