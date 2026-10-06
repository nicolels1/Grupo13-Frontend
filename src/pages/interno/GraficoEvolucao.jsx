import { dataCurta } from '@/lib/formato'

const LARGURA = 640
const ALTURA = 180
const MARGEM = { topo: 10, direita: 8, base: 22, esquerda: 28 }

// linhas da quantidade por canal ao longo do tempo (GET /estoque/evolucao).
// `marca` (ISO) desenha uma linha vertical no momento escolhido.
export function GraficoEvolucao({ pontos, marca }) {
  if (!pontos || pontos.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Sem movimentações no período.</p>
  }

  const tempos = pontos.map((p) => new Date(p.inicio_periodo).getTime())
  const inicio = tempos[0]
  const fim = tempos[tempos.length - 1] || inicio + 1
  const maximo = Math.max(1, ...pontos.flatMap((p) => [p.loja_fisica, p.online]))
  const teto = Math.ceil(maximo / 4) * 4 || 4
  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base

  const x = (t) => MARGEM.esquerda + (fim === inicio ? 0 : ((t - inicio) / (fim - inicio)) * larguraUtil)
  const y = (v) => MARGEM.topo + alturaUtil - (v / teto) * alturaUtil
  // degraus: a quantidade vale até o próximo período
  const linha = (campo) =>
    pontos
      .map((p, i) => {
        const px = x(tempos[i])
        const py = y(p[campo])
        return i === 0 ? `M${px},${py}` : `H${px} V${py}`
      })
      .join(' ')

  const marcaX = marca ? x(Math.min(Math.max(new Date(marca).getTime(), inicio), fim)) : null
  const rotulosX = [0, Math.floor(pontos.length / 2), pontos.length - 1].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <figure className="space-y-2">
      <figcaption className="flex justify-end gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-marinho" aria-hidden="true" />Loja física</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-aco" aria-hidden="true" />Online</span>
      </figcaption>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full" role="img" aria-label="Quantidade em estoque por canal ao longo do período">
        {[0, teto / 2, teto].map((v) => (
          <g key={v}>
            <line x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(v)} y2={y(v)} stroke="var(--border)" />
            <text x={MARGEM.esquerda - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">{v}</text>
          </g>
        ))}
        <path d={linha('loja_fisica')} fill="none" stroke="var(--marinho)" strokeWidth="2" />
        <path d={linha('online')} fill="none" stroke="var(--aco)" strokeWidth="2" strokeDasharray="5 4" />
        {marcaX !== null && (
          <line x1={marcaX} x2={marcaX} y1={MARGEM.topo} y2={ALTURA - MARGEM.base} stroke="var(--terracota)" strokeWidth="1.5" />
        )}
        {rotulosX.map((i) => (
          <text
            key={i}
            x={x(tempos[i])}
            y={ALTURA - 4}
            textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {dataCurta(pontos[i].inicio_periodo)}
          </text>
        ))}
      </svg>
    </figure>
  )
}
