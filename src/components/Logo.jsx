import { Link } from 'react-router'
import { cn } from 'cn'

// marca em caixa alta e espaçada, como no design
export function Logo({ para = '/', className }) {
  return (
    <Link
      to={para}
      className={cn('justify-self-center whitespace-nowrap font-heading font-normal uppercase tracking-[0.35em]', className)}
    >
      Casa Lorenzi
    </Link>
  )
}
