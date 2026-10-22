import { useState } from 'react'
import { cn } from 'cn'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Paginacao } from '@/components/Navegacao'
import { api, type Esquema } from '@/lib/api'
import { dataCurta, dataLonga, MARCAS, numero } from '@/lib/formato'
import type { Loja } from '@/lib/lojaEscolhida'
import { useCarregar } from '@/lib/useCarregar'
import { CartoesDePontos } from './CartoesDePontos'
import { LOJAS_DOS_PONTOS, rotuloMovimentoPontos } from './pontosDaConta'

const POR_PAGINA = 20

// Meus pontos: o saldo das duas lojas e o extrato de cada uma, do mais novo para o mais antigo. Quem veio
// da Vulto vê também o histórico de antes de criar a conta (GET /fidelidade/meus-pontos/extrato)
export function MeusPontos() {
  const saldos = useCarregar(() => api<Esquema<'PontosDoCliente'>>('/fidelidade/meus-pontos'), [])
  const [loja, setLoja] = useState<Loja>('lorenzi')
  const [offset, setOffset] = useState(0)
  const extrato = useCarregar(
    () => api<Esquema<'Pagina_MovimentoPontosSaida_'>>('/fidelidade/meus-pontos/extrato', {
      params: { marca: loja, limit: POR_PAGINA, offset },
    }),
    [loja, offset],
  )

  function trocarLoja(nova: Loja) {
    setLoja(nova)
    setOffset(0)
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-saldos" className="rounded-xl border bg-background p-6 shadow-xs">
        <h1 id="titulo-saldos" className="mb-4 font-titulo text-2xl">Meus pontos</h1>
        {saldos.erro && <Aviso mensagem={saldos.erro} />}
        {saldos.carregando && !saldos.dados && <Carregando />}
        {saldos.dados && <CartoesDePontos saldos={saldos.dados.saldos} />}
      </section>

      <section aria-labelledby="titulo-extrato" className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 id="titulo-extrato" className="mb-4 font-titulo text-2xl">Extrato</h2>
        <Abas
          rotulo="Loja do extrato"
          valor={loja}
          aoMudar={trocarLoja}
          abas={LOJAS_DOS_PONTOS.map((l) => ({ valor: l, rotulo: MARCAS[l] ?? l }))}
          className="mb-4"
        />
        {extrato.erro && <Aviso mensagem={extrato.erro} />}
        {extrato.carregando && !extrato.dados && <Carregando />}
        {extrato.dados?.items.length === 0 && <Vazio>Nenhum movimento de pontos na {MARCAS[loja]} ainda.</Vazio>}
        {extrato.dados && extrato.dados.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pl-2 font-medium">Data</th>
                  <th className="font-medium">Movimento</th>
                  <th className="font-medium">Pedido</th>
                  <th className="text-right font-medium">Pontos</th>
                  <th className="pl-6 font-medium">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {extrato.dados.items.map((m) => (
                  <tr key={m.id_movimento} className="border-b">
                    <td className="py-3 pl-2 tabular-nums">{dataCurta(m.ganho_em ?? m.criado_em)}</td>
                    <td>
                      {rotuloMovimentoPontos(m.tipo)}
                      {m.motivo && <span className="block text-xs text-muted-foreground">{m.motivo}</span>}
                    </td>
                    <td className="text-muted-foreground">{m.codigo_venda ?? '—'}</td>
                    <td className={cn('text-right font-medium tabular-nums', m.pontos < 0 && 'text-ferrugem')}>
                      {m.pontos > 0 ? '+' : ''}{numero(m.pontos)}
                    </td>
                    {/* nas entradas, quanto ainda sobra delas e quando vence */}
                    <td className="pl-6 text-muted-foreground">
                      {m.restante && m.vence_em ? `${numero(m.restante)} em ${dataLonga(m.vence_em)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao pagina={extrato.dados} aoMudar={setOffset} rotulo="movimentos" />
      </section>
    </div>
  )
}
