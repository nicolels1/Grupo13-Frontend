import { useState, type SubmitEvent } from 'react'
import { Check, ChevronDown, PackageCheck, Store } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Status } from '@/components/Status'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { dataCurta, dataLonga, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { guardarPedidoEmAberto } from './checkout/pedidoEmAberto'
import { rotuloTamanho } from './componentes/tamanhos'

type Pedido = Esquema<'PedidoSaida'>
type Item = Pedido['itens'][number]

const POR_PAGINA = 10

// Meus pedidos: compras do site e das lojas (CPF na nota ou código da notinha), mais recentes primeiro
export function MeusPedidos() {
  const local = useLocation()
  const comprasLigadas = (local.state as { comprasLigadas?: number } | null)?.comprasLigadas ?? 0
  const [quantos, setQuantos] = useState(POR_PAGINA)
  const { dados, erro, carregando, recarregar } = useCarregar(
    () => api<Esquema<'Pagina_PedidoSaida_'>>('/pedidos', { params: { limit: quantos } }),
    [quantos],
  )

  return (
    <>
      <div className="bg-ardosia text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="font-titulo text-4xl sm:text-5xl">Meus pedidos</h1>
          {dados && <p className="mt-2 text-sm text-white/85">{plural(dados.total, 'pedido')}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-8 sm:px-6">
        {comprasLigadas > 0 && (
          <p role="status" className="flex items-start gap-3 border-l-4 border-aco bg-aco-fundo p-4 text-sm">
            <Store className="mt-0.5 size-4 shrink-0 text-aco" aria-hidden="true" />
            Encontramos {plural(comprasLigadas, 'compra feita', 'compras feitas')} em lojas com o seu CPF. Elas já estão aqui.
          </p>
        )}

        <Reivindicar aoReivindicar={recarregar} />

        {erro && <Aviso mensagem={erro} />}
        {!dados && carregando && <Carregando />}
        {dados && dados.items.length === 0 && (
          <div className="space-y-4 border p-8 text-center">
            <p>Você ainda não tem pedidos.</p>
            <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Ver as peças</Link>
          </div>
        )}

        <ul className="space-y-5">
          {dados?.items.map((pedido) => (
            <li key={pedido.id_pedido}>
              <CartaoPedido pedido={pedido} aoMudar={recarregar} />
            </li>
          ))}
        </ul>

        {dados && dados.items.length < dados.total && (
          <div className="text-center">
            <Button variant="outline" size="loja" onClick={() => setQuantos((n) => n + POR_PAGINA)} disabled={carregando}>
              Mostrar mais pedidos
            </Button>
          </div>
        )}
      </div>
    </>
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
    <div className="space-y-3">
      {ligado && <Sucesso>A compra {ligado} agora está na sua conta.</Sucesso>}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex items-center gap-1 text-sm font-medium underline underline-offset-4"
      >
        Comprou numa loja sem informar o CPF?
        <ChevronDown className={cn('size-4 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      {aberto && (
        <form onSubmit={(e) => void ligar(e)} className="space-y-3 bg-superficie p-5">
          <label htmlFor="codigo-notinha" className="block text-sm font-medium">Código da compra</label>
          <p id="dica-codigo" className="text-sm text-muted-foreground">Está impresso na notinha que a loja entregou.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="codigo-notinha"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              aria-describedby={erro ? 'dica-codigo erro-codigo' : 'dica-codigo'}
              aria-invalid={Boolean(erro) || undefined}
              className="h-11 bg-background uppercase sm:max-w-xs"
              required
            />
            <Button type="submit" variant="outline" size="loja" disabled={enviando || !codigo.trim()}>
              {enviando ? 'Ligando...' : 'Ligar à minha conta'}
            </Button>
          </div>
          {erro && <p id="erro-codigo" role="alert" className="text-sm text-ferrugem">{erro}</p>}
        </form>
      )}
    </div>
  )
}

function CartaoPedido({ pedido, aoMudar }: { pedido: Pedido; aoMudar: () => void }) {
  const naLoja = pedido.canal === 'loja_fisica'
  const entregue = pedido.status === 'entregue'
  const aguardando = pedido.status === 'aguardando_pagamento'
  const pagamento = pedido.pagamentos.find((p) => p.tipo === 'pagamento' && p.status === 'aprovado')

  return (
    <article aria-labelledby={`pedido-${pedido.id_pedido}`} className="border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-superficie px-5 py-4">
        <div>
          <h2 id={`pedido-${pedido.id_pedido}`} className="font-medium tabular-nums">Pedido {pedido.codigo_venda}</h2>
          <p className="text-sm text-muted-foreground">
            {dataLonga(pedido.criado_em)},{' '}
            {naLoja ? `na ${pedido.unidade}` : pedido.modalidade === 'retirada' ? `retirada na ${pedido.unidade}` : 'entrega em casa'}
          </p>
        </div>
        <Status tipo="pedido" valor={pedido.status} />
      </header>

      <div className="space-y-5 p-5">
        {!naLoja && pedido.status !== 'cancelado' && <LinhaDoTempo pedido={pedido} />}
        {pedido.status === 'cancelado' && pedido.motivo_cancelamento && (
          <p className="text-sm text-muted-foreground">Cancelado: {pedido.motivo_cancelamento}</p>
        )}

        <ul className="divide-y">
          {pedido.itens.map((item) => (
            <ItemDoPedido key={item.id_item} item={item} pedido={pedido} podeAvaliar={entregue} />
          ))}
        </ul>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            {pagamento ? `${METODOS_PAGAMENTO[pagamento.metodo] ?? pagamento.metodo}` : aguardando ? 'Pagamento pendente' : ''}
            {Number(pedido.valor_frete) > 0 && `, frete de ${moeda(pedido.valor_frete)}`}
          </span>
          <span className="text-base font-medium tabular-nums">Total {moeda(pedido.valor_total)}</span>
        </div>

        <AcoesDoPedido pedido={pedido} aoMudar={aoMudar} />
      </div>
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
        <li key={rotulo} className={cn('border-t-4 pt-2 text-sm', em ? 'border-marinho' : 'border-border text-muted-foreground')}>
          <span className="flex items-center gap-1 font-medium">
            {em && <Check className="size-3.5 text-marinho" aria-hidden="true" />}
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
      <span>
        <span className="block">{item.quantidade}× {item.produto}</span>
        <span className="text-muted-foreground">{item.cor}, tamanho {rotuloTamanho(item.tamanho)}</span>
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

function AcoesDoPedido({ pedido, aoMudar }: { pedido: Pedido; aoMudar: () => void }) {
  const navegar = useNavigate()
  const [confirmando, setConfirmando] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const ajuda = `/loja/chamados/novo?pedido=${pedido.id_pedido}`

  // a reserva tem 15 minutos: o checkout retoma o mesmo pedido em vez de reservar de novo
  function continuarPagamento() {
    guardarPedidoEmAberto(pedido.id_pedido)
    navegar('/loja/checkout')
  }

  async function cancelar() {
    const feito = await enviar(() => api<Pedido>(`/pedidos/${pedido.id_pedido}/cancelar`, { metodo: 'POST' }))
    if (feito) aoMudar()
  }

  if (pedido.status === 'aguardando_pagamento') {
    return (
      <div className="space-y-3">
        {confirmando ? (
          <div role="group" aria-label="Confirmar cancelamento" className="flex flex-wrap items-center gap-3 bg-superficie p-4 text-sm">
            <span>Cancelar este pedido? As peças voltam para o estoque.</span>
            <Button variant="destructive" onClick={() => void cancelar()} disabled={enviando}>Sim, cancelar</Button>
            <Button variant="outline" onClick={() => setConfirmando(false)}>Voltar</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button size="loja" onClick={continuarPagamento}>Continuar pagamento</Button>
            <Button variant="outline" size="loja" onClick={() => setConfirmando(true)}>Cancelar pedido</Button>
          </div>
        )}
        {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
      </div>
    )
  }

  // compra do site troca pelo chamado; compra da loja troca no balcão de qualquer loja (case)
  const naLoja = pedido.canal === 'loja_fisica'
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
