import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, PackageCheck, Truck, UserPen, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Status } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Campo, Input, Textarea } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, ErroApi, type Esquema } from '@/lib/api'
import { dataCurta, dataHora, haQuanto, hora, mascaraCpf, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Pedido = Esquema<'PedidoSaida'>
type PaginaPedidos = Esquema<'Pagina_PedidoSaida_'>
type Cliente = Esquema<'ClienteResumo'>
type ClienteCorrigido = Esquema<'ClienteCorrigido'>
type Fila = 'preparar' | 'retirada' | 'enviados' | 'aguardando' | 'todos'

const POR_PAGINA = 25
// a retirada fica guardada por 7 dias depois de pronta; a partir de 5, a lista avisa que está perto de vencer
const PRAZO_RETIRADA_DIAS = 7
const AVISO_RETIRADA_DIAS = 5

// filas da área Pedidos (design, seção Pedidos): cada uma vira o filtro do GET /vendas/pedidos
const FILAS: { valor: Fila; rotulo: string; filtros: { status?: Pedido['status'] } }[] = [
  { valor: 'preparar', rotulo: 'Para preparar', filtros: { status: 'pago' } },
  { valor: 'retirada', rotulo: 'Esperando retirada', filtros: { status: 'pronto_para_retirada' } },
  { valor: 'enviados', rotulo: 'Enviados', filtros: { status: 'enviado' } },
  { valor: 'aguardando', rotulo: 'Aguardando pagamento', filtros: { status: 'aguardando_pagamento' } },
  { valor: 'todos', rotulo: 'Todos', filtros: {} },
]

// como o pedido chega à pessoa
function comoRecebe(p: Pedido) {
  if (p.canal === 'loja_fisica') return `Compra na ${p.unidade}`
  if (p.modalidade === 'retirada') return `Retirada na ${p.unidade}`
  return 'Entrega em casa'
}

const pecas = (p: Pedido) => p.itens.reduce((t, i) => t + i.quantidade, 0)
const diasDesde = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0)
const nomeDoCliente = (p: Pedido) => p.cliente ?? (p.cpf_nota ? `CPF ${mascaraCpf(p.cpf_nota)}` : 'Cliente sem cadastro')

export function Pedidos() {
  const { perfil } = useAuth()
  const { unidade } = useUnidadeEscolhida()
  const [params, setParams] = useSearchParams()
  const [fila, setFila] = useState<Fila>('preparar')
  const [offset, setOffset] = useState(0)
  const [corrigindo, setCorrigindo] = useState(false)
  const idVer = params.get('ver')
  const filtros = FILAS.find((f) => f.valor === fila)?.filtros ?? {}

  const lista = useCarregar(
    () => api<PaginaPedidos>('/vendas/pedidos', { params: { ...filtros, id_unidade: unidade, limit: POR_PAGINA, offset } }),
    [fila, unidade, offset],
  )
  // contagem de cada fila (só o total; "Todos" não precisa)
  const contagens = useCarregar(
    () => Promise.all(FILAS.map((f) => (f.valor === 'todos'
      ? Promise.resolve(null)
      : api<PaginaPedidos>('/vendas/pedidos', { params: { ...f.filtros, id_unidade: unidade, limit: 1 } }).then((r) => r.total)))),
    [unidade],
  )
  const itens = lista.dados?.items ?? []
  // o pedido aberto vem da lista; se não está na página (link direto), o detalhe busca sozinho
  const escolhido = itens.find((p) => String(p.id_pedido) === idVer) ?? (idVer ? null : itens[0])

  function ver(id: number) {
    setParams({ ver: String(id) }, { replace: true })
  }

  function aposMudar() {
    lista.recarregar()
    contagens.recarregar()
  }

  return (
    <>
      <Cabecalho
        titulo="Pedidos"
        subtitulo="Pedidos do site para separar, enviar, avisar que estão prontos e entregar."
        abas={
          <Abas
            semLinha
            rotulo="Filas de pedidos"
            valor={fila}
            aoMudar={(v) => { setFila(v); setOffset(0); setParams({}, { replace: true }) }}
            abas={FILAS.map((f, i) => ({ valor: f.valor, rotulo: f.rotulo, contagem: contagens.dados?.[i] }))}
          />
        }
      >
        {temPermissao(perfil, 'corrigir_cadastro_cliente') && (
          <Button variant="aco" size="lg" className="h-11 px-4" onClick={() => setCorrigindo(true)}>
            <UserPen aria-hidden="true" /> Corrigir cadastro de cliente
          </Button>
        )}
      </Cabecalho>

      <div className="grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="min-w-0">
          {lista.erro && <Aviso mensagem={lista.erro} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados && itens.length === 0 && <p className="py-8 text-sm text-muted-foreground">Nenhum pedido nesta fila.</p>}
          <ul>
            {itens.map((p) => (
              <ItemDaFila key={p.id_pedido} pedido={p} aberto={escolhido?.id_pedido === p.id_pedido} aoAbrir={() => ver(p.id_pedido)} />
            ))}
          </ul>
          <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="pedidos" />
        </div>

        <div className="min-w-0">
          {escolhido ? (
            <DetalhePedido key={`${escolhido.id_pedido}-${escolhido.status}`} pedido={escolhido} aoMudar={aposMudar} />
          ) : idVer ? (
            <PedidoPorLink key={idVer} idPedido={idVer} aoMudar={aposMudar} />
          ) : (
            lista.dados && <Vazio>Escolha um pedido na lista.</Vazio>
          )}
        </div>
      </div>

      <CorrigirCadastro aberto={corrigindo} aoFechar={() => setCorrigindo(false)} />
    </>
  )
}

