import { useEffect, useState } from 'react'
import { ChevronLeft, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api } from '@/lib/api'
import {
  CATEGORIAS_CHAMADO, dataHora, dataLonga, haQuanto, hora, MOTIVOS_CONCLUSAO, PRIORIDADES, STATUS_CHAMADO,
} from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

const POR_PAGINA = 25
const INTERVALO_ATUALIZACAO = 20000

// filas do menu da esquerda: cada uma vira os filtros do GET /atendimento/chamados
const FILAS = [
  { valor: 'sem', rotulo: 'Sem responsável', filtros: { sem_responsavel: true, status: 'aberto' } },
  { valor: 'meus', rotulo: 'Meus em andamento', filtros: { meus: true, status: 'em_andamento' } },
  { valor: 'respondeu', rotulo: 'Cliente respondeu', filtros: { meus: true, com_mensagem_nova: true } },
  { valor: 'andamento', rotulo: 'Todos em andamento', filtros: { status: 'em_andamento' } },
  { valor: 'concluidos', rotulo: 'Concluídos', filtros: { status: 'concluido' } },
]

export function Atendimento() {
  const { unidade } = useUnidadeEscolhida()
  const navegar = useNavigate()
  const [fila, setFila] = useState('sem')
  const [categoria, setCategoria] = useState('')
  const [offset, setOffset] = useState(0)
  const filtros = FILAS.find((f) => f.valor === fila).filtros
  const { enviar, erro: erroAssumir } = useEnviar()

  const lista = useCarregar(
    () => api('/atendimento/chamados', { params: { ...filtros, categoria, id_unidade: unidade, limit: POR_PAGINA, offset } }),
    [fila, categoria, unidade, offset],
  )
  // contagem de cada fila (só o total, uma linha por consulta)
  const contagens = useCarregar(
    () => Promise.all(FILAS.map((f) => api('/atendimento/chamados', { params: { ...f.filtros, id_unidade: unidade, limit: 1 } }).then((r) => r.total))),
    [unidade],
  )

  async function assumir(id) {
    const ok = await enviar(() => api(`/atendimento/chamados/${id}/assumir`, { metodo: 'POST' }))
    if (ok) navegar(`/interno/atendimento/${id}`)
  }

  return (
    <>
      <Cabecalho titulo={FILAS.find((f) => f.valor === fila).rotulo} subtitulo="Chamados abertos pelos clientes no site." />
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Filas" className="lg:hidden">
          <Abas
            rotulo="Filas"
            valor={fila}
            aoMudar={(v) => { setFila(v); setOffset(0) }}
            abas={FILAS.map((f, i) => ({ valor: f.valor, rotulo: f.rotulo, contagem: contagens.dados?.[i] }))}
          />
        </nav>
        <nav aria-label="Filas" className="hidden lg:block">
          {FILAS.map((f, i) => (
            <button
              key={f.valor}
              type="button"
              aria-current={fila === f.valor ? 'true' : undefined}
              onClick={() => { setFila(f.valor); setOffset(0) }}
              className={cn('flex w-full justify-between px-3 py-2.5 text-left text-sm hover:bg-superficie', fila === f.valor && 'bg-superficie font-medium')}
            >
              {f.rotulo}
              <span className="text-muted-foreground">{contagens.dados?.[i] ?? ''}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            <Select aria-label="Categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setOffset(0) }} className="w-auto">
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORIAS_CHAMADO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </Select>
          </div>
          {(lista.erro || erroAssumir) && <Aviso mensagem={lista.erro || erroAssumir} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados?.items.length === 0 && <Vazio>Nenhum chamado nesta fila.</Vazio>}
          {lista.dados?.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pl-2 font-medium">Chamado</th>
                    <th className="font-medium">Categoria</th>
                    <th className="font-medium">Prioridade</th>
                    <th className="font-medium">Aberto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.dados.items.map((c) => (
                    <tr key={c.id_chamado} className="border-b">
                      <td className="py-3 pl-2">
                        <Link to={`/interno/atendimento/${c.id_chamado}`} className="font-medium hover:underline">{c.assunto}</Link>
                        <span className="block text-muted-foreground">
                          Chamado {c.id_chamado}, {c.cliente}
                          {c.responsavel && ` · com ${c.responsavel}`}
                          {c.mensagens_nao_lidas > 0 && <span className="text-ferrugem"> · {c.mensagens_nao_lidas} nova(s)</span>}
                        </span>
                      </td>
                      <td>{CATEGORIAS_CHAMADO[c.categoria]}</td>
                      <td><Prioridade valor={c.prioridade} /></td>
                      <td className="text-muted-foreground">{haQuanto(c.criado_em)}</td>
                      <td className="pr-2 text-right">
                        {!c.id_responsavel && c.status !== 'concluido' ? (
                          <Button variant="outline" onClick={() => assumir(c.id_chamado)}>Assumir</Button>
                        ) : (
                          <Link to={`/interno/atendimento/${c.id_chamado}`} className="text-sm underline underline-offset-2">Abrir</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="chamados" />
        </div>
      </div>
    </>
  )
}

function Prioridade({ valor }) {
  if (!valor) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn('flex items-center gap-1.5', valor === 'alta' && 'text-ferrugem')}>
      <span className={cn('size-1.5 rounded-full', valor === 'alta' ? 'bg-ferrugem' : valor === 'media' ? 'bg-terracota' : 'bg-ardosia')} aria-hidden="true" />
      {PRIORIDADES[valor]}
    </span>
  )
}

// o histórico guarda o id de quem passou a ser responsável; mostra o que aconteceu, não o id
function textoHistorico(h) {
  if (h.campo_alterado === 'responsavel') return h.valor_anterior ? `${h.autor} repassou` : `${h.autor} assumiu`
  if (h.campo_alterado === 'prioridade') return `Prioridade ${PRIORIDADES[h.valor_novo]?.toLowerCase() ?? h.valor_novo}`
  return STATUS_CHAMADO[h.valor_novo] ?? h.valor_novo
}

export function ChamadoInterno() {
  const { idChamado } = useParams()
  const { perfil } = useAuth()
  const chamado = useCarregar(() => api(`/atendimento/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api(`/atendimento/chamados/${idChamado}/mensagens`), [idChamado])
  const historico = useCarregar(() => api(`/atendimento/chamados/${idChamado}/historico`), [idChamado])
  const [modo, setModo] = useState('cliente')
  const [texto, setTexto] = useState('')
  const [motivo, setMotivo] = useState('resolvido')
  const { enviar, enviando, erro } = useEnviar()
  const { recarregar: recarregarMensagens } = mensagens

  useEffect(() => {
    const id = setInterval(recarregarMensagens, INTERVALO_ATUALIZACAO)
    return () => clearInterval(id)
  }, [recarregarMensagens])

  if (chamado.carregando && !chamado.dados) return <Carregando />
  if (chamado.erro) return <Aviso mensagem={chamado.erro} />
  const c = chamado.dados
  const souResponsavel = c.id_responsavel === perfil.id_usuario
  const concluido = c.status === 'concluido'

  function atualizarTudo() {
    chamado.recarregar()
    historico.recarregar()
  }

  async function acao(caminho, corpo, metodo = 'POST') {
    const ok = await enviar(() => api(`/atendimento/chamados/${idChamado}${caminho}`, { metodo, corpo }))
    if (ok) atualizarTudo()
    return ok
  }

  async function responder(evento) {
    evento.preventDefault()
    const ok = await enviar(() => api(`/atendimento/chamados/${idChamado}/mensagens`, {
      metodo: 'POST',
      corpo: { conteudo: texto, interna: modo === 'interna' },
    }))
    if (ok) {
      setTexto('')
      recarregarMensagens()
      atualizarTudo()
    }
  }

  return (
    <>
      <Link to="/interno/atendimento" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Chamados
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{c.assunto}</h1>
          <p className="text-sm text-muted-foreground">
            Chamado {c.id_chamado}, aberto por {c.cliente} em {dataLonga(c.criado_em)} às {hora(c.criado_em)} · {CATEGORIAS_CHAMADO[c.categoria]}
          </p>
        </div>
        <Prioridade valor={c.prioridade} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <ol aria-label="Mensagens" className="space-y-5">
            <Mensagem doCliente texto={c.descricao} rodape={`${c.cliente}, ${dataHora(c.criado_em)}`} />
            {mensagens.dados?.items.map((m) => (
              <Mensagem
                key={m.id_mensagem}
                doCliente={!m.da_equipe}
                interna={m.interna}
                texto={m.conteudo}
                anexo={m.anexo_nome}
                rodape={`${m.autor}, ${dataHora(m.criado_em)}`}
              />
            ))}
          </ol>
          {mensagens.erro && <Aviso mensagem={mensagens.erro} />}

          {!concluido && (
            <form onSubmit={responder} className="border">
              <div className="px-3 pt-2">
                <Abas
                  rotulo="Tipo de resposta"
                  valor={modo}
                  aoMudar={setModo}
                  abas={[{ valor: 'cliente', rotulo: 'Responder' }, { valor: 'interna', rotulo: 'Nota interna' }]}
                />
              </div>
              <label htmlFor="resposta" className="sr-only">Mensagem</label>
              <textarea
                id="resposta"
                rows={4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={5000}
                placeholder={modo === 'interna' ? 'Só a equipe vê esta nota' : `Escreva para ${c.cliente.split(' ')[0]}`}
                className={cn('block w-full resize-y px-4 py-3 text-sm outline-none', modo === 'interna' && 'bg-ferrugem-fundo/60')}
              />
              <div className="flex justify-end border-t p-2">
                <Button type="submit" size="lg" className="h-10 px-4" disabled={enviando || !texto.trim()}>
                  <Send aria-hidden="true" /> {modo === 'interna' ? 'Salvar nota' : 'Enviar'}
                </Button>
              </div>
            </form>
          )}
          {erro && <Aviso mensagem={erro} />}
        </div>

        <aside className="space-y-6">
          <section className="space-y-1">
            <h2 className="text-lg font-medium">{c.cliente}</h2>
            <p className="text-sm text-muted-foreground">Status: {STATUS_CHAMADO[c.status]}</p>
            <p className="text-sm text-muted-foreground">Responsável: {c.responsavel ?? 'ninguém ainda'}</p>
            {(c.id_pedido || c.id_variante || c.id_chamado_anterior) && (
              <p className="flex flex-wrap gap-1.5 pt-2">
                {c.id_pedido && <Etiqueta>Pedido {c.id_pedido}</Etiqueta>}
                {c.id_variante && <Etiqueta>Peça {c.id_variante}</Etiqueta>}
                {c.id_chamado_anterior && (
                  <Link to={`/interno/atendimento/${c.id_chamado_anterior}`}><Etiqueta>Chamado anterior {c.id_chamado_anterior}</Etiqueta></Link>
                )}
              </p>
            )}
          </section>

          {!c.id_responsavel && !concluido && (
            <Button size="lg" className="h-11 w-full" disabled={enviando} onClick={() => acao('/assumir')}>Assumir chamado</Button>
          )}

          {souResponsavel && !concluido && (
            <Campo id="prioridade" rotulo="Prioridade">
              <Select id="prioridade" value={c.prioridade ?? ''} onChange={(e) => acao('', { prioridade: e.target.value }, 'PATCH')} disabled={enviando}>
                <option value="" disabled>Definir</option>
                {Object.entries(PRIORIDADES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Select>
            </Campo>
          )}

          <section>
            <h2 className="mb-1 text-sm font-medium">Histórico deste chamado</h2>
            {historico.dados?.items.length === 0 && <p className="text-sm text-muted-foreground">Sem alterações ainda.</p>}
            <ul className="text-sm">
              {historico.dados?.items.map((h) => (
                <li key={h.id_historico} className="flex justify-between gap-3 border-b py-2.5">
                  <span className="text-muted-foreground">{dataHora(h.criado_em)}</span>
                  <span className="text-right">{textoHistorico(h)}</span>
                </li>
              ))}
            </ul>
          </section>

          {souResponsavel && !concluido && (
            <form
              onSubmit={(e) => { e.preventDefault(); acao('/concluir', { motivo }) }}
              className="flex items-end gap-2"
            >
              <Campo id="motivo-conclusao" rotulo="Concluir como" className="flex-1">
                <Select id="motivo-conclusao" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  {Object.entries(MOTIVOS_CONCLUSAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </Select>
              </Campo>
              <Button type="submit" variant="outline" className="h-9 px-4" disabled={enviando}>Concluir</Button>
            </form>
          )}
          {concluido && (
            <p className="bg-superficie p-4 text-sm">
              Concluído em {dataHora(c.concluido_em)} como {MOTIVOS_CONCLUSAO[c.motivo_encerramento]?.toLowerCase()}.
            </p>
          )}
        </aside>
      </div>
    </>
  )
}

function Mensagem({ doCliente, interna, texto, anexo, rodape }) {
  return (
    <li className={cn('flex flex-col gap-1', doCliente ? 'items-start' : 'items-end')}>
      <div className={cn('max-w-[85%] whitespace-pre-line px-4 py-3 text-sm', interna ? 'bg-ferrugem-fundo' : 'bg-superficie')}>
        {interna && <span className="mb-1 block text-xs font-medium text-ferrugem">Só a equipe vê esta nota</span>}
        {texto}
        {anexo && <span className="mt-1 block text-xs underline">{anexo}</span>}
      </div>
      <span className="text-xs text-muted-foreground">{rodape}</span>
    </li>
  )
}
