import type { ReactNode } from 'react'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, todasAsPaginas, type Esquema } from '@/lib/api'
import { moeda, numero } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { BLOCO_ACO } from '../componentes/estilos'
import { ESTOQUE, FATURAMENTO, FIM_DE_30_09, INICIO_FATURAMENTO, PASSIVO } from './numerosDaMigracao'
import { agruparFaturamento, confere, pecasPorUnidade } from './regrasNumeros'

// aba "Os 3 números da Vulto" da Visão Geral (Etapa 9): faturamento jan/2025–set/2026, estoque e passivo
// de pontos em 01/10/2026. Cada número tem o que a plataforma soma (depois da carga), o que a migração
// calculou e de onde vem a diferença para o sistema da Vulto, com a decisão de cada passo

export function TresNumeros() {
  return (
    <div className="space-y-16">
      <Faturamento />
      <Estoque />
      <Passivo />
    </div>
  )
}

function Secao({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="border-b border-foreground pb-3">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>
      {children}
    </section>
  )
}

// o número grande e, embaixo, se a plataforma confere com a migração
function Destaque({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className="text-3xl font-medium tabular-nums">{valor}</p>
      {detalhe && <p className="text-sm text-muted-foreground">{detalhe}</p>}
    </div>
  )
}

function Conferencia({ bate, carregando }: { bate: boolean | null; carregando?: boolean }) {
  if (carregando) return <span className="text-muted-foreground">conferindo com a plataforma...</span>
  if (bate === null) return <span className="text-muted-foreground">a plataforma ainda não tem esse dado (falta a carga)</span>
  return bate
    ? <span className="font-medium text-marinho">a plataforma confere</span>
    : <span className="font-medium text-ferrugem">a plataforma tem outro número: conferir a carga</span>
}

// cada motivo da margem e, embaixo, em negrito, a margem do número inteiro (a soma deles)
function Margem({ linhas, total }: { linhas: { decisao: string | null; texto: string; valor: string }[]; total: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Margem de erro</h3>
      <ul className="space-y-1 text-sm">
        {linhas.map((l) => (
          <li key={l.texto} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span>{l.texto}</span>
            <span className="tabular-nums text-muted-foreground">{l.valor}</span>
          </li>
        ))}
      </ul>
      <p className="border-t pt-2 text-sm font-semibold">Margem de erro total: {total}</p>
    </div>
  )
}

