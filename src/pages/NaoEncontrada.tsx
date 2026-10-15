import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

// qualquer endereço que não existe
export function NaoEncontrada() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>Voltar ao início</Link>
    </main>
  )
}
