import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { Logo } from '@/components/Logo'

// moldura das telas de conta: fundo marinho-escuro de ponta a ponta e o cartão branco no meio.
// As telas de senha têm pouco conteúdo: o cartão largo e mais alto não deixa a tela vazia
export function MolduraConta({ children, larga = false }: { children: ReactNode; larga?: boolean }) {
  return (
    <main className={cn('flex min-h-svh flex-col items-center bg-marinho-escuro px-4 py-10 text-foreground', larga && 'sm:justify-center')}>
      <Logo para="/loja" className="mb-10 text-2xl text-white" />
      <div
        className={cn(
          'w-full border-t-4 border-terracota bg-background',
          larga ? 'max-w-2xl p-8 sm:px-16 sm:py-16 [&_h1]:sm:text-4xl [&_p]:sm:text-base' : 'max-w-md p-8 sm:p-10',
        )}
      >
        {children}
      </div>
      <Link to="/loja" className="mt-6 text-sm text-white/85 underline underline-offset-4 hover:text-white">
        Voltar para a loja
      </Link>
    </main>
  )
}
