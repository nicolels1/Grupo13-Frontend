import { Link, Outlet } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Button, buttonVariants } from '@/components/ui/button'

// plataforma do cliente: a vitrine é pública; "Entrar" ou o nome de quem está logado
export function LayoutCliente() {
  const { sessao, perfil, sair } = useAuth()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/loja" className="font-heading font-semibold">Casa Lorenzi</Link>
          {sessao && perfil ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{perfil.nome}</span>
              <Button variant="ghost" size="sm" onClick={sair}>Sair</Button>
            </div>
          ) : (
            <Link to="/entrar" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Entrar</Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
