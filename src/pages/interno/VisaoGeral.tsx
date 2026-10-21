import { useState, type ReactNode } from 'react'
import { ArrowLeftRight, Plus, ShoppingBag } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { ehAdmin, temPermissao, type CodigoPermissao } from '@/auth/areas'
import { Aviso, Carregando } from '@/components/Estados'
import { NomeDaLoja } from '@/components/Logo'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { buttonVariants } from '@/components/ui/button'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema, type OpcoesApi } from '@/lib/api'
import { BLOCO_ACO } from './componentes/estilos'
import { moeda, numero, plural } from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { GraficoChamados, GraficoMaisVendidas, GraficoVendas } from './componentes/GraficosVisaoGeral'
import { faixasDoPassivo, passivoPorLoja } from './componentes/passivo'
import { TresNumeros } from './numeros/TresNumeros'

type Perfil = Esquema<'Perfil'>
type Resumo = Esquema<'Resumo'>
type Pendencia = { chave: string; rotulo: string; singular: string; para: string; total: number }

const ESTOQUE: CodigoPermissao[] = ['movimentar_estoque', 'definir_estoque_minimo']
// quem vê a seção de vendas do resumo (a mesma regra do backend); atender_chamado vê a de atendimento
const VENDAS: CodigoPermissao[] = ['registrar_venda_fisica', 'preparar_entregar_pedido']
// a retirada vence em 7 dias; a partir de 5, entra nas pendências (mesmo corte do resumo)
const RETIRADA_PERTO_DE_VENCER_DIAS = 5
// cobertura abaixo disso é número fora do esperado na tabela das unidades
const COBERTURA_BAIXA_DIAS = 15

// só o total importa: pede uma linha e lê o total da página
const contar = (caminho: string, params: OpcoesApi['params']) =>
  api<{ total: number }>(caminho, { params: { ...params, limit: 1 } }).then((r) => r.total)

// pendências que a conta pode resolver, cada uma com a contagem e o lugar onde se resolve.
// O resumo da Visão Geral não traz contagens por pessoa, então cada uma é uma consulta curta.
function usePendencias(perfil: Perfil | null, unidade: string) {
  // recarrega quando muda a unidade ou o perfil (outra pessoa ou permissões atualizadas)
  return useCarregar(async () => {
    const pode = (codigo: CodigoPermissao) => temPermissao(perfil, codigo)
    const idUnidade = unidade ? Number(unidade) : null
    // o total chega como número ou como a consulta que vai contar; tudo espera junto no fim
    const lista: (Omit<Pendencia, 'total'> & { total: number | Promise<number> })[] = []
    // transferências numa situação: sem unidade, o total da API já é a resposta; com unidade, a API
    // devolve as que saem e as que chegam, e a direção se confere aqui numa lista já pequena
    const transferencias = async (status: string, direcao: 'id_unidade_destino' | 'id_unidade_origem') => {
      if (!idUnidade) return contar('/transferencias', { status })
      const pagina = await api<Esquema<'Pagina_TransferenciaSaida_'>>('/transferencias', { params: { status, id_unidade: unidade, limit: 200 } })
      return pagina.items.filter((t) => t[direcao] === idUnidade).length
    }

    if (ESTOQUE.some(pode)) {
      lista.push({
        chave: 'minimo', rotulo: 'peças abaixo do mínimo', singular: 'peça abaixo do mínimo', para: '/interno/estoque?abaixo=1',
        total: contar('/estoque', { abaixo_minimo: true, id_unidade: unidade }),
      })
    }
    if (pode('receber_transferencia')) {
      lista.push({
        chave: 'chegando', rotulo: 'transferências para receber', singular: 'transferência para receber', para: '/interno/transferencias',
        total: transferencias('enviada', 'id_unidade_destino'),
      })
    }
    if (pode('enviar_transferencia')) {
      lista.push({
        chave: 'enviar', rotulo: 'transferências para enviar', singular: 'transferência para enviar', para: '/interno/transferencias',
        total: transferencias('solicitada', 'id_unidade_origem'),
      })
    }
    if (pode('preparar_entregar_pedido')) {
      lista.push({
        chave: 'preparar', rotulo: 'pedidos online para preparar', singular: 'pedido online para preparar', para: '/interno/pedidos',
        total: contar('/vendas/pedidos', { status: 'pago', id_unidade: unidade }),
      })
      lista.push({
        chave: 'retiradas', rotulo: 'retiradas perto de vencer', singular: 'retirada perto de vencer', para: '/interno/caixa',
        total: contar('/vendas/pedidos', { status: 'pronto_para_retirada', pronto_ha_mais_de_dias: RETIRADA_PERTO_DE_VENCER_DIAS, id_unidade: unidade }),
      })
    }
    if (pode('atender_chamado')) {
      lista.push({
        chave: 'respostas', rotulo: 'clientes responderam seus chamados', singular: 'cliente respondeu seu chamado', para: '/interno/atendimento',
        total: contar('/atendimento/chamados', { meus: true, com_mensagem_nova: true }),
      })
      lista.push({
        chave: 'fila', rotulo: 'chamados sem responsável', singular: 'chamado sem responsável', para: '/interno/atendimento',
        total: contar('/atendimento/chamados', { sem_responsavel: true, status: 'aberto', id_unidade: unidade }),
      })
    }
    if (pode('moderar_avaliacoes')) {
      lista.push({
        chave: 'denuncias', rotulo: 'denúncias de avaliação para analisar', singular: 'denúncia de avaliação para analisar', para: '/interno/avaliacoes',
        total: contar('/moderacao/denuncias', {}),
      })
    }

    const totais = await Promise.all(lista.map((p) => p.total))
    return lista.map((p, i): Pendencia => ({ ...p, total: totais[i] ?? 0 }))
  }, [perfil, unidade])
}

