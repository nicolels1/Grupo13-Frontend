import { Link } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { moeda, plural } from '@/lib/formato'
import { useCarrinho } from './contexto'
import { BarraFreteGratis, ItensCarrinho } from './ItensCarrinho'
import { useResumo } from './useResumo'

// gaveta lateral: abre sozinha ao adicionar uma peça (é a confirmação) e pelo ícone do topo
export function GavetaCarrinho() {
  const { itens, quantidadeTotal, gavetaAberta, fecharGaveta, abrirGaveta } = useCarrinho()
  const { dados: resumo, erro, carregando } = useResumo()

  return (
    <Sheet open={gavetaAberta} onOpenChange={(aberta) => (aberta ? abrirGaveta() : fecharGaveta())}>
      <SheetContent className="w-full gap-0 motion-reduce:transition-none sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-titulo text-2xl font-normal">Carrinho</SheetTitle>
          <SheetDescription>{quantidadeTotal === 0 ? 'Vazio' : plural(quantidadeTotal, 'peça', 'peças')}</SheetDescription>
        </SheetHeader>

        {itens.length === 0 ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            <Link to="/loja/produtos" onClick={fecharGaveta} className={buttonVariants({ variant: 'outline', size: 'loja' })}>
              Ver as peças
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {resumo && (
                <div className="pt-4">
                  <BarraFreteGratis resumo={resumo} />
                </div>
              )}
              {erro && (
                <div className="pt-4">
                  <Aviso mensagem={erro} />
                </div>
              )}
              {!resumo && carregando && <Carregando />}
              <ItensCarrinho resumo={resumo} aoNavegar={fecharGaveta} />
            </div>

            <div className="space-y-3 border-t p-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums">{resumo ? moeda(resumo.valor_itens) : '—'}</span>
              </div>
              <p className="text-xs text-muted-foreground">O frete e a retirada você escolhe na finalização.</p>
              <Link
                to="/loja/checkout"
                onClick={fecharGaveta}
                aria-disabled={Boolean(erro)}
                className={cn(buttonVariants({ size: 'loja' }), 'w-full sm:w-full', erro && 'pointer-events-none opacity-50')}
              >
                Finalizar compra
              </Link>
              <Link
                to="/loja/carrinho"
                onClick={fecharGaveta}
                className="block text-center text-sm underline underline-offset-4"
              >
                Ver carrinho
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
