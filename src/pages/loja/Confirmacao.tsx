import { useState } from 'react'
import { Check, CircleCheck, Copy } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { rotuloTamanho } from './componentes/tamanhos'

type Pedido = Esquema<'PedidoSaida'>

const METODOS: Record<string, string> = { pix: 'Pix', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito' }

// confirmação: número do pedido copiável primeiro, depois o que acontece agora, os itens e as ações
export function ConfirmacaoPedido() {
  const { idPedido } = useParams()
  const { dados: pedido, erro, carregando } = useCarregar(() => api<Pedido>(`/pedidos/${idPedido}`), [idPedido])
  const [copiado, setCopiado] = useState(false)

  if (carregando) return <Carregando />
  if (erro || !pedido) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <Aviso titulo="Não foi possível abrir o pedido" mensagem={erro} />
        <Link to="/loja" className={buttonVariants({ variant: 'outline' })}>Voltar para a loja</Link>
      </div>
    )
  }

  const pagamento = pedido.pagamentos.find((p) => p.tipo === 'pagamento' && p.status === 'aprovado')
  const endereco = pedido.endereco_entrega

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <div className="space-y-4 bg-marinho p-8 text-white">
        <CircleCheck className="size-10" aria-hidden="true" />
        <h1 className="font-titulo text-4xl">Pedido confirmado</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white/85">Número do pedido</span>
          <span className="text-xl font-medium tabular-nums">{pedido.codigo_venda}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(pedido.codigo_venda)
              setCopiado(true)
            }}
            className="flex items-center gap-1.5 border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <section aria-labelledby="titulo-proximo" className="space-y-2 border-x border-b p-6">
        <h2 id="titulo-proximo" className="font-titulo text-2xl">E agora</h2>
        {pedido.modalidade === 'retirada' ? (
          <p className="text-sm">
            Vamos separar as peças na <span className="font-medium">{pedido.unidade}</span>. Quando ficar pronto, o status
            muda em Meus pedidos; leve o número do pedido e um documento. O pedido fica separado por 7 dias depois disso.
          </p>
        ) : (
          <p className="text-sm">
            Vamos enviar para {endereco ? `${endereco.rua}, ${endereco.numero}${endereco.complemento ? `, ${endereco.complemento}` : ''}, ${endereco.cidade} (${endereco.uf})` : 'o endereço escolhido'}.
            Você acompanha cada etapa em Meus pedidos.
          </p>
        )}
        {pagamento && (
          <p className="text-sm text-muted-foreground">
            Pago com {METODOS[pagamento.metodo] ?? pagamento.metodo}: {moeda(pagamento.valor)}.
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-itens" className="mt-8">
        <h2 id="titulo-itens" className="mb-3 font-titulo text-2xl">Itens</h2>
        <ul>
          {pedido.itens.map((item) => (
            <li key={item.id_item} className="flex justify-between gap-3 border-b py-3 text-sm">
              <span>
                <span className="block">{item.quantidade}× {item.produto}</span>
                <span className="text-muted-foreground">{item.cor}, tamanho {rotuloTamanho(item.tamanho)}</span>
              </span>
              <span className="tabular-nums">{moeda(Number(item.preco_unitario) * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{pedido.modalidade === 'retirada' ? 'Retirada' : 'Frete'}</dt>
            <dd className="tabular-nums">{Number(pedido.valor_frete) === 0 ? 'Grátis' : moeda(pedido.valor_frete)}</dd>
          </div>
          <div className="flex justify-between text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{moeda(pedido.valor_total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/loja/pedidos" className={buttonVariants({ size: 'loja' })}>Acompanhar pedido</Link>
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Continuar comprando</Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Problema com o pedido?{' '}
        <Link to="/loja/chamados/novo" className="text-foreground underline underline-offset-4">Fale com a gente</Link>
      </p>
    </div>
  )
}