// início da plataforma interna: pendências, números e gráficos só das áreas da conta, na unidade
// do topo (sem unidade: a rede). O resumo (GET /visao-geral/resumo) já vem cortado pelo perfil.
// O Admin tem uma segunda aba, "Os 3 números da Vulto" (Etapa 9), com a aba no endereço (?aba=numeros)
export function VisaoGeral() {
  const { perfil } = useAuth()
  const [params, setParams] = useSearchParams()
  if (ehAdmin(perfil) && params.get('aba') === 'numeros') {
    return (
      <div className="space-y-12">
        <Cabecalho
          titulo="Os 3 números da Vulto"
          subtitulo="O que a Entrega 3 pede para a diretoria: o número da migração, o da plataforma e a diferença para o sistema da Vulto."
          abas={<AbasDaVisaoGeral aba="numeros" aoMudar={setParams} />}
        />
        <TresNumeros />
      </div>
    )
  }
  return <Hoje aoMudarAba={setParams} />
}

// as duas abas, só para o Admin
function AbasDaVisaoGeral({ aba, aoMudar }: { aba: 'hoje' | 'numeros'; aoMudar: (params: Record<string, string>, opcoes: { replace: boolean }) => void }) {
  return (
    <Abas
      semLinha
      rotulo="Partes da Visão Geral"
      valor={aba}
      aoMudar={(v) => aoMudar(v === 'numeros' ? { aba: v } : {}, { replace: true })}
      abas={[{ valor: 'hoje', rotulo: 'Hoje' }, { valor: 'numeros', rotulo: 'Os 3 números da Vulto' }]}
    />
  )
}

