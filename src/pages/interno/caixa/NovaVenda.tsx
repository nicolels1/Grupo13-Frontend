import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Vazio } from '@/components/Estados'
import { NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { api, ErroApi, type Esquema } from '@/lib/api'
import { BLOCO_ACO } from '../componentes/estilos'
import { MARCAS, mascaraCpf, METODOS_PAGAMENTO, moeda, plural, soDigitos } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { Notinha } from './impressao'
import { descontoCabe, pontosDoCpf, valorAPagar, type PontosNoCaixa } from './pontosNoCaixa'
import { useImprimirAoAbrir } from './useImprimirAoAbrir'

type Unidade = Esquema<'UnidadeSaida'>
type Pedido = Esquema<'PedidoSaida'>
type ItemEstoque = Esquema<'EstoqueItem'>
// peça no carrinho da venda: a linha de estoque da loja e a quantidade digitada
type ItemVenda = { linha: ItemEstoque; quantidade: string }

// aba Nova venda do Caixa: busca de peça, CPF na nota, pagamento e a notinha

export function NovaVenda({ loja }: { loja: Unidade }) {
  const [venda, setVenda] = useState<Pedido | null>(null)
  const [troco, setTroco] = useState<number | null>(null)
  // remonta o formulário vazio a cada venda nova
  const [numero, setNumero] = useState(0)

  if (venda) {
    return (
      <VendaFinalizada
        venda={venda}
        marca={loja.marca}
        troco={troco}
        aoNovaVenda={() => {
          setVenda(null)
          setTroco(null)
          setNumero(numero + 1)
        }}
      />
    )
  }
  return (
    <FormularioVenda
      key={numero}
      loja={loja}
      aoFinalizar={(pedido, trocoDado) => {
        setVenda(pedido)
        setTroco(trocoDado)
      }}
    />
  )
}

function FormularioVenda({ loja, aoFinalizar }: { loja: Unidade; aoFinalizar: (pedido: Pedido, troco: number | null) => void }) {
  const [termo, setTermo] = useState('')
  const [itens, setItens] = useState<ItemVenda[]>([])
  const [cpf, setCpf] = useState('')
  const [metodo, setMetodo] = useState('pix')
  const [recebido, setRecebido] = useState('')
  const [pontosAplicados, setPontosAplicados] = useState<PontosNoCaixa | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  const achadas = useCarregar(
    () => (termo.trim().length >= 2
      ? api<Esquema<'Pagina_EstoqueItem_'>>('/balcao/estoque', { params: { id_unidade: loja.id_unidade, canal: 'loja_fisica', busca: termo.trim(), limit: 30 } })
      : null),
    [loja.id_unidade, termo],
  )
  const linhasAchadas = (achadas.dados?.items ?? []).filter((l) => l.disponivel > 0)

  // preços e total vêm do servidor (POST /carrinho), o mesmo cálculo que a venda vai usar
  const validos = itens.filter((i) => Number(i.quantidade) >= 1)
  const chaveCarrinho = validos.map((i) => `${i.linha.id_variante}x${Number(i.quantidade)}`).join(',')
  const resumo = useCarregar(
    () => (validos.length
      ? api<Esquema<'ResumoCarrinho'>>('/carrinho', { metodo: 'POST', corpo: { itens: validos.map((i) => ({ id_variante: i.linha.id_variante, quantidade: Number(i.quantidade) })) } })
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave resume os itens válidos; editar sem mudar o carrinho não busca de novo
    [chaveCarrinho],
  )
  const precos = Object.fromEntries((resumo.dados?.itens ?? []).map((i) => [i.id_variante, i]))
  const total = validos.length ? resumo.dados?.valor_itens : null

  // CPF na nota: com 11 dígitos, mostra o nome da conta ou avisa que a compra fica guardada no CPF
  const cpfDigitos = soDigitos(cpf)
  const cliente = useCarregar(
    () => (cpfDigitos.length === 11
      ? api<Esquema<'ClienteResumo'>>('/vendas/clientes', { params: { cpf: cpfDigitos } })
        .then((c): { conta: Esquema<'ClienteResumo'> | null } => ({ conta: c }))
        .catch((falha: unknown) => {
          if (falha instanceof ErroApi && falha.status === 404) return { conta: null }
          throw falha
        })
      : null),
    [cpfDigitos],
  )

  // pontos do cliente do CPF como desconto; o pagamento fecha com o total menos o desconto
  const pontos = pontosDoCpf(pontosAplicados, cpfDigitos)
  const aPagar = pontos ? valorAPagar(total, pontos.desconto) : total
  const descontoOk = !pontos || descontoCabe(pontos.desconto, total)

  const emDinheiro = metodo === 'dinheiro'
  const valorRecebido = Number(recebido.replace(',', '.'))
  const trocoDado = emDinheiro && aPagar && recebido ? valorRecebido - Number(aPagar) : null
  const faltaDinheiro = emDinheiro && (!recebido || (trocoDado ?? 0) < 0)

  const quantidadesOk = itens.length > 0 && itens.every((i) => Number(i.quantidade) >= 1 && Number(i.quantidade) <= i.linha.disponivel)
  const cpfOk = cpfDigitos.length === 0 || cpfDigitos.length === 11
  const pronta = quantidadesOk && cpfOk && total && descontoOk && !resumo.carregando && !resumo.erro && !faltaDinheiro

  function adicionar(linha: ItemEstoque) {
    setTermo('')
    if (itens.some((i) => i.linha.id_variante === linha.id_variante)) {
      setItens(itens.map((i) => (i.linha.id_variante === linha.id_variante
        ? { ...i, quantidade: String(Math.min(linha.disponivel, Number(i.quantidade) + 1)) }
        : i)))
      return
    }
    setItens([...itens, { linha, quantidade: '1' }])
  }

  function mudarQuantidade(idVariante: number, quantidade: string) {
    setItens(itens.map((i) => (i.linha.id_variante === idVariante ? { ...i, quantidade } : i)))
  }

  async function finalizar(evento: FormEvent) {
    evento.preventDefault()
    const corpo = {
      id_unidade: loja.id_unidade,
      itens: itens.map((i) => ({ id_variante: i.linha.id_variante, quantidade: Number(i.quantidade) })),
      cpf_nota: cpfDigitos || null,
      pagamentos: [{ metodo, valor: aPagar }],
      pontos_resgate: pontos?.pontos ?? null,
    }
    const pedido = await enviar(() => api<Pedido>('/vendas/pedidos', { metodo: 'POST', corpo }))
    if (pedido) aoFinalizar(pedido, trocoDado)
  }

  return (
    <form onSubmit={finalizar} className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-6">
        <Campo id="venda-busca" rotulo="Buscar peça" dica="Só aparecem as peças com saldo na loja física desta loja.">
          <Input
            id="venda-busca"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Etiqueta ou nome da peça"
            autoComplete="off"
            autoFocus
          />
          {linhasAchadas.length > 0 && (
            <ul className="max-h-72 overflow-y-auto border">
              {linhasAchadas.map((l) => (
                <li key={l.id_variante}>
                  <button type="button" onClick={() => adicionar(l)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-superficie">
                    <NomePeca produto={l.produto} cor={l.cor} tamanho={`${l.tamanho}, ${l.sku}`} />
                    <span className="shrink-0 text-xs text-muted-foreground">{plural(l.disponivel, 'disponível', 'disponíveis')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {achadas.erro && <Aviso mensagem={achadas.erro} />}
          {achadas.dados && linhasAchadas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça com saldo nesta loja com esse nome. Confira a etiqueta ou veja em Consultar peça.</p>}
        </Campo>

        {itens.length === 0 ? (
          <Vazio>Busque as peças para começar a venda.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Peça</th>
                  <th className="text-right font-medium">Preço</th>
                  <th className="text-right font-medium">Quantidade</th>
                  <th className="text-right font-medium">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => {
                  const preco = precos[i.linha.id_variante]
                  return (
                    <tr key={i.linha.id_variante} className="border-b">
                      <td className="py-3"><NomePeca produto={i.linha.produto} cor={i.linha.cor} tamanho={i.linha.tamanho} /></td>
                      <td className="text-right tabular-nums">{moeda(preco?.preco_unitario)}</td>
                      <td className="text-right">
                        <Input
                          aria-label={`Quantidade de ${i.linha.produto}`}
                          type="number"
                          min={1}
                          max={i.linha.disponivel}
                          value={i.quantidade}
                          onChange={(e) => mudarQuantidade(i.linha.id_variante, e.target.value)}
                          className="ml-auto w-20 text-right"
                          required
                        />
                      </td>
                      <td className="text-right tabular-nums">{moeda(preco?.subtotal)}</td>
                      <td className="pl-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Tirar peça"
                          onClick={() => setItens(itens.filter((x) => x.linha.id_variante !== i.linha.id_variante))}
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {resumo.erro && <Aviso mensagem={resumo.erro} />}
      </div>

      <div className={cn('h-fit space-y-6', BLOCO_ACO)}>
        <Campo id="venda-cpf" rotulo="CPF na nota?" opcional>
          <Input
            id="venda-cpf"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(mascaraCpf(e.target.value))}
            placeholder="000.000.000-00"
            autoComplete="off"
            aria-invalid={!cpfOk || undefined}
          />
          {cliente.carregando && cpfDigitos.length === 11 && <p className="text-xs text-muted-foreground">Procurando o CPF...</p>}
          {cliente.dados?.conta && <p className="text-sm">{cliente.dados.conta.nome}</p>}
          {cliente.dados && !cliente.dados.conta && (
            <p className="text-xs text-muted-foreground">CPF sem conta, a compra fica guardada nele.</p>
          )}
          {cliente.erro && <p className="text-xs text-destructive">{cliente.erro}</p>}
        </Campo>

        {cpfDigitos.length === 11 && (
          <UsarPontosNoCaixa marca={loja.marca} cpf={cpfDigitos} aplicados={pontos} aoMudar={setPontosAplicados} />
        )}

        <Campo id="venda-metodo" rotulo="Forma de pagamento">
          <Select id="venda-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {Object.entries(METODOS_PAGAMENTO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </Select>
        </Campo>

        {emDinheiro && (
          <Campo id="venda-recebido" rotulo="Valor recebido">
            <Input
              id="venda-recebido"
              inputMode="decimal"
              value={recebido}
              onChange={(e) => setRecebido(e.target.value.replace(/[^\d,.]/g, ''))}
              placeholder="0,00"
              autoComplete="off"
              required
            />
            {trocoDado !== null && (
              <p className={cn('text-sm', trocoDado < 0 && 'text-destructive')}>
                {trocoDado < 0 ? `Faltam ${moeda(-trocoDado)}` : `Troco: ${moeda(trocoDado)}`}
              </p>
            )}
          </Campo>
        )}

        <div className="space-y-1 border-t pt-4">
          {pontos && (
            <>
              <p className="flex justify-between text-sm"><span className="text-muted-foreground">Peças</span><span className="tabular-nums">{moeda(total)}</span></p>
              <p className="flex justify-between text-sm">
                <span className="text-muted-foreground">{plural(pontos.pontos, 'ponto', 'pontos')}</span>
                <span className="tabular-nums">−{moeda(pontos.desconto)}</span>
              </p>
            </>
          )}
          <p className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-medium tabular-nums">{resumo.carregando && validos.length ? '...' : moeda(aPagar)}</span>
          </p>
          {!descontoOk && <p role="alert" className="text-sm text-ferrugem">O desconto dos pontos ficou maior que as peças. Tire os pontos ou use menos.</p>}
        </div>

        {erro && <Aviso mensagem={erro} />}
        <Button type="submit" size="lg" className="h-11 w-full" disabled={!pronta || enviando}>
          {enviando ? 'Finalizando...' : 'Finalizar venda'}
        </Button>
      </div>
    </form>
  )
}

// pontos do cliente do CPF como desconto, na marca da loja (cada marca tem o seu programa). O valor vem de
// GET /fidelidade/resgate/caixa, a mesma conta que a venda faz; saldo e resgate mínimo, o backend confere.
// Fica dentro do formulário da venda: o Enter aqui aplica os pontos em vez de finalizar a venda
function UsarPontosNoCaixa({ marca, cpf, aplicados, aoMudar }: {
  marca: Unidade['marca']
  cpf: string
  aplicados: PontosNoCaixa | null
  aoMudar: (aplicados: PontosNoCaixa | null) => void
}) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const nome = MARCAS[marca] ?? marca

  async function aplicar() {
    setAviso(null)
    const pontos = Number(texto)
    if (!Number.isInteger(pontos) || pontos <= 0) {
      setAviso('Escreva quantos pontos o cliente quer usar.')
      return
    }
    const resgate = await enviar(() =>
      api<Esquema<'ResgateSimulado'>>('/fidelidade/resgate/caixa', { params: { cpf, marca, pontos } }),
    )
    if (!resgate) return
    aoMudar({ cpf, pontos, desconto: resgate.desconto, saldo: resgate.saldo })
    setTexto('')
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    void aplicar()
  }

  if (aplicados) {
    return (
      <div className="space-y-1 text-sm">
        <p>
          {plural(aplicados.pontos, 'ponto', 'pontos')} da {nome} aplicados,{' '}
          <span className="font-medium tabular-nums">−{moeda(aplicados.desconto)}</span>
        </p>
        <p className="text-xs text-muted-foreground">O cliente tinha {plural(aplicados.saldo, 'ponto', 'pontos')}.</p>
        <button type="button" onClick={() => aoMudar(null)} className="underline underline-offset-4 hover:text-aco">
          Tirar os pontos
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Campo id="venda-pontos" rotulo={`Usar pontos da ${nome}`} opcional className="min-w-0 flex-1">
          <Input
            id="venda-pontos"
            inputMode="numeric"
            value={texto}
            onChange={(e) => setTexto(soDigitos(e.target.value).slice(0, 9))}
            onKeyDown={aoTeclar}
            placeholder="Quantos pontos"
            autoComplete="off"
            aria-invalid={Boolean(aviso || erro) || undefined}
          />
        </Campo>
        <Button type="button" variant="outline" disabled={enviando || !texto} onClick={() => void aplicar()}>
          {enviando ? 'Calculando...' : 'Aplicar desconto'}
        </Button>
      </div>
      {(aviso || erro) && <p role="alert" className="text-xs text-destructive">{aviso ?? erro}</p>}
    </div>
  )
}

// a notinha abre para imprimir assim que a venda fecha; "Nova venda" só depois de imprimir
function VendaFinalizada({ venda, marca, troco, aoNovaVenda }: {
  venda: Pedido
  marca: Unidade['marca']
  troco: number | null
  aoNovaVenda: () => void
}) {
  const { imprimiu, imprimir } = useImprimirAoAbrir()

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-lg font-medium">Venda finalizada</p>
        <p className="text-sm text-muted-foreground">
          {imprimiu ? 'Se a notinha não saiu, imprima de novo antes de começar outra venda.' : 'Abrindo a impressão da notinha...'}
        </p>
      </div>

      <Notinha venda={venda} marca={marca} troco={troco} />

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="lg" className="h-11 px-4" onClick={imprimir}>
          <Printer aria-hidden="true" /> Imprimir de novo
        </Button>
        <Button type="button" size="lg" className="h-11 px-5" disabled={!imprimiu} onClick={aoNovaVenda}>
          Nova venda
        </Button>
      </div>
    </div>
  )
}
