import { describe, expect, it } from 'vitest'

import type { Esquema } from '@/lib/api'
import { variantePronta } from './pecaDoLink'

function variante(id_variante: number, ativo = true, disponivel: boolean | null = true) {
  return { id_variante, id_produto: 5, sku: `CAM-${id_variante}`, ean: '2000000000000', cor: 'Azul', tamanho: 'M',
    preco: '99.90', ativo, disponivel }
}

const PRODUTO = {
  id_produto: 5, id_categoria: 1, nome: 'Camisa', descricao_tecnica: null, descricao_cliente: 'Camisa de botão',
  marca: 'lorenzi', ativo: true, imagens: [],
  variantes: [variante(50), variante(51, true, false), variante(52, false), variante(53, true, null)],
} as unknown as Esquema<'ProdutoSaida'>

describe('variantePronta', () => {
  it('só aceita a variante ativa do produto com estoque para o site', () => {
    expect(variantePronta(PRODUTO, 50)?.id_variante).toBe(50)
    expect(variantePronta(PRODUTO, 51)).toBeNull() // esgotou
    expect(variantePronta(PRODUTO, 52)).toBeNull() // desativada
    expect(variantePronta(PRODUTO, 53)).toBeNull() // disponibilidade não consultada
    expect(variantePronta(PRODUTO, 99)).toBeNull() // não é deste produto
  })
})
