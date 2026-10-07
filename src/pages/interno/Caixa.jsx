import { useEffect, useRef, useState } from 'react'
import { Check, Printer, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Label, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { EmConstrucao } from '@/pages/Basicas'
import { api, ErroApi } from '@/lib/api'
import { dataHora, haQuanto, mascaraCpf, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

// abas do Caixa e a permissão que cada uma pede (as mesmas das rotas do backend)
const ABAS = [
  { valor: 'nova', rotulo: 'Nova venda', permissoes: ['registrar_venda_fisica'] },
  { valor: 'retiradas', rotulo: 'Retiradas', permissoes: ['preparar_entregar_pedido'] },
  { valor: 'hoje', rotulo: 'Vendas de hoje', permissoes: ['registrar_venda_fisica', 'preparar_entregar_pedido', 'registrar_troca_devolucao'] },
  { valor: 'consultar', rotulo: 'Consultar peça', permissoes: ['registrar_venda_fisica', 'registrar_troca_devolucao'] },
  { valor: 'troca', rotulo: 'Troca ou devolução', permissoes: ['registrar_troca_devolucao'] },
]

// a retirada fica guardada por 7 dias depois de pronta; a partir de 5, a lista avisa que está perto de vencer
const PRAZO_RETIRADA_DIAS = 7
const AVISO_RETIRADA_DIAS = 5

export function Caixa() {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const lojas = unidades.filter((u) => u.ativo && u.tipo === 'loja')
  // quem tem unidade vende travado nela; quem não tem (Admin) escolhe a loja, começando pela do topo
  const travada = perfil?.id_unidade ? String(perfil.id_unidade) : null
  const [escolhida, setEscolhida] = useState(() => (lojas.some((u) => String(u.id_unidade) === unidade) ? unidade : ''))
  const idLoja = travada ?? escolhida
  const loja = unidades.find((u) => String(u.id_unidade) === idLoja)

  const abas = ABAS.filter((a) => a.permissoes.some((codigo) => temPermissao(perfil, codigo)))
  const [aba, setAba] = useState(abas[0]?.valor)

  const subtitulo = loja ? `Vendendo na ${loja.nome}` : 'Escolha a loja para começar'

  return (
    <>
      <Cabecalho titulo="Caixa" subtitulo={subtitulo}>
        {!travada && (
          <div className="w-56">
            <Label htmlFor="caixa-loja" className="sr-only">Loja</Label>
            <Select id="caixa-loja" value={escolhida} onChange={(e) => setEscolhida(e.target.value)}>
              <option value="" disabled>Escolha a loja</option>
              {lojas.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
            </Select>
          </div>
        )}
      </Cabecalho>

      {loja && loja.tipo !== 'loja' ? (
        <Aviso titulo="O CD não tem caixa" mensagem="Venda, retirada e troca no balcão acontecem nas lojas." />
      ) : !loja ? (
        unidades.length > 0 && <Vazio>Escolha a loja no alto da página para abrir o caixa.</Vazio>
      ) : (
        <>
          <Abas rotulo="Caixa" valor={aba} aoMudar={setAba} abas={abas} className="mb-8" />
          {aba === 'nova' && <NovaVenda key={idLoja} loja={loja} />}
          {aba === 'retiradas' && <Retiradas key={idLoja} loja={loja} />}
          {aba === 'hoje' && <EmConstrucao titulo="Vendas de hoje" />}
          {aba === 'consultar' && <EmConstrucao titulo="Consultar peça" />}
          {aba === 'troca' && <EmConstrucao titulo="Troca ou devolução" />}
        </>
      )}
    </>
  )
}

// ---------- Nova venda ----------

const soDigitos = (texto) => texto.replace(/\D/g, '')

function NovaVenda({ loja }) {
  const [venda, setVenda] = useState(null)
  const [troco, setTroco] = useState(null)
  // remonta o formulário vazio a cada venda nova
  const [numero, setNumero] = useState(0)

  if (venda) {
    return (
      <VendaFinalizada
        venda={venda}
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

function FormularioVenda({ loja, aoFinalizar }) {
  const [termo, setTermo] = useState('')
  const [itens, setItens] = useState([])
  const [cpf, setCpf] = useState('')
  const [metodo, setMetodo] = useState('pix')
  const [recebido, setRecebido] = useState('')
  const { enviar, enviando, erro } = useEnviar()

  const achadas = useCarregar(
    () => (termo.trim().length >= 2
      ? api('/balcao/estoque', { params: { id_unidade: loja.id_unidade, canal: 'loja_fisica', busca: termo.trim(), limit: 30 } })
      : null),
    [loja.id_unidade, termo],
  )
  const linhasAchadas = (achadas.dados?.items ?? []).filter((l) => l.disponivel > 0)

  // preços e total vêm do servidor (POST /carrinho), o mesmo cálculo que a venda vai usar
  const validos = itens.filter((i) => Number(i.quantidade) >= 1)
  const chaveCarrinho = validos.map((i) => `${i.linha.id_variante}x${Number(i.quantidade)}`).join(',')
  const resumo = useCarregar(
    () => (validos.length
      ? api('/carrinho', { metodo: 'POST', corpo: { itens: validos.map((i) => ({ id_variante: i.linha.id_variante, quantidade: Number(i.quantidade) })) } })
      : null),
    [chaveCarrinho],
  )
  const precos = Object.fromEntries((resumo.dados?.itens ?? []).map((i) => [i.id_variante, i]))
  const total = validos.length ? resumo.dados?.valor_itens : null

  // CPF na nota: com 11 dígitos, mostra o nome da conta ou avisa que a compra fica guardada no CPF
  const cpfDigitos = soDigitos(cpf)
  const cliente = useCarregar(
    () => (cpfDigitos.length === 11
      ? api('/vendas/clientes', { params: { cpf: cpfDigitos } })
        .then((c) => ({ conta: c }))
        .catch((falha) => {
          if (falha instanceof ErroApi && falha.status === 404) return { conta: null }
          throw falha
        })
      : null),
    [cpfDigitos],
  )

  const emDinheiro = metodo === 'dinheiro'
  const valorRecebido = Number(recebido.replace(',', '.'))
  const trocoDado = emDinheiro && total && recebido ? valorRecebido - Number(total) : null
  const faltaDinheiro = emDinheiro && (!recebido || trocoDado < 0)

  const quantidadesOk = itens.length > 0 && itens.every((i) => Number(i.quantidade) >= 1 && Number(i.quantidade) <= i.linha.disponivel)
  const cpfOk = cpfDigitos.length === 0 || cpfDigitos.length === 11
  const pronta = quantidadesOk && cpfOk && total && !resumo.carregando && !resumo.erro && !faltaDinheiro

  function adicionar(linha) {
    setTermo('')
    if (itens.some((i) => i.linha.id_variante === linha.id_variante)) {
      setItens(itens.map((i) => (i.linha.id_variante === linha.id_variante
        ? { ...i, quantidade: String(Math.min(linha.disponivel, Number(i.quantidade) + 1)) }
        : i)))
      return
    }
    setItens([...itens, { linha, quantidade: '1' }])
  }

  function mudarQuantidade(idVariante, quantidade) {
    setItens(itens.map((i) => (i.linha.id_variante === idVariante ? { ...i, quantidade } : i)))
  }

  async function finalizar(evento) {
    evento.preventDefault()
    const corpo = {
      id_unidade: loja.id_unidade,
      itens: itens.map((i) => ({ id_variante: i.linha.id_variante, quantidade: Number(i.quantidade) })),
      cpf_nota: cpfDigitos || null,
      pagamentos: [{ metodo, valor: total }],
    }
    const pedido = await enviar(() => api('/vendas/pedidos', { metodo: 'POST', corpo }))
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
          {achadas.dados && linhasAchadas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça com saldo com esse nome.</p>}
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

      <div className="space-y-6 lg:border-l lg:pl-8">
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

        <div className="flex items-baseline justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-medium tabular-nums">{resumo.carregando && validos.length ? '...' : moeda(total)}</span>
        </div>

        {erro && <Aviso mensagem={erro} />}
        <Button type="submit" size="lg" className="h-11 w-full" disabled={!pronta || enviando}>
          {enviando ? 'Finalizando...' : 'Finalizar venda'}
        </Button>
      </div>
    </form>
  )
}

// a notinha abre para imprimir assim que a venda fecha; "Nova venda" só depois de imprimir
function VendaFinalizada({ venda, troco, aoNovaVenda }) {
  const [imprimiu, setImprimiu] = useState(false)
  const abriu = useRef(false)

  function imprimir() {
    window.print()
    setImprimiu(true)
  }

  useEffect(() => {
    // o StrictMode roda o efeito duas vezes no desenvolvimento: abre a impressão uma vez só
    if (abriu.current) return
    abriu.current = true
    const espera = setTimeout(imprimir, 0)
    return () => clearTimeout(espera)
  }, [])

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-lg font-medium">Venda finalizada</p>
        <p className="text-sm text-muted-foreground">
          {imprimiu ? 'Se a notinha não saiu, imprima de novo antes de começar outra venda.' : 'Abrindo a impressão da notinha...'}
        </p>
      </div>

      <Notinha venda={venda} troco={troco} />

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

function Notinha({ venda, troco }) {
  return (
    <section aria-label="Notinha" className="notinha space-y-4 border bg-white p-5 text-sm text-black">
      <div className="space-y-0.5 text-center">
        <p className="font-logo uppercase tracking-[0.3em]">Casa Lorenzi</p>
        <p>{venda.unidade}</p>
        <p>{dataHora(venda.criado_em)}</p>
      </div>
      <p className="text-center">
        Código da venda <span className="font-medium tabular-nums">{venda.codigo_venda}</span>
      </p>
      <table className="w-full">
        <tbody>
          {venda.itens.map((item) => (
            <tr key={item.id_item} className="align-top">
              <td className="py-1">
                {item.quantidade} × {item.produto}
                <span className="block text-xs">{item.cor}, {item.tamanho}, {item.sku}</span>
              </td>
              <td className="py-1 text-right tabular-nums">{moeda(Number(item.preco_unitario) * item.quantidade)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-dashed border-black pt-3">
        <p className="flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{moeda(venda.valor_total)}</span></p>
        {venda.pagamentos.map((p) => (
          <p key={p.id_pagamento} className="flex justify-between">
            <span>{METODOS_PAGAMENTO[p.metodo] ?? p.metodo}</span>
            <span className="tabular-nums">{moeda(p.valor)}</span>
          </p>
        ))}
        {troco > 0 && <p className="flex justify-between"><span>Troco</span><span className="tabular-nums">{moeda(troco)}</span></p>}
      </div>
      {venda.cpf_nota && <p className="text-center">CPF na nota {mascaraCpf(venda.cpf_nota)}</p>}
      <p className="text-center text-xs">Troca ou devolução em até 30 dias com esta notinha.</p>
    </section>
  )
}

// ---------- Retiradas ----------

function diasDesde(iso) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0
}

function Retiradas({ loja }) {
  const lista = useCarregar(
    () => api('/vendas/pedidos', { params: { status: 'pronto_para_retirada', id_unidade: loja.id_unidade, limit: 100 } }),
    [loja.id_unidade],
  )
  const prontas = lista.dados?.items ?? []
  const [idEscolhido, setIdEscolhido] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [entregue, setEntregue] = useState(null)

  // o pedido aparece pelo clique na lista ou pelo código digitado
  const codigoLimpo = codigo.trim().toUpperCase()
  const escolhido = prontas.find((p) => codigoLimpo && p.codigo_venda === codigoLimpo) ?? prontas.find((p) => p.id_pedido === idEscolhido)

  function aposEntregar(pedido) {
    setEntregue(pedido)
    setIdEscolhido(null)
    setCodigo('')
    lista.recarregar()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          {lista.dados ? `${plural(prontas.length, 'pedido pronto', 'pedidos prontos')} para retirar` : 'Pedidos prontos para retirar'}
        </p>
        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados && prontas.length === 0 && <Vazio>Nenhuma retirada esperando nesta loja.</Vazio>}
        <ul>
          {prontas.map((p) => {
            const dias = diasDesde(p.pronto_retirada_em)
            const perto = dias >= AVISO_RETIRADA_DIAS
            return (
              <li key={p.id_pedido}>
                <button
                  type="button"
                  onClick={() => { setIdEscolhido(p.id_pedido); setEntregue(null) }}
                  aria-current={escolhido?.id_pedido === p.id_pedido ? 'true' : undefined}
                  className={cn('w-full space-y-1 border-b px-3 py-4 text-left hover:bg-superficie', escolhido?.id_pedido === p.id_pedido && 'bg-superficie')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.cliente ?? 'Cliente'}</span>
                    {perto && <Etiqueta alerta>Vence em {plural(Math.max(0, PRAZO_RETIRADA_DIAS - dias), 'dia')}</Etiqueta>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Pedido {p.id_pedido}, {plural(p.itens.reduce((t, i) => t + i.quantidade, 0), 'peça')}, pronto {haQuanto(p.pronto_retirada_em)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0 space-y-6">
        {entregue && (
          <p role="status" className="flex items-center gap-2 bg-aco/10 px-3 py-2 text-sm text-marinho">
            <Check className="size-4 shrink-0 text-aco" aria-hidden="true" />
            Pedido {entregue.id_pedido} entregue para {entregue.cliente ?? 'o cliente'}.
          </p>
        )}
        <Campo id="retirada-codigo" rotulo="Código do pedido" dica="Peça o código que o cliente recebeu quando o pedido ficou pronto.">
          <Input
            id="retirada-codigo"
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setEntregue(null) }}
            placeholder="CL..."
            autoComplete="off"
            className="max-w-xs uppercase"
          />
        </Campo>
        {escolhido ? (
          <EntregarRetirada key={escolhido.id_pedido} pedido={escolhido} codigo={codigoLimpo} aoEntregar={aposEntregar} />
        ) : (
          lista.dados && prontas.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {codigoLimpo ? 'Nenhuma retirada pronta nesta loja com esse código.' : 'Digite o código ou escolha o pedido na lista.'}
            </p>
          )
        )}
      </div>
    </div>
  )
}

function EntregarRetirada({ pedido, codigo, aoEntregar }) {
  const [conferiu, setConferiu] = useState(false)
  const { enviar, enviando, erro } = useEnviar()

  async function entregar(evento) {
    evento.preventDefault()
    const feito = await enviar(() => api(`/vendas/pedidos/${pedido.id_pedido}/entregar`, { metodo: 'POST', corpo: { codigo_venda: codigo } }))
    if (feito) aoEntregar(feito)
  }

  return (
    <form onSubmit={entregar} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-medium">{pedido.cliente ?? 'Cliente sem conta'}</h2>
        <p className="text-sm text-muted-foreground">
          Pedido {pedido.id_pedido}, pago {haQuanto(pedido.pago_em)}, {moeda(pedido.valor_total)}
        </p>
      </div>

      <ul className="border-t">
        {pedido.itens.map((item) => (
          <li key={item.id_item} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
            <NomePeca produto={item.produto} cor={item.cor} tamanho={`${item.tamanho}, ${item.sku}`} />
            <span className="shrink-0 tabular-nums">{item.quantidade} ×</span>
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={conferiu} onChange={(e) => setConferiu(e.target.checked)} className="size-4 accent-marinho" />
        Conferi o documento com foto de quem está retirando
      </label>

      {erro && <Aviso mensagem={erro} />}
      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-11 px-5" disabled={!codigo || !conferiu || enviando}>
          <Check aria-hidden="true" /> {enviando ? 'Entregando...' : 'Entregar'}
        </Button>
      </div>
    </form>
  )
}
