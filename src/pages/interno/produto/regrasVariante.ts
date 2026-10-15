import type { Esquema } from '@/lib/api'

type Canal = Esquema<'EstoqueItem'>['canal']
// estoque inicial de uma variação nova: onde e quanto, como digitado
type EstoqueInicial = { id_unidade: string; canal: Canal; quantidade: string }
type VarianteNova = { cor: string; tamanho: string; sku: string; preco: string; estoque_inicial: EstoqueInicial[] }

// variações do produto: a linha vazia do formulário e o formato que a API espera

export const VARIANTE_VAZIA: VarianteNova = { cor: '', tamanho: '', sku: '', preco: '', estoque_inicial: [] }

// linha da lista de variações do produto novo: a chave fixa mantém cada linha no lugar quando uma do meio sai
export const novaLinha = () => ({ ...VARIANTE_VAZIA, chave: crypto.randomUUID() })

// a API recebe a variante nova com o estoque inicial já em números
export function varianteParaApi(v: VarianteNova) {
  return {
    cor: v.cor.trim() || 'Única',
    tamanho: v.tamanho.trim() || 'U',
    sku: v.sku,
    preco: v.preco,
    estoque_inicial: v.estoque_inicial
      .filter((e) => e.id_unidade && Number(e.quantidade) > 0)
      .map((e) => ({ id_unidade: Number(e.id_unidade), canal: e.canal, quantidade: Number(e.quantidade) })),
  }
}
