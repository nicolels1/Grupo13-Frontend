import type { Esquema } from '@/lib/api'
import { dataHora, mascaraCpf, METODOS_PAGAMENTO, moeda } from '@/lib/formato'

type Pedido = Esquema<'PedidoSaida'>

// notinha da venda: impressa na Nova venda e reimpressa nas Vendas de hoje

export function Notinha({ venda, troco }: { venda: Pedido; troco: number | null }) {
  return (
    <section aria-label="Notinha" className="notinha space-y-4 border bg-white p-5 text-sm text-foreground">
      <div className="space-y-0.5 text-center">
        <p className="font-logo uppercase tracking-[0.3em]">Casa Lorenzi</p>
        <p>{venda.unidade}</p>
        <p>{dataHora(venda.criado_em)}</p>
      </div>
      <p className="text-center">
        Código da venda <span className="font-medium tabular-nums">{venda.codigo_venda}</span>
      </p>
      <table className="w-full">
        <tbody>
          {venda.itens.map((item) => (
            <tr key={item.id_item} className="align-top">
              <td className="py-1">
                {item.quantidade} × {item.produto}
                <span className="block text-xs">{item.cor}, {item.tamanho}, {item.sku}</span>
              </td>
              <td className="py-1 text-right tabular-nums">{moeda(Number(item.preco_unitario) * item.quantidade)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-dashed border-foreground pt-3">
        <p className="flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{moeda(venda.valor_total)}</span></p>
        {venda.pagamentos.map((p) => (
          <p key={p.id_pagamento} className="flex justify-between">
            <span>{METODOS_PAGAMENTO[p.metodo] ?? p.metodo}</span>
            <span className="tabular-nums">{moeda(p.valor)}</span>
          </p>
        ))}
        {troco !== null && troco > 0 && <p className="flex justify-between"><span>Troco</span><span className="tabular-nums">{moeda(troco)}</span></p>}
      </div>
      {venda.cpf_nota && <p className="text-center">CPF na nota {mascaraCpf(venda.cpf_nota)}</p>}
      <p className="text-center text-xs">Troca ou devolução em até 30 dias com esta notinha.</p>
    </section>
  )
}
