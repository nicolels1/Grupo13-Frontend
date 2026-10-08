import { useState, type ReactNode, type SubmitEvent } from 'react'
import { Check, ChevronDown, CircleAlert, Package, PackageCheck, Star, Store, Truck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Status } from '@/components/Status'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { corDaPeca } from '@/lib/cores'
import { dataCurta, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { guardarPedidoEmAberto } from './checkout/pedidoEmAberto'
import { rotuloTamanho } from './componentes/tamanhos'
import { EM_ANDAMENTO, pecasParaAvaliar, pedidosDoCliente, resumoDosPedidos } from './conta/pedidosDaConta'

type Pedido = Esquema<'PedidoSaida'>
type Item = Pedido['itens'][number]
type Aba = 'todos' | 'andamento' | 'entregues' | 'cancelados'

// quantos pedidos a página traz; quem tem mais vê "Mostrar mais pedidos"
const LIMITE = 50

// motivos do banco (CHECK de pedido.motivo_cancelamento), escritos para o cliente
const MOTIVOS_DO_CANCELAMENTO: Record<string, string> = {
  cliente: 'Você cancelou este pedido.',
  reserva_vencida: 'Cancelado porque o pagamento não foi concluído em 15 minutos.',
  retirada_vencida: 'Cancelado porque o pedido não foi retirado em 7 dias. O valor foi estornado.',
  equipe: 'Cancelado pela nossa equipe. Se tiver dúvida, fale com a gente.',
}

// cor do ícone do pedido pela situação: terracota pede ação, aço anda, marinho terminou, cinza cancelou
const COR_DA_SITUACAO: Record<string, string> = {
  aguardando_pagamento: 'bg-terracota-fundo text-terracota',
  pago: 'bg-aco-fundo text-aco',
  enviado: 'bg-aco-fundo text-aco',
  pronto_para_retirada: 'bg-aco-fundo text-aco',
  entregue: 'bg-marinho text-white',
  cancelado: 'bg-superficie text-muted-foreground',
}

// Meus pedidos: compras do site e das lojas (CPF na nota ou código da notinha), mais recentes primeiro.
// Resumo do que pede atenção, abas por situação e cada pedido numa linha que abre os detalhes
export function MeusPedidos() {
  const local = useLocation()
  const comprasLigadas = (local.state as { comprasLigadas?: number } | null)?.comprasLigadas ?? 0
  const [quantos, setQuantos] = useState(LIMITE)
  const [abaEscolhida, setAbaEscolhida] = useState<Aba | null>(null)
  const [aberto, setAberto] = useState<number | null>(null)
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => api<Esquema<'Pagina_PedidoSaida_'>>('/pedidos', { params: { limit: quantos } }),
    [quantos],
  )
  // sem os cancelados que nunca foram pagos (ver pedidosDoCliente)
  const pedidos = pedidosDoCliente(dados?.items ?? [])
  const resumo = resumoDosPedidos(pedidos)
  // abre em "Em andamento" quando há algo andando; senão, em "Todos"
  const aba: Aba = abaEscolhida ?? (resumo.aguardando + resumo.aCaminho > 0 ? 'andamento' : 'todos')
  const visiveis = pedidos.filter((p) => {
    if (aba === 'andamento') return EM_ANDAMENTO.includes(p.status)
    if (aba === 'entregues') return p.status === 'entregue'
    if (aba === 'cancelados') return p.status === 'cancelado'
    return true
  })
  const todasAsAbas: { valor: Aba; rotulo: string; quantos: number }[] = [
    { valor: 'todos', rotulo: 'Todos', quantos: pedidos.length },
    { valor: 'andamento', rotulo: 'Em andamento', quantos: resumo.aguardando + resumo.aCaminho },
    { valor: 'entregues', rotulo: 'Entregues', quantos: resumo.entregues },
    { valor: 'cancelados', rotulo: 'Cancelados', quantos: resumo.cancelados },
  ]
  // "Cancelados" só aparece quando há pedido cancelado depois de pago
  const abas = todasAsAbas.filter((a) => a.valor !== 'cancelados' || a.quantos > 0)

  // dentro da área "Minha conta": a faixa do título e o menu das seções vêm de AreaDaConta
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="font-titulo text-3xl">Meus pedidos</h1>
        {dados && <span className="text-sm text-muted-foreground">{plural(pedidos.length, 'pedido')}</span>}
      </div>

      {comprasLigadas > 0 && (
        <p role="status" className="flex items-start gap-3 rounded-xl bg-aco-fundo p-4 text-sm">
          <Store className="mt-0.5 size-4 shrink-0 text-aco" aria-hidden="true" />
          Encontramos {plural(comprasLigadas, 'compra feita', 'compras feitas')} em lojas com o seu CPF. Elas já estão aqui.
        </p>
      )}

      {erro && <Aviso mensagem={erro} />}
      {!dados && carregando && <Carregando />}
      {dados && pedidos.length === 0 && (
        <div className="space-y-4 rounded-xl border bg-background p-8 text-center shadow-xs">
          <p>Você ainda não tem pedidos.</p>
          <Link to="/loja/produtos" className={cn(buttonVariants({ variant: 'outline', size: 'loja' }), 'rounded-full')}>Ver as peças</Link>
        </div>
      )}

      {/* resumos e lista numa coluna e, ao lado, o cartão para avaliar a última peça (no celular, embaixo).
          As duas colunas têm a mesma altura: a lista estica até o fim do cartão */}
      {pedidos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Resumo
                cor="bg-terracota-fundo text-terracota"
                icone={<CircleAlert className="size-5" aria-hidden="true" />}
                numero={resumo.aguardando}
                texto="aguardando pagamento"
                aoClicar={() => setAbaEscolhida('andamento')}
              />
              <Resumo
                cor="bg-aco-fundo text-aco"
                icone={<Truck className="size-5" aria-hidden="true" />}
                numero={resumo.aCaminho}
                texto={resumo.aCaminho === 1 ? 'pedido a caminho' : 'pedidos a caminho'}
                aoClicar={() => setAbaEscolhida('andamento')}
              />
              <Resumo
                cor="bg-ardosia-clara text-marinho"
                icone={<Star className="size-5" aria-hidden="true" />}
                numero={resumo.paraAvaliar}
                texto={resumo.paraAvaliar === 1 ? 'peça para avaliar' : 'peças para avaliar'}
                aoClicar={() => setAbaEscolhida('entregues')}
              />
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border bg-background shadow-xs">
              <div role="tablist" aria-label="Filtrar pedidos" className="flex overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {abas.map((a) => (
                  <button
                    key={a.valor}
                    type="button"
                    role="tab"
                    aria-selected={aba === a.valor}
                    onClick={() => setAbaEscolhida(a.valor)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm whitespace-nowrap',
                      aba === a.valor ? 'border-marinho font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {a.rotulo}
                    <span className={cn('rounded-full px-2 text-xs tabular-nums', aba === a.valor ? 'bg-marinho text-white' : 'bg-superficie')}>
                      {a.quantos}
                    </span>
                  </button>
                ))}
              </div>

              {visiveis.length === 0 ? (
                <p role="tabpanel" className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido aqui.</p>
              ) : (
                // até uns 5 pedidos à vista (cada linha tem perto de 4,75rem); com mais, a lista rola por dentro
                // e o cartão não cresce sem fim. tabIndex deixa rolar pelo teclado
                <ul role="tabpanel" tabIndex={0} className="max-h-[24rem] divide-y overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                  {visiveis.map((pedido) => (
                    <li key={pedido.id_pedido}>
                      <LinhaPedido
                        pedido={pedido}
                        aberto={aberto === pedido.id_pedido}
                        aoAlternar={() => setAberto((atual) => (atual === pedido.id_pedido ? null : pedido.id_pedido))}
                        aoMudar={recarregar}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <AvaliarUltimaPeca pedidos={pedidos} aoVerTodas={() => setAbaEscolhida('entregues')} />
        </div>
      )}

      {/* compara com o que veio da API, não com o que aparece */}
      {dados && dados.items.length < dados.total && (
        <div className="text-center">
          <Button variant="outline" size="loja" className="rounded-full" onClick={() => setQuantos((n) => n + LIMITE)} disabled={carregando}>
            Mostrar mais pedidos
          </Button>
        </div>
      )}

      <Reivindicar aoReivindicar={recarregar} />
    </div>
  )
}

