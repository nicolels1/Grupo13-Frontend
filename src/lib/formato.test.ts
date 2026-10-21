import { afterEach, describe, expect, it, vi } from 'vitest'

import { dataCurta, dataHora, diasAtras, mascaraCpf, moeda, moedaCurta, nomeDoMetodo, numero, plural, soDigitos, tamanhoArquivo } from './formato'

describe('moeda', () => {
  it('mostra o valor da API em reais', () => {
    expect(moeda('349.90')).toMatch(/^R\$\s349,90$/)
    expect(moeda(1299.6)).toMatch(/^R\$\s1\.299,60$/)
  })

  it('mostra um traço quando não há valor', () => {
    expect(moeda(null)).toBe('—')
    expect(moeda('')).toBe('—')
  })
})

describe('nomeDoMetodo', () => {
  it('dá nome aos métodos do caixa e ao do pagamento migrado sem método', () => {
    expect(nomeDoMetodo('cartao_credito')).toBe('Cartão de crédito')
    expect(nomeDoMetodo('nao_informado')).toBe('Método não informado')
    expect(nomeDoMetodo('boleto')).toBe('boleto')
  })
})

describe('moedaCurta', () => {
  it('mostra milhares com uma casa e o resto sem centavos', () => {
    expect(moedaCurta(4230)).toBe('R$ 4,2 mil')
    expect(moedaCurta(999.6)).toBe('R$ 1.000')
    expect(moedaCurta(350)).toBe('R$ 350')
  })
})

describe('numero', () => {
  it('separa milhares com ponto e decimais com vírgula', () => {
    expect(numero(1234)).toBe('1.234')
    expect(numero(4.56, 1)).toBe('4,6')
  })

  it('com casas fixas mostra o zero', () => {
    expect(numero(4, 1)).toBe('4')
    expect(numero(4, 1, true)).toBe('4,0')
  })
})

describe('datas no horário de Brasília', () => {
  // 02:30 em UTC ainda é o dia anterior em Brasília (UTC-3)
  const madrugadaUtc = '2026-10-08T02:30:00Z'

  it('usa o dia de Brasília, não o de UTC', () => {
    expect(dataCurta(madrugadaUtc)).toBe('7 de out')
    expect(dataHora(madrugadaUtc)).toBe('07/10 23:30')
  })

  it('mostra um traço quando não há data', () => {
    expect(dataCurta(null)).toBe('—')
    expect(dataHora(undefined)).toBe('—')
  })
})

describe('diasAtras', () => {
  afterEach(() => vi.useRealTimers())

  it('calcula datas de calendário a partir do dia de Brasília', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T16:00:00Z'))

    expect(diasAtras(0)).toBe('2026-10-08')
    expect(diasAtras(7)).toBe('2026-10-01')
  })
})

describe('plural', () => {
  it('escolhe singular ou plural pelo número', () => {
    expect(plural(1, 'pedido')).toBe('1 pedido')
    expect(plural(3, 'pedido')).toBe('3 pedidos')
    expect(plural(0, 'pendência', 'pendências')).toBe('0 pendências')
  })

  it('separa os milhares', () => {
    expect(plural(1200, 'peça')).toBe('1.200 peças')
  })
})

describe('CPF', () => {
  it('guarda só os números', () => {
    expect(soDigitos('123.456.789-09')).toBe('12345678909')
  })

  it('põe a máscara enquanto a pessoa digita', () => {
    expect(mascaraCpf('123')).toBe('123')
    expect(mascaraCpf('1234')).toBe('123.4')
    expect(mascaraCpf('1234567')).toBe('123.456.7')
    expect(mascaraCpf('12345678909')).toBe('123.456.789-09')
  })

  it('aceita colar com pontos e corta no 11º número', () => {
    expect(mascaraCpf('123.456.789-0912')).toBe('123.456.789-09')
  })
})

describe('tamanhoArquivo', () => {
  it('mostra KB abaixo de 1 MB e MB acima', () => {
    expect(tamanhoArquivo(820 * 1024)).toBe('820 KB')
    expect(tamanhoArquivo(2.4 * 1024 * 1024)).toBe('2,4 MB')
  })

  it('não mostra nada sem tamanho', () => {
    expect(tamanhoArquivo(0)).toBe('')
  })
})
