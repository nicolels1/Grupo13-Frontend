// mesma regra do backend para o link do botão do slide: uma página da própria loja, começando com /
// ("//outro-site" também leva para fora, então não vale). Conferida antes de enviar para avisar na hora
export function problemaDoLink(link: string) {
  const texto = link.trim()
  if (!texto.startsWith('/') || texto.startsWith('//')) return 'O link precisa ser uma página da loja, começando com / (ex.: /loja/produtos).'
  return null
}

// troca a ordem de dois slides vizinhos: devolve as duas alterações que a API precisa receber
export function trocarOrdem<T extends { id_destaque: number; ordem: number }>(slides: T[], indice: number, direcao: -1 | 1) {
  const atual = slides[indice]
  const vizinho = slides[indice + direcao]
  if (!atual || !vizinho) return []
  return [
    { id_destaque: atual.id_destaque, ordem: vizinho.ordem },
    { id_destaque: vizinho.id_destaque, ordem: atual.ordem },
  ]
}