// cartão do resumo: ícone num quadrado na cor do assunto, número grande e o que pede atenção; clicar filtra a lista
// (no celular os três cabem lado a lado: ícone em cima, número e texto embaixo)
function Resumo({ cor, icone, numero, texto, aoClicar }: {
  cor: string
  icone: ReactNode
  numero: number
  texto: string
  aoClicar: () => void
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border bg-background p-3 text-left shadow-xs transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-4',
        numero === 0 && 'opacity-60',
      )}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-11', cor)}>{icone}</span>
      <span>
        <span className="block text-xl font-medium tabular-nums sm:text-2xl">{numero}</span>
        <span className="block text-xs leading-snug text-muted-foreground sm:text-sm">{texto}</span>
      </span>
    </button>
  )
}

// cartão ardósia ao lado da lista: a peça entregue mais recente que ainda não foi avaliada, com as
// estrelas que já abrem "Escrever avaliação" com a nota marcada. Sem nada para avaliar, explica quando
// o cartão vai servir, para o espaço não ficar vazio
function AvaliarUltimaPeca({ pedidos, aoVerTodas }: { pedidos: Pedido[]; aoVerTodas: () => void }) {
  const [realce, setRealce] = useState(0)
  const pendentes = pecasParaAvaliar(pedidos)
  const ultima = pendentes[0]

  return (
    <aside aria-labelledby="titulo-avaliar" className="space-y-5 rounded-xl bg-ardosia p-6 text-white shadow-xs">
      <span className="flex size-11 items-center justify-center rounded-lg bg-white/15">
        <Star className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h2 id="titulo-avaliar" className="font-titulo text-2xl leading-tight">
          {ultima ? 'Como ficou a sua compra?' : 'Nada para avaliar agora'}
        </h2>
        <p className="text-sm text-white/90">
          {ultima ? 'Sua nota ajuda quem vai comprar depois.' : 'Quando um pedido chegar, você dá a nota das peças por aqui.'}
        </p>
      </div>

      {ultima && (
        <>
          <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
            <span
              className="size-9 shrink-0 rounded-full ring-2 ring-white/50"
              style={{ backgroundColor: corDaPeca(ultima.item.cor) }}
              aria-hidden="true"
            />
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium">{ultima.item.produto}</span>
              <span className="text-white/90">{ultima.item.cor}, tamanho {rotuloTamanho(ultima.item.tamanho)}</span>
            </span>
          </div>

          {/* cada estrela é um link; passar o mouse (ou o foco) acende até ela, como na nota de verdade */}
          <div className="flex gap-1" onMouseLeave={() => setRealce(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Link
                key={n}
                to={`/loja/avaliar/${ultima.item.id_item}?pedido=${ultima.pedido.id_pedido}&nota=${n}`}
                aria-label={`Dar ${n} ${n === 1 ? 'estrela' : 'estrelas'} para ${ultima.item.produto}`}
                onMouseEnter={() => setRealce(n)}
                onFocus={() => setRealce(n)}
                onBlur={() => setRealce(0)}
                className="flex size-10 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-white"
              >
                <Star className={cn('size-7 transition-colors', n <= realce && 'fill-white')} aria-hidden="true" />
              </Link>
            ))}
          </div>

          {pendentes.length > 1 && (
            <button type="button" onClick={aoVerTodas} className="text-sm font-medium underline underline-offset-4">
              E mais {plural(pendentes.length - 1, 'peça', 'peças')} para avaliar
            </button>
          )}
        </>
      )}
    </aside>
  )
}

