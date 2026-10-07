import { useState } from 'react'
import { ChevronDown, Store } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from 'cn'

import { AREAS, podeVerArea } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Logo } from '@/components/Logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUnidades } from '@/lib/listas'
import type { UnidadeEscolhida } from './unidadeEscolhida'

// sublinhado da aba ativa na cor da área. Estoque (marinho) e Transferências (marinho-escuro)
// sumiriam sobre a faixa marinho-escura, então ficam em branco como as áreas sem cor própria.
const COR_DA_ABA: Record<string, string> = {
  pedidos: 'border-area-pedidos',
  atendimento: 'border-area-atendimento',
  avaliacoes: 'border-area-avaliacoes',
}

// plataforma interna: uma faixa com logo, áreas da conta, unidade em foco e o menu da pessoa
export function LayoutInterno() {
  const { perfil } = useAuth()
  const areas = AREAS.filter((area) => podeVerArea(perfil, area))
  const { dados: unidades } = useUnidades()
  // a unidade da conta é só o filtro inicial; dá para olhar qualquer outra
  const [unidade, setUnidade] = useState(perfil?.id_unidade ? String(perfil.id_unidade) : '')
  const contexto: UnidadeEscolhida = { unidade, setUnidade, unidades: unidades ?? [] }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="bg-marinho-escuro text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 px-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:gap-x-8">
          <Logo para="/interno" className="py-4 text-lg" />

          <nav
            aria-label="Áreas"
            className="col-span-2 row-start-2 -mx-4 flex min-w-0 gap-6 overflow-x-auto px-4 lg:col-span-1 lg:row-start-auto lg:mx-0 lg:self-stretch lg:px-0"
          >
            {areas.map((area) => (
              <NavLink
                key={area.caminho}
                to={area.caminho ? `/interno/${area.caminho}` : '/interno'}
                end={!area.caminho}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center border-b-2 py-3 text-sm transition-colors',
                    isActive
                      ? cn('font-medium text-white', COR_DA_ABA[area.caminho] ?? 'border-white')
                      : 'border-transparent text-white/70 hover:text-white',
                  )
                }
              >
                {area.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="col-start-2 row-start-1 flex items-center justify-end gap-6 lg:col-span-2 lg:col-start-auto lg:row-start-auto">
            <label className="flex items-center gap-2 text-sm">
              <Store className="size-4 text-white/70" aria-hidden="true" />
              <span className="sr-only">Unidade em foco</span>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="max-w-44 bg-transparent py-1 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:text-foreground"
              >
                <option value="">Todas as unidades</option>
                {(unidades ?? []).filter((u) => u.ativo).map((u) => (
                  <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>
                ))}
              </select>
            </label>
            <MenuDaPessoa />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Outlet context={contexto} />
      </main>
    </div>
  )
}

function MenuDaPessoa() {
  const { perfil, sair } = useAuth()
  if (!perfil) return null
  const primeiroNome = perfil.nome.split(' ')[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm whitespace-nowrap outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        {primeiroNome}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* o rótulo do base-ui precisa estar dentro de um grupo */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">
            <span className="block font-medium">{perfil.nome}</span>
            {perfil.modelo_acesso && (
              <span className="block font-normal text-muted-foreground">{perfil.modelo_acesso.nome}</span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void sair()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
