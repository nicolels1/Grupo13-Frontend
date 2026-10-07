import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ChevronLeft, Paperclip, Send, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Status } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, ErroApi, type Esquema } from '@/lib/api'
import {
  CATEGORIAS_CHAMADO, dataCurta, dataHora, dataLonga, haQuanto, hora, METODOS_PAGAMENTO, moeda, MOTIVOS_CONCLUSAO, plural, PRIORIDADES,
  STATUS_CHAMADO,
  tamanhoArquivo,
} from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { estornaveis, prazoTroca, type ModoTroca, type TrocaFeita } from '@/lib/trocaDevolucao'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { AtenderPedido } from './TrocaDevolucao'

type Chamado = Esquema<'ChamadoSaida'>
type Mensagem = Esquema<'MensagemSaida'>
type Pedido = Esquema<'PedidoSaida'>
type Historico = Esquema<'Lista_HistoricoSaida_'>
type Fila = 'sem' | 'meus' | 'respondeu' | 'andamento' | 'concluidos'
// o que useCarregar devolve, para passar uma carga a outro componente
type Carga<T> = { dados: T | null; erro: string | null; carregando: boolean; recarregar: () => void }

const POR_PAGINA = 25
const INTERVALO_ATUALIZACAO = 20000

// filas do menu da esquerda: cada uma vira os filtros do GET /atendimento/chamados
const FILAS: { valor: Fila; rotulo: string; filtros: Record<string, string | boolean> }[] = [
  { valor: 'sem', rotulo: 'Sem responsável', filtros: { sem_responsavel: true, status: 'aberto' } },
  { valor: 'meus', rotulo: 'Meus em andamento', filtros: { meus: true, status: 'em_andamento' } },
  { valor: 'respondeu', rotulo: 'Cliente respondeu', filtros: { meus: true, com_mensagem_nova: true } },
  { valor: 'andamento', rotulo: 'Todos em andamento', filtros: { status: 'em_andamento' } },
  { valor: 'concluidos', rotulo: 'Concluídos', filtros: { status: 'concluido' } },
]

// caixa de entrada em três colunas (design, seção Atendimento): filas, lista e conversa.
// A mesma tela atende /interno/atendimento e /interno/atendimento/:idChamado; o chamado aberto
// fica na terceira coluna. No celular, a conversa toma a tela e há um link de volta para a fila.
export function Atendimento() {
  const { idChamado } = useParams()
  const { unidade } = useUnidadeEscolhida()
  const [fila, setFila] = useState<Fila>('sem')
  const [categoria, setCategoria] = useState('')
  const [offset, setOffset] = useState(0)
  const filtros = FILAS.find((f) => f.valor === fila)?.filtros ?? {}

  const lista = useCarregar(
    () => api<Esquema<'Pagina_ChamadoSaida_'>>('/atendimento/chamados', { params: { ...filtros, categoria, id_unidade: unidade, limit: POR_PAGINA, offset } }),
    [fila, categoria, unidade, offset],
  )
  // contagem de cada fila (só o total, uma linha por consulta)
  const contagens = useCarregar(
    () => Promise.all(FILAS.map((f) => api<Esquema<'Pagina_ChamadoSaida_'>>('/atendimento/chamados', { params: { ...f.filtros, id_unidade: unidade, limit: 1 } }).then((r) => r.total))),
    [unidade],
  )
  const { recarregar: recarregarLista } = lista
  const { recarregar: recarregarContagens } = contagens
  const aoMudarChamado = useCallback(() => {
    recarregarLista()
    recarregarContagens()
  }, [recarregarLista, recarregarContagens])

  function mudarFila(valor: Fila) {
    setFila(valor)
    setOffset(0)
  }

  return (
    <>
      <Cabecalho titulo="Atendimento" subtitulo="Chamados abertos pelos clientes no site." />
      <div className="grid gap-6 lg:grid-cols-[11rem_17rem_minmax(0,1fr)]">
        <nav aria-label="Filas" className={cn('lg:hidden', idChamado && 'hidden')}>
          <Abas
            rotulo="Filas"
            valor={fila}
            aoMudar={mudarFila}
            abas={FILAS.map((f, i) => ({ valor: f.valor, rotulo: f.rotulo, contagem: contagens.dados?.[i] }))}
          />
        </nav>
        <nav aria-label="Filas" className="hidden lg:block">
          {FILAS.map((f, i) => (
            <button
              key={f.valor}
              type="button"
              aria-current={fila === f.valor ? 'true' : undefined}
              onClick={() => mudarFila(f.valor)}
              className={cn('flex w-full justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-superficie', fila === f.valor && 'bg-superficie font-medium')}
            >
              {f.rotulo}
              <span className="tabular-nums text-muted-foreground">{contagens.dados?.[i] ?? ''}</span>
            </button>
          ))}
        </nav>

        <section aria-label="Chamados da fila" className={cn('min-w-0 lg:border-x lg:px-4', idChamado && 'hidden lg:block')}>
          <Select aria-label="Categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setOffset(0) }} className="mb-2">
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIAS_CHAMADO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
          {lista.erro && <Aviso mensagem={lista.erro} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados?.items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum chamado nesta fila.</p>}
          <ul>
            {lista.dados?.items.map((c) => <ItemDaFila key={c.id_chamado} chamado={c} aberto={String(c.id_chamado) === idChamado} />)}
          </ul>
          <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="chamados" />
        </section>

        <div className={cn('min-w-0', !idChamado && 'hidden lg:block')}>
          {idChamado ? (
            <>
              <Link to="/interno/atendimento" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
                <ChevronLeft className="size-4" aria-hidden="true" /> Voltar para a fila
              </Link>
              <ChamadoAberto key={idChamado} idChamado={idChamado} aoMudar={aoMudarChamado} />
            </>
          ) : (
            <Vazio>Escolha um chamado na lista para ver a conversa.</Vazio>
          )}
        </div>
      </div>
    </>
  )
}

