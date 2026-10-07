import { useState } from 'react'
import { ArrowLeftRight, Plus, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { ehAdmin, temPermissao } from '@/auth/areas'
import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api } from '@/lib/api'
import { moeda, plural } from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { GraficoChamados, GraficoMaisVendidas, GraficoVendas } from './GraficosVisaoGeral'

const ESTOQUE = ['movimentar_estoque', 'definir_estoque_minimo']
// a retirada vence em 7 dias; a partir de 5, entra nas pendências (mesmo corte do resumo)
const RETIRADA_PERTO_DE_VENCER_DIAS = 5
// cobertura abaixo disso é número fora do esperado na tabela das unidades
const COBERTURA_BAIXA_DIAS = 15

// só o total importa: pede uma linha e lê o total da página
const contar = (caminho, params) => api(caminho, { params: { ...params, limit: 1 } }).then((r) => r.total)

// pendências que a conta pode resolver, cada uma com a contagem e o lugar onde se resolve.
// O resumo da Visão Geral não traz contagens por pessoa, então cada uma é uma consulta curta.
function usePendencias(perfil, unidade) {
  const pode = (codigo) => temPermissao(perfil, codigo)
  const idUnidade = unidade ? Number(unidade) : null
  const chave = [unidade, perfil?.id_usuario].join('|')

  return useCarregar(async () => {
    const lista = []
    const transferencias = pode('receber_transferencia') || pode('enviar_transferencia')
      ? (await api('/transferencias', { params: { id_unidade: unidade, limit: 200 } })).items
      : []

    if (ESTOQUE.some(pode)) {
      lista.push({
        chave: 'minimo', rotulo: 'peças abaixo do mínimo', singular: 'peça abaixo do mínimo', para: '/interno/estoque?abaixo=1',
        total: contar('/estoque', { abaixo_minimo: true, id_unidade: unidade }),
      })
    }
    if (pode('receber_transferencia')) {
      const n = transferencias.filter((t) => t.status === 'enviada' && (!idUnidade || t.id_unidade_destino === idUnidade)).length
      lista.push({ chave: 'chegando', rotulo: 'transferências para receber', singular: 'transferência para receber', para: '/interno/transferencias', total: n })
    }
    if (pode('enviar_transferencia')) {
      const n = transferencias.filter((t) => t.status === 'solicitada' && (!idUnidade || t.id_unidade_origem === idUnidade)).length
      lista.push({ chave: 'enviar', rotulo: 'transferências para enviar', singular: 'transferência para enviar', para: '/interno/transferencias', total: n })
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
    return lista.map((p, i) => ({ ...p, total: totais[i] }))
  }, [chave])
}

// início da plataforma interna: pendências, números e gráficos só das áreas da conta, na unidade
// do topo (sem unidade: a rede). O resumo (GET /visao-geral/resumo) já vem cortado pelo perfil.
export function VisaoGeral() {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const pode = (codigo) => temPermissao(perfil, codigo)
  const admin = ehAdmin(perfil)
  const [dia] = useState(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }))

  const resumo = useCarregar(() => api('/visao-geral/resumo', { params: { id_unidade: unidade } }), [unidade])
  const pendencias = usePendencias(perfil, unidade)
  const r = resumo.dados

  const titulo = unidade ? nomeUnidade(unidades, Number(unidade)) : 'Toda a rede'
  const abertas = (pendencias.dados ?? []).filter((p) => p.total > 0).length
  const temNumeros = r && (r.vendas_por_dia || r.chamados)

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{titulo}</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {dia}.{' '}
            {pendencias.dados && (abertas ? `${plural(abertas, 'pendência', 'pendências')} para resolver.` : 'Tudo em dia.')}
          </p>
        </div>
        <Atalhos pode={pode} />
      </div>

      <div className={cn('grid gap-12', temNumeros && 'lg:grid-cols-[22rem_1fr]')}>
        <section aria-labelledby="titulo-pendencias">
          <h2 id="titulo-pendencias" className="border-b border-foreground pb-3 text-lg font-medium">Pendências</h2>
          {pendencias.erro && <div className="mt-4"><Aviso mensagem={pendencias.erro} /></div>}
          {pendencias.carregando && !pendencias.dados && <Carregando texto="Conferindo as pendências..." />}
          {pendencias.dados?.length === 0 && <p className="py-6 text-sm text-muted-foreground">Sua conta não tem pendências para acompanhar aqui.</p>}
          <ul>
            {(pendencias.dados ?? []).map((p) => <Pendencia key={p.chave} pendencia={p} />)}
          </ul>
        </section>

        {(resumo.carregando && !r) && <Carregando texto="Carregando os números..." />}
        {resumo.erro && <Aviso mensagem={resumo.erro}>Recarregue a página para tentar de novo.</Aviso>}
        {temNumeros && (
          <div className="min-w-0 space-y-12">
            {r.vendas_por_dia && (
              <section aria-labelledby="titulo-vendas" className="space-y-6">
                <h2 id="titulo-vendas" className="border-b border-foreground pb-3 text-lg font-medium">Vendas</h2>
                <NumerosVendas dias={r.vendas_por_dia} />
                <div className="grid gap-10 xl:grid-cols-[1fr_22rem]">
                  <GraficoVendas dias={r.vendas_por_dia} />
                  <GraficoMaisVendidas pecas={r.mais_vendidas ?? []} />
                </div>
              </section>
            )}
            {r.chamados && (
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

function Atalhos({ pode }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pode('registrar_venda_fisica') && (
        <Link to="/interno/caixa" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
          <ShoppingBag aria-hidden="true" /> Nova venda no caixa
        </Link>
      )}
      {pode('movimentar_estoque') && (
        <Link to="/interno/estoque/movimentacoes?registrar=1" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
          <Plus aria-hidden="true" /> Registrar movimentação
        </Link>
      )}
      {pode('solicitar_transferencia') && (
        <Link to="/interno/transferencias?nova=1" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
          <ArrowLeftRight aria-hidden="true" /> Pedir peças a outra unidade
        </Link>
      )}
    </div>
  )
}

// número grande com marcador: terracota quando há o que fazer, cinza com "tudo em dia" quando não
function Pendencia({ pendencia: p }) {
  const ha = p.total > 0
  return (
    <li>
      <Link to={p.para} className="group flex items-center gap-4 border-b py-4 hover:bg-superficie">
        <span className={cn('size-2 shrink-0 rounded-full', ha ? 'bg-terracota' : 'bg-border')} aria-hidden="true" />
        <span className={cn('w-12 shrink-0 text-right text-3xl font-medium tabular-nums', !ha && 'text-muted-foreground')}>{p.total}</span>
        <span className="min-w-0 flex-1 text-sm">
          {p.total === 1 ? p.singular : p.rotulo}
          {!ha && <span className="block text-xs text-muted-foreground">tudo em dia</span>}
        </span>
      </Link>
    </li>
  )
}

function NumerosVendas({ dias }) {
  const soma = (canal, campo) => dias.reduce((t, d) => t + Number(d[canal][campo]), 0)
  return (
    <div className="grid grid-cols-2 gap-6">
      <Numero rotulo="Online em 14 dias" valor={moeda(soma('online', 'valor'))} detalhe={plural(soma('online', 'pedidos'), 'pedido')} />
      <Numero rotulo="Loja física em 14 dias" valor={moeda(soma('loja_fisica', 'valor'))} detalhe={plural(soma('loja_fisica', 'pedidos'), 'venda')} />
    </div>
  )
}

function Numero({ rotulo, valor, detalhe, alerta, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn('text-2xl font-medium tabular-nums', alerta && 'text-terracota')}>{valor ?? '—'}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}

// ---------- A rede agora (só Admin; sempre a rede inteira) ----------

const umaCasa = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

function variacao(pct) {
  if (pct === null || pct === undefined) return 'sem base para comparar'
  const sinal = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return `${sinal}${umaCasa(Math.abs(pct))}% contra os 14 dias anteriores`
}

function horas(h) {
  if (h === null || h === undefined) return null
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${umaCasa(h)} h`
}

function RedeAgora({ rede, unidades }) {
  const v = rede.vendas_14_dias
  const t = rede.ticket_medio_30_dias
  const a = rede.avaliacoes
  return (
    <section aria-labelledby="titulo-rede" className="space-y-8">
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
          alerta={rede.ruptura_online_pct > 0}
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

      <div className="overflow-x-auto">
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
                <Celula valor={u.retiradas_perto_de_vencer ?? '—'} fora={u.retiradas_perto_de_vencer > 0} />
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

function Celula({ valor, fora }) {
  return (
    <td className={cn('text-right tabular-nums', fora && 'font-medium text-terracota')}>{valor}</td>
  )
}
