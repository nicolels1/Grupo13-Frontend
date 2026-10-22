import { useState, type FormEvent } from 'react'
import { cn } from 'cn'

import { Aviso } from '@/components/Estados'
import { Abas } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { BLOCO_ACO } from '../componentes/estilos'
import { dataCurta, mascaraCpf, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { motivoBloqueio, prazoTroca, repartirEstorno, type ModoTroca, type TrocaFeita } from './regrasTrocaDevolucao'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

// formulário de troca e devolução de um pedido entregue, no balcão do Caixa
// (POST /balcao/pedidos/{id}/...) e no chamado do Atendimento (POST /atendimento/chamados/{id}/...).
// `rota` é a base do POST; `aoConcluir` recebe o que foi feito, para o comprovante do balcão ou o
// aviso no chamado.
type Pedido = Esquema<'PedidoSaida'>
type ItemPedido = Esquema<'ItemPedidoSaida'>
type ItemEstoque = Esquema<'EstoqueItem'>

export function AtenderPedido({
  pedido, loja, rota, modoInicial = 'troca', comAbas = true, comCabecalho = true, dicaSemEstorno, aoConcluir,
}: {
  pedido: Pedido
  loja: Esquema<'UnidadeSaida'>
  rota: string
  modoInicial?: ModoTroca
  comAbas?: boolean
  comCabecalho?: boolean
  dicaSemEstorno?: string
  aoConcluir: (feito: TrocaFeita) => void
}) {
  const [modo, setModo] = useState<ModoTroca>(modoInicial)
  // quantidade escolhida e variante nova de cada item, por id_item
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [novas, setNovas] = useState<Record<number, string>>({})
  const { enviar, enviando, erro } = useEnviar()
  // fora do LayoutInterno (testes) não há a lista: o backend confere a marca de qualquer jeito
  const unidades = useUnidadeEscolhida()?.unidades ?? []
  const marcaDoPedido = unidades.find((u) => u.id_unidade === pedido.id_unidade)?.marca
  const bloqueio = motivoBloqueio(pedido, loja, marcaDoPedido)

  // na troca, as outras cores e tamanhos do mesmo produto com saldo na loja física desta loja
  // a lista de nomes e o motivo de bloqueio mudam de identidade a cada render: a busca depende do texto deles
  const chaveNomes = [...new Set(pedido.itens.map((i) => i.produto))].join('|')
  const bloqueada = Boolean(bloqueio)
  const opcoes = useCarregar(
    () => (modo === 'troca' && !bloqueada
      ? Promise.all(chaveNomes.split('|').map((nome) => api<Esquema<'Pagina_EstoqueItem_'>>('/balcao/estoque', {
        params: { id_unidade: loja.id_unidade, canal: 'loja_fisica', busca: nome, limit: 200 },
      }))).then((paginas) => paginas.flatMap((p) => p.items))
      : null),
    [modo, bloqueada, loja.id_unidade, chaveNomes],
  )
  const opcoesDoItem = (item: ItemPedido) => (opcoes.dados ?? []).filter((l) => l.produto === item.produto && l.id_variante !== item.id_variante && l.disponivel > 0)

  const escolhidos = pedido.itens
    .map((item) => ({ item, quantidade: Number(quantidades[item.id_item] || 0), nova: novas[item.id_item] }))
    .filter((e) => e.quantidade > 0)
  const valorDevolvido = escolhidos.reduce((t, e) => t + Number(e.item.preco_unitario) * e.quantidade, 0)
  const { estornos, falta } = repartirEstorno(pedido, valorDevolvido)

  const quantidadesOk = escolhidos.length > 0 && escolhidos.every((e) => e.quantidade <= e.item.quantidade)
  const pronto = !bloqueio && quantidadesOk && (modo === 'troca' ? escolhidos.every((e) => e.nova) : falta <= 0)

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    const itens = escolhidos.map((e) => ({
      id_variante: e.item.id_variante,
      quantidade: e.quantidade,
      ...(modo === 'troca' && { id_variante_nova: Number(e.nova) }),
    }))
    const corpo = modo === 'troca'
      ? { id_unidade: loja.id_unidade, itens }
      : { id_unidade: loja.id_unidade, itens, estornos: estornos.map(({ id_pagamento, valor }) => ({ id_pagamento, valor })) }
    const resposta = await enviar(() => api<Pedido>(`${rota}/${modo === 'troca' ? 'troca' : 'devolucao'}`, { metodo: 'POST', corpo }))
    if (!resposta) return
    const variantes: Record<string, ItemEstoque> = Object.fromEntries((opcoes.dados ?? []).map((l) => [l.id_variante, l]))
    aoConcluir({
      modo,
      pedido: resposta,
      linhas: escolhidos.map((e) => ({ ...e, nova: e.nova ? variantes[e.nova] ?? null : null })),
      estornos: modo === 'devolucao' ? estornos : [],
    })
  }

  const prazo = prazoTroca(pedido)

  return (
    <form onSubmit={registrar} className="max-w-4xl space-y-6">
      {comCabecalho && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta>{pedido.codigo_venda}</Etiqueta>
            {pedido.devolucao === 'parcial' && <Etiqueta>Já teve devolução</Etiqueta>}
          </div>
          <h2 className="text-2xl font-medium">{pedido.cliente ?? (pedido.cpf_nota ? `CPF ${mascaraCpf(pedido.cpf_nota)}` : 'Cliente sem CPF')}</h2>
          <p className="text-sm text-muted-foreground">
            {pedido.unidade}, entregue em {dataCurta(pedido.entregue_em)}
            {prazo && `, troca e devolução até ${dataCurta(prazo.toISOString())}`}
          </p>
        </div>
      )}

      {comAbas && (
        <Abas
          rotulo="Tipo de atendimento"
          valor={modo}
          aoMudar={setModo}
          abas={[{ valor: 'troca', rotulo: 'Troca' }, { valor: 'devolucao', rotulo: 'Devolução' }]}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 font-medium">Peça</th>
              <th className="text-right font-medium">Comprou</th>
              <th className="text-right font-medium">{modo === 'troca' ? 'Trocar' : 'Devolver'}</th>
              <th className="pl-4 font-medium">{modo === 'troca' ? 'Levar no lugar' : 'Valor'}</th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((item) => {
              const quantidade = quantidades[item.id_item] ?? ''
              const marcada = Number(quantidade) > 0
              const disponiveis = opcoesDoItem(item)
              return (
                <tr key={item.id_item} className="border-b">
                  <td className="py-3"><NomePeca produto={item.produto} cor={item.cor} tamanho={`${item.tamanho}, ${item.sku}`} /></td>
                  <td className="text-right tabular-nums">{item.quantidade}</td>
                  <td className="text-right">
                    <Input
                      aria-label={`Quantidade de ${item.produto} para ${modo === 'troca' ? 'trocar' : 'devolver'}`}
                      type="number"
                      min={0}
                      max={item.quantidade}
                      value={quantidade}
                      placeholder="0"
                      onChange={(e) => setQuantidades({ ...quantidades, [item.id_item]: e.target.value })}
                      disabled={Boolean(bloqueio)}
                      className="ml-auto w-20 text-right"
                    />
                  </td>
                  <td className="pl-4">
                    {modo === 'troca' ? (
                      marcada && (
                        opcoes.carregando ? (
                          <span className="text-xs text-muted-foreground">Procurando no estoque...</span>
                        ) : disponiveis.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhuma outra cor ou tamanho com saldo nesta loja. Ofereça a devolução.</span>
                        ) : (
                          <Select
                            aria-label={`Peça nova no lugar de ${item.produto}`}
                            value={novas[item.id_item] ?? ''}
                            onChange={(e) => setNovas({ ...novas, [item.id_item]: e.target.value })}
                            required
                          >
                            <option value="" disabled>Escolha cor e tamanho</option>
                            {disponiveis.map((l) => (
                              <option key={l.id_variante} value={l.id_variante}>
                                {l.cor}, {l.tamanho} ({plural(l.disponivel, 'disponível', 'disponíveis')})
                              </option>
                            ))}
                          </Select>
                        )
                      )
                    ) : (
                      <span className="tabular-nums">{marcada ? moeda(Number(item.preco_unitario) * Number(quantidade)) : moeda(item.preco_unitario)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {opcoes.erro && <Aviso mensagem={opcoes.erro} />}

      {pedido.devolucao === 'parcial' && !bloqueio && (
        <p className="text-xs text-muted-foreground">
          Este pedido já teve peças devolvidas. A lista mostra o que foi comprado; o sistema confere o que o cliente ainda tem ao registrar.
        </p>
      )}

      {modo === 'devolucao' && escolhidos.length > 0 && (
        <div className={cn('space-y-1 text-sm', BLOCO_ACO)}>
          <p className="font-medium">Estorno de {moeda(valorDevolvido)}, pelo mesmo meio do pagamento</p>
          {estornos.map((e) => (
            <p key={e.id_pagamento} className="text-muted-foreground">{METODOS_PAGAMENTO[e.metodo] ?? e.metodo}: {moeda(e.valor)}</p>
          ))}
          {falta > 0 && <p className="text-destructive">Os pagamentos do pedido só cobrem {moeda(valorDevolvido - falta)} de estorno. {dicaSemEstorno ?? 'Diminua as peças.'}</p>}
        </div>
      )}

      {erro && <Aviso mensagem={erro} />}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {bloqueio && <p className="text-sm text-muted-foreground">{bloqueio}</p>}
        <Button type="submit" size="lg" className="h-11 px-5" disabled={!pronto || enviando}>
          {enviando ? 'Registrando...' : modo === 'troca' ? 'Registrar troca' : 'Registrar devolução'}
        </Button>
      </div>
    </form>
  )
}
