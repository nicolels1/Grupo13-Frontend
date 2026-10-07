import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Input, Label, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, todasAsPaginas } from '@/lib/api'
import { ordenarTamanhos } from '@/lib/cores'
import { CANAIS, codigoTransferencia, dataCurta, dataLonga, hojeIso, hora, paraApi, plural, TIPOS_MOVIMENTACAO } from '@/lib/formato'
import { useAdiado, useCarregar } from '@/lib/useCarregar'
import { AbasEstoque, AcoesEstoque } from './Estoque'
import { GraficoEvolucao } from './GraficoEvolucao'

const POR_PAGINA = 50
const DIAS_NA_REGUA = 31
const ATALHOS = [[7, 'Há 1 semana'], [14, 'Há 2 semanas'], [30, 'Há 1 mês']]
const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['intervalo', 'Escolher intervalo']]
const GRANULARIDADES = [['', 'Automático'], ['hora', 'Por hora'], ['dia', 'Por dia'], ['semana', 'Por semana']]

// "AAAA-MM-DD" de n dias atrás, no horário de Brasília
function diasAtras(n) {
  const d = new Date(`${hojeIso()}T12:00:00`)
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE')
}

const sinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

// junta "naquele momento" e "agora" por variante e unidade (somando os canais do filtro)
function comparar(naquele, agora) {
  const linhas = new Map()
  const juntar = (lista, campo) => {
    for (const l of lista) {
      const chave = `${l.id_variante}-${l.id_unidade}`
      if (!linhas.has(chave)) linhas.set(chave, { chave, ...l, naquele: 0, agora: 0 })
      linhas.get(chave)[campo] += l.quantidade
    }
  }
  juntar(naquele, 'naquele')
  juntar(agora, 'agora')
  return [...linhas.values()].sort((a, b) =>
    a.produto.localeCompare(b.produto, 'pt-BR')
    || a.cor.localeCompare(b.cor, 'pt-BR')
    || ordenarTamanhos([a.tamanho, b.tamanho]).indexOf(a.tamanho) - ordenarTamanhos([a.tamanho, b.tamanho]).indexOf(b.tamanho)
    || a.unidade.localeCompare(b.unidade, 'pt-BR'))
}

