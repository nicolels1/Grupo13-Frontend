import { Star } from 'lucide-react'
import { cn } from 'cn'

// nota de 0 a 5 em estrelas marinho; meia estrela conta como cheia a partir de .5.
// Sobre fundo escuro (bloco marinho), `clara` pinta as estrelas de branco
export function Estrelas({ nota, clara, className }: { nota: number; clara?: boolean; className?: string }) {
  const cheias = Math.round(nota)
  const cheia = clara ? 'fill-white text-white' : 'fill-marinho text-marinho'
  const vazia = clara ? 'text-white/40' : 'text-border'
  return (
    <span className={cn('inline-flex gap-0.5', className)} role="img" aria-label={`Nota ${nota.toLocaleString('pt-BR')} de 5`}>
      {[1, 2, 3, 4, 5].map((posicao) => (
        <Star key={posicao} aria-hidden="true" className={cn('size-4', posicao <= cheias ? cheia : vazia)} />
      ))}
    </span>
  )
}
