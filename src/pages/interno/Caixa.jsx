import { useEffect, useRef, useState } from 'react'
import { Check, Printer, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, ErroApi } from '@/lib/api'
import { ordenarTamanhos } from '@/lib/cores'
import { CANAIS, dataCurta, dataHora, haQuanto, hojeIso, hora, mascaraCpf, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
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
  const { unidade, setUnidade, unidades } = useUnidadeEscolhida()
  const lojas = unidades.filter((u) => u.ativo && u.tipo === 'loja')
  // a loja do caixa é a unidade do seletor do topo (design: "visível no topo"). Quem tem unidade
  // abre travado nela; quem não tem (Admin) escolhe a loja antes da primeira venda
  const travada = perfil?.id_unidade ? String(perfil.id_unidade) : null
  const idLoja = travada ?? unidade
  const loja = unidades.find((u) => String(u.id_unidade) === idLoja)

  // o topo mostra a loja travada mesmo que a pessoa tenha olhado outra unidade em outra área
  useEffect(() => {
    if (travada && unidade !== travada) setUnidade(travada)
  }, [travada, unidade, setUnidade])

  const abas = ABAS.filter((a) => a.permissoes.some((codigo) => temPermissao(perfil, codigo)))
  const [aba, setAba] = useState(abas[0]?.valor)
  const vendendo = loja?.tipo === 'loja' && loja.ativo

  return (
    <>
      <Cabecalho titulo="Caixa" subtitulo={vendendo ? `Vendendo na ${loja.nome}` : undefined} />

      {travada && loja && !vendendo ? (
        <Aviso titulo="Sua unidade não tem caixa" mensagem="Venda, retirada e troca no balcão acontecem nas lojas ativas. Peça ao Admin para revisar a unidade da sua conta." />
      ) : !vendendo ? (
        unidades.length > 0 && (
          <div className="max-w-sm space-y-4">
            <p className="text-sm text-muted-foreground">
              {loja ? 'O CD não tem caixa.' : 'O caixa abre numa loja.'} Escolha a loja onde você vai vender; ela fica no seletor do topo.
            </p>
            <Campo id="caixa-loja" rotulo="Loja">
              <Select id="caixa-loja" value="" onChange={(e) => setUnidade(e.target.value)}>
                <option value="" disabled>Escolha a loja</option>
                {lojas.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
              </Select>
            </Campo>
          </div>
        )
      ) : (
        <>
          <Abas rotulo="Caixa" valor={aba} aoMudar={setAba} abas={abas} className="mb-8" />
          {aba === 'nova' && <NovaVenda key={idLoja} loja={loja} />}
          {aba === 'retiradas' && <Retiradas key={idLoja} loja={loja} />}
          {aba === 'hoje' && <VendasDeHoje key={idLoja} loja={loja} />}
          {aba === 'consultar' && <ConsultarPeca key={idLoja} loja={loja} />}
          {aba === 'troca' && <TrocaOuDevolucao key={idLoja} loja={loja} />}
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

// abre a impressão assim que a tela aparece; `imprimiu` libera o próximo atendimento
function useImprimirAoAbrir() {
  const [imprimiu, setImprimiu] = useState(false)
  const abriu = useRef(false)

  function imprimir() {
    window.print()
    setImprimiu(true)
  }

  useEffect(() => {
    // o StrictMode roda o efeito duas vezes no desenvolvimento: abre a impressão uma vez só
    if (abriu.current) return undefined
    abriu.current = true
    const espera = setTimeout(imprimir, 0)
    return () => clearTimeout(espera)
  }, [])

  return { imprimiu, imprimir }
}

// a notinha abre para imprimir assim que a venda fecha; "Nova venda" só depois de imprimir
function VendaFinalizada({ venda, troco, aoNovaVenda }) {
  const { imprimiu, imprimir } = useImprimirAoAbrir()

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
    <section aria-label="Notinha" className="notinha space-y-4 border bg-white p-5 text-sm text-foreground">
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
      <div className="space-y-1 border-t border-dashed border-foreground pt-3">
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
            className="max-w-xs"
          />
        </Campo>
        {escolhido ? (
          <EntregarRetirada key={escolhido.id_pedido} pedido={escolhido} codigo={codigoLimpo} aoEntregar={aposEntregar} />
        ) : (
          lista.dados && prontas.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {codigoLimpo ? 'Nenhuma retirada pronta nesta loja com esse código. Confira o código com o cliente ou procure o pedido na lista.' : 'Digite o código ou escolha o pedido na lista.'}
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

// ---------- Vendas de hoje ----------

function VendasDeHoje({ loja }) {
  const hoje = hojeIso()
  const lista = useCarregar(
    () => api('/vendas/pedidos', { params: { canal: 'loja_fisica', id_unidade: loja.id_unidade, de: hoje, ate: hoje, limit: 200 } }),
    [loja.id_unidade, hoje],
  )
  const vendas = lista.dados?.items ?? []
  const [reimprimindo, setReimprimindo] = useState(null)

  // total recebido por forma de pagamento (só os pagamentos aprovados; estornos ficam de fora)
  const porMetodo = {}
  for (const venda of vendas) {
    for (const p of venda.pagamentos) {
      if (p.tipo === 'pagamento' && p.status === 'aprovado') porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + Number(p.valor)
    }
  }
  const totalDia = Object.values(porMetodo).reduce((t, v) => t + v, 0)

  // a notinha só existe no papel: monta, abre a impressão e desmonta
  useEffect(() => {
    if (!reimprimindo) return undefined
    const espera = setTimeout(() => {
      window.print()
      setReimprimindo(null)
    }, 0)
    return () => clearTimeout(espera)
  }, [reimprimindo])

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados && vendas.length === 0 && <Vazio>Nenhuma venda no caixa hoje.</Vazio>}
        {lista.dados && lista.dados.total > vendas.length && (
          <p className="pb-2 text-xs text-muted-foreground">Mostrando as {vendas.length} vendas mais recentes de {lista.dados.total}.</p>
        )}
        {vendas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Hora</th>
                  <th className="font-medium">Venda</th>
                  <th className="font-medium">Peças</th>
                  <th className="font-medium">Pagamento</th>
                  <th className="text-right font-medium">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.id_pedido} className="border-b">
                    <td className="py-3 tabular-nums">{hora(v.criado_em)}</td>
                    <td>
                      <Etiqueta>{v.codigo_venda}</Etiqueta>
                      {v.cliente && <span className="block pt-1 text-xs text-muted-foreground">{v.cliente}</span>}
                    </td>
                    <td>{plural(v.itens.reduce((t, i) => t + i.quantidade, 0), 'peça')}</td>
                    <td>{[...new Set(v.pagamentos.filter((p) => p.tipo === 'pagamento').map((p) => METODOS_PAGAMENTO[p.metodo] ?? p.metodo))].join(', ')}</td>
                    <td className="text-right tabular-nums">{moeda(v.valor_total)}</td>
                    <td className="pl-2 text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setReimprimindo(v)}>
                        <Printer aria-hidden="true" /> Reimprimir notinha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3 lg:border-l lg:pl-8">
        <p className="text-sm text-muted-foreground">{lista.dados ? `${plural(vendas.length, 'venda')} hoje` : 'Vendas de hoje'}</p>
        <dl className="space-y-2 text-sm">
          {Object.entries(METODOS_PAGAMENTO).map(([metodo, rotulo]) => (
            <div key={metodo} className="flex justify-between">
              <dt>{rotulo}</dt>
              <dd className="tabular-nums">{moeda(porMetodo[metodo] ?? 0)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{moeda(totalDia)}</dd>
          </div>
        </dl>
      </div>

      {reimprimindo && (
        <div className="hidden print:block">
          <Notinha venda={reimprimindo} troco={null} />
        </div>
      )}
    </div>
  )
}

// ---------- Consultar peça ----------

// todas as linhas de estoque do produto em todas as unidades; a busca é por parte do nome, então
// filtra o nome exato no fim
async function estoqueDoProduto(produto) {
  const linhas = []
  for (let offset = 0; ; offset += 200) {
    const pagina = await api('/balcao/estoque', { params: { busca: produto, limit: 200, offset } })
    linhas.push(...pagina.items)
    if (offset + pagina.limit >= pagina.total) break
  }
  return linhas.filter((l) => l.produto === produto)
}

const somaDisponivel = (linhas) => linhas.reduce((t, l) => t + l.disponivel, 0)

function ConsultarPeca({ loja }) {
  const [termo, setTermo] = useState('')
  const [produto, setProduto] = useState(null)
  const [celula, setCelula] = useState(null)

  const achadas = useCarregar(
    () => (termo.trim().length >= 2 && !produto ? api('/balcao/estoque', { params: { busca: termo.trim(), limit: 200 } }) : null),
    [termo, produto],
  )
  const produtos = [...new Set((achadas.dados?.items ?? []).map((l) => l.produto))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const estoque = useCarregar(() => (produto ? estoqueDoProduto(produto) : null), [produto])
  const linhas = estoque.dados ?? []
  const cores = [...new Set(linhas.map((l) => l.cor))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const tamanhos = ordenarTamanhos(new Set(linhas.map((l) => l.tamanho)))
  const doCruzamento = (cor, tamanho) => linhas.filter((l) => l.cor === cor && l.tamanho === tamanho)
  const nestaLoja = (doCruz) => somaDisponivel(doCruz.filter((l) => l.id_unidade === loja.id_unidade && l.canal === 'loja_fisica'))

  function escolher(nome) {
    setProduto(nome)
    setTermo(nome)
    setCelula(null)
  }

  const ondeTem = celula ? doCruzamento(celula.cor, celula.tamanho).filter((l) => l.disponivel > 0) : []

  return (
    <div className="space-y-8">
      <Campo id="consulta-busca" rotulo="Peça" dica="Mostra o disponível de cada cor e tamanho nesta loja e na rede toda.">
        <Input
          id="consulta-busca"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setProduto(null); setCelula(null) }}
          placeholder="Etiqueta ou nome da peça"
          autoComplete="off"
          className="max-w-md"
        />
        {!produto && produtos.length > 0 && (
          <ul className="max-h-72 max-w-md overflow-y-auto border">
            {produtos.map((nome) => (
              <li key={nome}>
                <button type="button" onClick={() => escolher(nome)} className="w-full px-3 py-2 text-left text-sm hover:bg-superficie">
                  {nome}
                </button>
              </li>
            ))}
          </ul>
        )}
        {achadas.erro && <Aviso mensagem={achadas.erro} />}
        {!produto && achadas.dados && produtos.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça com esse nome.</p>}
      </Campo>

      {estoque.erro && <Aviso mensagem={estoque.erro} />}
      {estoque.carregando && produto && <Carregando />}

      {produto && estoque.dados && (
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-3">
            <h2 className="text-2xl font-medium">{produto}</h2>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-6 text-left font-medium">Cor</th>
                    {tamanhos.map((t) => <th key={t} className="w-20 px-2 text-center font-medium">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cores.map((cor) => (
                    <tr key={cor} className="border-b">
                      <th scope="row" className="py-2 pr-6 text-left font-normal">
                        <NomePeca produto={cor} />
                      </th>
                      {tamanhos.map((tamanho) => {
                        const doCruz = doCruzamento(cor, tamanho)
                        if (doCruz.length === 0) return <td key={tamanho} className="px-2 text-center text-muted-foreground">—</td>
                        const ativa = celula?.cor === cor && celula?.tamanho === tamanho
                        const aqui = nestaLoja(doCruz)
                        const rede = somaDisponivel(doCruz)
                        return (
                          <td key={tamanho} className="p-1">
                            <button
                              type="button"
                              onClick={() => setCelula({ cor, tamanho })}
                              aria-pressed={ativa}
                              aria-label={`${cor}, ${tamanho}: ${aqui} aqui, ${rede} na rede`}
                              className={cn('w-full px-2 py-1.5 text-center hover:bg-superficie', ativa && 'bg-superficie ring-1 ring-foreground')}
                            >
                              <span className={cn('block text-base font-medium tabular-nums', aqui === 0 && 'text-muted-foreground')}>{aqui}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">rede {rede}</span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Em cima, o disponível na loja física da {loja.nome}; embaixo, a soma de todas as unidades e canais.
            </p>
          </div>

          <div className="lg:border-l lg:pl-8">
            {celula ? (
              <div className="space-y-3">
                <p className="font-medium">{celula.cor}, {celula.tamanho}</p>
                {ondeTem.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem peça disponível em nenhuma unidade.</p>
                ) : (
                  <ul className="text-sm">
                    {ondeTem.map((l) => (
                      <li key={`${l.id_unidade}-${l.canal}`} className={cn('flex justify-between gap-3 border-b py-2', l.id_unidade === loja.id_unidade && 'font-medium')}>
                        <span>{l.unidade}, {CANAIS[l.canal].toLowerCase()}</span>
                        <span className="tabular-nums">{l.disponivel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escolha uma cor e tamanho para ver onde tem.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Troca ou devolução ----------

const PRAZO_TROCA_DIAS = 30
const BUSCAS = {
  codigo_venda: { rotulo: 'Código da venda', dica: 'O código da notinha ou do pedido, como CL...' },
  cpf: { rotulo: 'CPF', dica: 'Mostra os pedidos entregues nos últimos 30 dias, pela conta ou pelo CPF na nota.' },
  id_pedido: { rotulo: 'Número do pedido', dica: 'O número que aparece no painel de pedidos.' },
}

function prazoTroca(pedido) {
  if (!pedido.entregue_em) return null
  return new Date(new Date(pedido.entregue_em).getTime() + PRAZO_TROCA_DIAS * 86400000)
}

// por que o pedido não aceita troca nem devolução (null = aceita); o backend confere de novo
function motivoBloqueio(pedido, loja) {
  if (pedido.status !== 'entregue') return 'Só pedido entregue tem troca ou devolução.'
  if (prazoTroca(pedido) < new Date()) return `Passou o prazo de ${PRAZO_TROCA_DIAS} dias após a entrega.`
  if (pedido.devolucao === 'total') return 'Todas as peças deste pedido já foram devolvidas.'
  if (loja.tipo !== 'loja') return 'Troca e devolução são feitas numa loja.'
  return null
}

// quanto ainda dá para estornar de cada pagamento aprovado (valor menos os estornos já feitos)
function estornaveis(pedido) {
  return pedido.pagamentos
    .filter((p) => p.tipo === 'pagamento' && p.status === 'aprovado')
    .map((p) => {
      const estornado = pedido.pagamentos
        .filter((e) => e.id_pagamento_original === p.id_pagamento && e.status !== 'recusado')
        .reduce((t, e) => t + Number(e.valor), 0)
      return { pagamento: p, restante: Math.round((Number(p.valor) - estornado) * 100) / 100 }
    })
    .filter((p) => p.restante > 0)
}

// reparte o valor da devolução pelos pagamentos, na ordem em que foram feitos (mesmo meio de pagamento)
function repartirEstorno(pedido, valor) {
  const estornos = []
  let falta = Math.round(valor * 100) / 100
  for (const { pagamento, restante } of estornaveis(pedido)) {
    if (falta <= 0) break
    const parte = Math.min(falta, restante)
    estornos.push({ id_pagamento: pagamento.id_pagamento, metodo: pagamento.metodo, valor: parte.toFixed(2) })
    falta = Math.round((falta - parte) * 100) / 100
  }
  return { estornos, falta }
}

function TrocaOuDevolucao({ loja }) {
  const [tipoBusca, setTipoBusca] = useState('codigo_venda')
  const [termo, setTermo] = useState('')
  const [filtro, setFiltro] = useState(null)
  const [idEscolhido, setIdEscolhido] = useState(null)
  const [feito, setFeito] = useState(null)

  const busca = useCarregar(() => (filtro ? api('/balcao/pedidos', { params: filtro }) : null), [JSON.stringify(filtro)])
  const achados = busca.dados?.items ?? []
  const escolhido = achados.length === 1 ? achados[0] : achados.find((p) => p.id_pedido === idEscolhido)

  function buscar(evento) {
    evento.preventDefault()
    const valor = tipoBusca === 'codigo_venda' ? termo.trim().toUpperCase() : soDigitos(termo)
    setIdEscolhido(null)
    setFiltro({ [tipoBusca]: valor })
  }

  function recomecar() {
    setFeito(null)
    setFiltro(null)
    setTermo('')
    setIdEscolhido(null)
  }

  if (feito) return <ComprovanteFeito feito={feito} loja={loja} aoRecomecar={recomecar} />

  const termoOk = tipoBusca === 'cpf' ? soDigitos(termo).length === 11 : tipoBusca === 'id_pedido' ? soDigitos(termo).length > 0 : termo.trim().length > 0

  return (
    <div className="space-y-8">
      <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
        <Campo id="troca-tipo" rotulo="Buscar por" className="w-48">
          <Select id="troca-tipo" value={tipoBusca} onChange={(e) => { setTipoBusca(e.target.value); setTermo('') }}>
            {Object.entries(BUSCAS).map(([valor, { rotulo }]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </Select>
        </Campo>
        <Campo id="troca-termo" rotulo={BUSCAS[tipoBusca].rotulo} dica={BUSCAS[tipoBusca].dica} className="w-full max-w-sm">
          <Input
            id="troca-termo"
            value={termo}
            onChange={(e) => setTermo(tipoBusca === 'cpf' ? mascaraCpf(e.target.value) : e.target.value)}
            inputMode={tipoBusca === 'codigo_venda' ? 'text' : 'numeric'}
            placeholder={tipoBusca === 'cpf' ? '000.000.000-00' : undefined}
            autoComplete="off"
          />
        </Campo>
        <Button type="submit" variant="outline" size="lg" className="mb-5 h-9 px-4" disabled={!termoOk || busca.carregando}>Buscar</Button>
      </form>

      {busca.erro && <Aviso mensagem={busca.erro} />}
      {busca.carregando && filtro && <Carregando />}
      {busca.dados && achados.length === 0 && <Vazio>Nenhum pedido entregue nos últimos 30 dias com esse CPF. Tente pelo código da notinha.</Vazio>}

      {achados.length > 1 && (
        <ul className="max-w-2xl border-t">
          {achados.map((p) => (
            <li key={p.id_pedido}>
              <button
                type="button"
                onClick={() => setIdEscolhido(p.id_pedido)}
                aria-current={escolhido?.id_pedido === p.id_pedido ? 'true' : undefined}
                className={cn('flex w-full items-center justify-between gap-3 border-b px-3 py-3 text-left text-sm hover:bg-superficie', escolhido?.id_pedido === p.id_pedido && 'bg-superficie')}
              >
                <span className="flex items-center gap-2">
                  <Etiqueta>{p.codigo_venda}</Etiqueta>
                  <span>{p.unidade}, entregue em {dataCurta(p.entregue_em)}</span>
                </span>
                <span className="tabular-nums">{moeda(p.valor_total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {escolhido && (
        <AtenderPedido
          key={`${escolhido.id_pedido}-${escolhido.devolucao}`}
          pedido={escolhido}
          loja={loja}
          aoConcluir={setFeito}
        />
      )}
    </div>
  )
}

function AtenderPedido({ pedido, loja, aoConcluir }) {
  const [modo, setModo] = useState('troca')
  // quantidade escolhida e variante nova de cada item, por id_item
  const [quantidades, setQuantidades] = useState({})
  const [novas, setNovas] = useState({})
  const { enviar, enviando, erro } = useEnviar()
  const bloqueio = motivoBloqueio(pedido, loja)

  // na troca, as outras cores e tamanhos do mesmo produto com saldo na loja física desta loja
  const nomes = [...new Set(pedido.itens.map((i) => i.produto))]
  const opcoes = useCarregar(
    () => (modo === 'troca' && !bloqueio
      ? Promise.all(nomes.map((nome) => api('/balcao/estoque', {
        params: { id_unidade: loja.id_unidade, canal: 'loja_fisica', busca: nome, limit: 200 },
      }))).then((paginas) => paginas.flatMap((p) => p.items))
      : null),
    [modo, loja.id_unidade, nomes.join('|'), Boolean(bloqueio)],
  )
  const opcoesDoItem = (item) => (opcoes.dados ?? []).filter((l) => l.produto === item.produto && l.id_variante !== item.id_variante && l.disponivel > 0)

  const escolhidos = pedido.itens
    .map((item) => ({ item, quantidade: Number(quantidades[item.id_item] || 0), nova: novas[item.id_item] }))
    .filter((e) => e.quantidade > 0)
  const valorDevolvido = escolhidos.reduce((t, e) => t + Number(e.item.preco_unitario) * e.quantidade, 0)
  const { estornos, falta } = repartirEstorno(pedido, valorDevolvido)

  const quantidadesOk = escolhidos.length > 0 && escolhidos.every((e) => e.quantidade <= e.item.quantidade)
  const pronto = !bloqueio && quantidadesOk && (modo === 'troca' ? escolhidos.every((e) => e.nova) : falta <= 0)

  async function registrar(evento) {
    evento.preventDefault()
    const itens = escolhidos.map((e) => ({
      id_variante: e.item.id_variante,
      quantidade: e.quantidade,
      ...(modo === 'troca' && { id_variante_nova: Number(e.nova) }),
    }))
    const corpo = modo === 'troca'
      ? { id_unidade: loja.id_unidade, itens }
      : { id_unidade: loja.id_unidade, itens, estornos: estornos.map(({ id_pagamento, valor }) => ({ id_pagamento, valor })) }
    const resposta = await enviar(() => api(`/balcao/pedidos/${pedido.id_pedido}/${modo === 'troca' ? 'troca' : 'devolucao'}`, { metodo: 'POST', corpo }))
    if (!resposta) return
    const variantes = Object.fromEntries((opcoes.dados ?? []).map((l) => [l.id_variante, l]))
    aoConcluir({
      modo,
      pedido: resposta,
      linhas: escolhidos.map((e) => ({ ...e, nova: e.nova ? variantes[e.nova] : null })),
      estornos: modo === 'devolucao' ? estornos : [],
    })
  }

  const prazo = prazoTroca(pedido)

  return (
    <form onSubmit={registrar} className="max-w-4xl space-y-6">
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

      <Abas
        rotulo="Tipo de atendimento"
        valor={modo}
        aoMudar={setModo}
        abas={[{ valor: 'troca', rotulo: 'Troca' }, { valor: 'devolucao', rotulo: 'Devolução' }]}
      />

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
        <div className="space-y-1 border-l-4 border-aco bg-aco/10 p-4 text-sm">
          <p className="font-medium">Estorno de {moeda(valorDevolvido)}, pelo mesmo meio do pagamento</p>
          {estornos.map((e) => (
            <p key={e.id_pagamento} className="text-muted-foreground">{METODOS_PAGAMENTO[e.metodo] ?? e.metodo}: {moeda(e.valor)}</p>
          ))}
          {falta > 0 && <p className="text-destructive">Os pagamentos do pedido só cobrem {moeda(valorDevolvido - falta)} de estorno. Diminua as peças ou faça a devolução pelo Atendimento.</p>}
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

// comprovante da troca ou devolução: abre para imprimir na hora, como a notinha da venda
function ComprovanteFeito({ feito, loja, aoRecomecar }) {
  const { imprimiu, imprimir } = useImprimirAoAbrir()
  const troca = feito.modo === 'troca'
  const [momento] = useState(() => new Date().toISOString())

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-lg font-medium">{troca ? 'Troca registrada' : 'Devolução registrada'}</p>
        <p className="text-sm text-muted-foreground">
          {imprimiu ? 'Se o comprovante não saiu, imprima de novo antes do próximo atendimento.' : 'Abrindo a impressão do comprovante...'}
        </p>
      </div>

      <section aria-label="Comprovante" className="notinha space-y-4 border bg-white p-5 text-sm text-foreground">
        <div className="space-y-0.5 text-center">
          <p className="font-logo uppercase tracking-[0.3em]">Casa Lorenzi</p>
          <p>{loja.nome}</p>
          <p>{dataHora(momento)}</p>
        </div>
        <p className="text-center font-medium">
          {troca ? 'Comprovante de troca' : 'Comprovante de devolução'}
          <span className="block font-normal">Venda <span className="tabular-nums">{feito.pedido.codigo_venda}</span></span>
        </p>
        <ul className="space-y-2">
          {feito.linhas.map(({ item, quantidade, nova }) => (
            <li key={item.id_item}>
              {quantidade} × {item.produto}
              <span className="block text-xs">Devolveu: {item.cor}, {item.tamanho}</span>
              {nova && <span className="block text-xs">Levou: {nova.cor}, {nova.tamanho}</span>}
            </li>
          ))}
        </ul>
        {feito.estornos.length > 0 && (
          <div className="space-y-1 border-t border-dashed border-foreground pt-3">
            {feito.estornos.map((e) => (
              <p key={e.id_pagamento} className="flex justify-between">
                <span>Estorno em {(METODOS_PAGAMENTO[e.metodo] ?? e.metodo).toLowerCase()}</span>
                <span className="tabular-nums">{moeda(e.valor)}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="lg" className="h-11 px-4" onClick={imprimir}>
          <Printer aria-hidden="true" /> Imprimir de novo
        </Button>
        <Button type="button" size="lg" className="h-11 px-5" disabled={!imprimiu} onClick={aoRecomecar}>
          Novo atendimento
        </Button>
      </div>
    </div>
  )
}