// Histórico do estoque: como estava numa data e hora, comparado com agora (design, seção Estoque)
export function HistoricoEstoque() {
  const { unidade, setUnidade, unidades } = useUnidadeEscolhida()
  const [data, setData] = useState(() => diasAtras(7))
  const [horaEscolhida, setHoraEscolhida] = useState('18:00')
  const [busca, setBusca] = useState('')
  const [canal, setCanal] = useState('')
  const [soMudou, setSoMudou] = useState(false)
  const [offset, setOffset] = useState(0)
  const [aberta, setAberta] = useState(null)
  const buscaAplicada = useAdiado(busca.trim())
  const em = paraApi(data, horaEscolhida)

  const comparacao = useCarregar(async () => {
    const filtros = { id_unidade: unidade, canal, busca: buscaAplicada }
    const [naquele, agora] = await Promise.all([
      todasAsPaginas('/estoque/historico', { ...filtros, em }),
      todasAsPaginas('/estoque', filtros),
    ])
    return comparar(naquele, agora)
  }, [unidade, canal, buscaAplicada, em])
  const transito = useCarregar(
    () => api('/estoque/em-transito', { params: { em, id_unidade: unidade, busca: buscaAplicada } }),
    [unidade, buscaAplicada, em],
  )

  const todas = comparacao.dados ?? []
  const visiveis = soMudou ? todas.filter((l) => l.naquele !== l.agora) : todas
  const pagina = visiveis.slice(offset, offset + POR_PAGINA)
  const mudaram = todas.filter((l) => l.naquele !== l.agora).length
  const emTransito = transito.dados?.items ?? []
  const escolhida = unidades.find((u) => String(u.id_unidade) === unidade)
  const reiniciar = (setter) => (valor) => {
    setter(valor)
    setOffset(0)
    setAberta(null)
  }

  return (
    <>
      <Cabecalho titulo="Estoque"><AcoesEstoque /></Cabecalho>
      <AbasEstoque />

      <section aria-label="Momento do histórico" className="mb-8 space-y-4 bg-superficie p-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-3 text-lg">
          <span>Estoque {escolhida?.tipo === 'cd' ? 'do' : 'da'}</span>
          <Label htmlFor="hist-unidade" className="sr-only">Unidade</Label>
          <Select id="hist-unidade" value={unidade} onChange={(e) => reiniciar(setUnidade)(e.target.value)} className="h-10 w-auto bg-background text-base">
            <option value="">rede</option>
            {unidades.filter((u) => u.ativo).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
          </Select>
          <span>em</span>
          <Label htmlFor="hist-data" className="sr-only">Data</Label>
          <Input id="hist-data" type="date" max={hojeIso()} value={data} onChange={(e) => e.target.value && reiniciar(setData)(e.target.value)} className="h-10 w-44 bg-background text-base" />
          <span>às</span>
          <Label htmlFor="hist-hora" className="sr-only">Hora</Label>
          <Input id="hist-hora" type="time" value={horaEscolhida} onChange={(e) => e.target.value && reiniciar(setHoraEscolhida)(e.target.value)} className="h-10 w-32 bg-background text-base" />
        </p>
        <div className="flex flex-wrap gap-2">
          {ATALHOS.map(([dias, rotulo]) => {
            const alvo = diasAtras(dias)
            return (
              <button
                key={dias}
                type="button"
                aria-pressed={data === alvo}
                onClick={() => reiniciar(setData)(alvo)}
                className={cn('h-8 border px-3 text-sm', data === alvo ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:border-foreground')}
              >
                {rotulo}
              </button>
            )
          })}
        </div>
        <ReguaDeDatas valor={data} aoMudar={reiniciar(setData)} />
        <p className="text-xs text-muted-foreground">
          Horário de Brasília. O saldo daquele momento soma as movimentações até {dataLonga(`${data}T12:00:00`)} às {horaEscolhida}; reservas de pedidos online não entram nessa conta.
        </p>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3 sm:max-w-80">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar peça ou etiqueta</span>
          <input value={busca} onChange={(e) => reiniciar(setBusca)(e.target.value)} placeholder="Buscar peça ou etiqueta" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <Select aria-label="Canal" value={canal} onChange={(e) => reiniciar(setCanal)(e.target.value)} className="w-auto">
          <option value="">Loja física e online</option>
          {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>Só {r.toLowerCase()}</option>)}
        </Select>
        <label className="flex h-9 items-center gap-2 border border-input px-3 text-sm">
          <input type="checkbox" checked={soMudou} onChange={(e) => reiniciar(setSoMudou)(e.target.checked)} className="size-4 accent-marinho" />
          Só o que mudou{comparacao.dados && ` (${mudaram})`}
        </label>
      </div>

      {comparacao.erro && <Aviso mensagem={comparacao.erro}>Confira a data e a hora e tente de novo.</Aviso>}
      {comparacao.carregando && <Carregando texto="Montando o estoque daquele momento..." />}
      {comparacao.dados && !comparacao.carregando && visiveis.length === 0 && (
        <Vazio>{soMudou ? 'Nada mudou entre aquele momento e agora com esses filtros.' : 'Nenhuma peça com esses filtros. Confira a busca ou troque a unidade.'}</Vazio>
      )}
      {!comparacao.carregando && pagina.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" />
                <th className="py-2 font-medium">Peça</th>
                <th className="font-medium">Etiqueta</th>
                {!unidade && <th className="font-medium">Unidade</th>}
                <th className="text-right font-medium">Naquele momento</th>
                <th className="text-right font-medium">Agora</th>
                <th className="pr-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((l) => {
                const aberto = aberta === l.chave
                const diferenca = l.agora - l.naquele
                return (
                  <Fragment key={l.chave}>
                    <tr className={cn('cursor-pointer border-b hover:bg-superficie', aberto && 'bg-superficie')} onClick={() => setAberta(aberto ? null : l.chave)}>
                      <td className="pl-2">
                        <button type="button" aria-expanded={aberto} aria-label={`Evolução de ${l.produto}, ${l.cor}, ${l.tamanho}`} className="flex">
                          {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      </td>
                      <td className="py-3"><NomePeca produto={l.produto} cor={l.cor} tamanho={l.tamanho} /></td>
                      <td><Etiqueta>{l.sku}</Etiqueta></td>
                      {!unidade && <td className="text-muted-foreground">{l.unidade}</td>}
                      <td className="text-right tabular-nums">{l.naquele}</td>
                      <td className="text-right tabular-nums">{l.agora}</td>
                      <td className={cn('pr-2 text-right font-medium tabular-nums', diferenca > 0 && 'text-aco', diferenca < 0 && 'text-terracota', diferenca === 0 && 'font-normal text-muted-foreground')}>
                        {sinal(diferenca)}
                      </td>
                    </tr>
                    {aberto && (
                      <tr className="border-b bg-superficie">
                        <td colSpan={7} className="px-4 pb-6 pt-2">
                          <EvolucaoDaPeca linha={l} em={em} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <p className="pt-2 text-xs text-muted-foreground">Diferença de agora para aquele momento: aumento em aço, queda em terracota.</p>
        </div>
      )}
      {!comparacao.carregando && (
        <Paginacao pagina={{ total: visiveis.length, limit: POR_PAGINA, offset }} aoMudar={setOffset} rotulo="peças" />
      )}

      <section aria-labelledby="titulo-transito" className="mt-12 space-y-3">
        <div className="space-y-1">
          <h2 id="titulo-transito" className="text-lg font-medium">Em trânsito naquele momento</h2>
          <p className="text-sm text-muted-foreground">Peças que já tinham saído e ainda não tinham chegado: não entram no saldo de nenhuma unidade.</p>
        </div>
        {transito.erro && <Aviso mensagem={transito.erro} />}
        {transito.carregando && !transito.dados && <Carregando />}
        {transito.dados && emTransito.length === 0 && <Vazio>Nenhuma peça em trânsito naquele momento.</Vazio>}
        {emTransito.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Transferência</th>
                  <th className="font-medium">Peça</th>
                  <th className="font-medium">Caminho</th>
                  <th className="font-medium">Enviada em</th>
                  <th className="pr-2 text-right font-medium">Peças</th>
                </tr>
              </thead>
              <tbody>
                {emTransito.map((t) => (
                  <tr key={`${t.id_transferencia}-${t.id_variante}-${t.canal_entrada}`} className="border-b">
                    <td className="py-3"><Etiqueta>{codigoTransferencia(t.id_transferencia)}</Etiqueta></td>
                    <td><NomePeca produto={t.produto} cor={t.cor} tamanho={`${t.tamanho}, ${t.sku}`} /></td>
                    <td>De {t.origem} para {t.destino}<span className="block text-xs text-muted-foreground">entra no {CANAIS[t.canal_entrada].toLowerCase()}</span></td>
                    <td className="tabular-nums">{dataCurta(t.enviada_em)}, {hora(t.enviada_em)}</td>
                    <td className="pr-2 text-right tabular-nums">{t.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function ReguaDeDatas({ valor, aoMudar }) {
  const dias = Array.from({ length: DIAS_NA_REGUA }, (_, i) => diasAtras(DIAS_NA_REGUA - 1 - i))
  return (
    <div role="radiogroup" aria-label="Escolher o dia" className="flex items-end overflow-x-auto border bg-background px-2 pb-2 pt-6">
      {dias.map((dia) => {
        const numero = Number(dia.slice(8))
        const escolhido = dia === valor
        return (
          <button
            key={dia}
            type="button"
            role="radio"
            aria-checked={escolhido}
            aria-label={dataLonga(`${dia}T12:00:00`)}
            onClick={() => aoMudar(dia)}
            className="group relative flex min-w-6 flex-1 flex-col items-center gap-1"
          >
            {escolhido && (
              <span className="absolute -top-5 whitespace-nowrap bg-marinho px-1.5 py-0.5 text-[0.65rem] text-white">{dataCurta(`${dia}T12:00:00`)}</span>
            )}
            <span className={cn('w-px', escolhido ? 'h-8 w-0.5 bg-terracota' : numero % 5 === 0 || numero === 1 ? 'h-4 bg-foreground' : 'h-2.5 bg-foreground/50 group-hover:bg-foreground')} />
            <span className={cn('text-[0.65rem]', numero % 5 === 0 || numero === 1 ? 'text-muted-foreground' : 'invisible')}>{numero}</span>
          </button>
        )
      })}
    </div>
  )
}

// ao abrir uma peça: gráfico de evolução no período, resumo curto em números e as movimentações
function EvolucaoDaPeca({ linha, em }) {
  const { unidade } = useUnidadeEscolhida()
  const [periodo, setPeriodo] = useState('30')
  const [de, setDe] = useState(() => diasAtras(30))
  const [ate, setAte] = useState(() => hojeIso())
  const [granularidade, setGranularidade] = useState('')
  const intervalo = periodo === 'intervalo'
  const inicio = intervalo ? de : diasAtras(Number(periodo))
  const fim = intervalo ? paraApi(ate, '23:59') : undefined
  // sem unidade no topo, a linha é de uma unidade só: o gráfico e as movimentações são dela
  const idUnidade = unidade || linha.id_unidade
  const intervaloOk = !intervalo || (de && ate && de <= ate)

  const evolucao = useCarregar(
    () => (intervaloOk
      ? api('/estoque/evolucao', { params: { id_variante: linha.id_variante, id_unidade: idUnidade, inicio, fim, granularidade } })
      : null),
    [linha.id_variante, idUnidade, inicio, fim, granularidade, intervaloOk],
  )
  const movimentacoes = useCarregar(
    () => (intervaloOk
      ? api('/movimentacoes-estoque', { params: { id_variante: linha.id_variante, id_unidade: idUnidade, de: inicio, ate: fim, limit: 200 } })
      : null),
    [linha.id_variante, idUnidade, inicio, fim, intervaloOk],
  )

  const pontos = evolucao.dados?.pontos ?? []
  const movs = movimentacoes.dados?.items ?? []
  const completo = movimentacoes.dados && movimentacoes.dados.total <= movs.length
  const saldo = (p) => (p ? p.loja_fisica + p.online : null)
  const comecou = saldo(pontos[0])
  const terminou = saldo(pontos[pontos.length - 1])
  const entraram = movs.filter((m) => m.quantidade > 0).reduce((t, m) => t + m.quantidade, 0)
  const sairam = movs.filter((m) => m.quantidade < 0).reduce((t, m) => t - m.quantidade, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-2">
          {PERIODOS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={periodo === valor}
              onClick={() => setPeriodo(valor)}
              className={cn('h-8 border px-3 text-sm', periodo === valor ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:border-foreground')}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {intervalo && (
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor={`de-${linha.chave}`} className="sr-only">De</Label>
            <Input id={`de-${linha.chave}`} type="date" max={ate} value={de} onChange={(e) => setDe(e.target.value)} className="h-8 w-40 bg-background" />
            <span>até</span>
            <Label htmlFor={`ate-${linha.chave}`} className="sr-only">Até</Label>
            <Input id={`ate-${linha.chave}`} type="date" min={de} max={hojeIso()} value={ate} onChange={(e) => setAte(e.target.value)} className="h-8 w-40 bg-background" />
          </div>
        )}
        <div className="ml-auto">
          <Label htmlFor={`gran-${linha.chave}`} className="sr-only">Detalhe do gráfico</Label>
          <Select id={`gran-${linha.chave}`} value={granularidade} onChange={(e) => setGranularidade(e.target.value)} className="h-8 w-auto bg-background">
            {GRANULARIDADES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </div>
      </div>
      {!intervaloOk && <Aviso mensagem="A data inicial precisa vir antes da final. Ajuste o intervalo." />}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          {evolucao.erro && <Aviso mensagem={evolucao.erro}>Tente um período menor ou outro detalhe do gráfico.</Aviso>}
          {evolucao.carregando && !evolucao.dados && <Carregando />}
          {evolucao.dados && <GraficoEvolucao pontos={pontos} marca={`${em}:00-03:00`} granularidade={evolucao.dados.granularidade} />}
          {evolucao.dados && pontos.length > 0 && (
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">No início</dt><dd className="text-xl font-medium tabular-nums">{comecou}</dd></div>
              <div><dt className="text-xs text-muted-foreground">No fim</dt><dd className="text-xl font-medium tabular-nums">{terminou}</dd></div>
              {completo && <div><dt className="text-xs text-muted-foreground">Entraram</dt><dd className="text-xl font-medium tabular-nums">{entraram}</dd></div>}
              {completo && <div><dt className="text-xs text-muted-foreground">Saíram</dt><dd className="text-xl font-medium tabular-nums">{sairam}</dd></div>}
            </dl>
          )}
        </div>

        <section className="space-y-2">
          <h3 className="font-medium">
            Movimentações do período
            {movimentacoes.dados && <span className="ml-1.5 font-normal text-muted-foreground">{movimentacoes.dados.total}</span>}
          </h3>
          {movimentacoes.erro && <Aviso mensagem={movimentacoes.erro} />}
          {movimentacoes.dados && movs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação no período.</p>}
          <ul className="max-h-80 overflow-y-auto text-sm">
            {movs.map((m) => (
              <li key={m.id_movimentacao} className="grid grid-cols-[6.5rem_1fr_auto] gap-3 border-b py-2">
                <span className="text-muted-foreground">{dataCurta(m.criado_em)}, {hora(m.criado_em)}</span>
                <span className="truncate">
                  {TIPOS_MOVIMENTACAO[m.tipo] ?? m.tipo}
                  <span className="text-muted-foreground">, {CANAIS[m.canal].toLowerCase()}</span>
                </span>
                <span className="font-medium tabular-nums">{sinal(m.quantidade)}</span>
              </li>
            ))}
          </ul>
          {movimentacoes.dados && !completo && (
            <p className="text-xs text-muted-foreground">Mostrando as {plural(movs.length, 'mais recente', 'mais recentes')}. Escolha um período menor para ver todas.</p>
          )}
        </section>
      </div>
    </div>
  )
}