function Hoje({ aoMudarAba }: { aoMudarAba: (params: Record<string, string>, opcoes: { replace: boolean }) => void }) {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const pode = (codigo: CodigoPermissao) => temPermissao(perfil, codigo)
  const admin = ehAdmin(perfil)
  const [dia] = useState(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }))

  const resumo = useCarregar(() => api<Resumo>('/visao-geral/resumo', { params: { id_unidade: unidade } }), [unidade])
  const pendencias = usePendencias(perfil, unidade)
  const r = resumo.dados

  const titulo = unidade ? nomeUnidade(unidades, Number(unidade)) : 'Toda a rede'
  const abertas = (pendencias.dados ?? []).filter((p) => p.total > 0).length
  // as que pedem atenção vêm primeiro, da maior para a menor; as zeradas, na ordem de sempre (o sort é estável)
  const pendenciasEmOrdem = [...(pendencias.dados ?? [])].sort((a, b) => b.total - a.total)
  // as duas colunas já existem antes do resumo chegar, pelo perfil: assim os números carregam ao
  // lado das pendências, e não aparecem embaixo delas para depois pular de lugar
  const verPontos = pode('gerenciar_fidelidade')
  const teraNumeros = admin || VENDAS.some(pode) || pode('atender_chamado')

  return (
    <div className="space-y-12">
      <Cabecalho
        titulo={titulo}
        subtitulo={
          <span className="block first-letter:uppercase">
            {dia}.{' '}
            {pendencias.dados && (abertas ? `${plural(abertas, 'pendência', 'pendências')} para resolver.` : 'Tudo em dia.')}
          </span>
        }
        abas={admin ? <AbasDaVisaoGeral aba="hoje" aoMudar={aoMudarAba} /> : undefined}
      >
        <Atalhos pode={pode} />
      </Cabecalho>

      <div className={cn('grid gap-12', teraNumeros && 'lg:grid-cols-[25rem_1fr]')}>
        {/* linha vertical entre pendências e números, com o mesmo respiro dos dois lados. Embaixo das
            pendências, os pontos: são da rede inteira, então ficam fora da coluna da unidade escolhida */}
        <div className={cn('space-y-12', teraNumeros ? 'lg:border-r lg:pr-12' : 'max-w-md')}>
          <section aria-labelledby="titulo-pendencias">
            <h2 id="titulo-pendencias" className="border-b border-foreground pb-3 text-lg font-medium">Pendências</h2>
            {pendencias.erro && <div className="mt-4"><Aviso mensagem={pendencias.erro} /></div>}
            {pendencias.carregando && !pendencias.dados && <Carregando texto="Conferindo as pendências..." />}
            {pendencias.dados?.length === 0 && <p className="py-6 text-sm text-muted-foreground">Sua conta não tem pendências para acompanhar aqui.</p>}
            <ul>
              {pendenciasEmOrdem.map((p) => <LinhaPendencia key={p.chave} pendencia={p} />)}
            </ul>
          </section>
          {verPontos && <PassivoDePontos />}
        </div>

        {teraNumeros && (
          <div className="min-w-0 space-y-12">
            {resumo.carregando && !r && <Carregando texto="Carregando os números..." />}
            {resumo.erro && <Aviso mensagem={resumo.erro}>Recarregue a página para tentar de novo.</Aviso>}
            {r?.vendas_por_dia && (
              <section aria-labelledby="titulo-vendas" className="space-y-6">
                <h2 id="titulo-vendas" className="border-b border-foreground pb-3 text-lg font-medium">Vendas</h2>
                <NumerosVendas dias={r.vendas_por_dia} />
                <div className="grid gap-10 xl:grid-cols-[1fr_22rem]">
                  <GraficoVendas dias={r.vendas_por_dia} />
                  <GraficoMaisVendidas pecas={r.mais_vendidas ?? []} />
                </div>
              </section>
            )}
            {r?.chamados && (
              <section aria-labelledby="titulo-chamados" className="space-y-6">
                <h2 id="titulo-chamados" className="border-b border-foreground pb-3 text-lg font-medium">Atendimento</h2>
                <div className="grid grid-cols-3 gap-6">
                  <Numero rotulo="Abertos" valor={r.chamados.abertos} />
                  <Numero rotulo="Em andamento" valor={r.chamados.em_andamento} />
                  <Numero rotulo="Concluídos em 7 dias" valor={r.chamados.concluidos_7_dias} />
                </div>
                <GraficoChamados dias={r.chamados.por_dia} />
              </section>
            )}
          </div>
        )}
      </div>

      {admin && r?.rede_agora && <RedeAgora rede={r.rede_agora} unidades={r.por_unidade ?? []} />}
    </div>
  )
}

function Atalhos({ pode }: { pode: (codigo: CodigoPermissao) => boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pode('registrar_venda_fisica') && (
        <Link to="/interno/caixa" className={cn(buttonVariants({ variant: 'aco', size: 'lg' }), 'h-11 px-4')}>
          <ShoppingBag aria-hidden="true" /> Nova venda no caixa
        </Link>
      )}
      {pode('movimentar_estoque') && (
        <Link to="/interno/estoque/movimentacoes?registrar=1" className={cn(buttonVariants({ variant: 'aco', size: 'lg' }), 'h-11 px-4')}>
          <Plus aria-hidden="true" /> Registrar movimentação
        </Link>
      )}
      {pode('solicitar_transferencia') && (
        <Link to="/interno/transferencias?nova=1" className={cn(buttonVariants({ variant: 'aco', size: 'lg' }), 'h-11 px-4')}>
          <ArrowLeftRight aria-hidden="true" /> Pedir peças a outra unidade
        </Link>
      )}
    </div>
  )
}

// quanto mais coisa parada, mais forte o terracota (pendência, no design). Faixas fixas, para a mesma
// quantidade ter sempre o mesmo peso: 1 a 4 só o fundo claro; 5 a 9 ganha a barra e o número em
// terracota; 10 ou mais, fundo mais forte e texto em negrito
const PENDENCIA_MEDIA = 5
const PENDENCIA_ALTA = 10

