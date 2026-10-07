import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'

type VendasDoDia = Esquema<'VendasDoDia'>
type MaisVendida = Esquema<'MaisVendida'>
type ChamadosDoDia = Esquema<'ChamadosDoDia'>
type Raio = [number, number, number, number]

// gráficos da Visão Geral (design: só aqui e no Histórico do estoque).
// Séries na ordem do design: marinho, aço, terracota, ardósia. Barras finas, pontas
// arredondadas de 4px, 2px de respiro entre barras vizinhas, grade e eixos discretos.

const PONTA: Raio = [4, 4, 0, 0]
const PONTA_HORIZONTAL: Raio = [0, 4, 4, 0]
const EIXO = { tickLine: false, axisLine: false, fontSize: 11 } as const

// "05/10" a partir de "2026-10-05" (dia sem hora, já no horário de Brasília)
const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// R$ 4,2 mil no eixo: o tooltip mostra o valor exato
function moedaCurta(valor: number) {
  if (valor >= 1000) return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

const CONFIG_VENDAS = {
  online: { label: 'Online', color: 'var(--marinho)' },
  loja_fisica: { label: 'Loja física', color: 'var(--aco)' },
}

// vendas dos últimos 14 dias, online × loja física, em reais
export function GraficoVendas({ dias }: { dias: VendasDoDia[] }) {
  const dados = dias.map((d) => ({
    dia: diaCurto(d.dia),
    online: Number(d.online.valor),
    loja_fisica: Number(d.loja_fisica.valor),
    pedidos_online: d.online.pedidos,
    pedidos_loja: d.loja_fisica.pedidos,
  }))
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">Vendas dos últimos 14 dias</figcaption>
      <ChartContainer config={CONFIG_VENDAS} className="aspect-auto h-60 w-full">
        <BarChart data={dados} barGap={2} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="dia" {...EIXO} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...EIXO} width={64} tickFormatter={moedaCurta} />
          <ChartTooltip
            cursor={{ fill: 'var(--superficie)' }}
            content={<ChartTooltipContent formatter={(valor, nome, item) => {
              const serie = CONFIG_VENDAS[nome as keyof typeof CONFIG_VENDAS]
              const pedidos = nome === 'online' ? item.payload.pedidos_online : item.payload.pedidos_loja
              return <LinhaTooltip cor={serie.color} rotulo={serie.label} valor={`${moeda(Number(valor))}, ${pedidos} pedidos`} />
            }} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="online" fill="var(--color-online)" radius={PONTA} maxBarSize={14} />
          <Bar dataKey="loja_fisica" fill="var(--color-loja_fisica)" radius={PONTA} maxBarSize={14} />
        </BarChart>
      </ChartContainer>
      <TabelaDoGrafico
        titulo="Ver os números das vendas"
        colunas={['Dia', 'Online', 'Loja física']}
        linhas={dados.map((d) => [d.dia, moeda(d.online), moeda(d.loja_fisica)])}
      />
    </figure>
  )
}

const CONFIG_MAIS_VENDIDAS = { quantidade_vendida: { label: 'Peças vendidas', color: 'var(--marinho)' } }

// 5 peças mais vendidas na semana: uma série só, então sem legenda; o número fica na ponta da barra
export function GraficoMaisVendidas({ pecas }: { pecas: MaisVendida[] }) {
  const dados = pecas.map((p) => ({ ...p, nome: `${p.produto}, ${p.cor}, ${p.tamanho}` }))
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">Mais vendidas na semana</figcaption>
      {dados.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Nenhuma venda nos últimos 7 dias.</p>
      ) : (
        <ChartContainer config={CONFIG_MAIS_VENDIDAS} className="aspect-auto w-full" style={{ height: dados.length * 44 + 8 }}>
          <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 32 }} accessibilityLayer>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="nome" {...EIXO} width={180} tickFormatter={(t: string) => (t.length > 28 ? `${t.slice(0, 27)}…` : t)} />
            <ChartTooltip
              cursor={{ fill: 'var(--superficie)' }}
              content={<ChartTooltipContent hideLabel formatter={(valor, _nome, item) => (
                <div className="space-y-0.5">
                  <p className="font-medium">{item.payload.nome}</p>
                  <p className="text-muted-foreground">{valor} vendidas, {item.payload.saldo_atual} em estoque</p>
                </div>
              )} />}
            />
            <Bar dataKey="quantidade_vendida" fill="var(--color-quantidade_vendida)" radius={PONTA_HORIZONTAL} maxBarSize={14}>
              <LabelList dataKey="quantidade_vendida" position="right" className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </figure>
  )
}

const CONFIG_CHAMADOS = {
  abertos: { label: 'Abertos', color: 'var(--marinho)' },
  concluidos: { label: 'Concluídos', color: 'var(--aco)' },
}

// chamados abertos × concluídos por dia
export function GraficoChamados({ dias }: { dias: ChamadosDoDia[] }) {
  const dados = dias.map((d) => ({ dia: diaCurto(d.dia), abertos: d.abertos, concluidos: d.concluidos }))
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">Chamados abertos e concluídos por dia</figcaption>
      <ChartContainer config={CONFIG_CHAMADOS} className="aspect-auto h-52 w-full">
        <BarChart data={dados} barGap={2} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="dia" {...EIXO} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...EIXO} width={32} allowDecimals={false} />
          <ChartTooltip cursor={{ fill: 'var(--superficie)' }} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="abertos" fill="var(--color-abertos)" radius={PONTA} maxBarSize={12} />
          <Bar dataKey="concluidos" fill="var(--color-concluidos)" radius={PONTA} maxBarSize={12} />
        </BarChart>
      </ChartContainer>
      <TabelaDoGrafico
        titulo="Ver os números dos chamados"
        colunas={['Dia', 'Abertos', 'Concluídos']}
        linhas={dados.map((d) => [d.dia, d.abertos, d.concluidos])}
      />
    </figure>
  )
}

function LinhaTooltip({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: cor }} aria-hidden="true" />
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="ml-auto font-medium tabular-nums text-foreground">{valor}</span>
    </div>
  )
}

// os mesmos números em tabela, para quem não lê o gráfico
function TabelaDoGrafico({ titulo, colunas, linhas }: { titulo: string; colunas: string[]; linhas: (string | number)[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{titulo}</summary>
      <table className="mt-2 w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">{colunas.map((c, i) => <th key={c} className={i ? 'py-1 text-right font-medium' : 'py-1 font-medium'}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={String(linha[0])} className="border-b">
              {linha.map((v, i) => <td key={i} className={i ? 'py-1 text-right tabular-nums' : 'py-1'}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
