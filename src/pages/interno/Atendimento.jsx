import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Paperclip, Send, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, ErroApi } from '@/lib/api'
import {
  CATEGORIAS_CHAMADO, dataHora, dataLonga, haQuanto, hora, MOTIVOS_CONCLUSAO, plural, PRIORIDADES, STATUS_CHAMADO, tamanhoArquivo,
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

// caixa de entrada em três colunas (design, seção Atendimento): filas, lista e conversa.
// A mesma tela atende /interno/atendimento e /interno/atendimento/:idChamado; o chamado aberto
// fica na terceira coluna. No celular, a conversa toma a tela e há um link de volta para a fila.
export function Atendimento() {
  const { idChamado } = useParams()
  const { unidade } = useUnidadeEscolhida()
  const [fila, setFila] = useState('sem')
  const [categoria, setCategoria] = useState('')
  const [offset, setOffset] = useState(0)
  const filtros = FILAS.find((f) => f.valor === fila).filtros

  const lista = useCarregar(
    () => api('/atendimento/chamados', { params: { ...filtros, categoria, id_unidade: unidade, limit: POR_PAGINA, offset } }),
    [fila, categoria, unidade, offset],
  )
  // contagem de cada fila (só o total, uma linha por consulta)
  const contagens = useCarregar(
    () => Promise.all(FILAS.map((f) => api('/atendimento/chamados', { params: { ...f.filtros, id_unidade: unidade, limit: 1 } }).then((r) => r.total))),
    [unidade],
  )
  const { recarregar: recarregarLista } = lista
  const { recarregar: recarregarContagens } = contagens
  const aoMudarChamado = useCallback(() => {
    recarregarLista()
    recarregarContagens()
  }, [recarregarLista, recarregarContagens])

  function mudarFila(valor) {
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
function ItemDaFila({ chamado: c, aberto }) {
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

function Marcador({ children }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-1.5 rounded-full bg-terracota" aria-hidden="true" />
      {children}
    </span>
  )
}

function Prioridade({ valor }) {
  if (!valor) return <span className="text-sm text-muted-foreground">Sem prioridade</span>
  if (valor === 'alta') return <span className="text-sm font-medium"><Marcador>Prioridade alta</Marcador></span>
  return <span className="text-sm text-muted-foreground">Prioridade {PRIORIDADES[valor].toLowerCase()}</span>
}

// o histórico guarda o id de quem passou a ser responsável; mostra o que aconteceu, não o id
function textoHistorico(h) {
  if (h.campo_alterado === 'responsavel') return h.valor_anterior ? `${h.autor} repassou` : `${h.autor} assumiu`
  if (h.campo_alterado === 'prioridade') return `Prioridade ${PRIORIDADES[h.valor_novo]?.toLowerCase() ?? h.valor_novo}`
  return STATUS_CHAMADO[h.valor_novo] ?? h.valor_novo
}

// conversa e painel do chamado aberto, na terceira coluna da caixa de entrada.
// `aoMudar` atualiza a lista e as contagens quando o chamado muda (assumir, concluir, prioridade)
function ChamadoAberto({ idChamado, aoMudar }) {
  const { perfil } = useAuth()
  const chamado = useCarregar(() => api(`/atendimento/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api(`/atendimento/chamados/${idChamado}/mensagens`), [idChamado])
  const historico = useCarregar(() => api(`/atendimento/chamados/${idChamado}/historico`), [idChamado])
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
    aoMudar()
  }

  async function acao(caminho, corpo, metodo = 'POST') {
    const ok = await enviar(() => api(`/atendimento/chamados/${idChamado}${caminho}`, { metodo, corpo }))
    if (ok) atualizarTudo()
    return ok
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
            Chamado {c.id_chamado}, aberto por {c.cliente} em {dataLonga(c.criado_em)} às {hora(c.criado_em)}, {CATEGORIAS_CHAMADO[c.categoria].toLowerCase()}
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

        <aside className="space-y-6">
          {erro && <Aviso mensagem={erro} />}
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

// balão da conversa: cliente à esquerda, equipe à direita; nota interna em ardósia-claro com
// "Só a equipe vê" (design, seção Atendimento). A primeira mensagem é a descrição do chamado.
function Mensagem({ mensagem: m }) {
  const daEquipe = Boolean(m.da_equipe)
  return (
    <li className={cn('flex flex-col gap-1', daEquipe ? 'items-end' : 'items-start')}>
      <div className={cn('max-w-[85%] space-y-2 px-4 py-3 text-sm', m.interna ? 'bg-ardosia-clara' : daEquipe ? 'bg-aco-fundo' : 'bg-superficie')}>
        {m.interna && <span className="block text-xs font-medium text-ardosia">Só a equipe vê</span>}
        {m.conteudo && <p className="whitespace-pre-line">{m.conteudo}</p>}
        {m.anexo_nome && <Anexo mensagem={m} />}
      </div>
      <span className="text-xs text-muted-foreground">
        {m.autor}{m.interna && ', nota interna'}, {dataHora(m.criado_em)}
      </span>
    </li>
  )
}

// o arquivo fica na área privada do Storage: o link é pedido na hora e vale por pouco tempo.
// A aba nova abre antes da chamada para o navegador não bloquear a janela.
function Anexo({ mensagem: m }) {
  const [erro, setErro] = useState(null)

  async function abrir() {
    setErro(null)
    const janela = window.open('', '_blank')
    try {
      const { url } = await api(`/atendimento/chamados/${m.id_chamado}/mensagens/${m.id_mensagem}/anexo`)
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
function Responder({ chamado: c, aoEnviar }) {
  const [modo, setModo] = useState('cliente')
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [erroArquivo, setErroArquivo] = useState(null)
  const seletor = useRef(null)
  const { enviar, enviando, erro } = useEnviar()
  const interna = modo === 'interna'

  function escolher(evento) {
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

  async function responder(evento) {
    evento.preventDefault()
    const conteudo = texto.trim()
    const caminho = `/atendimento/chamados/${c.id_chamado}`
    const ok = await enviar(() => {
      if (!arquivo) return api(`${caminho}/mensagens`, { metodo: 'POST', corpo: { conteudo, interna } })
      const formulario = new FormData()
      formulario.append('arquivo', arquivo)
      if (conteudo) formulario.append('conteudo', conteudo)
      formulario.append('interna', String(interna))
      return api(`${caminho}/anexos`, { metodo: 'POST', corpo: formulario })
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
