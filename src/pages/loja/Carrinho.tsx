import { Link } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { moeda, plural } from '@/lib/formato'
import { useCarrinho } from './carrinho/contexto'
import { FinalizarCompra } from './carrinho/FinalizarCompra'
import { BarraFreteGratis, ItensCarrinho } from './carrinho/ItensCarrinho'
import { useResumo } from './carrinho/useResumo'

// página do carrinho: as peças com mais espaço e o resumo com frete e total antes de finalizar
export function CarrinhoLoja() {
  const { itens, quantidadeTotal } = useCarrinho()
  const { dados: resumo, erro, carregando } = useResumo()

  return (
    <>
      <div className="bg-ardosia text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-titulo text-4xl sm:text-5xl">Carrinho</h1>
          {quantidadeTotal > 0 && <p className="mt-2 text-sm text-white/85">{plural(quantidadeTotal, 'peça', 'peças')}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {itens.length === 0 ? (
          <div className="space-y-4 py-10">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Ver as peças</Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              {erro && <Aviso mensagem={erro} />}
              {!resumo && carregando && <Carregando />}
              <ItensCarrinho resumo={resumo} />
            </div>

            <aside className="space-y-5 bg-superficie p-6 lg:sticky lg:top-6 lg:self-start">
              <h2 className="font-titulo text-2xl">Resumo</h2>
              {resumo && <BarraFreteGratis resumo={resumo} />}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{resumo ? moeda(resumo.valor_itens) : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Entrega em casa</dt>
                  <dd className="tabular-nums">
                    {resumo ? (Number(resumo.frete_entrega) === 0 ? 'Grátis' : moeda(resumo.frete_entrega)) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Retirada na loja</dt>
                  <dd>Grátis</dd>
                </div>
              </dl>
              <div className="flex justify-between border-t pt-4">
                <span className="font-medium">Total com entrega</span>
                <span className="text-lg font-medium tabular-nums">{resumo ? moeda(resumo.total_entrega) : '—'}</span>
              </div>
              <FinalizarCompra desativado={Boolean(erro)} />
              <Link to="/loja/produtos" className="block text-center text-sm underline underline-offset-4">
                Continuar comprando
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
