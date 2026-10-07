import { useState } from 'react'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso } from '@/components/Estados'
import { Etiqueta } from '@/components/Peca'
import { buttonVariants } from '@/components/ui/button'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api } from '@/lib/api'
import { codigoTransferencia, haQuanto, dataCurta, hora, plural } from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'

const nada = () => Promise.resolve(null)

// início da plataforma interna: o que a unidade em foco precisa fazer, montado com as
// permissões da conta (cada bloco só aparece para quem pode agir nele)
export function VisaoGeral() {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const pode = (codigo) => temPermissao(perfil, codigo)
  const veEstoque = ['movimentar_estoque', 'definir_estoque_minimo', 'solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia'].some(pode)
  const veTransferencias = ['solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia'].some(pode)
  const atende = pode('atender_chamado')
  const [dia] = useState(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }))

  const chamadosNovos = useCarregar(
    () => (atende ? api('/atendimento/chamados', { params: { sem_responsavel: true, status: 'aberto', id_unidade: unidade, limit: 3 } }) : nada()),
    [atende, unidade],
  )
  const respostas = useCarregar(
    () => (atende ? api('/atendimento/chamados', { params: { meus: true, com_mensagem_nova: true, limit: 3 } }) : nada()),
    [atende],
  )
  const transferencias = useCarregar(
    () => (veTransferencias ? api('/transferencias', { params: { id_unidade: unidade, limit: 100 } }) : nada()),
    [veTransferencias, unidade],
  )
  const abaixo = useCarregar(
    () => (veEstoque ? api('/estoque', { params: { abaixo_minimo: true, id_unidade: unidade, limit: 3 } }) : nada()),
    [veEstoque, unidade],
  )
  const transito = useCarregar(
    () => (veEstoque ? api('/estoque/em-transito', { params: { id_unidade: unidade } }) : nada()),
    [veEstoque, unidade],
  )

  const idUnidade = unidade ? Number(unidade) : null
  const lista = transferencias.dados?.items ?? []
  const chegando = lista.filter((t) => t.status === 'enviada' && (!idUnidade || t.id_unidade_destino === idUnidade))
  const paraEnviar = lista.filter((t) => t.status === 'solicitada' && (!idUnidade || t.id_unidade_origem === idUnidade))
  const pecasChegando = (transito.dados?.items ?? [])
    .filter((item) => !idUnidade || item.id_unidade_destino === idUnidade)
    .reduce((soma, item) => soma + item.quantidade, 0)

  const agora = [
    ...(chamadosNovos.dados?.items ?? []).map((c) => ({
      chave: `c${c.id_chamado}`,
      titulo: `Responder ${c.cliente}: ${c.assunto}`,
      etiquetas: [`Chamado ${c.id_chamado}`],
      detalhe: `aberto ${haQuanto(c.criado_em)}`,
      alerta: c.prioridade === 'alta' ? 'Prioridade alta' : null,
      acao: { rotulo: 'Abrir', para: `/interno/atendimento/${c.id_chamado}` },
    })),
    ...(respostas.dados?.items ?? []).map((c) => ({
      chave: `r${c.id_chamado}`,
      titulo: `${c.cliente} respondeu: ${c.assunto}`,
      etiquetas: [`Chamado ${c.id_chamado}`],
      detalhe: `${plural(c.mensagens_nao_lidas, 'mensagem nova', 'mensagens novas')}`,
      acao: { rotulo: 'Abrir', para: `/interno/atendimento/${c.id_chamado}` },
    })),
  ]

  const hoje = [
    ...(pode('receber_transferencia') ? chegando : []).map((t) => ({
      chave: `tr${t.id_transferencia}`,
      titulo: `Receber ${plural(somaItens(t, 'quantidade_enviada'), 'peça')} vindas de ${nomeUnidade(unidades, t.id_unidade_origem)}`,
      etiquetas: [codigoTransferencia(t.id_transferencia)],
      detalhe: `enviada em ${dataCurta(t.enviada_em)} às ${hora(t.enviada_em)}`,
      acao: { rotulo: 'Receber', para: `/interno/transferencias?ver=${t.id_transferencia}`, principal: true },
    })),
    ...(pode('enviar_transferencia') ? paraEnviar : []).map((t) => ({
      chave: `te${t.id_transferencia}`,
      titulo: `Enviar ${plural(somaItens(t, 'quantidade_solicitada'), 'peça')} pedidas por ${nomeUnidade(unidades, t.id_unidade_destino)}`,
      etiquetas: [codigoTransferencia(t.id_transferencia)],
      detalhe: `pedida em ${dataCurta(t.solicitada_em)} às ${hora(t.solicitada_em)}`,
      acao: { rotulo: 'Abrir', para: `/interno/transferencias?ver=${t.id_transferencia}` },
    })),
  ]

  const quandoDer = abaixo.dados?.total
    ? [{
        chave: 'minimo',
        titulo: `Repor ${plural(abaixo.dados.total, 'peça abaixo', 'peças abaixo')} do mínimo`,
        etiquetas: abaixo.dados.items.map((e) => e.sku),
        alertaEtiquetas: true,
        detalhe: abaixo.dados.total > abaixo.dados.items.length ? `e mais ${abaixo.dados.total - abaixo.dados.items.length}` : null,
        acao: { rotulo: 'Ver estoque', para: '/interno/estoque?abaixo=1' },
      }]
    : []

  const erros = [chamadosNovos, respostas, transferencias, abaixo].map((c) => c.erro).filter(Boolean)
  const carregando = [chamadosNovos, respostas, transferencias, abaixo].some((c) => c.carregando)
  const titulo = idUnidade ? nomeUnidade(unidades, idUnidade) : 'Toda a rede'
  const totalTarefas = agora.length + hoje.length + quandoDer.length

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-10 space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{titulo}</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {dia}.{' '}
            {carregando ? 'Conferindo as tarefas...' : `${plural(totalTarefas, 'tarefa aberta', 'tarefas abertas')}.`}
          </p>
        </div>
        {erros.length > 0 && <div className="mb-6"><Aviso mensagem={erros[0]} /></div>}

        <BlocoTarefas titulo="Precisa de atenção agora" tarefas={agora} />
        <BlocoTarefas titulo="Para hoje" tarefas={hoje} />
        <BlocoTarefas titulo="Quando der" tarefas={quandoDer} />
        {!carregando && totalTarefas === 0 && (
          <p className="border-y py-10 text-center text-sm text-muted-foreground">Nada pendente por aqui.</p>
        )}
      </div>

      <aside className="space-y-8">
        <section aria-labelledby="titulo-agora">
          <h2 id="titulo-agora" className="mb-2 text-lg font-medium">{idUnidade ? 'A loja agora' : 'A rede agora'}</h2>
          {veEstoque && <Numero rotulo="Peças abaixo do mínimo" valor={abaixo.dados?.total} alerta />}
          {veEstoque && <Numero rotulo="Peças chegando" valor={transito.dados ? pecasChegando : undefined} />}
          {veTransferencias && <Numero rotulo="Transferências para enviar" valor={transferencias.dados ? paraEnviar.length : undefined} />}
          {atende && <Numero rotulo="Chamados sem responsável" valor={chamadosNovos.dados?.total} />}
        </section>
        <div className="space-y-2">
          {pode('movimentar_estoque') && (
            <Link to="/interno/estoque/movimentacoes?registrar=1" className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full justify-start px-4')}>
              <Plus aria-hidden="true" /> Registrar movimentação
            </Link>
          )}
          {pode('solicitar_transferencia') && (
            <Link to="/interno/transferencias?nova=1" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 w-full justify-start px-4')}>
              <ArrowLeftRight aria-hidden="true" /> Pedir peças a outra unidade
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}

function somaItens(transferencia, campo) {
  return transferencia.itens.reduce((soma, item) => soma + (item[campo] ?? 0), 0)
}

function BlocoTarefas({ titulo, tarefas }) {
  if (tarefas.length === 0) return null
  return (
    <section className="mb-10">
      <h2 className="border-b border-foreground pb-3 text-lg font-medium">{titulo}</h2>
      <ul>
        {tarefas.map((tarefa) => (
          <li key={tarefa.chave} className="flex flex-wrap items-center gap-4 border-b py-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p>{tarefa.titulo}</p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {tarefa.etiquetas.map((e) => <Etiqueta key={e} alerta={tarefa.alertaEtiquetas}>{e}</Etiqueta>)}
                {tarefa.detalhe}
              </p>
            </div>
            {tarefa.alerta && (
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span className="size-1.5 rounded-full bg-terracota" aria-hidden="true" />
                {tarefa.alerta}
              </span>
            )}
            <Link
              to={tarefa.acao.para}
              className={buttonVariants({ variant: tarefa.acao.principal ? 'default' : 'outline', size: 'lg' })}
            >
              {tarefa.acao.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Numero({ rotulo, valor, alerta }) {
  return (
    <div className="flex items-baseline justify-between border-b py-4">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className={cn('text-2xl font-medium', alerta && valor > 0 && 'text-terracota')}>{valor ?? '—'}</span>
    </div>
  )
}
