import { useState } from 'react'
import { Check, CircleCheck, Copy } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { METODOS_PAGAMENTO, moeda } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { rotuloTamanho } from './componentes/tamanhos'

type Compra = Esquema<'CompraSaida'>
type Pedido = Esquema<'PedidoSaida'>

// confirmação: número da compra copiável primeiro, depois o que acontece agora, os itens e as ações.
// Com peças das duas marcas, a compra chega em mais de um pedido, cada um saindo de uma unidade da sua marca
export function ConfirmacaoCompra() {
  const { idCompra } = useParams()
  const { dados: compra, erro, carregando } = useCarregar(() => api<Compra>(`/compras/${idCompra}`), [idCompra])
  const [copiado, setCopiado] = useState(false)

  if (carregando) return <Carregando />
  if (erro || !compra) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <Aviso titulo="Não foi possível abrir a compra" mensagem={erro} />
        <Link to="/loja" className={buttonVariants({ variant: 'outline' })}>Voltar para a loja</Link>
      </div>
    )
  }

  const varios = compra.pedidos.length > 1
  const retirada = compra.pedidos[0]?.modalidade === 'retirada'

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <div className="space-y-4 bg-marinho p-8 text-white">
        <CircleCheck className="size-10" aria-hidden="true" />
        <h1 className="font-titulo text-4xl">Compra confirmada</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white/85">Número da compra</span>
          <span className="text-xl font-medium tabular-nums">{compra.codigo_compra}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(compra.codigo_compra)
              setCopiado(true)
            }}
            className="flex items-center gap-1.5 border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <section aria-labelledby="titulo-proximo" className="space-y-3 border-x border-b p-6">
        <h2 id="titulo-proximo" className="font-titulo text-2xl">E agora</h2>
        {varios && (
          <p className="text-sm">
            As peças saem de lugares diferentes, então a compra chega em {compra.pedidos.length} pedidos. Você acompanha
            cada um em Meus pedidos.
          </p>
        )}
        {compra.pedidos.map((pedido) => (
          <ProximoPasso key={pedido.id_pedido} pedido={pedido} mostrarNumero={varios} />
        ))}
        {compra.metodo && (
          <p className="text-sm text-muted-foreground">
            Pago com {METODOS_PAGAMENTO[compra.metodo] ?? compra.metodo}: {moeda(compra.valor_total)}.
          </p>
        )}
      </section>

      <section aria-labelledby="titulo-itens" className="mt-8">
        <h2 id="titulo-itens" className="mb-3 font-titulo text-2xl">Itens</h2>
        <div className="space-y-6">
          {compra.pedidos.map((pedido) => (
            <div key={pedido.id_pedido}>
              {varios && (
                <h3 className="text-sm font-medium text-muted-foreground">
                  Pedido <span className="tabular-nums">{pedido.codigo_venda}</span>, sai da {pedido.unidade}
                </h3>
              )}
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
            </div>
          ))}
        </div>

        <dl className="space-y-1 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{retirada ? 'Retirada' : 'Frete'}</dt>
            <dd className="tabular-nums">{Number(compra.valor_frete) === 0 ? 'Grátis' : moeda(compra.valor_frete)}</dd>
          </div>
          {Number(compra.valor_desconto) > 0 && (
            <div className="flex justify-between">
              <dt>Desconto com pontos</dt>
              <dd className="tabular-nums">−{moeda(compra.valor_desconto)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{moeda(compra.valor_total)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/loja/pedidos" className={buttonVariants({ size: 'loja' })}>
          {varios ? 'Acompanhar pedidos' : 'Acompanhar pedido'}
        </Link>
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Continuar comprando</Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Problema com a compra?{' '}
        <Link to="/loja/chamados/novo" className="text-foreground underline underline-offset-4">Fale com a gente</Link>
      </p>
    </div>
  )
}

// o que acontece com cada pedido: na retirada, o número do pedido é o que a loja pede no balcão
function ProximoPasso({ pedido, mostrarNumero }: { pedido: Pedido; mostrarNumero: boolean }) {
  const endereco = pedido.endereco_entrega
  return (
    <div className="space-y-1">
      {mostrarNumero && (
        <p className="text-sm font-medium">
          Pedido <span className="tabular-nums">{pedido.codigo_venda}</span>
        </p>
      )}
      {pedido.modalidade === 'retirada' ? (
        <p className="text-sm">
          Vamos separar as peças na <span className="font-medium">{pedido.unidade}</span>. Quando ficar pronto, o status
          muda em Meus pedidos; leve o número do pedido <span className="font-medium tabular-nums">{pedido.codigo_venda}</span> e
          um documento. O pedido fica separado por 7 dias depois disso.
        </p>
      ) : (
        <p className="text-sm">
          Vamos enviar da {pedido.unidade} para{' '}
          {endereco
            ? `${endereco.rua}, ${endereco.numero}${endereco.complemento ? `, ${endereco.complemento}` : ''}, ${endereco.cidade} (${endereco.uf})`
            : 'o endereço escolhido'}
          . Você acompanha cada etapa em Meus pedidos.
        </p>
      )}
    </div>
  )
}
