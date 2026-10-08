import { describe, expect, it } from 'vitest'

import { dataCurta, dataHora, mascaraCpf, moeda, plural, soDigitos, tamanhoArquivo } from './formato'

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
