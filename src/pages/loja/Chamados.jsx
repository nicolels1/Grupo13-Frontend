import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Button, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { api } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta, dataHora, dataLonga, STATUS_CHAMADO } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

// de quanto em quanto tempo a conversa aberta procura respostas novas
const INTERVALO_ATUALIZACAO = 20000

// /loja/chamados: lista à esquerda e o chamado (ou o formulário de novo) à direita
export function ChamadosCliente() {
  const lista = useCarregar(() => api('/chamados', { params: { limit: 50 } }), [])

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[17rem_1fr]">
      <aside className="space-y-5">
        <Link to="/loja/ajuda" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Central de ajuda
        </Link>
        <h1 className="text-sm font-medium uppercase tracking-[0.15em]">Meus chamados</h1>
        <Link to="/loja/chamados/novo" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 w-full uppercase tracking-[0.12em]')}>
          Novo chamado
        </Link>
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.erro && <Aviso mensagem={lista.erro} />}
        <nav aria-label="Chamados" className="border-t border-foreground">
          {lista.dados?.items.map((chamado) => (
            <NavLink
              key={chamado.id_chamado}
              to={`/loja/chamados/${chamado.id_chamado}`}
              className={({ isActive }) => cn('block border-b px-1 py-3 hover:bg-superficie', isActive && 'bg-superficie')}
            >
              <span className="block truncate text-sm font-medium">#{chamado.id_chamado} · {chamado.assunto}</span>
              <span className="block text-xs text-muted-foreground">
                {chamado.status === 'concluido'
                  ? `Concluído em ${dataCurta(chamado.concluido_em)}`
                  : STATUS_CHAMADO[chamado.status]}
                {chamado.mensagens_nao_lidas > 0 && (
                  <span className="ml-1 font-medium text-ferrugem">· {chamado.mensagens_nao_lidas} nova(s)</span>
                )}
              </span>
            </NavLink>
          ))}
          {lista.dados?.items.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
          )}
        </nav>
      </aside>

      <section className="min-w-0">
        <Outlet context={{ recarregarLista: lista.recarregar }} />
      </section>
    </div>
  )
}

export function SemChamadoEscolhido() {
  return (
    <div className="flex min-h-80 items-center justify-center border text-sm text-muted-foreground">
      Escolha um chamado na lista ou abra um novo.
    </div>
  )
}