// compra na loja sem CPF: o código da notinha liga a compra à conta (uma vez só)
function Reivindicar({ aoReivindicar }: { aoReivindicar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ligado, setLigado] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function ligar(evento: SubmitEvent) {
    evento.preventDefault()
    const pedido = await enviar(() =>
      api<Pedido>('/pedidos/reivindicar', { metodo: 'POST', corpo: { codigo_venda: codigo.trim().toUpperCase() } }),
    )
    if (pedido) {
      setLigado(pedido.codigo_venda)
      setCodigo('')
      setAberto(false)
      aoReivindicar()
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-background p-5 shadow-xs">
      {ligado && <Sucesso>A compra {ligado} agora está na sua conta.</Sucesso>}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Store className="size-4 text-aco" aria-hidden="true" />
        Comprou numa loja sem informar o CPF?
        <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      {aberto && (
        <form onSubmit={(e) => void ligar(e)} className="space-y-3 pt-2">
          <label htmlFor="codigo-notinha" className="block text-sm font-medium">Código da compra</label>
          <p id="dica-codigo" className="text-sm text-muted-foreground">Está impresso na notinha que a loja entregou.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="codigo-notinha"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              aria-describedby={erro ? 'dica-codigo erro-codigo' : 'dica-codigo'}
              aria-invalid={Boolean(erro) || undefined}
              className="h-11 uppercase sm:max-w-xs"
              required
            />
            <Button type="submit" variant="outline" size="loja" className="rounded-full" disabled={enviando || !codigo.trim()}>
              {enviando ? 'Ligando...' : 'Ligar à minha conta'}
            </Button>
          </div>
          {erro && <p id="erro-codigo" role="alert" className="text-sm text-ferrugem">{erro}</p>}
        </form>
      )}
    </div>
  )
}

// uma linha por pedido: cores das peças, número, data, total, situação e a ação do momento;
// "Ver detalhes" abre a linha do tempo, as peças, onde e como pagou, e as outras ações
function LinhaPedido({ pedido, aberto, aoAlternar, aoMudar }: {
  pedido: Pedido
  aberto: boolean
  aoAlternar: () => void
  aoMudar: () => void
}) {
  const navegar = useNavigate()
  const naLoja = pedido.canal === 'loja_fisica'
  const cancelado = pedido.status === 'cancelado'
  const pecas = pedido.itens.reduce((soma, i) => soma + i.quantidade, 0)
  const paraAvaliar = pedido.status === 'entregue' ? pedido.itens.find((i) => i.id_avaliacao === null) : undefined
  const pagamento = pedido.pagamentos.find((p) => p.tipo === 'pagamento' && p.status === 'aprovado')
  const idDetalhes = `detalhes-${pedido.id_pedido}`

  // a reserva tem 15 minutos: o checkout retoma o mesmo pedido em vez de reservar de novo
  function continuarPagamento() {
    guardarPedidoEmAberto(pedido.id_pedido)
    navegar('/loja/checkout')
  }

  return (
    <article aria-labelledby={`pedido-${pedido.id_pedido}`}>
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4', cancelado && 'text-muted-foreground')}>
        <span
          className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', COR_DA_SITUACAO[pedido.status] ?? 'bg-superficie')}
          aria-hidden="true"
        >
          <Package className="size-5" />
        </span>

        {/* basis: o número e a data nunca ficam espremidos; sem espaço, preço e ações descem para a linha de baixo */}
        <div className="min-w-0 flex-1 basis-48">
          <h2 id={`pedido-${pedido.id_pedido}`} className="font-medium tabular-nums">Pedido {pedido.codigo_venda}</h2>
          <p className="text-sm text-muted-foreground">
            {dataCurta(pedido.criado_em)}, {plural(pecas, 'peça', 'peças')},{' '}
            {naLoja ? `na ${pedido.unidade}` : pedido.modalidade === 'retirada' ? 'retirada na loja' : 'entrega em casa'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-medium tabular-nums">{moeda(pedido.valor_total)}</span>
          <Status tipo="pedido" valor={pedido.status} />
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {pedido.status === 'aguardando_pagamento' && <Button onClick={continuarPagamento}>Continuar pagamento</Button>}
          {paraAvaliar && (
            <Link
              to={`/loja/avaliar/${paraAvaliar.id_item}?pedido=${pedido.id_pedido}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Star className="size-4" aria-hidden="true" />
              Avaliar
            </Link>
          )}
          <button
            type="button"
            onClick={aoAlternar}
            aria-expanded={aberto}
            aria-controls={idDetalhes}
            className="flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {aberto ? 'Fechar' : 'Ver detalhes'}
            <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', aberto && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {aberto && (
        <div id={idDetalhes} className="space-y-5 border-t bg-superficie px-5 py-5">
          {!naLoja && !cancelado && <LinhaDoTempo pedido={pedido} />}
          {cancelado && pedido.motivo_cancelamento && (
            <p className="text-sm">{MOTIVOS_DO_CANCELAMENTO[pedido.motivo_cancelamento] ?? 'Pedido cancelado.'}</p>
          )}

          <ul className="divide-y rounded-lg bg-background px-4">
            {pedido.itens.map((item) => (
              <ItemDoPedido key={item.id_item} item={item} pedido={pedido} podeAvaliar={pedido.status === 'entregue'} />
            ))}
          </ul>

          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">
                {naLoja ? 'Comprado em' : pedido.modalidade === 'retirada' ? 'Retirada em' : 'Entrega em'}
              </dt>
              <dd>
                {pedido.endereco_entrega
                  ? `${pedido.endereco_entrega.rua}, ${pedido.endereco_entrega.numero}, ${pedido.endereco_entrega.cidade} (${pedido.endereco_entrega.uf})`
                  : pedido.unidade}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pagamento</dt>
              <dd>{pagamento ? METODOS_PAGAMENTO[pagamento.metodo] ?? pagamento.metodo : cancelado ? 'Não cobrado' : 'Pendente'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd>
                {moeda(pedido.valor_total)}
                {Number(pedido.valor_frete) > 0 && <span className="text-muted-foreground"> (frete {moeda(pedido.valor_frete)})</span>}
              </dd>
            </div>
          </dl>

          <AcoesDoPedido pedido={pedido} aoMudar={aoMudar} />
        </div>
      )}
    </article>
  )
}

// Pago → Enviado (ou Pronto para retirada) → Entregue, com a data de cada etapa já cumprida
function LinhaDoTempo({ pedido }: { pedido: Pedido }) {
  const etapas = [
    { rotulo: 'Pago', em: pedido.pago_em },
    pedido.modalidade === 'retirada'
      ? { rotulo: 'Pronto para retirada', em: pedido.pronto_retirada_em }
      : { rotulo: 'Enviado', em: pedido.enviado_em },
    { rotulo: pedido.modalidade === 'retirada' ? 'Retirado' : 'Entregue', em: pedido.entregue_em },
  ]
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Andamento do pedido">
      {etapas.map(({ rotulo, em }) => (
        <li key={rotulo} className={cn('border-t-4 pt-2 text-sm', em ? 'border-aco' : 'border-border text-muted-foreground')}>
          <span className="flex items-center gap-1 font-medium">
            {em && <Check className="size-3.5 text-aco" aria-hidden="true" />}
            {rotulo}
          </span>
          <span className="block text-xs text-muted-foreground">{em ? dataCurta(em) : 'ainda não'}</span>
        </li>
      ))}
    </ol>
  )
}

function ItemDoPedido({ item, pedido, podeAvaliar }: { item: Item; pedido: Pedido; podeAvaliar: boolean }) {
  const destino = `/loja/avaliar/${item.id_item}?pedido=${pedido.id_pedido}`
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <span className="flex items-center gap-3">
        <span className="size-8 shrink-0 rounded-full" style={{ backgroundColor: corDaPeca(item.cor) }} aria-hidden="true" />
        <span>
          <span className="block">{item.quantidade}× {item.produto}</span>
          <span className="text-muted-foreground">{item.cor}, tamanho {rotuloTamanho(item.tamanho)}</span>
        </span>
      </span>
      <span className="flex items-center gap-4">
        <span className="tabular-nums">{moeda(Number(item.preco_unitario) * item.quantidade)}</span>
        {podeAvaliar && (
          <Link to={destino} className="font-medium underline underline-offset-4">
            {item.id_avaliacao ? 'Ver avaliação' : 'Avaliar'}
          </Link>
        )}
      </span>
    </li>
  )
}

// ações dentro dos detalhes; "Continuar pagamento" já fica na própria linha
function AcoesDoPedido({ pedido, aoMudar }: { pedido: Pedido; aoMudar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const ajuda = `/loja/chamados/novo?pedido=${pedido.id_pedido}`
  const naLoja = pedido.canal === 'loja_fisica'

  async function cancelar() {
    const feito = await enviar(() => api<Pedido>(`/pedidos/${pedido.id_pedido}/cancelar`, { metodo: 'POST' }))
    if (feito) aoMudar()
  }

  if (pedido.status === 'aguardando_pagamento') {
    return (
      <div className="space-y-3">
        {confirmando ? (
          <div role="group" aria-label="Confirmar cancelamento" className="flex flex-wrap items-center gap-3 rounded-lg bg-background p-4 text-sm">
            <span>Cancelar este pedido? As peças voltam para o estoque.</span>
            <Button variant="destructive" onClick={() => void cancelar()} disabled={enviando}>Sim, cancelar</Button>
            <Button variant="outline" onClick={() => setConfirmando(false)}>Voltar</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="text-sm underline underline-offset-4">
            Cancelar pedido
          </button>
        )}
        {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
      </div>
    )
  }

  // compra do site troca pelo chamado; compra da loja troca no balcão de qualquer loja (case)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {pedido.status === 'entregue' && !naLoja && (
        <Link to={`${ajuda}&categoria=troca_devolucao`} className="flex items-center gap-1.5 font-medium underline underline-offset-4">
          <PackageCheck className="size-4" aria-hidden="true" />
          Trocar ou devolver
        </Link>
      )}
      {pedido.status === 'entregue' && naLoja && (
        <span className="text-muted-foreground">
          Para trocar ou devolver, leve a peça e o código {pedido.codigo_venda} a qualquer loja em até 30 dias.
        </span>
      )}
      {pedido.status !== 'cancelado' && (
        <Link to={ajuda} className="underline underline-offset-4">Preciso de ajuda com este pedido</Link>
      )}
    </div>
  )
}
