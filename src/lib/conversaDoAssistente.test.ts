import { describe, expect, it } from 'vitest'

import { separarConversa } from './conversaDoAssistente'

describe('separarConversa', () => {
  it('separa o resumo confirmado da conversa com o assistente', () => {
    const descricao = 'Quer trocar a camisa pelo G.\n\nConversa com o assistente:\nCliente: quero trocar\nAssistente: Qual tamanho?'

    expect(separarConversa(descricao)).toEqual({
      resumo: 'Quer trocar a camisa pelo G.',
      conversa: [
        { de: 'cliente', texto: 'quero trocar' },
        { de: 'assistente', texto: 'Qual tamanho?' },
      ],
    })
  })

  it('junta a fala que tinha quebra de linha', () => {
    const descricao = 'Resumo\n\nConversa com o assistente:\nAssistente: Temos duas lojas:\nPinheiros\nSavassi\nCliente: ok'

    expect(separarConversa(descricao).conversa).toEqual([
      { de: 'assistente', texto: 'Temos duas lojas:\nPinheiros\nSavassi' },
      { de: 'cliente', texto: 'ok' },
    ])
  })

  it('chamado aberto pelo site fica só com o resumo', () => {
    expect(separarConversa('Quero o tamanho M')).toEqual({ resumo: 'Quero o tamanho M', conversa: [] })
  })
})