// um pedido na lista: código e status, cliente, como recebe, peças, total e há quanto tempo
function ItemDaFila({ pedido: p, aberto, aoAbrir }: { pedido: Pedido; aberto: boolean; aoAbrir: () => void }) {
  const dias = diasDesde(p.pronto_retirada_em)
  const perto = p.status === 'pronto_para_retirada' && dias >= AVISO_RETIRADA_DIAS
  return (
    <li>
      <button
        type="button"
        onClick={aoAbrir}
        aria-current={aberto ? 'true' : undefined}
        className={cn('w-full space-y-1.5 border-b px-3 py-3 text-left text-sm hover:bg-superficie', aberto && 'bg-superficie')}
      >
        <span className="flex items-center justify-between gap-2">
          <Etiqueta>{p.codigo_venda}</Etiqueta>
          {perto ? <Etiqueta alerta>Vence em {plural(Math.max(0, PRAZO_RETIRADA_DIAS - dias), 'dia')}</Etiqueta> : <Status tipo="pedido" valor={p.status} />}
        </span>
        <span className="block font-medium">{nomeDoCliente(p)}</span>
        <span className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{comoRecebe(p)}, {plural(pecas(p), 'peça')}, {moeda(p.valor_total)}</span>
          <span className="shrink-0">{haQuanto(p.pago_em ?? p.criado_em)}</span>
        </span>
      </button>
    </li>
  )
}

// aberto por link (?ver=) quando o pedido não está na página da fila
function PedidoPorLink({ idPedido, aoMudar }: { idPedido: string; aoMudar: () => void }) {
  const pedido = useCarregar(() => api<Pedido>(`/vendas/pedidos/${idPedido}`), [idPedido])
  if (pedido.erro) return <Aviso mensagem={pedido.erro} />
  if (!pedido.dados) return <Carregando />
  return <DetalhePedido pedido={pedido.dados} aoMudar={() => { pedido.recarregar(); aoMudar() }} />
}

// etapas do pedido na ordem em que acontecem; cancelado substitui o que faltava
type Etapa = { rotulo: string; quando: string | null; feita: boolean; cancelada?: boolean }

