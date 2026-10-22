import { NomeDaLoja } from '@/components/Logo'
import type { Esquema } from '@/lib/api'
import { dataLonga, moeda, numero, plural } from '@/lib/formato'
import { nomeDaCategoria, saldosPorLoja } from './pontosDaConta'

// o saldo das duas lojas lado a lado: cada marca tem o seu programa (o da Vulto é o Vulto+). Aparece na
// visão geral da conta e em Meus pontos
export function CartoesDePontos({ saldos }: { saldos: Esquema<'SaldoPontosSaida'>[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {saldosPorLoja(saldos).map(({ loja, saldo }) => (
        <li key={loja} className="space-y-2 bg-superficie p-4 text-sm">
          <NomeDaLoja loja={loja} className="text-base" />
          {!saldo ? (
            <p className="text-muted-foreground">Você ainda não tem pontos nesta loja. Eles entram a cada compra paga.</p>
          ) : (
            <>
              <p>
                <span className="text-2xl font-medium tabular-nums">{numero(saldo.saldo)}</span> pontos,{' '}
                <span className="text-muted-foreground">valem {moeda(saldo.valor_em_reais)}</span>
              </p>
              <p>Categoria {nomeDaCategoria(saldo.categoria)}, com {numero(saldo.ganhos_no_ano)} pontos ganhos no ano</p>
              {saldo.proximo_vencimento && saldo.pontos_no_proximo_vencimento > 0 && (
                <p className="text-muted-foreground">
                  {plural(saldo.pontos_no_proximo_vencimento, 'ponto vence', 'pontos vencem')} em {dataLonga(saldo.proximo_vencimento)}
                </p>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
