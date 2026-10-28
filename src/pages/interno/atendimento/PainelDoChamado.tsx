import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { AREAS, podeVerArea } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Aviso, Sucesso } from '@/components/Estados'
import { OrigemMigracao } from '@/components/OrigemMigracao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Status } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta, dataHora, moeda, MOTIVOS_CONCLUSAO, nomeDoMetodo, plural, PRIORIDADES, STATUS_CHAMADO } from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { estornaveis, prazoTroca, type ModoTroca, type TrocaFeita } from '../troca/regrasTrocaDevolucao'
import { type Carga, useCarregar, useEnviar } from '@/lib/useCarregar'
import { AtenderPedido } from '../troca/TrocaDevolucao'
import { caminhoDaFicha } from '../clientes/regrasCliente'
import { nomeDoCanalExterno, quemAbriu, semCadastro, veioDoAssistente } from './regrasChamado'

type Chamado = Esquema<'ChamadoSaida'>
type Pedido = Esquema<'PedidoSaida'>
type Historico = Esquema<'Lista_HistoricoSaida_'>

const AREA_CLIENTES = AREAS.find((a) => a.caminho === 'clientes')
// a ficha do cliente do chamado, com conta ou da Vulto sem conta
const fichaDoCliente = (c: Chamado) => (c.id_cliente ? caminhoDaFicha('conta', c.id_cliente)
  : c.id_cliente_sem_conta ? caminhoDaFicha('sem-conta', c.id_cliente_sem_conta) : null)

// painel do chamado aberto: cliente, pedido, prioridade, repasse, troca, devolução, estorno e histórico

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
export function PainelDoChamado({ chamado: c, historico, aoMudar }: { chamado: Chamado; historico: Carga<Historico>; aoMudar: () => void }) {
  const { perfil } = useAuth()
  const { unidades } = useUnidadeEscolhida()
  const [motivo, setMotivo] = useState('resolvido')
  const [repassando, setRepassando] = useState(false)
  // 'troca' ou 'devolucao' com o painel lateral aberto; `feito` é a confirmação depois de registrar
  const [trocando, setTrocando] = useState<ModoTroca | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const ficha = AREA_CLIENTES && podeVerArea(perfil, AREA_CLIENTES) ? fichaDoCliente(c) : null
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
        <h3 className="text-lg font-medium">
          {ficha ? <Link to={ficha} className="hover:underline">{quemAbriu(c)}</Link> : quemAbriu(c)}
        </h3>
        {c.canal_externo && (
          <p className="text-sm text-muted-foreground">
            Pelo {nomeDoCanalExterno(c.canal_externo)}
            {c.contato_externo && !semCadastro(c) && `, ${c.contato_externo}`}
            {semCadastro(c) && '. Sem cadastro: nada liga esta conversa a um cliente.'}
          </p>
        )}
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

      {/* só no chamado que veio do atendimento da Vulto: a linha da conversa, a categoria e quem atendeu lá */}
      {c.canal_externo && !veioDoAssistente(c) && (
        <div className="border-t pt-4">
          <OrigemMigracao tabela="chamado" idRegistro={c.id_chamado} titulo="Origem na Vulto" semDecisoes />
        </div>
      )}
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
      <SheetContent className="w-full! overflow-y-auto sm:max-w-3xl!">
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
  const metodo = escolhida ? nomeDoMetodo(escolhida.pagamento.metodo).toLowerCase() : ''
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
      <SheetContent className="overflow-y-auto sm:max-w-md!">
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
                        <span className="block font-medium">{nomeDoMetodo(o.pagamento.metodo)}</span>
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
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cliente</dt><dd>{quemAbriu(c)}</dd></div>
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
