import { describe, expect, it } from 'vitest'

import { agruparOrigem, nomeDaFonte, nomeDoCampo, valorOriginal } from './origemMigracao'
import { ORIGEM_PEDIDO_DE_TESTE, ORIGEM_VARIANTE_DE_TESTE } from './vultoDeTeste'

describe('agruparOrigem', () => {
  it('junta os campos mudados embaixo da linha de origem de onde vieram', () => {
    const linhas = agruparOrigem(ORIGEM_VARIANTE_DE_TESTE)
    expect(linhas.map((l) => l.linha)).toEqual(['Verão 26!402', 'Atemporais!88'])
    expect(linhas[0]).toMatchObject({ decisao: 'C13', mudancas: [{ campo: 'sku', valor: 'MOL001MG', decisao: 'J2' }, { campo: 'cor' }] })
    expect(linhas[1]?.mudancas.map((m) => m.decisao)).toEqual(['C1', 'C12', 'C3'])
  })

  it('não precisa da linha sem campo para montar a linha de origem', () => {
    const [linha] = agruparOrigem([{ fonte: 'vulto.db', linha_origem: 'vendas#9', campo: 'status', valor_original: 'PAGO', decisao: 'V13' }])
    expect(linha).toEqual({ fonte: 'vulto.db', linha: 'vendas#9', decisao: null, mudancas: [{ campo: 'status', valor: 'PAGO', decisao: 'V13' }] })
  })

  it('devolve lista vazia para o registro que não veio da migração', () => {
    expect(agruparOrigem([])).toEqual([])
  })
})

describe('valorOriginal', () => {
  it('mostra o preço e o valor da venda em reais', () => {
    expect(valorOriginal('preco', '319.90')).toMatch(/^R\$\s319,90$/)
    const [linha] = agruparOrigem(ORIGEM_PEDIDO_DE_TESTE)
    expect(linha?.mudancas[0]?.valor).toMatch(/^R\$\s31\.490,00$/)
  })

  it('escreve o vazio, que a planilha tinha em branco', () => {
    expect(valorOriginal('aceita_mensagem', '')).toBe('(vazio)')
    expect(valorOriginal('telefone', null)).toBe('(vazio)')
  })
})

describe('nomes', () => {
  it('troca o arquivo e o campo pelo nome que a equipe conhece', () => {
    expect(nomeDaFonte('vulto.db')).toBe('Sistema da Vulto')
    expect(nomeDaFonte('outro.csv')).toBe('outro.csv')
    expect(nomeDoCampo('ean')).toBe('Código de barras')
    expect(nomeDoCampo('valor_frete')).toBe('valor frete')
  })
})
