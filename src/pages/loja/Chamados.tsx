import { useEffect, useMemo, useRef, useState, type ReactNode, type SubmitEvent } from 'react'
import {
  ArrowLeft,
  CircleCheck,
  CircleHelp,
  FileText,
  MessageCircle,
  Package,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Status } from '@/components/Status'
import { Button, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta, dataLonga, haQuanto } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { problemaDoArquivo, TIPOS_DO_ANEXO } from './chamados/anexos'
import { Balao, Compositor } from './chamados/Mensagens'
import { rotuloTamanho } from './componentes/tamanhos'

type Chamado = Esquema<'ChamadoSaida'>
type Pedido = Esquema<'PedidoSaida'>
type ContextoChamados = { recarregarLista: () => void }

// de quanto em quanto tempo a conversa aberta procura respostas novas
const INTERVALO_ATUALIZACAO = 20000

// cada assunto tem o seu ícone: aparece na lista, no cabeçalho da conversa e na escolha do chamado novo
const ICONE_DA_CATEGORIA: Record<string, LucideIcon> = {
  entrega: Truck,
  troca_devolucao: RefreshCw,
  estorno: ReceiptText,
  duvida: CircleHelp,
  outros: MessageCircle,
}

function IconeDaCategoria({ categoria, className }: { categoria: string; className?: string }) {
  const Icone = ICONE_DA_CATEGORIA[categoria] ?? MessageCircle
  return <Icone className={className} aria-hidden="true" />
}

