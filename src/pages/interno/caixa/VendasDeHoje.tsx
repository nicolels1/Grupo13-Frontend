import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, ListaCortada, Vazio } from '@/components/Estados'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { BLOCO_ACO } from '../componentes/estilos'
import { hojeIso, hora, METODOS_PAGAMENTO, moeda, plural } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { Notinha } from './impressao'

type Unidade = Esquema<'UnidadeSaida'>
type Pedido = Esquema<'PedidoSaida'>
type PaginaPedidos = Esquema<'Pagina_PedidoSaida_'>

// aba Vendas de hoje do Caixa: as vendas do dia, o total por forma de pagamento e a reimpressão

export function VendasDeHoje({ loja }: { loja: Unidade }) {
  const hoje = hojeIso()
  const lista = useCarregar(
    () => api<PaginaPedidos>('/vendas/pedidos', { params: { canal: 'loja_fisica', id_unidade: loja.id_unidade, de: hoje, ate: hoje, limit: 200 } }),
    [loja.id_unidade, hoje],
  )
  const vendas = lista.dados?.items ?? []
  const [reimprimindo, setReimprimindo] = useState<Pedido | null>(null)

  // total recebido por forma de pagamento (só os pagamentos aprovados; estornos ficam de fora)
  const porMetodo: Record<string, number> = {}
  for (const venda of vendas) {
    for (const p of venda.pagamentos) {
      if (p.tipo === 'pagamento' && p.status === 'aprovado') porMetodo[p.metodo] = (porMetodo[p.metodo] ?? 0) + Number(p.valor)
    }
  }
  const totalDia = Object.values(porMetodo).reduce((t, v) => t + v, 0)

  // a notinha só existe no papel: monta, abre a impressão e desmonta
  useEffect(() => {
    if (!reimprimindo) return undefined
    const espera = setTimeout(() => {
      window.print()
      setReimprimindo(null)
    }, 0)
    return () => clearTimeout(espera)
  }, [reimprimindo])

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados && vendas.length === 0 && <Vazio>Nenhuma venda no caixa hoje.</Vazio>}
        {lista.dados && <ListaCortada mostrados={vendas.length} total={lista.dados.total} dica="Aparecem as vendas mais recentes." />}
        {vendas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Hora</th>
                  <th className="font-medium">Venda</th>
                  <th className="font-medium">Peças</th>
                  <th className="font-medium">Pagamento</th>
                  <th className="text-right font-medium">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.id_pedido} className="border-b">
                    <td className="py-3 tabular-nums">{hora(v.criado_em)}</td>
                    <td>
                      <Etiqueta>{v.codigo_venda}</Etiqueta>
                      {v.cliente && <span className="block pt-1 text-xs text-muted-foreground">{v.cliente}</span>}
                    </td>
                    <td>{plural(v.itens.reduce((t, i) => t + i.quantidade, 0), 'peça')}</td>
                    <td>{[...new Set(v.pagamentos.filter((p) => p.tipo === 'pagamento').map((p) => METODOS_PAGAMENTO[p.metodo] ?? p.metodo))].join(', ')}</td>
                    <td className="text-right tabular-nums">{moeda(v.valor_total)}</td>
                    <td className="pl-2 text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setReimprimindo(v)}>
                        <Printer aria-hidden="true" /> Reimprimir notinha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cn('h-fit space-y-3', BLOCO_ACO)}>
        <p className="text-sm text-muted-foreground">{lista.dados ? `${plural(vendas.length, 'venda')} hoje` : 'Vendas de hoje'}</p>
        <dl className="space-y-2 text-sm">
          {Object.entries(METODOS_PAGAMENTO).map(([metodo, rotulo]) => (
            <div key={metodo} className="flex justify-between">
              <dt>{rotulo}</dt>
              <dd className="tabular-nums">{moeda(porMetodo[metodo] ?? 0)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{moeda(totalDia)}</dd>
          </div>
        </dl>
      </div>

      {reimprimindo && (
        <div className="hidden print:block">
          <Notinha venda={reimprimindo} marca={loja.marca} troco={null} />
        </div>
      )}
    </div>
  )
}
