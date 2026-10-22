import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { MARCAS, moeda, plural, soDigitos } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type ResumoMarca = Esquema<'ResumoMarca'>
type Saldo = Esquema<'SaldoPontosSaida'>
export type PontoAplicado = { pontos: number; desconto: string }
export type PontosAplicados = Partial<Record<string, PontoAplicado>>

// pontos como desconto no checkout: cada marca tem o seu programa, então os pontos de cada uma descontam só das
// peças dela (ADR 0017 do backend). O valor vem de GET /fidelidade/resgate, a mesma conta do backend no checkout
export function UsarPontos({
  marcas,
  aplicados,
  aoMudar,
}: {
  marcas: ResumoMarca[]
  aplicados: PontosAplicados
  aoMudar: (aplicados: PontosAplicados) => void
}) {
  const { dados, erro } = useCarregar(() => api<Esquema<'PontosDoCliente'>>('/fidelidade/meus-pontos'), [])

  // sem os pontos o checkout segue normal: só não oferece o desconto
  if (erro) return <p className="text-sm text-muted-foreground">Não foi possível carregar seus pontos agora.</p>
  if (!dados) return null
  const comSaldo = marcas
    .map((marca) => ({ marca, saldo: dados.saldos.find((s) => s.marca === marca.marca && s.saldo > 0) }))
    .filter((linha): linha is { marca: ResumoMarca; saldo: Saldo } => linha.saldo !== undefined)
  if (comSaldo.length === 0) return null

  return (
    <section aria-labelledby="titulo-pontos" className="space-y-3 border p-4">
      <h3 id="titulo-pontos" className="font-medium">Usar pontos</h3>
      {comSaldo.map(({ marca, saldo }) => (
        <PontosDaMarca
          key={marca.marca}
          marca={marca}
          saldo={saldo}
          aplicado={aplicados[marca.marca]}
          aoAplicar={(ponto) => aoMudar({ ...aplicados, [marca.marca]: ponto })}
        />
      ))}
    </section>
  )
}

function PontosDaMarca({
  marca,
  saldo,
  aplicado,
  aoAplicar,
}: {
  marca: ResumoMarca
  saldo: Saldo
  aplicado: PontoAplicado | undefined
  aoAplicar: (ponto: PontoAplicado | undefined) => void
}) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const nome = MARCAS[marca.marca] ?? marca.marca
  const id = `pontos-${marca.marca}`

  async function aplicar(evento: FormEvent) {
    evento.preventDefault()
    setAviso(null)
    const pontos = Number(texto)
    if (!Number.isInteger(pontos) || pontos <= 0) {
      setAviso('Escreva quantos pontos quer usar.')
      return
    }
    const resgate = await enviar(() =>
      api<Esquema<'ResgateSimulado'>>('/fidelidade/resgate', { params: { marca: marca.marca, pontos } }),
    )
    if (!resgate) return
    // a peça não sai de graça: o backend recusa o desconto que cobre todas as peças da marca
    if (Number(resgate.desconto) >= Number(marca.valor_itens)) {
      setAviso(`O desconto precisa ser menor que as peças da ${nome} (${moeda(marca.valor_itens)}). Use menos pontos.`)
      return
    }
    aoAplicar({ pontos, desconto: resgate.desconto })
    setTexto('')
  }

  if (aplicado) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 bg-superficie px-4 py-3 text-sm">
        <span>
          {nome}: {plural(aplicado.pontos, 'ponto', 'pontos')} aplicados,{' '}
          <span className="font-medium tabular-nums">−{moeda(aplicado.desconto)}</span>
        </span>
        <button type="button" onClick={() => aoAplicar(undefined)} className="underline underline-offset-4 hover:text-aco">
          Remover os pontos da {nome}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void aplicar(e)} noValidate className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Campo
          id={id}
          rotulo={`Pontos da ${nome}`}
          className="min-w-40 flex-1"
          dica={`Você tem ${plural(saldo.saldo, 'ponto', 'pontos')}, que valem ${moeda(saldo.valor_em_reais)}.`}
        >
          <Input
            id={id}
            value={texto}
            onChange={(e) => setTexto(soDigitos(e.target.value).slice(0, 9))}
            inputMode="numeric"
            aria-invalid={Boolean(aviso || erro)}
          />
        </Campo>
        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando ? 'Calculando...' : 'Aplicar desconto'}
        </Button>
      </div>
      {(aviso || erro) && <p role="alert" className="text-sm text-ferrugem">{aviso ?? erro}</p>}
    </form>
  )
}