function Faturamento() {
  const relatorio = FATURAMENTO.ponte[0]!
  const loja = FATURAMENTO.porLoja.filter((l) => l.canal === 'Loja física').reduce((t, l) => t + l.valor, 0)
  // a mesma regra do numeros.py, calculada pela plataforma com os pedidos da Vulto carregados
  const plataforma = useCarregar(
    () => api<Esquema<'Faturamento'>>('/visao-geral/faturamento', { params: { de: INICIO_FATURAMENTO, ate: FIM_DE_30_09, marca: 'vulto' } }),
    [],
  )
  const total = plataforma.dados ? Number(plataforma.dados.valor) : null
  const grupos = plataforma.dados ? agruparFaturamento(plataforma.dados.items) : null
  const naPlataforma = (chave: string) => grupos?.porColuna.get(chave) ?? null

  return (
    <Secao titulo="Faturamento" subtitulo={`${FATURAMENTO.periodo}: venda paga, sem frete, no mês do pedido pelo horário de Brasília`}>
      <div className="grid gap-8 sm:grid-cols-3">
        <Destaque
          rotulo="Nosso número"
          valor={moeda(FATURAMENTO.nosso)}
          detalhe={<Conferencia bate={!total ? null : confere(total, FATURAMENTO.nosso)} carregando={plataforma.carregando && !plataforma.dados} />}
        />
        <Destaque rotulo="Na plataforma" valor={total ? moeda(total) : '—'} detalhe={total ? `frete à parte: ${moeda(plataforma.dados?.frete)}` : undefined} />
        <Destaque rotulo="Relatório do sistema da Vulto" valor={moeda(relatorio.valor)} detalhe="soma tudo, de qualquer status, com o app em centavos" />
      </div>
      <p className="text-sm text-muted-foreground">
        Loja física {moeda(loja)}; online (site e app, que saem do CD Cajamar) {moeda(FATURAMENTO.nosso - loja)}. Frete à parte: {moeda(FATURAMENTO.frete)}.
      </p>
      {plataforma.erro && <Aviso mensagem={plataforma.erro} />}

      <div className="grid gap-10 xl:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Por loja e canal</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 font-medium">Loja</th>
                <th className="font-medium">Canal</th>
                <th className="text-right font-medium">Migração</th>
                <th className="text-right font-medium">Plataforma</th>
              </tr>
            </thead>
            <tbody>
              {FATURAMENTO.porLoja.map((l) => (
                <tr key={l.chave} className="border-b">
                  <td className="py-2">{l.nome}</td>
                  <td className="text-muted-foreground">{l.canal}</td>
                  <td className="text-right tabular-nums">{moeda(l.valor)}</td>
                  <td className="text-right tabular-nums">{naPlataforma(l.chave) === null ? '—' : moeda(naPlataforma(l.chave))}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2">Total</td>
                <td />
                <td className="text-right tabular-nums">{moeda(FATURAMENTO.nosso)}</td>
                <td className="text-right tabular-nums">{total ? moeda(total) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={cn('space-y-2', BLOCO_ACO)}>
          <h3 className="text-sm font-medium">Do relatório da Vulto ao nosso número</h3>
          <table className="w-full text-sm">
            <tbody>
              {FATURAMENTO.ponte.map((p) => (
                <tr key={p.texto} className="border-b border-aco/20 align-baseline">
                  <td className="py-1.5 pr-3">{p.texto}</td>
                  <td className="text-right whitespace-nowrap tabular-nums">{p.decisao ? `${p.valor > 0 ? '+' : '−'}${moeda(Math.abs(p.valor))}` : moeda(p.valor)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-1.5">Nosso faturamento</td>
                <td className="text-right tabular-nums">{moeda(FATURAMENTO.nosso)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {grupos && grupos.meses.length > 0 && <FaturamentoPorMes meses={grupos.meses} />}
      <Margem linhas={FATURAMENTO.margem} total={FATURAMENTO.margemTotal} />
    </Secao>
  )
}

// mês a mês, da plataforma: uma coluna por loja física e uma para o site e o app
function FaturamentoPorMes({ meses }: { meses: ReturnType<typeof agruparFaturamento>['meses'] }) {
  const colunas = FATURAMENTO.porLoja
  const mes = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver o faturamento da plataforma mês a mês</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[52rem] tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Mês</th>
              {colunas.map((c) => <th key={c.chave} className="text-right font-medium">{c.nome.replace(' (CD Cajamar)', '').replace('Vulto ', '')}</th>)}
              <th className="text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-b">
                <td className="py-1.5">{mes(m.mes)}</td>
                {colunas.map((c) => <td key={c.chave} className="text-right">{moeda(m.colunas.get(c.chave) ?? 0)}</td>)}
                <td className="text-right font-medium">{moeda([...m.colunas.values()].reduce((t, v) => t + v, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Estoque() {
  const { unidades } = useUnidadeEscolhida()
  const daVulto = unidades.filter((u) => u.marca === 'vulto')
  const chave = daVulto.map((u) => u.id_unidade).join(',')
  // a posição no fim de 30/09 em cada unidade da Vulto, mais as peças em trânsito naquele momento
  const plataforma = useCarregar(
    () => (daVulto.length === 0 ? null : Promise.all([
      Promise.all(daVulto.map((u) => todasAsPaginas<Esquema<'EstoqueHistoricoItem'>>('/estoque/historico', { em: FIM_DE_30_09, id_unidade: u.id_unidade })))
        .then((listas) => pecasPorUnidade(listas.flat())),
      // uma consulta só: a mesma transferência aparece na unidade de origem e na de destino
      api<Esquema<'Lista_EmTransitoItem_'>>('/estoque/em-transito', { params: { em: FIM_DE_30_09 } })
        .then((lista) => lista.items.filter((i) => daVulto.some((u) => u.id_unidade === i.id_unidade_destino))
          .reduce((t, i) => t + i.quantidade, 0)),
    ])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a lista de unidades muda de identidade; a chave não
    [chave],
  )
  const [porUnidade, transito] = plataforma.dados ?? [null, null]
  const total = porUnidade && transito !== null ? porUnidade.reduce((t, u) => t + u.pecas, 0) + transito : null
  const naPlataforma = (nome: string) => porUnidade?.find((u) => u.unidade === nome)?.pecas ?? null

  return (
    <Secao titulo="Estoque" subtitulo="Em 01/10/2026 (a posição no fim de 30/09), por unidade, contando as peças em trânsito">
      <div className="grid gap-8 sm:grid-cols-3">
        <Destaque
          rotulo="Nosso número"
          valor={`${numero(ESTOQUE.nosso)} peças`}
          detalhe={<Conferencia bate={total === null || total === 0 ? null : confere(total, ESTOQUE.nosso)} carregando={plataforma.carregando && !plataforma.dados} />}
        />
        <Destaque rotulo="Na plataforma" valor={total ? `${numero(total)} peças` : '—'} detalhe={total ? `${numero(transito ?? 0)} em trânsito` : undefined} />
      </div>
      {plataforma.erro && <Aviso mensagem={plataforma.erro} />}

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 font-medium">Unidade</th>
            <th className="font-medium">De onde vem</th>
            <th className="text-right font-medium">Migração</th>
            <th className="text-right font-medium">Plataforma</th>
          </tr>
        </thead>
        <tbody>
          {ESTOQUE.porUnidade.map((u) => (
            <tr key={u.nome} className="border-b align-baseline">
              <td className="py-2 pr-3">{u.nome}</td>
              <td className="pr-3 text-muted-foreground">{u.base}</td>
              <td className="text-right tabular-nums">{numero(u.pecas)}</td>
              <td className="text-right tabular-nums">{naPlataforma(u.nome) === null ? '—' : numero(naPlataforma(u.nome)!)}</td>
            </tr>
          ))}
          <tr className="border-b">
            <td className="py-2">Em trânsito do CD para a loja</td>
            <td className="text-muted-foreground">envios de 21/09 sem recebimento</td>
            <td className="text-right tabular-nums">{numero(ESTOQUE.emTransito)}</td>
            <td className="text-right tabular-nums">{transito ? numero(transito) : '—'}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">{ESTOQUE.sistemaDaVulto}</p>
      <Margem linhas={ESTOQUE.margem} total={ESTOQUE.margemTotal} />
    </Secao>
  )
}

function Passivo() {
  // o passivo no fim de 30/09: confere mesmo depois de alguém ganhar ou resgatar ponto na plataforma
  const passivo = useCarregar(() => api<Esquema<'Lista_PassivoSaida_'>>('/fidelidade/passivo', { params: { em: FIM_DE_30_09 } }), [])
  const daVulto = passivo.dados?.items.find((p) => p.marca === 'vulto') ?? null

  return (
    <Secao titulo="Passivo de pontos do Vulto+" subtitulo="Em 01/10/2026: cada ponto pelo valor da época em que foi ganho">
      <div className="grid gap-8 sm:grid-cols-3">
        <Destaque
          rotulo="Nosso número"
          valor={moeda(PASSIVO.nosso.reais)}
          detalhe={<>{numero(PASSIVO.nosso.pontos)} pontos de {numero(PASSIVO.nosso.clientes)} clientes. <Conferencia bate={daVulto ? confere(daVulto.pontos, PASSIVO.nosso.pontos, 0.5) : null} carregando={passivo.carregando && !passivo.dados} /></>}
        />
        <Destaque rotulo="Na plataforma em 01/10" valor={daVulto ? moeda(daVulto.reais) : '—'} detalhe={daVulto ? `${numero(daVulto.pontos)} pontos` : undefined} />
        <Destaque rotulo="No sistema da Vulto" valor={moeda(PASSIVO.sistemaDaVulto)} detalhe="todo ponto a R$ 0,10, sem a mudança de mar/2025" />
      </div>
      {passivo.erro && <Aviso mensagem={passivo.erro} />}
      {passivo.carregando && !passivo.dados && <Carregando texto="Somando os pontos..." />}

      <table className="w-full max-w-2xl text-sm">
        <tbody>
          {PASSIVO.porValor.map((p) => (
            <tr key={p.texto} className="border-b">
              <td className="py-2">{p.texto}</td>
              <td className="text-right tabular-nums">{numero(p.pontos)} pts</td>
              <td className="text-right tabular-nums">a {moeda(p.valorPonto)}</td>
              <td className="text-right tabular-nums">{moeda(p.reais)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Margem linhas={PASSIVO.margem} total={PASSIVO.margemTotal} />
    </Secao>
  )
}
