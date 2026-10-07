import { useState } from 'react'

import { dataCurta, hora } from '@/lib/formato'

const LARGURA = 640
const ALTURA = 200
const MARGEM = { topo: 10, direita: 8, base: 22, esquerda: 32 }

const GRANULARIDADES = { hora: 'por hora', dia: 'por dia', semana: 'por semana' }

function rotuloDoPonto(iso, granularidade) {
  if (granularidade === 'hora') return `${dataCurta(iso)}, ${hora(iso)}`
  if (granularidade === 'semana') return `semana de ${dataCurta(iso)}`
  return dataCurta(iso)
}

// quantidade por canal ao longo do tempo (GET /estoque/evolucao), em degraus: o saldo vale até o
// próximo ponto. Loja física em marinho (linha cheia), online em aço (tracejada), legenda sempre
// visível. Passar o mouse mostra os números do ponto. `marca` (ISO) é o momento escolhido.
export function GraficoEvolucao({ pontos, marca, granularidade = 'dia' }) {
  const [foco, setFoco] = useState(null)

  if (!pontos || pontos.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Sem dados no período.</p>
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

  // ponto mais perto do mouse, pela posição horizontal dentro do svg
  function mover(evento) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    const px = ((evento.clientX - caixa.left) / caixa.width) * LARGURA
    let melhor = 0
    for (let i = 1; i < tempos.length; i += 1) {
      if (Math.abs(x(tempos[i]) - px) < Math.abs(x(tempos[melhor]) - px)) melhor = i
    }
    setFoco(melhor)
  }

  const ponto = foco === null ? null : pontos[foco]
  const focoX = foco === null ? null : x(tempos[foco])

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Saldo {GRANULARIDADES[granularidade] ?? ''}</span>
        <span className="flex gap-4">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-marinho" aria-hidden="true" />Loja física</span>
          <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-aco" aria-hidden="true" />Online</span>
          {marca && <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-terracota" aria-hidden="true" />Momento escolhido</span>}
        </span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="w-full touch-none"
          role="img"
          aria-label="Saldo por canal ao longo do período"
          onPointerMove={mover}
          onPointerLeave={() => setFoco(null)}
        >
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
          {focoX !== null && (
            <g>
              <line x1={focoX} x2={focoX} y1={MARGEM.topo} y2={ALTURA - MARGEM.base} stroke="var(--muted-foreground)" strokeWidth="1" />
              <circle cx={focoX} cy={y(ponto.loja_fisica)} r="4" fill="var(--marinho)" stroke="var(--background)" strokeWidth="2" />
              <circle cx={focoX} cy={y(ponto.online)} r="4" fill="var(--aco)" stroke="var(--background)" strokeWidth="2" />
            </g>
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
              {rotuloDoPonto(pontos[i].inicio_periodo, granularidade)}
            </text>
          ))}
        </svg>
        {ponto && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 border bg-background px-3 py-2 text-xs shadow-sm"
            style={focoX / LARGURA > 0.6 ? { right: `${100 - (focoX / LARGURA) * 100 + 2}%` } : { left: `${(focoX / LARGURA) * 100 + 2}%` }}
          >
            <p className="mb-1 font-medium">{rotuloDoPonto(ponto.inicio_periodo, granularidade)}</p>
            <p className="flex justify-between gap-4"><span className="text-muted-foreground">Loja física</span><span className="tabular-nums">{ponto.loja_fisica}</span></p>
            <p className="flex justify-between gap-4"><span className="text-muted-foreground">Online</span><span className="tabular-nums">{ponto.online}</span></p>
          </div>
        )}
      </div>
    </figure>
  )
}