// um chamado na lista do meio: número e há quanto tempo, assunto, cliente e pedido;
// marcador terracota para mensagem nova e prioridade alta (destaques com significado)
function ItemDaFila({ chamado: c, aberto }: { chamado: Chamado; aberto: boolean }) {
  return (
    <li>
      <Link
        to={`/interno/atendimento/${c.id_chamado}`}
        aria-current={aberto ? 'page' : undefined}
        className={cn('block space-y-1 border-b px-2 py-3 text-sm hover:bg-superficie', aberto && 'bg-superficie')}
      >
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">Chamado {c.id_chamado}</span>
          <span>{haQuanto(c.criado_em)}</span>
        </span>
        <span className="block truncate font-medium">{c.assunto}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[c.cliente, c.id_pedido && `pedido ${c.id_pedido}`, c.responsavel && `com ${c.responsavel}`].filter(Boolean).join(', ')}
        </span>
        {(c.mensagens_nao_lidas > 0 || c.prioridade === 'alta') && (
          <span className="flex flex-wrap gap-3 pt-0.5 text-xs font-medium">
            {c.mensagens_nao_lidas > 0 && <Marcador>{plural(c.mensagens_nao_lidas, 'mensagem nova', 'mensagens novas')}</Marcador>}
            {c.prioridade === 'alta' && <Marcador>Prioridade alta</Marcador>}
          </span>
        )}
      </Link>
    </li>
  )
}

function Marcador({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-terracota" aria-hidden="true" />
      {children}
    </span>
  )
}

function Prioridade({ valor }: { valor: Chamado['prioridade'] }) {
  if (!valor) return <span className="text-sm text-muted-foreground">Sem prioridade</span>
  if (valor === 'alta') return <span className="text-sm font-medium"><Marcador>Prioridade alta</Marcador></span>
  return <span className="text-sm text-muted-foreground">Prioridade {PRIORIDADES[valor]?.toLowerCase()}</span>
}

// o histórico guarda o id de quem passou a ser responsável; mostra o que aconteceu, não o id
function textoHistorico(h: Esquema<'HistoricoSaida'>) {
  if (h.campo_alterado === 'responsavel') return h.valor_anterior ? `${h.autor} repassou o chamado` : `${h.autor} assumiu`
  if (h.campo_alterado === 'prioridade') return `${h.autor} mudou a prioridade para ${PRIORIDADES[h.valor_novo]?.toLowerCase() ?? h.valor_novo}`
  if (h.valor_novo === 'concluido') return `${h.autor} concluiu`
  return `Chamado ${STATUS_CHAMADO[h.valor_novo]?.toLowerCase() ?? h.valor_novo}`
}

