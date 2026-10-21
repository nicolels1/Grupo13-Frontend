import { Link } from 'react-router'
import { cn } from 'cn'

import type { Loja } from '@/lib/lojaEscolhida'

// nome de cada rede na fonte dela: Casa Lorenzi em Marcellus, caixa alta espaçada (único lugar do site
// com essa fonte); Vulto em Helvetica Neue negrito, caixa alta espaçada, como na marca da Vulto
export function NomeDaLoja({ loja, className }: { loja: Loja; className?: string }) {
  return loja === 'vulto' ? (
    <span className={cn('font-logo-vulto font-bold whitespace-nowrap uppercase tracking-[0.35em]', className)}>Vulto</span>
  ) : (
    <span className={cn('font-logo whitespace-nowrap uppercase tracking-[0.3em]', className)}>Casa Lorenzi</span>
  )
}

export function Logo({ para = '/', loja = 'lorenzi', className }: { para?: string; loja?: Loja; className?: string }) {
  return (
    <Link to={para} className={cn('inline-block', className)}>
      <NomeDaLoja loja={loja} />
    </Link>
  )
}
