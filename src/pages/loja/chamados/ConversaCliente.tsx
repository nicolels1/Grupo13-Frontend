import { useEffect, useRef, type ReactNode } from 'react'
import { CircleCheck, Package } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Status } from '@/components/Status'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta, dataLonga } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { CabecalhoDoLado } from './CabecalhoDoLado'
import { useContextoChamados } from './contexto'
import { IconeDaCategoria } from './IconeDaCategoria'
import { Balao, Compositor } from './Mensagens'

type Chamado = Esquema<'ChamadoSaida'>
type Pedido = Esquema<'PedidoSaida'>

// de quanto em quanto tempo a conversa aberta procura respostas novas
const INTERVALO_ATUALIZACAO = 20000

// a conversa: cabeçalho com situação, assunto e pedido ligado; mensagens agrupadas por dia num fundo
// ardósia-claro, para os balões (marinho seus, brancos da equipe) se destacarem;
// abrir a conversa marca as respostas da equipe como lidas (o backend faz isso ao listar)
export function ConversaCliente() {
  const { idChamado } = useParams()
  const { recarregarLista } = useContextoChamados()
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
