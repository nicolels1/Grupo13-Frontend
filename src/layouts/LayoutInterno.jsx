import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from 'cn'

import { AREAS, podeVerArea } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Button } from '@/components/ui/button'

// plataforma interna: barra no topo (não sidebar) só com as áreas que a conta pode usar
export function LayoutInterno() {
  const { perfil, sair } = useAuth()
  const areas = AREAS.filter((area) => podeVerArea(perfil, area))

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <span className="shrink-0 font-heading font-semibold">Casa Lorenzi</span>
          <nav aria-label="Áreas" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {areas.map((area) => (
              <NavLink
                key={area.caminho}
                to={area.caminho ? `/interno/${area.caminho}` : '/interno'}
                end={!area.caminho}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted',
                    isActive ? 'bg-muted font-medium' : 'text-muted-foreground',
                  )
                }
              >
                {area.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {perfil.nome}
              {perfil.modelo_acesso && ` · ${perfil.modelo_acesso.nome}`}
            </span>
            <Button variant="ghost" size="sm" onClick={sair} aria-label="Sair">
              <LogOut />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