// /loja/chamados dentro da área "Minha conta": um cartão só, com a lista à esquerda e a conversa
// (ou o chamado novo) à direita. No computador o cartão tem altura fixa e cada lado rola sozinho;
// no celular aparece um de cada vez, a lista ou a conversa
export function ChamadosCliente() {
  const local = useLocation()
  const lista = useCarregar(() => api<Esquema<'Pagina_ChamadoSaida_'>>('/chamados', { params: { limit: 50 } }), [])
  const naLista = local.pathname.replace(/\/$/, '') === '/loja/chamados'
  const contexto: ContextoChamados = { recarregarLista: lista.recarregar }
  const chamados = lista.dados?.items ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Chamados</h1>
          <p className="text-sm text-muted-foreground">Converse com a equipe sobre pedidos, trocas e dúvidas.</p>
        </div>
        <Link to="/loja/chamados/novo" className={cn(buttonVariants({ size: 'loja' }), 'rounded-full sm:w-auto')}>
          <Plus className="size-4" aria-hidden="true" />
          Novo chamado
        </Link>
      </div>

      <div className="grid overflow-hidden rounded-xl border bg-background shadow-xs lg:h-[clamp(32rem,calc(100dvh-8rem),44rem)] lg:grid-cols-[21rem_minmax(0,1fr)]">
        <nav aria-label="Seus chamados" className={cn('flex min-h-0 flex-col lg:border-r', !naLista && 'hidden lg:flex')}>
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
            <span className="font-medium">Seus chamados</span>
            {lista.dados && <span className="rounded-full bg-aco-fundo px-2.5 py-0.5 text-xs font-medium text-marinho tabular-nums">{lista.dados.total}</span>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.carregando && !lista.dados && <Carregando />}
            {lista.erro && <div className="p-4"><Aviso mensagem={lista.erro} /></div>}
            {lista.dados && chamados.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
            )}
            <ul className="divide-y">
              {chamados.map((chamado) => (
                <li key={chamado.id_chamado}>
                  <ItemDaLista chamado={chamado} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <section className={cn('flex min-h-0 min-w-0 flex-col', naLista && 'hidden lg:flex')}>
          <Outlet context={contexto} />
        </section>
      </div>
    </div>
  )
}

// linha da lista: ícone do assunto (aço; cinza quando concluído), título, há quanto tempo mudou,
// situação e o contador terracota de respostas novas
function ItemDaLista({ chamado }: { chamado: Chamado }) {
  const concluido = chamado.status === 'concluido'
  const novas = chamado.mensagens_nao_lidas
  return (
    <NavLink
      to={`/loja/chamados/${chamado.id_chamado}`}
      className={({ isActive }) =>
        cn(
          'group flex gap-3 border-l-[3px] px-4 py-4 transition-colors',
          isActive ? 'border-aco bg-aco-fundo' : 'border-transparent hover:bg-superficie',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              concluido ? 'bg-superficie text-muted-foreground' : isActive ? 'bg-aco text-white' : 'bg-aco-fundo text-aco',
            )}
          >
            <IconeDaCategoria categoria={chamado.categoria} className="size-5" />
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className={cn('truncate text-sm', novas > 0 ? 'font-semibold' : 'font-medium')}>{chamado.assunto}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{haQuanto(chamado.atualizado_em)}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Status tipo="chamado" valor={chamado.status} />
              <span className="truncate">{CATEGORIAS_CHAMADO[chamado.categoria]}</span>
              {novas > 0 && (
                <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-terracota px-1.5 font-medium text-white tabular-nums">
                  {novas}
                  <span className="sr-only"> {novas === 1 ? 'resposta nova' : 'respostas novas'}</span>
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </NavLink>
  )
}

// lado direito sem chamado aberto (só no computador): convite com atalhos por assunto
export function SemChamadoEscolhido() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-aco text-white">
        <MessageCircle className="size-8" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-2">
        <p className="font-titulo text-2xl">Fale com a equipe</p>
        <p className="text-sm text-muted-foreground">
          Escolha um chamado na lista para ver a conversa, ou comece um novo pelo assunto. Uma pessoa da equipe responde por aqui.
        </p>
      </div>
      <ul className="flex max-w-lg flex-wrap justify-center gap-2">
        {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => (
          <li key={valor}>
            <Link
              to={`/loja/chamados/novo?categoria=${valor}`}
              className="flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:border-aco hover:bg-aco-fundo"
            >
              <IconeDaCategoria categoria={valor} className="size-4 text-aco" />
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// cabeçalho do lado direito, igual na conversa e no chamado novo; no celular traz a volta para a lista
function CabecalhoDoLado({ icone, titulo, children, direita }: { icone: ReactNode; titulo: ReactNode; children?: ReactNode; direita?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-start gap-3 border-b px-4 py-4 sm:px-5">
      <Link
        to="/loja/chamados"
        aria-label="Voltar aos chamados"
        className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-superficie lg:hidden"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-aco text-white max-lg:hidden">{icone}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-titulo text-2xl leading-tight">{titulo}</h2>
        {children}
      </div>
      {direita}
    </header>
  )
}

// chamado novo. Vindo de Meus pedidos (?pedido=, ?categoria=) já nasce ligado ao pedido; vindo da
// página de um produto (?variante=), à peça; de um chamado concluído (?anterior=), continua aquele
export function NovoChamadoCliente() {
  const navegar = useNavigate()
  const { recarregarLista } = useOutletContext<ContextoChamados>()
  const [params] = useSearchParams()
  const local = useLocation()
  const peca = (local.state as { peca?: string } | null)?.peca
  const idPedido = params.get('pedido')
  const idVariante = params.get('variante')
  const idAnterior = params.get('anterior')
  const pedido = useCarregar(() => (idPedido ? api<Pedido>(`/pedidos/${idPedido}`) : null), [idPedido])
  const categoriaInicial = params.get('categoria') ?? (idVariante ? 'duvida' : '')
  const [categoria, setCategoria] = useState(categoriaInicial)
  const [assunto, setAssunto] = useState(peca ? `Dúvida sobre ${peca}` : '')
  const [descricao, setDescricao] = useState('')
  const [idItem, setIdItem] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const previa = useMemo(() => (arquivo && arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null), [arquivo])
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa)
  }, [previa])

  // os atalhos de assunto do lado vazio trocam só a ?categoria=: o formulário acompanha
  const [categoriaDaUrl, setCategoriaDaUrl] = useState(categoriaInicial)
  if (categoriaDaUrl !== categoriaInicial) {
    setCategoriaDaUrl(categoriaInicial)
    setCategoria(categoriaInicial)
  }

  // com o pedido carregado, o título já vem pronto (a pessoa pode trocar)
  const codigo = pedido.dados?.codigo_venda
  const assuntoSugerido = codigo
    ? categoria === 'troca_devolucao' ? `Troca ou devolução do pedido ${codigo}` : `Ajuda com o pedido ${codigo}`
    : ''

  async function abrir(evento: SubmitEvent) {
    evento.preventDefault()
    const criado = await enviar(async () => {
      const chamado = await api<Chamado>('/chamados', {
        metodo: 'POST',
        corpo: {
          categoria,
          assunto: (assunto || assuntoSugerido).trim(),
          descricao: descricao.trim(),
          id_pedido: idPedido ? Number(idPedido) : null,
          id_item_pedido: idItem ? Number(idItem) : null,
          id_variante: idVariante ? Number(idVariante) : null,
          id_chamado_anterior: idAnterior ? Number(idAnterior) : null,
        },
      })
      // a foto (ou PDF) vai como a primeira mensagem do chamado
      if (arquivo) {
        const dados = new FormData()
        dados.append('arquivo', arquivo)
        await api(`/chamados/${chamado.id_chamado}/anexos`, { metodo: 'POST', corpo: dados })
      }
      return chamado
    })
    if (criado) {
      recarregarLista()
      navegar(`/loja/chamados/${criado.id_chamado}`, { replace: true })
    }
  }

  return (
    <>
      <CabecalhoDoLado icone={<Plus className="size-5" aria-hidden="true" />} titulo="Novo chamado">
        <p className="text-sm text-muted-foreground">
          {idAnterior ? 'Continua um chamado já concluído.' : 'Conte o que aconteceu. Uma pessoa da equipe responde por aqui.'}
        </p>
      </CabecalhoDoLado>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={(e) => void abrir(e)} className="max-w-2xl space-y-6 p-4 sm:p-6">
          {idPedido && (
            <div className="flex items-center gap-3 rounded-lg bg-superficie p-4 text-sm">
              <Package className="size-5 shrink-0 text-marinho" aria-hidden="true" />
              {pedido.dados ? (
                <span>
                  Sobre o pedido <span className="font-medium tabular-nums">{pedido.dados.codigo_venda}</span>, de{' '}
                  {dataCurta(pedido.dados.criado_em)}
                </span>
              ) : pedido.erro ? (
                <span className="text-ferrugem">{pedido.erro}</span>
              ) : (
                <span>Carregando o pedido...</span>
              )}
            </div>
          )}
          {peca && !idPedido && <p className="rounded-lg bg-superficie p-4 text-sm">Sobre a peça {peca}</p>}

          {/* poucas opções: ficam todas à vista, em vez de escondidas num select */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Sobre o que é</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => (
                <label
                  key={valor}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                    categoria === valor ? 'border-aco bg-aco-fundo font-medium' : 'hover:border-aco/60',
                  )}
                >
                  <input
                    type="radio"
                    name="categoria"
                    value={valor}
                    checked={categoria === valor}
                    onChange={() => setCategoria(valor)}
                    className="sr-only"
                    required
                  />
                  <IconeDaCategoria categoria={valor} className="size-5 shrink-0 text-aco" />
                  {rotulo}
                </label>
              ))}
            </div>
          </fieldset>

          {pedido.dados && pedido.dados.itens.length > 1 && (
            <Campo id="item" rotulo="Qual peça" opcional>
              <Select id="item" value={idItem} onChange={(e) => setIdItem(e.target.value)} className="h-11">
                <option value="">O pedido todo</option>
                {pedido.dados.itens.map((item) => (
                  <option key={item.id_item} value={item.id_item}>
                    {item.produto}, {item.cor}, tamanho {rotuloTamanho(item.tamanho)}
                  </option>
                ))}
              </Select>
            </Campo>
          )}

          <Campo id="assunto" rotulo="Título">
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder={assuntoSugerido || 'Em poucas palavras'}
              minLength={3}
              maxLength={200}
              className="h-11"
              required={!assuntoSugerido}
            />
          </Campo>
          <Campo id="descricao" rotulo="Mensagem">
            <Textarea id="descricao" rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={5000} required />
          </Campo>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Foto ou PDF <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-xl border bg-superficie p-2.5 text-sm">
                {previa ? (
                  <img src={previa} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-background">
                    <FileText className="size-6 text-aco" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
                <button
                  type="button"
                  onClick={() => setArquivo(null)}
                  aria-label={`Tirar o anexo ${arquivo.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-background"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input p-4 text-sm transition-colors hover:border-aco hover:bg-aco-fundo has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-aco-fundo text-aco">
                  <Paperclip className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">Anexar foto ou PDF</span>
                  <span className="text-muted-foreground">JPG, PNG, WEBP ou PDF de até 10 MB</span>
                </span>
                <input
                  type="file"
                  accept={TIPOS_DO_ANEXO.join(',')}
                  className="sr-only"
                  onChange={(e) => {
                    const escolhido = e.target.files?.[0]
                    e.target.value = ''
                    if (!escolhido) return
                    const problema = problemaDoArquivo(escolhido)
                    setErroArquivo(problema)
                    if (!problema) setArquivo(escolhido)
                  }}
                />
              </label>
            )}
            {erroArquivo && <p role="alert" className="text-sm text-ferrugem">{erroArquivo}</p>}
          </div>

          {erro && <p role="alert" className="rounded-lg bg-ferrugem-fundo p-3 text-sm text-ferrugem">{erro}</p>}
          <Button type="submit" size="loja" disabled={enviando} className="rounded-full">
            {enviando ? 'Abrindo o chamado...' : 'Abrir chamado'}
          </Button>
        </form>
      </div>
    </>
  )
}

// a conversa: cabeçalho com situação, assunto e pedido ligado; mensagens agrupadas por dia num fundo
// ardósia-claro, para os balões (marinho seus, brancos da equipe) se destacarem;
// abrir a conversa marca as respostas da equipe como lidas (o backend faz isso ao listar)
export function ConversaCliente() {
  const { idChamado } = useParams()
  const { recarregarLista } = useOutletContext<ContextoChamados>()
  const chamado = useCarregar(() => api<Chamado>(`/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api<Esquema<'Lista_MensagemSaida_'>>(`/chamados/${idChamado}/mensagens`), [idChamado])
  const idPedido = chamado.dados?.id_pedido
  const pedido = useCarregar(() => (idPedido ? api<Pedido>(`/pedidos/${idPedido}`) : null), [idPedido])
  const rolagem = useRef<HTMLOListElement>(null)
  const quantasVistas = useRef(-1)
  const { recarregar: recarregarMensagens } = mensagens
  const quantas = mensagens.dados?.items.length

  // depois de abrir, o contador de não lidas da lista (e do topo) cai
  useEffect(() => {
    if (mensagens.dados) recarregarLista()
  }, [mensagens.dados, recarregarLista])

  useEffect(() => {
    const relogio = window.setInterval(recarregarMensagens, INTERVALO_ATUALIZACAO)
    return () => window.clearInterval(relogio)
  }, [recarregarMensagens])

  // desce até a última mensagem ao abrir e quando chega uma nova (a atualização a cada 20 s sem
  // novidade não mexe na rolagem de quem está lendo mensagens antigas)
  useEffect(() => {
    if (quantas === undefined || quantas === quantasVistas.current) return
    quantasVistas.current = quantas
    const caixa = rolagem.current
    if (caixa) caixa.scrollTop = caixa.scrollHeight
  }, [quantas])

  if (chamado.carregando && !chamado.dados) return <Carregando />
  if (chamado.erro || !chamado.dados) return <div className="p-5"><Aviso mensagem={chamado.erro ?? 'Chamado não encontrado.'} /></div>
  const c = chamado.dados
  const concluido = c.status === 'concluido'
  const lista = mensagens.dados?.items ?? []

  // separador de dia: aparece quando a mensagem é de um dia diferente da anterior
  const diaDe = (iso: string) => new Date(iso).toDateString()

  return (
    // no celular a conversa ocupa a altura da tela, com a caixa de escrever sempre à vista
    <div className="flex h-[calc(100dvh-8rem)] min-h-[30rem] flex-col lg:h-full lg:min-h-0">
      <CabecalhoDoLado
        icone={<IconeDaCategoria categoria={c.categoria} className="size-5" />}
        titulo={c.assunto}
        direita={<Status tipo="chamado" valor={c.status} className="mt-1" />}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span>{CATEGORIAS_CHAMADO[c.categoria]}</span>
          <span>Aberto em {dataCurta(c.criado_em)}</span>
          {c.responsavel && <span>Atendimento com {c.responsavel.split(' ')[0]}</span>}
          {pedido.dados && (
            <Link
              to="/loja/pedidos"
              className="inline-flex items-center gap-1.5 rounded-full bg-superficie px-2.5 py-0.5 font-medium text-marinho underline-offset-4 hover:underline"
            >
              <Package className="size-4" aria-hidden="true" />
              Pedido {pedido.dados.codigo_venda}
            </Link>
          )}
        </div>
      </CabecalhoDoLado>

      <ol ref={rolagem} aria-label="Mensagens" aria-live="polite" className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-ardosia-clara px-4 py-5 sm:px-6">
        <SeparadorDeDia criadoEm={c.criado_em} />
        <Balao minha autor="Você" texto={c.descricao} criadoEm={c.criado_em} />
        {lista.map((m, i) => {
          const anterior = i === 0 ? null : lista[i - 1]!
          const novoDia = diaDe(m.criado_em) !== diaDe(anterior?.criado_em ?? c.criado_em)
          // mensagens seguidas da mesma pessoa no mesmo dia ficam juntas, sem repetir o nome
          const mesmoAutor = !novoDia && (anterior ? anterior.da_equipe === m.da_equipe && anterior.autor === m.autor : !m.da_equipe)
          return (
            <MensagemComDia key={m.id_mensagem} novoDia={novoDia} criadoEm={m.criado_em}>
              <Balao
                minha={!m.da_equipe}
                continuacao={mesmoAutor}
                autor={m.da_equipe ? `${m.autor.split(' ')[0]}, Casa Lorenzi` : 'Você'}
                texto={m.conteudo}
                criadoEm={m.criado_em}
                lidaEm={m.lida_em}
                anexo={m.anexo_nome ? { idChamado: c.id_chamado, idMensagem: m.id_mensagem, nome: m.anexo_nome } : null}
              />
            </MensagemComDia>
          )
        })}
        {mensagens.erro && <li className="pt-3"><Aviso mensagem={mensagens.erro} /></li>}
      </ol>

      {concluido ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm">
          <span className="flex items-center gap-2">
            <CircleCheck className="size-5 text-marinho" aria-hidden="true" />
            Este chamado foi concluído em {dataCurta(c.concluido_em)}.
          </span>
          <Link to={`/loja/chamados/novo?anterior=${c.id_chamado}`} className={cn(buttonVariants({ variant: 'outline', size: 'loja' }), 'rounded-full')}>
            Abrir novo sobre este assunto
          </Link>
        </div>
      ) : (
        <Compositor idChamado={c.id_chamado} aoEnviar={() => recarregarMensagens()} />
      )}
    </div>
  )
}

function SeparadorDeDia({ criadoEm }: { criadoEm: string }) {
  return (
    <li className="flex justify-center py-3 first:pt-0">
      <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow-xs">{dataLonga(criadoEm)}</span>
    </li>
  )
}

function MensagemComDia({ novoDia, criadoEm, children }: { novoDia: boolean; criadoEm: string; children: ReactNode }) {
  return (
    <>
      {novoDia && <SeparadorDeDia criadoEm={criadoEm} />}
      {children}
    </>
  )
}