function etapas(p: Pedido): Etapa[] {
  if (p.canal === 'loja_fisica') {
    return [{ rotulo: 'Vendido na loja', quando: p.entregue_em ?? p.criado_em, feita: true }]
  }
  const meio = p.modalidade === 'retirada'
    ? { rotulo: 'Pronto para retirada', quando: p.pronto_retirada_em }
    : { rotulo: 'Enviado', quando: p.enviado_em }
  const lista = [
    { rotulo: 'Pedido feito', quando: p.criado_em },
    { rotulo: 'Pago', quando: p.pago_em },
    meio,
    { rotulo: 'Entregue', quando: p.entregue_em },
  ].map((e) => ({ ...e, feita: Boolean(e.quando) }))
  if (p.status !== 'cancelado') return lista
  return [...lista.filter((e) => e.feita), { rotulo: 'Cancelado', quando: p.cancelado_em, feita: true, cancelada: true }]
}

// painel do pedido (design, seção Pedidos): a ação do momento, os itens, o pagamento, a entrega
// e "Cancelar pedido" com motivo
function DetalhePedido({ pedido: p, aoMudar }: { pedido: Pedido; aoMudar: () => void }) {
  const { perfil } = useAuth()
  const [feito, setFeito] = useState<string | null>(null)
  const podeCancelar = temPermissao(perfil, 'cancelar_pedido_equipe') && ['aguardando_pagamento', 'pago', 'pronto_para_retirada'].includes(p.status)
  const pagamentos = p.pagamentos.filter((x) => x.tipo === 'pagamento')
  const estornos = p.pagamentos.filter((x) => x.tipo === 'estorno' && x.status !== 'recusado')

  function aposAcao(mensagem: string) {
    setFeito(mensagem)
    aoMudar()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta>{p.codigo_venda}</Etiqueta>
          <Status tipo="pedido" valor={p.status} />
          {p.devolucao !== 'nenhuma' && <Etiqueta>Devolução {p.devolucao}</Etiqueta>}
        </div>
        <h2 className="text-2xl font-medium">{nomeDoCliente(p)}</h2>
        <p className="text-sm text-muted-foreground">
          Pedido {p.id_pedido}, {comoRecebe(p).toLowerCase()}, feito em {dataCurta(p.criado_em)} às {hora(p.criado_em)}
        </p>
      </div>

      <ol aria-label="Etapas do pedido" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {etapas(p).map((e) => (
          <li key={e.rotulo} className={cn('border-t-[3px] pt-3', e.feita ? (e.cancelada ? 'border-ferrugem' : 'border-foreground') : 'border-border')}>
            <p className="text-sm font-medium">{e.rotulo}</p>
            <p className="text-xs text-muted-foreground">{e.quando ? `${dataCurta(e.quando)} às ${hora(e.quando)}` : 'ainda não'}</p>
          </li>
        ))}
      </ol>

      {feito && <Sucesso>{feito}</Sucesso>}
      <AcaoDoMomento key={p.status} pedido={p} aoFazer={aposAcao} />

      <section className="space-y-2">
        <h3 className="font-medium">Peças</h3>
        <ul className="border-t">
          {p.itens.map((i) => (
            <li key={i.id_item} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
              <NomePeca produto={i.produto} cor={i.cor} tamanho={`${i.tamanho}, ${i.sku}`} />
              <span className="shrink-0 text-right tabular-nums">
                {i.quantidade} × {moeda(i.preco_unitario)}
                <span className="block text-xs text-muted-foreground">{moeda(Number(i.preco_unitario) * i.quantidade)}</span>
              </span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto max-w-xs space-y-1 pt-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Peças</dt><dd className="tabular-nums">{moeda(p.valor_itens)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Frete</dt><dd className="tabular-nums">{Number(p.valor_frete) ? moeda(p.valor_frete) : 'grátis'}</dd></div>
          <div className="flex justify-between font-medium"><dt>Total</dt><dd className="tabular-nums">{moeda(p.valor_total)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section className="space-y-2 text-sm">
          <h3 className="font-medium">Pagamento</h3>
          {pagamentos.length === 0 && <p className="text-muted-foreground">Nenhum pagamento ainda.</p>}
          <ul className="space-y-1">
            {pagamentos.map((x) => (
              <li key={x.id_pagamento} className="flex items-center justify-between gap-3">
                <span>{METODOS_PAGAMENTO[x.metodo] ?? x.metodo}, {moeda(x.valor)}</span>
                <Status tipo="pagamento" valor={x.status} />
              </li>
            ))}
            {estornos.map((x) => (
              <li key={x.id_pagamento} className="flex justify-between gap-3 text-muted-foreground">
                <span>Estorno no {(METODOS_PAGAMENTO[x.metodo] ?? x.metodo).toLowerCase()}, {dataCurta(x.criado_em)}</span>
                <span className="tabular-nums">−{moeda(x.valor)}</span>
              </li>
            ))}
          </ul>
          {p.status === 'aguardando_pagamento' && p.reserva_expira_em && (
            <p className="text-xs text-muted-foreground">As peças ficam reservadas até {hora(p.reserva_expira_em)}; sem pagamento, o pedido é cancelado.</p>
          )}
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="font-medium">{p.modalidade === 'entrega' ? 'Entrega' : 'Onde recebe'}</h3>
          {p.endereco_entrega ? (
            <address className="not-italic">
              {p.endereco_entrega.rua}, {p.endereco_entrega.numero}
              {p.endereco_entrega.complemento && `, ${p.endereco_entrega.complemento}`}
              <br />
              {p.endereco_entrega.bairro}, {p.endereco_entrega.cidade}/{p.endereco_entrega.uf}
              <br />
              CEP {p.endereco_entrega.cep}
            </address>
          ) : (
            <p>{comoRecebe(p)}</p>
          )}
        </section>
      </div>

      {p.status === 'cancelado' && (
        <p className="bg-superficie p-4 text-sm">
          Cancelado em {dataHora(p.cancelado_em)}
          {p.justificativa_cancelamento ? `: ${p.justificativa_cancelamento}` : p.motivo_cancelamento ? `: ${p.motivo_cancelamento}` : '.'}
        </p>
      )}

      {podeCancelar && <CancelarPedido pedido={p} aoCancelar={() => aposAcao(`Pedido ${p.codigo_venda} cancelado.`)} />}
    </div>
  )
}

// o que falta fazer agora, conforme o status e a modalidade (só para quem prepara e entrega)
function AcaoDoMomento({ pedido: p, aoFazer }: { pedido: Pedido; aoFazer: (mensagem: string) => void }) {
  const { perfil } = useAuth()
  const [codigo, setCodigo] = useState('')
  const [conferiu, setConferiu] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  if (!temPermissao(perfil, 'preparar_entregar_pedido')) return null

  async function fazer(acao: 'enviar' | 'pronto-retirada' | 'entregar', corpo: object | undefined, mensagem: string) {
    const ok = await enviar(() => api<Pedido>(`/vendas/pedidos/${p.id_pedido}/${acao}`, { metodo: 'POST', corpo }))
    if (ok) aoFazer(mensagem)
  }

  let conteudo: ReactNode = null
  if (p.status === 'pago' && p.modalidade === 'entrega') {
    conteudo = (
      <>
        <p className="text-sm">Separe as peças e marque como enviado quando o pedido sair para a entrega.</p>
        <Button size="lg" className="h-11 px-5" disabled={enviando} onClick={() => fazer('enviar', undefined, 'Pedido marcado como enviado.')}>
          <Truck aria-hidden="true" /> Marcar como enviado
        </Button>
      </>
    )
  } else if (p.status === 'pago' && p.modalidade === 'retirada') {
    conteudo = (
      <>
        <p className="text-sm">Separe as peças e avise que o pedido está pronto. A partir daí, o cliente tem {PRAZO_RETIRADA_DIAS} dias para retirar.</p>
        <Button size="lg" className="h-11 px-5" disabled={enviando} onClick={() => fazer('pronto-retirada', undefined, 'O cliente foi avisado que o pedido está pronto para retirada.')}>
          <PackageCheck aria-hidden="true" /> Avisar que está pronto para retirada
        </Button>
      </>
    )
  } else if (p.status === 'enviado') {
    conteudo = (
      <>
        <p className="text-sm">Confirme quando a transportadora entregar o pedido.</p>
        <Button size="lg" className="h-11 px-5" disabled={enviando} onClick={() => fazer('entregar', {}, 'Entrega confirmada.')}>
          <Check aria-hidden="true" /> Confirmar entrega
        </Button>
      </>
    )
  } else if (p.status === 'pronto_para_retirada') {
    const dias = diasDesde(p.pronto_retirada_em)
    conteudo = (
      <form
        onSubmit={(e) => { e.preventDefault(); fazer('entregar', { codigo_venda: codigo.trim().toUpperCase() }, `Pedido entregue para ${nomeDoCliente(p)}.`) }}
        className="space-y-3"
      >
        <p className="text-sm">
          Pronto há {plural(dias, 'dia')}; o prazo de retirada acaba em {plural(Math.max(0, PRAZO_RETIRADA_DIAS - dias), 'dia')}.
          Peça o código do pedido e um documento com foto.
        </p>
        <Campo id="entrega-codigo" rotulo="Código do pedido" className="max-w-xs">
          <Input id="entrega-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CL..." autoComplete="off" />
        </Campo>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={conferiu} onChange={(e) => setConferiu(e.target.checked)} className="size-4 accent-marinho" />
          Conferi o documento com foto de quem está retirando
        </label>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={!codigo.trim() || !conferiu || enviando}>
          <Check aria-hidden="true" /> Entregar
        </Button>
      </form>
    )
  } else if (p.status === 'aguardando_pagamento') {
    conteudo = <p className="text-sm text-muted-foreground">Esperando o pagamento do cliente. Não há o que fazer até lá.</p>
  }
  if (!conteudo) return null

  return (
    <section aria-label="O que fazer agora" className="space-y-3 border-l-4 border-aco bg-aco-fundo p-5">
      {conteudo}
      {erro && <Aviso mensagem={erro} />}
    </section>
  )
}

// cancelamento pela equipe: antes do envio. Já pago, o backend estorna tudo e as peças voltam ao estoque
function CancelarPedido({ pedido: p, aoCancelar }: { pedido: Pedido; aoCancelar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const { enviar, enviando, erro } = useEnviar()
  const pago = p.status !== 'aguardando_pagamento'

  async function cancelar(evento: FormEvent) {
    evento.preventDefault()
    const ok = await enviar(() => api<Pedido>(`/vendas/pedidos/${p.id_pedido}/cancelar`, { metodo: 'POST', corpo: { justificativa: justificativa.trim() } }))
    if (ok) aoCancelar()
  }

  if (!aberto) {
    return (
      <div className="border-t pt-6">
        <Button variant="outline" onClick={() => setAberto(true)}>
          <X aria-hidden="true" /> Cancelar pedido
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={cancelar} className="space-y-3 border-t pt-6">
      <Campo id="cancelar-motivo" rotulo="Por que cancelar o pedido?" dica="O motivo fica no pedido e aparece para o cliente.">
        <Textarea id="cancelar-motivo" rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} minLength={3} maxLength={500} required />
      </Campo>
      <p className="text-sm text-muted-foreground">
        {pago
          ? `O pagamento de ${moeda(p.valor_pago)} é estornado pelo mesmo meio e as peças voltam ao estoque.`
          : 'A reserva das peças é liberada.'} O cancelamento não pode ser desfeito.
      </p>
      {erro && <Aviso mensagem={erro} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>Voltar</Button>
        <Button type="submit" variant="destructive" disabled={justificativa.trim().length < 3 || enviando}>
          {enviando ? 'Cancelando...' : 'Cancelar pedido'}
        </Button>
      </div>
    </form>
  )
}

// corrigir e-mail ou CPF de um cliente, com documento (GET /vendas/clientes pelo CPF e PATCH).
// Se o CPF certo já tem conta, os pedidos passam para ela e esta conta é desativada.
function CorrigirCadastro({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const [cpfBusca, setCpfBusca] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [conferiu, setConferiu] = useState(false)
  const [resultado, setResultado] = useState<ClienteCorrigido | null>(null)
  const [erroBusca, setErroBusca] = useState<string | null>(null)
  const { enviar, enviando, erro, limparErro } = useEnviar()
  const digitos = (t: string) => t.replace(/\D/g, '')

  function recomecar() {
    setCpfBusca('')
    setCliente(null)
    setResultado(null)
    setErroBusca(null)
    setConferiu(false)
    limparErro()
  }

  async function buscar(evento: FormEvent) {
    evento.preventDefault()
    setErroBusca(null)
    setResultado(null)
    try {
      const achado = await api<Cliente>('/vendas/clientes', { params: { cpf: digitos(cpfBusca) } })
      setCliente(achado)
      setEmail(achado.email)
      setCpf(achado.cpf ? mascaraCpf(achado.cpf) : '')
      setConferiu(false)
    } catch (falha) {
      setCliente(null)
      setErroBusca(falha instanceof ErroApi && falha.status === 404
        ? 'Nenhuma conta com esse CPF. Confira os números com o cliente ou busque pelo CPF que está no cadastro.'
        : falha instanceof ErroApi ? falha.message : 'Não foi possível buscar o cliente. Tente de novo.')
    }
  }

  const mudancas: { email?: string; cpf?: string } = {}
  if (cliente && email.trim() && email.trim() !== cliente.email) mudancas.email = email.trim()
  if (cliente && digitos(cpf) && digitos(cpf) !== (cliente.cpf ?? '')) mudancas.cpf = digitos(cpf)
  const temMudanca = Object.keys(mudancas).length > 0

  async function corrigir(evento: FormEvent) {
    evento.preventDefault()
    if (!cliente) return
    const feito = await enviar(() => api<ClienteCorrigido>(`/vendas/clientes/${cliente.id_usuario}`, { metodo: 'PATCH', corpo: mudancas }))
    if (feito) {
      setResultado(feito)
      setCliente(null)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={(abrir) => { if (!abrir) { recomecar(); aoFechar() } }}>
      <SheetContent className="overflow-y-auto sm:max-w-md!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg">Corrigir cadastro de cliente</SheetTitle>
          <SheetDescription>E-mail ou CPF errados são corrigidos em qualquer loja, conferindo um documento com foto.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <form onSubmit={buscar} className="flex items-end gap-2">
            <Campo id="corrigir-busca" rotulo="CPF do cadastro" className="flex-1">
              <Input id="corrigir-busca" inputMode="numeric" value={cpfBusca} onChange={(e) => setCpfBusca(mascaraCpf(e.target.value))} placeholder="000.000.000-00" autoComplete="off" />
            </Campo>
            <Button type="submit" variant="outline" className="h-9" disabled={digitos(cpfBusca).length !== 11}>Buscar</Button>
          </form>
          {erroBusca && <Aviso mensagem={erroBusca} />}

          {cliente && (
            <form onSubmit={corrigir} className="space-y-4">
              <div className="bg-superficie p-3 text-sm">
                <p className="font-medium">{cliente.nome}</p>
                <p className="text-muted-foreground">Conta {cliente.status_conta === 'ativa' ? 'ativa' : cliente.status_conta}</p>
              </div>
              <Campo id="corrigir-email" rotulo="E-mail">
                <Input id="corrigir-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Campo>
              <Campo id="corrigir-cpf" rotulo="CPF" dica="Se o CPF certo já tem conta, os pedidos passam para ela e esta conta é desativada.">
                <Input id="corrigir-cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} />
              </Campo>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={conferiu} onChange={(e) => setConferiu(e.target.checked)} className="size-4 accent-marinho" />
                Conferi o documento com foto do cliente
              </label>
              {erro && <Aviso mensagem={erro} />}
              <Button type="submit" size="lg" className="h-11 w-full" disabled={!temMudanca || !conferiu || enviando}>
                {enviando ? 'Salvando...' : 'Salvar correção'}
              </Button>
            </form>
          )}

          {resultado && (
            <Sucesso>
              Cadastro de {resultado.nome} corrigido.
              {resultado.id_conta_mantida && ' O CPF já tinha conta: os pedidos passaram para ela e esta foi desativada.'}
              {resultado.compras_ligadas > 0 && ` ${plural(resultado.compras_ligadas, 'compra da loja passou', 'compras da loja passaram')} para a conta.`}
            </Sucesso>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
