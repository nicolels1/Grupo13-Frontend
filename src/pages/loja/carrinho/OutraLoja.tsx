import { NomeDaLoja } from '@/components/Logo'
import { plural } from '@/lib/formato'
import { escolherLoja } from '@/lib/lojaEscolhida'
import { useCarrinho } from './contexto'

// cada loja tem o seu carrinho: o desta loja é o que fecha agora, e as peças da outra continuam
// guardadas lá. O link troca a aba do topo e mostra o outro carrinho
export function AvisoOutraLoja() {
  const { loja, pecasNaOutraLoja } = useCarrinho()
  if (pecasNaOutraLoja === 0) return null
  const outra = loja === 'vulto' ? 'lorenzi' : 'vulto'
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 bg-superficie px-4 py-3 text-sm">
      Você também tem {plural(pecasNaOutraLoja, 'peça', 'peças')} no carrinho da <NomeDaLoja loja={outra} className="text-xs" />.
      <button type="button" onClick={() => escolherLoja(outra)} className="underline underline-offset-4 hover:text-aco">
        Ver esse carrinho
      </button>
    </p>
  )
}
