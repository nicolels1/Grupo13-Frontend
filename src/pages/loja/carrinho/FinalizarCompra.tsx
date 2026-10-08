import { Link } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { buttonVariants } from '@/components/ui/button'

// botão de finalizar do carrinho (gaveta e página). Conta da equipe não compra pelo site: o checkout
// a mandaria para o interno sem explicar, então o aviso aparece aqui, no lugar do botão
export function FinalizarCompra({ desativado, aoClicar }: { desativado?: boolean; aoClicar?: () => void }) {
  const { perfil } = useAuth()

  if (perfil?.tipo_conta === 'interna') {
    return (
      <p className="bg-aco-fundo p-3 text-sm">
        Você está numa conta da equipe. Para comprar, saia e entre com uma conta de cliente.
      </p>
    )
  }

  return (
    <Link
      to="/loja/checkout"
      onClick={aoClicar}
      aria-disabled={desativado}
      className={cn(buttonVariants({ size: 'loja' }), 'w-full sm:w-full', desativado && 'pointer-events-none opacity-50')}
    >
      Finalizar compra
    </Link>
  )
}