// painel à direita da conversa (design, seção Atendimento): cliente e pedido ligado,
// status, prioridade e responsável, concluir com motivo e o histórico do chamado.
// Só o responsável muda a prioridade e conclui; quem atende pode assumir um chamado sem responsável.
function PainelDoChamado({ chamado: c, historico, aoMudar }: { chamado: Chamado; historico: Carga<Historico>; aoMudar: () => void }) {
  const { perfil } = useAuth()
  const { unidades } = useUnidadeEscolhida()
  const [motivo, setMotivo] = useState('resolvido')
  const [repassando, setRepassando] = useState(false)
  // 'troca' ou 'devolucao' com o painel lateral aberto; `feito` é a confirmação depois de registrar
  const [trocando, setTrocando] = useState<ModoTroca | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const souResponsavel = c.id_responsavel === perfil?.id_usuario
  const concluido = c.status === 'concluido'
  const pedido = useCarregar(() => (c.id_pedido ? api<Pedido>(`/vendas/pedidos/${c.id_pedido}`) : null), [c.id_pedido])
  // o backend só registra troca ou devolução em chamado dessa categoria, aberto e com pedido
  const podeTrocar = c.categoria === 'troca_devolucao' && c.id_pedido && !concluido && pedido.dados
  // estorno sem troca nem devolução: qualquer chamado aberto com pedido pago que ainda tem o que estornar
  const [estornando, setEstornando] = useState(false)
  const podeEstornar = !concluido && pedido.dados && !['aguardando_pagamento', 'cancelado'].includes(pedido.dados.status)
    && estornaveis(pedido.dados).length > 0

  async function acao(caminho: string, corpo?: object, metodo: 'POST' | 'PATCH' = 'POST') {
    const ok = await enviar(() => api<Chamado>(`/atendimento/chamados/${c.id_chamado}${caminho}`, { metodo, corpo }))
    if (ok) aoMudar()
  }

  return (
    <aside aria-label="Dados do chamado" className="space-y-6 xl:border-l xl:pl-6">
      {erro && <Aviso mensagem={erro} />}

      <section className="space-y-3">
        <h3 className="text-lg font-medium">{c.cliente}</h3>
        {c.id_pedido && <PedidoLigado chamado={c} pedido={pedido} />}
        {c.id_chamado_anterior && (
          <p className="text-sm">
            Continua o{' '}
            <Link to={`/interno/atendimento/${c.id_chamado_anterior}`} className="text-aco underline underline-offset-2">chamado {c.id_chamado_anterior}</Link>
          </p>
        )}
      </section>

      <dl className="space-y-2 border-t pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd><Status tipo="chamado" valor={c.status} /></dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Categoria</dt>
          <dd>{CATEGORIAS_CHAMADO[c.categoria]}</dd>
        </div>
        {c.id_unidade && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Unidade</dt>
            <dd>{nomeUnidade(unidades, c.id_unidade)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground"><label htmlFor="prioridade">Prioridade</label></dt>
          <dd>
            {souResponsavel && !concluido ? (
              <Select id="prioridade" value={c.prioridade ?? ''} onChange={(e) => acao('', { prioridade: e.target.value }, 'PATCH')} disabled={enviando} className="h-8 w-32">
                <option value="" disabled>Definir</option>
                {Object.entries(PRIORIDADES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Select>
            ) : (
              c.prioridade ? PRIORIDADES[c.prioridade] : <span className="text-muted-foreground">sem</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Responsável</dt>
          <dd className="flex items-center gap-2">
            {souResponsavel ? 'Você' : c.responsavel ?? <span className="text-muted-foreground">ninguém ainda</span>}
            {souResponsavel && !concluido && !repassando && (
              <button type="button" onClick={() => setRepassando(true)} className="text-aco underline underline-offset-2">Repassar</button>
            )}
          </dd>
        </div>
      </dl>

      {repassando && <Repassar chamado={c} aoFechar={() => setRepassando(false)} aoRepassar={() => { setRepassando(false); aoMudar() }} />}

      {podeTrocar && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => { setFeito(null); setTrocando('troca') }}>Registrar troca</Button>
          <Button variant="outline" onClick={() => { setFeito(null); setTrocando('devolucao') }}>Registrar devolução</Button>
        </div>
      )}
      {podeEstornar && (
        <Button variant="outline" className="w-full" onClick={() => { setFeito(null); setEstornando(true) }}>Estornar</Button>
      )}
      {feito && <Sucesso>{feito}</Sucesso>}
      {pedido.dados && (
        <EstornoPeloChamado
          aberto={estornando}
          chamado={c}
          pedido={pedido.dados}
          aoFechar={() => setEstornando(false)}
          aoConcluir={(resumo) => {
            setEstornando(false)
            setFeito(resumo)
            pedido.recarregar()
            aoMudar()
          }}
        />
      )}
      {pedido.dados && (
        <TrocaPeloChamado
          modo={trocando}
          chamado={c}
          pedido={pedido.dados}
          aoFechar={() => setTrocando(null)}
          aoConcluir={(resumo) => {
            setTrocando(null)
            setFeito(resumo)
            pedido.recarregar()
            aoMudar()
          }}
        />
      )}

      {!c.id_responsavel && !concluido && (
        <Button variant="outline" size="lg" className="h-11 w-full" disabled={enviando} onClick={() => acao('/assumir')}>
          Assumir chamado
        </Button>
      )}

      {souResponsavel && !concluido && (
        <form onSubmit={(e) => { e.preventDefault(); acao('/concluir', { motivo }) }} className="flex items-end gap-2 border-t pt-4">
          <Campo id="motivo-conclusao" rotulo="Concluir como" className="flex-1">
            <Select id="motivo-conclusao" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {Object.entries(MOTIVOS_CONCLUSAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </Select>
          </Campo>
          <Button type="submit" variant="outline" className="h-9 px-4" disabled={enviando}>Concluir</Button>
        </form>
      )}
      {c.id_responsavel && !souResponsavel && !concluido && (
        <p className="text-xs text-muted-foreground">Só {c.responsavel} muda a prioridade e conclui este chamado.</p>
      )}
      {concluido && (
        <p className="bg-superficie p-4 text-sm">
          Concluído em {dataHora(c.concluido_em)} como {MOTIVOS_CONCLUSAO[c.motivo_encerramento ?? '']?.toLowerCase()}. Chamado concluído não reabre.
        </p>
      )}

      <section className="border-t pt-4">
        <h3 className="mb-1 text-sm font-medium">Histórico deste chamado</h3>
        {historico.erro && <Aviso mensagem={historico.erro} />}
        {historico.dados?.items.length === 0 && <p className="text-sm text-muted-foreground">Sem alterações ainda.</p>}
        <ul className="text-sm">
          {historico.dados?.items.map((h) => (
            <li key={h.id_historico} className="grid grid-cols-[6.5rem_1fr] gap-3 border-b py-2">
              <span className="text-muted-foreground tabular-nums">{dataHora(h.criado_em)}</span>
              <span>{textoHistorico(h)}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

// troca ou devolução pelo chamado, num painel lateral (POST /atendimento/chamados/{id}/troca ou
// /devolucao). A peça volta numa loja: começa pela loja do chamado ou a do topo, e dá para trocar.
function TrocaPeloChamado({ modo, chamado: c, pedido, aoFechar, aoConcluir }: {
  modo: ModoTroca | null
  chamado: Chamado
  pedido: Pedido
  aoFechar: () => void
  aoConcluir: (resumo: string) => void
}) {
  const { unidade, unidades } = useUnidadeEscolhida()
  const lojas = unidades.filter((u) => u.ativo && u.tipo === 'loja')
  const inicial = [c.id_unidade, unidade].map(String).find((id) => lojas.some((u) => String(u.id_unidade) === id)) ?? ''
  const [idLoja, setIdLoja] = useState(inicial)
  const loja = lojas.find((u) => String(u.id_unidade) === idLoja)
  const troca = modo === 'troca'

  function concluir(f: TrocaFeita) {
    if (!loja) return
    const pecas = plural(f.linhas.reduce((t, l) => t + l.quantidade, 0), 'peça')
    const estorno = f.estornos.reduce((t, e) => t + Number(e.valor), 0)
    aoConcluir(troca
      ? `Troca de ${pecas} registrada na ${loja.nome}.`
      : `Devolução de ${pecas} registrada na ${loja.nome}, com estorno de ${moeda(estorno)}.`)
  }

  return (
    <Sheet open={Boolean(modo)} onOpenChange={(aberto) => { if (!aberto) aoFechar() }}>
      <SheetContent className="w-full! overflow-y-auto transition-none sm:max-w-3xl!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg">{troca ? 'Registrar troca' : 'Registrar devolução'}</SheetTitle>
          <SheetDescription>
            Pedido {pedido.codigo_venda}, chamado {c.id_chamado}. {troca
              ? 'A peça devolvida entra e a nova sai do estoque da loja física da loja escolhida.'
              : 'A peça entra no estoque da loja física da loja escolhida e o estorno sai pelo mesmo meio do pagamento.'}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <Campo id="troca-loja" rotulo="Loja que recebe a peça" className="max-w-xs">
            <Select id="troca-loja" value={idLoja} onChange={(e) => setIdLoja(e.target.value)}>
              <option value="" disabled>Escolha a loja</option>
              {lojas.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
            </Select>
          </Campo>
          {loja && (
            <AtenderPedido
              key={`${modo}-${idLoja}`}
              pedido={pedido}
              loja={loja}
              rota={`/atendimento/chamados/${c.id_chamado}`}
              modoInicial={modo ?? undefined}
              comAbas={false}
              comCabecalho={false}
              aoConcluir={concluir}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const PASSOS_ESTORNO = ['Pagamento', 'Valor', 'Confirmar']

// estorno pelo chamado, sem troca nem devolução (ex.: problema na entrega), num painel lateral
// passo a passo (design, seção Atendimento): de qual pagamento sai, quanto (pode ser parcial) e
// a confirmação. Volta pelo mesmo meio do pagamento e fica ligado ao chamado.
function EstornoPeloChamado({ aberto, chamado: c, pedido, aoFechar, aoConcluir }: {
  aberto: boolean
  chamado: Chamado
  pedido: Pedido
  aoFechar: () => void
  aoConcluir: (resumo: string) => void
}) {
  const [passo, setPasso] = useState(0)
  const [idPagamento, setIdPagamento] = useState<number | null>(null)
  const [valor, setValor] = useState('')
  const { enviar, enviando, erro, limparErro } = useEnviar()
  const opcoes = estornaveis(pedido)
  const escolhida = opcoes.find((o) => o.pagamento.id_pagamento === idPagamento)
  const numero = Number(valor.replace(',', '.'))
  const valorOk = escolhida && numero > 0 && numero <= escolhida.restante && /^\d+([.,]\d{1,2})?$/.test(valor)
  const metodo = escolhida ? (METODOS_PAGAMENTO[escolhida.pagamento.metodo] ?? escolhida.pagamento.metodo).toLowerCase() : ''
  const jaEstornados = pedido.pagamentos.filter((p) => p.tipo === 'estorno' && p.status !== 'recusado')

  function fechar() {
    setPasso(0)
    setIdPagamento(null)
    setValor('')
    limparErro()
    aoFechar()
  }

  function escolher(opcao: ReturnType<typeof estornaveis>[number]) {
    setIdPagamento(opcao.pagamento.id_pagamento)
    setValor(opcao.restante.toFixed(2).replace('.', ','))
    setPasso(1)
  }

  async function confirmar() {
    const corpo = { id_pagamento: idPagamento, valor: numero.toFixed(2) }
    const ok = await enviar(() => api<Pedido>(`/atendimento/chamados/${c.id_chamado}/estornos`, { metodo: 'POST', corpo }))
    if (!ok) return
    setPasso(0)
    setIdPagamento(null)
    setValor('')
    aoConcluir(`Estorno de ${moeda(numero)} no ${metodo} registrado no pedido ${pedido.codigo_venda}.`)
  }

  return (
    <Sheet open={aberto} onOpenChange={(abrir) => { if (!abrir) fechar() }}>
      <SheetContent className="overflow-y-auto transition-none sm:max-w-md!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg">Estornar</SheetTitle>
          <SheetDescription>
            Pedido {pedido.codigo_venda}, chamado {c.id_chamado}. Sem troca nem devolução: o valor volta pelo mesmo meio do pagamento e fica ligado a este chamado.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <ol aria-label="Passos do estorno" className="grid grid-cols-3 gap-2">
            {PASSOS_ESTORNO.map((rotulo, i) => (
              <li
                key={rotulo}
                aria-current={i === passo ? 'step' : undefined}
                className={cn('border-t-[3px] pt-2 text-xs', i <= passo ? 'border-foreground font-medium' : 'border-border text-muted-foreground')}
              >
                {i + 1}. {rotulo}
              </li>
            ))}
          </ol>

          {passo === 0 && (
            <section className="space-y-3">
              <h3 className="font-medium">De qual pagamento sai o estorno?</h3>
              <ul className="space-y-2">
                {opcoes.map((o) => (
                  <li key={o.pagamento.id_pagamento}>
                    <button
                      type="button"
                      onClick={() => escolher(o)}
                      className="flex w-full items-center justify-between gap-3 border px-4 py-3 text-left text-sm hover:border-foreground"
                    >
                      <span>
                        <span className="block font-medium">{METODOS_PAGAMENTO[o.pagamento.metodo] ?? o.pagamento.metodo}</span>
                        <span className="text-xs text-muted-foreground">pago {moeda(o.pagamento.valor)} em {dataCurta(o.pagamento.criado_em)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-medium tabular-nums">{moeda(o.restante)}</span>
                        <span className="text-xs text-muted-foreground">dá para estornar</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {jaEstornados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Já estornado neste pedido: {moeda(jaEstornados.reduce((t, e) => t + Number(e.valor), 0))}.
                </p>
              )}
            </section>
          )}

          {passo === 1 && escolhida && (
            <section className="space-y-4">
              <h3 className="font-medium">Quanto estornar no {metodo}?</h3>
              <Campo id="estorno-valor" rotulo="Valor" dica={`Até ${moeda(escolhida.restante)}. Pode ser parcial.`}>
                <Input
                  id="estorno-valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))}
                  aria-invalid={valor !== '' && !valorOk ? true : undefined}
                  className="max-w-40"
                  autoFocus
                />
              </Campo>
              {valor !== '' && !valorOk && (
                <p className="text-sm text-destructive">
                  {numero > escolhida.restante ? `O máximo neste pagamento é ${moeda(escolhida.restante)}. Diminua o valor.` : 'Digite um valor maior que zero, com até dois centavos.'}
                </p>
              )}
              <div className="flex justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setPasso(0)}>Voltar</Button>
                <Button type="button" variant="outline" disabled={!valorOk} onClick={() => setPasso(2)}>Continuar</Button>
              </div>
            </section>
          )}

          {passo === 2 && escolhida && (
            <section className="space-y-4">
              <h3 className="font-medium">Confira antes de estornar</h3>
              <dl className="space-y-2 bg-superficie p-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Valor</dt><dd className="font-medium tabular-nums">{moeda(numero)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Volta pelo</dt><dd>{metodo}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Pedido</dt><dd>{pedido.codigo_venda}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cliente</dt><dd>{c.cliente}</dd></div>
              </dl>
              <p className="text-xs text-muted-foreground">O estorno não pode ser desfeito.</p>
              {erro && <Aviso mensagem={erro} />}
              <div className="flex justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setPasso(1)} disabled={enviando}>Voltar</Button>
                <Button type="button" size="lg" className="h-11 px-5" disabled={enviando} onClick={confirmar}>
                  {enviando ? 'Estornando...' : `Estornar ${moeda(numero)}`}
                </Button>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// repassar o chamado para outra pessoa que atende chamados (GET /atendimento/equipe lista quem pode;
// o PATCH confere a mesma regra). Depois do repasse, quem repassou deixa de ser o responsável.
function Repassar({ chamado: c, aoFechar, aoRepassar }: { chamado: Chamado; aoFechar: () => void; aoRepassar: () => void }) {
  const { perfil } = useAuth()
  const { unidades } = useUnidadeEscolhida()
  const [destino, setDestino] = useState('')
  const { enviar, enviando, erro } = useEnviar()
  const equipe = useCarregar(() => api<Esquema<'Lista_PessoaDaEquipe_'>>('/atendimento/equipe'), [])
  const colegas = (equipe.dados?.items ?? []).filter((p) => p.id_usuario !== perfil?.id_usuario)

  async function repassar(evento: FormEvent) {
    evento.preventDefault()
    const ok = await enviar(() => api<Chamado>(`/atendimento/chamados/${c.id_chamado}`, { metodo: 'PATCH', corpo: { id_responsavel: destino } }))
    if (ok) aoRepassar()
  }

  return (
    <form onSubmit={repassar} className="space-y-3 border p-3">
      <Campo id="repassar-para" rotulo="Repassar para">
        <Select id="repassar-para" value={destino} onChange={(e) => setDestino(e.target.value)} disabled={!equipe.dados} required>
          <option value="" disabled>{equipe.carregando ? 'Carregando a equipe...' : 'Escolha a pessoa'}</option>
          {colegas.map((p) => (
            <option key={p.id_usuario} value={p.id_usuario}>
              {p.nome}{p.id_unidade ? `, ${nomeUnidade(unidades, p.id_unidade)}` : ''}
            </option>
          ))}
        </Select>
      </Campo>
      {equipe.dados && colegas.length === 0 && (
        <p className="text-xs text-muted-foreground">Ninguém mais da equipe atende chamados agora. Peça ao Admin para dar a permissão a alguém.</p>
      )}
      {(equipe.erro || erro) && <Aviso mensagem={equipe.erro || erro} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={aoFechar}>Cancelar</Button>
        <Button type="submit" variant="outline" disabled={!destino || enviando}>{enviando ? 'Repassando...' : 'Repassar'}</Button>
      </div>
    </form>
  )
}

// pedido ligado ao chamado: código, status, a peça apontada (ou os itens) e o prazo de troca
function PedidoLigado({ chamado: c, pedido }: { chamado: Chamado; pedido: Carga<Pedido> }) {
  const [agora] = useState(() => Date.now())
  if (pedido.erro) return <p className="text-sm text-muted-foreground">Pedido {c.id_pedido}</p>
  if (!pedido.dados) return <p className="text-sm text-muted-foreground">Carregando o pedido {c.id_pedido}...</p>
  const p = pedido.dados
  const apontados = p.itens.filter((i) => i.id_item === c.id_item_pedido || (!c.id_item_pedido && i.id_variante === c.id_variante))
  const itens = apontados.length ? apontados : p.itens
  const prazo = prazoTroca(p)

  return (
    <div className="space-y-2 bg-superficie p-3 text-sm">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <Etiqueta>{p.codigo_venda}</Etiqueta>
        <Status tipo="pedido" valor={p.status} />
      </p>
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.id_item}><NomePeca produto={i.produto} cor={i.cor} tamanho={`${i.tamanho}${i.quantidade > 1 ? `, ${i.quantidade} peças` : ''}`} /></li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {p.entregue_em && prazo
          ? `Entregue em ${dataCurta(p.entregue_em)}; troca ou devolução até ${dataCurta(prazo.toISOString())}${prazo.getTime() < agora ? ', prazo encerrado' : ''}.`
          : `${moeda(p.valor_total)}, ${p.canal === 'loja_fisica' ? 'compra na loja' : 'compra no site'}.`}
      </p>
    </div>
  )
}

// conversa e painel do chamado aberto, na terceira coluna da caixa de entrada.
// `aoMudar` atualiza a lista e as contagens quando o chamado muda (assumir, concluir, prioridade)
function ChamadoAberto({ idChamado, aoMudar }: { idChamado: string; aoMudar: () => void }) {
  const chamado = useCarregar(() => api<Chamado>(`/atendimento/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api<Esquema<'Lista_MensagemSaida_'>>(`/atendimento/chamados/${idChamado}/mensagens`), [idChamado])
  const historico = useCarregar(() => api<Historico>(`/atendimento/chamados/${idChamado}/historico`), [idChamado])
  const { recarregar: recarregarMensagens } = mensagens

  useEffect(() => {
    const id = setInterval(recarregarMensagens, INTERVALO_ATUALIZACAO)
    return () => clearInterval(id)
  }, [recarregarMensagens])

  if (chamado.carregando && !chamado.dados) return <Carregando />
  if (chamado.erro || !chamado.dados) return <Aviso mensagem={chamado.erro ?? 'Chamado não encontrado.'} />
  const c = chamado.dados
  const concluido = c.status === 'concluido'

  function atualizarTudo() {
    chamado.recarregar()
    historico.recarregar()
    aoMudar()
  }

  function aposResponder() {
    recarregarMensagens()
    atualizarTudo()
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-medium">{c.assunto}</h2>
          <p className="text-sm text-muted-foreground">
            Chamado {c.id_chamado}, aberto por {c.cliente} em {dataLonga(c.criado_em)} às {hora(c.criado_em)}, {CATEGORIAS_CHAMADO[c.categoria]?.toLowerCase()}
          </p>
        </div>
        <Prioridade valor={c.prioridade} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6">
          <ol aria-label="Mensagens" className="space-y-5">
            <Mensagem mensagem={{ conteudo: c.descricao, autor: c.cliente, criado_em: c.criado_em }} />
            {mensagens.dados?.items.map((m) => <Mensagem key={m.id_mensagem} mensagem={m} />)}
          </ol>
          {mensagens.erro && <Aviso mensagem={mensagens.erro} />}

          {!concluido && <Responder chamado={c} aoEnviar={aposResponder} />}
        </div>

        <PainelDoChamado chamado={c} historico={historico} aoMudar={atualizarTudo} />

      </div>
    </>
  )
}

// balão da conversa: cliente à esquerda, equipe à direita; nota interna em ardósia-claro com
// "Só a equipe vê" (design, seção Atendimento). A primeira mensagem é a descrição do chamado.
// a descrição do chamado entra como a primeira mensagem, sem id nem anexo
type MensagemNaTela = Pick<Mensagem, 'conteudo' | 'autor' | 'criado_em'> & Partial<Mensagem>

function Mensagem({ mensagem: m }: { mensagem: MensagemNaTela }) {
  const daEquipe = Boolean(m.da_equipe)
  return (
    <li className={cn('flex flex-col gap-1', daEquipe ? 'items-end' : 'items-start')}>
      <div className={cn('max-w-[85%] space-y-2 px-4 py-3 text-sm', m.interna ? 'bg-ardosia-clara' : daEquipe ? 'bg-aco-fundo' : 'bg-superficie')}>
        {m.interna && <span className="block text-xs font-medium text-ardosia">Só a equipe vê</span>}
        {m.conteudo && <p className="whitespace-pre-line">{m.conteudo}</p>}
        {m.anexo_nome && m.id_mensagem !== undefined && <Anexo mensagem={m as Mensagem} />}
      </div>
      <span className="text-xs text-muted-foreground">
        {m.autor}{m.interna && ', nota interna'}, {dataHora(m.criado_em)}
      </span>
    </li>
  )
}

// o arquivo fica na área privada do Storage: o link é pedido na hora e vale por pouco tempo.
// A aba nova abre antes da chamada para o navegador não bloquear a janela.
function Anexo({ mensagem: m }: { mensagem: Mensagem }) {
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    setErro(null)
    const janela = window.open('', '_blank')
    try {
      const { url } = await api<Esquema<'AnexoLink'>>(`/atendimento/chamados/${m.id_chamado}/mensagens/${m.id_mensagem}/anexo`)
      if (janela) janela.location.href = url
      else window.location.href = url
    } catch (falha) {
      janela?.close()
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível abrir o anexo. Tente de novo.')
    }
  }

  return (
    <div>
      <button type="button" onClick={abrir} className="flex items-center gap-2 border bg-background px-3 py-2 text-left text-xs hover:border-foreground">
        <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate underline underline-offset-2">{m.anexo_nome}</span>
        <span className="shrink-0 text-muted-foreground">{tamanhoArquivo(m.anexo_tamanho)}</span>
      </button>
      {erro && <p className="pt-1 text-xs text-destructive">{erro}</p>}
    </div>
  )
}

// mesmas regras do backend para anexo de chamado
const TIPOS_ANEXO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ANEXO_MAXIMO = 10 * 1024 * 1024

// campo de resposta: responder ao cliente ou nota interna, com texto e um anexo opcional
function Responder({ chamado: c, aoEnviar }: { chamado: Chamado; aoEnviar: () => void }) {
  const [modo, setModo] = useState<'cliente' | 'interna'>('cliente')
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const { enviar, enviando, erro } = useEnviar()
  const interna = modo === 'interna'

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (!escolhido) return
    if (!TIPOS_ANEXO.includes(escolhido.type)) {
      setErroArquivo('Esse tipo de arquivo não é aceito. Envie JPG, PNG, WEBP ou PDF.')
      return
    }
    if (escolhido.size > ANEXO_MAXIMO) {
      setErroArquivo(`O arquivo tem ${tamanhoArquivo(escolhido.size)}. Envie um de até 10 MB.`)
      return
    }
    setErroArquivo(null)
    setArquivo(escolhido)
  }

  async function responder(evento: FormEvent) {
    evento.preventDefault()
    const conteudo = texto.trim()
    const caminho = `/atendimento/chamados/${c.id_chamado}`
    const ok = await enviar(() => {
      if (!arquivo) return api<Mensagem>(`${caminho}/mensagens`, { metodo: 'POST', corpo: { conteudo, interna } })
      const formulario = new FormData()
      formulario.append('arquivo', arquivo)
      if (conteudo) formulario.append('conteudo', conteudo)
      formulario.append('interna', String(interna))
      return api<Mensagem>(`${caminho}/anexos`, { metodo: 'POST', corpo: formulario })
    })
    if (ok) {
      setTexto('')
      setArquivo(null)
      aoEnviar()
    }
  }

  return (
    <form onSubmit={responder} className={cn('border', interna && 'border-ardosia')}>
      <div className="px-3 pt-2">
        <Abas
          rotulo="Tipo de resposta"
          valor={modo}
          aoMudar={setModo}
          abas={[{ valor: 'cliente', rotulo: `Responder a ${c.cliente.split(' ')[0]}` }, { valor: 'interna', rotulo: 'Nota interna' }]}
        />
      </div>
      <label htmlFor="resposta" className="sr-only">{interna ? 'Nota interna' : 'Mensagem'}</label>
      <textarea
        id="resposta"
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={5000}
        placeholder={interna ? 'Só a equipe vê esta nota' : `Escreva para ${c.cliente.split(' ')[0]}`}
        className={cn('block w-full resize-y px-4 py-3 text-sm outline-none', interna && 'bg-ardosia-clara')}
      />
      {arquivo && (
        <div className="flex items-center gap-2 border-t px-3 py-2 text-xs">
          <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{arquivo.name}</span>
          <span className="shrink-0 text-muted-foreground">{tamanhoArquivo(arquivo.size)}</span>
          <Button type="button" variant="ghost" size="icon" className="ml-auto size-7" aria-label="Tirar o anexo" onClick={() => setArquivo(null)}>
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t p-2">
        <input ref={seletor} type="file" accept={TIPOS_ANEXO.join(',')} onChange={escolher} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <Button type="button" variant="ghost" size="sm" onClick={() => seletor.current?.click()}>
          <Paperclip aria-hidden="true" /> Anexar
        </Button>
        <Button type="submit" size="lg" className="h-10 px-4" disabled={enviando || (!texto.trim() && !arquivo)}>
          <Send aria-hidden="true" /> {enviando ? 'Enviando...' : interna ? 'Salvar nota' : 'Enviar'}
        </Button>
      </div>
      {(erroArquivo || erro) && <div className="border-t p-3"><Aviso mensagem={erroArquivo || erro} /></div>}
    </form>
  )
}