export function NovoChamadoCliente() {
  const navegar = useNavigate()
  const { recarregarLista } = useOutletContext()
  const [params] = useSearchParams()
  const local = useLocation()
  const idVariante = params.get('variante')
  const idAnterior = params.get('anterior')
  const [form, setForm] = useState({
    categoria: idVariante ? 'duvida' : '',
    assunto: local.state?.peca ? `Dúvida sobre ${local.state.peca}` : '',
    descricao: '',
  })
  const { enviar, enviando, erro } = useEnviar()

  async function abrir(evento) {
    evento.preventDefault()
    const corpo = {
      ...form,
      id_variante: idVariante ? Number(idVariante) : null,
      id_chamado_anterior: idAnterior ? Number(idAnterior) : null,
    }
    const chamado = await enviar(() => api('/chamados', { metodo: 'POST', corpo }))
    if (chamado) {
      recarregarLista()
      navegar(`/loja/chamados/${chamado.id_chamado}`, { replace: true })
    }
  }

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  return (
    <form onSubmit={abrir} className="max-w-2xl space-y-5 border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Novo chamado</h2>
        <p className="text-sm text-muted-foreground">
          {idAnterior
            ? `Continua o chamado #${idAnterior}.`
            : 'Conte o que aconteceu. Uma pessoa da equipe responde por aqui.'}
          {local.state?.peca && ` Peça: ${local.state.peca}.`}
        </p>
      </div>
      <Campo id="categoria" rotulo="Assunto do chamado">
        <Select id="categoria" value={form.categoria} onChange={mudar('categoria')} required>
          <option value="" disabled>Escolha</option>
          {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </Select>
      </Campo>
      <Campo id="assunto" rotulo="Título">
        <Input id="assunto" value={form.assunto} onChange={mudar('assunto')} minLength={3} maxLength={200} required />
      </Campo>
      <Campo id="descricao" rotulo="Mensagem">
        <Textarea id="descricao" rows={5} value={form.descricao} onChange={mudar('descricao')} maxLength={5000} required />
      </Campo>
      {erro && <Aviso mensagem={erro} />}
      <Button type="submit" size="lg" className="h-11 px-8 uppercase tracking-[0.12em]" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Abrir chamado'}
      </Button>
    </form>
  )
}

export function ConversaCliente() {
  const { idChamado } = useParams()
  const { recarregarLista } = useOutletContext()
  const chamado = useCarregar(() => api(`/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api(`/chamados/${idChamado}/mensagens`), [idChamado])
  const [texto, setTexto] = useState('')
  const { enviar, enviando, erro } = useEnviar()
  const fim = useRef(null)
  const { recarregar: recarregarMensagens } = mensagens

  // abrir a conversa marca as respostas da equipe como lidas: atualiza o contador da lista
  useEffect(() => {
    if (mensagens.dados) recarregarLista()
  }, [mensagens.dados, recarregarLista])

  useEffect(() => {
    const id = setInterval(recarregarMensagens, INTERVALO_ATUALIZACAO)
    return () => clearInterval(id)
  }, [recarregarMensagens])

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'nearest' })
  }, [mensagens.dados])

  async function responder(evento) {
    evento.preventDefault()
    const ok = await enviar(() => api(`/chamados/${idChamado}/mensagens`, { metodo: 'POST', corpo: { conteudo: texto } }))
    if (ok) {
      setTexto('')
      recarregarMensagens()
    }
  }

  if (chamado.carregando && !chamado.dados) return <Carregando />
  if (chamado.erro) return <Aviso mensagem={chamado.erro} />
  const c = chamado.dados
  const concluido = c.status === 'concluido'

  return (
    <div className="flex min-h-[32rem] flex-col border">
      <header className="space-y-1 border-b px-6 py-4">
        <h2 className="text-lg">#{c.id_chamado} · {c.assunto}</h2>
        <p className="text-sm text-muted-foreground">
          {CATEGORIAS_CHAMADO[c.categoria]} · {STATUS_CHAMADO[c.status]}
          {c.responsavel && ` · Atendente: ${c.responsavel}`}
        </p>
      </header>

      <ol aria-label="Mensagens" className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <li className="text-center text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Aberto em {dataLonga(c.criado_em)}
        </li>
        <Balao minha texto={c.descricao} rodape={`Você · ${dataHora(c.criado_em)}`} />
        {mensagens.dados?.items.map((m) => (
          <Balao
            key={m.id_mensagem}
            minha={!m.da_equipe}
            texto={m.conteudo}
            anexo={m.anexo_nome}
            rodape={`${m.da_equipe ? `${m.autor} · Casa Lorenzi` : 'Você'} · ${dataHora(m.criado_em)}`}
          />
        ))}
        {mensagens.erro && <li><Aviso mensagem={mensagens.erro} /></li>}
        <li ref={fim} aria-hidden="true" />
      </ol>

      {concluido ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-superficie px-6 py-4 text-sm">
          <span className="text-muted-foreground">Este chamado foi concluído em {dataCurta(c.concluido_em)}.</span>
          <Link to={`/loja/chamados/novo?anterior=${c.id_chamado}`} className={buttonVariants({ variant: 'outline' })}>
            Abrir novo sobre este assunto
          </Link>
        </div>
      ) : (
        <form onSubmit={responder} className="space-y-2 border-t p-4">
          {erro && <Aviso mensagem={erro} />}
          <div className="flex gap-2">
            <label htmlFor="mensagem" className="sr-only">Mensagem</label>
            <Input
              id="mensagem"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva uma mensagem"
              maxLength={5000}
              className="h-11"
              required
            />
            <Button type="submit" size="lg" className="h-11 px-6 uppercase tracking-[0.12em]" disabled={enviando || !texto.trim()}>
              Enviar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Balao({ minha, texto, anexo, rodape }) {
  return (
    <li className={cn('flex flex-col gap-1', minha ? 'items-end' : 'items-start')}>
      <div className={cn('max-w-[85%] whitespace-pre-line px-4 py-3 text-sm', minha ? 'bg-marinho text-white' : 'bg-superficie')}>
        {texto}
        {anexo && <span className="mt-1 block text-xs underline">{anexo}</span>}
      </div>
      <span className="text-xs text-muted-foreground">{rodape}</span>
    </li>
  )
}
