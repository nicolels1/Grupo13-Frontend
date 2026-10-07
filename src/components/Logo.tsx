import { Link } from 'react-router'
import { cn } from 'cn'

// marca em Marcellus, caixa alta espaçada (único lugar do site com essa fonte)
export function Logo({ para = '/', className }: { para?: string; className?: string }) {
  return (
    <Link to={para} className={cn('font-logo whitespace-nowrap uppercase tracking-[0.3em]', className)}>
      Casa Lorenzi
    </Link>
  )
}
