import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, ListaCortada, Vazio } from '@/components/Estados'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { haQuanto, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Unidade = Esquema<'UnidadeSaida'>
type Pedido = Esquema<'PedidoSaida'>
type PaginaPedidos = Esquema<'Pagina_PedidoSaida_'>

// aba Retiradas do Caixa: pedidos prontos na loja e a entrega com o código e o documento

// a retirada fica guardada por 7 dias depois de pronta; a partir de 5, a lista avisa que está perto de vencer
const PRAZO_RETIRADA_DIAS = 7
const AVISO_RETIRADA_DIAS = 5

function diasDesde(iso: string | null) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0
}

export function Retiradas({ loja }: { loja: Unidade }) {
  const lista = useCarregar(
    () => api<PaginaPedidos>('/vendas/pedidos', { params: { status: 'pronto_para_retirada', id_unidade: loja.id_unidade, limit: 100 } }),
    [loja.id_unidade],
  )
  const prontas = lista.dados?.items ?? []
  const [idEscolhido, setIdEscolhido] = useState<number | null>(null)
  const [codigo, setCodigo] = useState('')
  const [entregue, setEntregue] = useState<Pedido | null>(null)

  // o pedido aparece pelo clique na lista ou pelo código digitado
  const codigoLimpo = codigo.trim().toUpperCase()
  const escolhido = prontas.find((p) => codigoLimpo && p.codigo_venda === codigoLimpo) ?? prontas.find((p) => p.id_pedido === idEscolhido)

  function aposEntregar(pedido: Pedido) {
    setEntregue(pedido)
    setIdEscolhido(null)
    setCodigo('')
    lista.recarregar()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          {lista.dados ? `${plural(lista.dados.total, 'pedido pronto', 'pedidos prontos')} para retirar` : 'Pedidos prontos para retirar'}
        </p>
        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados && prontas.length === 0 && <Vazio>Nenhuma retirada esperando nesta loja.</Vazio>}
        {lista.dados && <ListaCortada mostrados={prontas.length} total={lista.dados.total} dica="As outras aparecem conforme estas forem entregues." />}
        <ul>
          {prontas.map((p) => {
            const dias = diasDesde(p.pronto_retirada_em)
            const perto = dias >= AVISO_RETIRADA_DIAS
            return (
              <li key={p.id_pedido}>
                <button
                  type="button"
                  onClick={() => { setIdEscolhido(p.id_pedido); setEntregue(null) }}
                  aria-current={escolhido?.id_pedido === p.id_pedido ? 'true' : undefined}
                  className={cn('w-full space-y-1 border-b px-3 py-4 text-left hover:bg-superficie', escolhido?.id_pedido === p.id_pedido && 'bg-superficie')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.cliente ?? 'Cliente'}</span>
                    {perto && <Etiqueta alerta>Vence em {plural(Math.max(0, PRAZO_RETIRADA_DIAS - dias), 'dia')}</Etiqueta>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Pedido {p.id_pedido}, {plural(p.itens.reduce((t, i) => t + i.quantidade, 0), 'peça')}, pronto {haQuanto(p.pronto_retirada_em)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0 space-y-6">
        {entregue && (
          <p role="status" className="flex items-center gap-2 bg-aco/10 px-3 py-2 text-sm text-marinho">
            <Check className="size-4 shrink-0 text-aco" aria-hidden="true" />
            Pedido {entregue.id_pedido} entregue para {entregue.cliente ?? 'o cliente'}.
          </p>
        )}
        <Campo id="retirada-codigo" rotulo="Código do pedido" dica="Peça o código que o cliente recebeu quando o pedido ficou pronto.">
          <Input
            id="retirada-codigo"
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setEntregue(null) }}
            placeholder="CL..."
            autoComplete="off"
            className="max-w-xs"
          />
        </Campo>
        {escolhido ? (
          <EntregarRetirada key={escolhido.id_pedido} pedido={escolhido} codigo={codigoLimpo} aoEntregar={aposEntregar} />
        ) : (
          lista.dados && prontas.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {codigoLimpo ? 'Nenhuma retirada pronta nesta loja com esse código. Confira o código com o cliente ou procure o pedido na lista.' : 'Digite o código ou escolha o pedido na lista.'}
            </p>
          )
        )}
      </div>
    </div>
  )
}

function EntregarRetirada({ pedido, codigo, aoEntregar }: { pedido: Pedido; codigo: string; aoEntregar: (pedido: Pedido) => void }) {
  const [conferiu, setConferiu] = useState(false)
  const { enviar, enviando, erro } = useEnviar()

  async function entregar(evento: FormEvent) {
    evento.preventDefault()
    const feito = await enviar(() => api<Pedido>(`/vendas/pedidos/${pedido.id_pedido}/entregar`, { metodo: 'POST', corpo: { codigo_venda: codigo } }))
    if (feito) aoEntregar(feito)
  }

  return (
    <form onSubmit={entregar} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-medium">{pedido.cliente ?? 'Cliente sem conta'}</h2>
        <p className="text-sm text-muted-foreground">
          Pedido {pedido.id_pedido}, pago {haQuanto(pedido.pago_em)}, {moeda(pedido.valor_total)}
        </p>
      </div>

      <ul className="border-t">
        {pedido.itens.map((item) => (
          <li key={item.id_item} className="flex items-center justify-between gap-3 border-b py-3 text-sm">
            <NomePeca produto={item.produto} cor={item.cor} tamanho={`${item.tamanho}, ${item.sku}`} />
            <span className="shrink-0 tabular-nums">{item.quantidade} ×</span>
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={conferiu} onChange={(e) => setConferiu(e.target.checked)} className="size-4 accent-marinho" />
        Conferi o documento com foto de quem está retirando
      </label>

      {erro && <Aviso mensagem={erro} />}
      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-11 px-5" disabled={!codigo || !conferiu || enviando}>
          <Check aria-hidden="true" /> {enviando ? 'Entregando...' : 'Entregar'}
        </Button>
      </div>
    </form>
  )
}