// número grande; zerada, o número fica cinza com "tudo em dia"
function LinhaPendencia({ pendencia: p }: { pendencia: Pendencia }) {
  const ha = p.total > 0
  const media = p.total >= PENDENCIA_MEDIA
  const alta = p.total >= PENDENCIA_ALTA
  return (
    <li>
      <Link
        to={p.para}
        className={cn(
          'group flex items-center gap-4 border-b px-3 py-4',
          !ha && 'hover:bg-superficie',
          ha && !alta && 'bg-terracota-fundo hover:bg-terracota/10',
          alta && 'bg-terracota/20 hover:bg-terracota/25',
          media && 'shadow-[inset_4px_0_0_var(--terracota)]',
        )}
      >
        <span className={cn('w-12 shrink-0 text-right text-3xl font-medium tabular-nums', !ha && 'text-muted-foreground', media && 'text-terracota')}>
          {p.total}
        </span>
        <span className={cn('min-w-0 flex-1 text-sm', alta && 'font-semibold')}>
          {p.total === 1 ? p.singular : p.rotulo}
          {!ha && <span className="block text-xs text-muted-foreground">tudo em dia</span>}
        </span>
      </Link>
    </li>
  )
}

// o que as duas marcas devem em pontos aos clientes, hoje e na rede inteira (o passivo não é por loja);
// fica fora do resumo porque vem da fidelidade, só para quem gerencia o programa
function PassivoDePontos() {
  const passivo = useCarregar(() => api<Esquema<'Lista_PassivoSaida_'>>('/fidelidade/passivo'), [])
  return (
    <section aria-labelledby="titulo-pontos" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-foreground pb-3">
        <h2 id="titulo-pontos" className="text-lg font-medium">Pontos a resgatar</h2>
        <span className="text-xs text-muted-foreground">toda a rede</span>
      </div>
      <p className="text-xs text-muted-foreground">Cada ponto pelo valor da época em que foi ganho.</p>
      {passivo.erro && <Aviso mensagem={passivo.erro} />}
      {passivo.carregando && !passivo.dados && <Carregando texto="Somando os pontos..." />}
      {passivo.dados && (
        <div className="space-y-8">
          {passivoPorLoja(passivo.dados.items).map(({ loja, passivo: p }) => (
            <div key={loja} className="space-y-3">
              <NomeDaLoja loja={loja} className="text-sm" />
              {!p ? (
                <p className="text-sm text-muted-foreground">Nenhum ponto em aberto.</p>
              ) : (
                <>
                  <Numero rotulo="Em reais" valor={moeda(p.reais)} detalhe={`${numero(p.pontos)} pontos`} />
                  {faixasDoPassivo(p).length > 1 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {faixasDoPassivo(p).map((f) => (
                        <li key={f.valor_ponto} className="flex justify-between gap-3 tabular-nums">
                          <span>{numero(f.pontos)} pts a {moeda(f.valor_ponto)}</span>
                          <span>{moeda(f.reais)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function NumerosVendas({ dias }: { dias: Esquema<'VendasDoDia'>[] }) {
  const soma = (canal: 'online' | 'loja_fisica', campo: 'valor' | 'pedidos') => dias.reduce((t, d) => t + Number(d[canal][campo]), 0)
  return (
    <div className="grid grid-cols-2 gap-6">
      <Numero rotulo="Online em 14 dias" valor={moeda(soma('online', 'valor'))} detalhe={plural(soma('online', 'pedidos'), 'pedido')} />
      <Numero rotulo="Loja física em 14 dias" valor={moeda(soma('loja_fisica', 'valor'))} detalhe={plural(soma('loja_fisica', 'pedidos'), 'venda')} />
    </div>
  )
}

function Numero({ rotulo, valor, detalhe, alerta, className }: {
  rotulo: string
  valor: ReactNode
  detalhe?: string | null
  alerta?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn('text-2xl font-medium tabular-nums', alerta && 'text-terracota')}>{valor ?? '—'}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}

// ---------- A rede agora (só Admin; sempre a rede inteira) ----------

const umaCasa = (n: number) => numero(n, 1)

function variacao(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return 'sem base para comparar'
  const sinal = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sinal}${umaCasa(Math.abs(pct))}% contra os 14 dias anteriores`
}

function horas(h: number | null | undefined) {
  if (h === null || h === undefined) return null
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${umaCasa(h)} h`
}

function RedeAgora({ rede, unidades }: { rede: Esquema<'RedeAgora'>; unidades: Esquema<'LinhaDaUnidade'>[] }) {
  const v = rede.vendas_14_dias
  const t = rede.ticket_medio_30_dias
  const a = rede.avaliacoes
  return (
    <section aria-labelledby="titulo-rede" className={cn('space-y-8', BLOCO_ACO)}>
      <h2 id="titulo-rede" className="border-b border-foreground pb-3 text-lg font-medium">A rede agora</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Numero rotulo="Vendas em 14 dias" valor={moeda(v.total.valor)} detalhe={variacao(v.total.variacao_valor_pct)} />
        <Numero rotulo="Online em 14 dias" valor={moeda(v.online.valor)} detalhe={variacao(v.online.variacao_valor_pct)} />
        <Numero rotulo="Loja física em 14 dias" valor={moeda(v.loja_fisica.valor)} detalhe={variacao(v.loja_fisica.variacao_valor_pct)} />
        <Numero rotulo="Ticket médio em 30 dias" valor={moeda(t.total)} detalhe={`online ${moeda(t.online)}, loja ${moeda(t.loja_fisica)}`} />
        <Numero
          rotulo="Cobertura de estoque"
          valor={rede.cobertura_dias === null ? '—' : `${umaCasa(rede.cobertura_dias)} dias`}
          detalhe={rede.cobertura_dias === null ? 'sem vendas em 30 dias' : 'no ritmo de venda dos últimos 30 dias'}
          alerta={rede.cobertura_dias !== null && rede.cobertura_dias < COBERTURA_BAIXA_DIAS}
        />
        <Numero
          rotulo="Ruptura no online"
          valor={rede.ruptura_online_pct === null ? '—' : `${umaCasa(rede.ruptura_online_pct)}%`}
          detalhe="das peças à venda sem estoque para o site"
          alerta={(rede.ruptura_online_pct ?? 0) > 0}
        />
        <Numero
          rotulo="Primeira resposta"
          valor={horas(rede.primeira_resposta_mediana_horas) ?? '—'}
          detalhe={`mediana; ${plural(rede.chamados_esperando_primeira_resposta, 'chamado esperando', 'chamados esperando')}`}
        />
        <Numero
          rotulo="Nota média em 90 dias"
          valor={a.nota_media_90_dias === null ? '—' : umaCasa(a.nota_media_90_dias)}
          detalhe={`${plural(a.quantidade_90_dias, 'avaliação', 'avaliações')}; ${plural(a.denuncias_pendentes, 'denúncia pendente', 'denúncias pendentes')}`}
          alerta={a.denuncias_pendentes > 0}
        />
        <Numero
          rotulo="Retiradas perto de vencer"
          valor={rede.retiradas_perto_de_vencer}
          detalhe="prontas há mais de 5 dias"
          alerta={rede.retiradas_perto_de_vencer > 0}
        />
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">Números de cada unidade</caption>
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 font-medium">Unidade</th>
              <th className="text-right font-medium">Vendas em 7 dias</th>
              <th className="text-right font-medium">Cobertura</th>
              <th className="text-right font-medium">Abaixo do mínimo</th>
              <th className="text-right font-medium">Retiradas perto de vencer</th>
              <th className="text-right font-medium">Transferências para enviar</th>
              <th className="text-right font-medium">Chegando</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id_unidade} className="border-b">
                <td className="py-3">
                  {u.nome}
                  {u.tipo === 'cd' && <span className="block text-xs text-muted-foreground">Centro de distribuição</span>}
                </td>
                <td className="text-right tabular-nums">
                  {moeda(u.vendas_7_dias.valor)}
                  <span className="block text-xs text-muted-foreground">{plural(u.vendas_7_dias.pedidos, 'pedido')}</span>
                </td>
                <Celula valor={u.cobertura_dias === null ? '—' : `${umaCasa(u.cobertura_dias)} dias`} fora={u.cobertura_dias !== null && u.cobertura_dias < COBERTURA_BAIXA_DIAS} />
                <Celula valor={u.variantes_abaixo_do_minimo} fora={u.variantes_abaixo_do_minimo > 0} />
                <Celula valor={u.retiradas_perto_de_vencer ?? '—'} fora={(u.retiradas_perto_de_vencer ?? 0) > 0} />
                <Celula valor={u.transferencias_esperando_envio} fora={u.transferencias_esperando_envio > 0} />
                <Celula valor={u.transferencias_chegando} />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pt-2 text-xs text-muted-foreground">
          Em terracota, o que pede atenção: cobertura abaixo de {COBERTURA_BAIXA_DIAS} dias, peças abaixo do mínimo, retiradas perto de vencer e transferências esperando envio.
        </p>
      </div>
    </section>
  )
}

function Celula({ valor, fora }: { valor: ReactNode; fora?: boolean }) {
  return (
    <td className={cn('text-right tabular-nums', fora && 'font-medium text-terracota')}>{valor}</td>
  )
}
