import { useState } from 'react'
import { Store } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from 'cn'

import { AREAS, podeVerArea } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Logo } from '@/components/Logo'
import { Select } from '@/components/ui/input'
import { useUnidades } from '@/lib/listas'

// plataforma interna: faixa com quem está logado, unidade em foco, logo e as áreas da conta
export function LayoutInterno() {
  const { perfil, sair } = useAuth()
  const areas = AREAS.filter((area) => podeVerArea(perfil, area))
  const { dados: unidades } = useUnidades()
  // a unidade da conta é só o filtro inicial; dá para olhar qualquer outra
  const [unidade, setUnidade] = useState(perfil.id_unidade ? String(perfil.id_unidade) : '')

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="bg-marinho-escuro text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
          <span>Retaguarda da Casa Lorenzi</span>
          <span className="flex items-center gap-4">
            <span className="hidden sm:inline">
              {perfil.nome}
              {perfil.modelo_acesso && `, ${perfil.modelo_acesso.nome}`}
            </span>
            <button type="button" onClick={sair} className="underline underline-offset-2 hover:text-white/80">
              Sair
            </button>
          </span>
        </div>
      </div>

      <header className="border-b">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pt-4 sm:px-6">
          <label className="flex w-fit items-center gap-2">
            <Store className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Unidade em foco</span>
            <Select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-auto max-w-48">
              <option value="">Todas as unidades</option>
              {(unidades ?? []).filter((u) => u.ativo).map((u) => (
                <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>
              ))}
            </Select>
          </label>
          <Logo para="/interno" className="text-lg sm:text-2xl" />
          <span />
        </div>
        <nav aria-label="Áreas" className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 pt-4 sm:justify-center sm:px-6">
          {areas.map((area) => (
            <NavLink
              key={area.caminho}
              to={area.caminho ? `/interno/${area.caminho}` : '/interno'}
              end={!area.caminho}
              className={({ isActive }) =>
                cn(
                  'shrink-0 border-b-2 pb-3 text-[0.95rem] transition-colors',
                  isActive ? 'border-foreground font-medium' : 'border-transparent hover:border-border',
                )
              }
            >
              {area.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Outlet context={{ unidade, setUnidade, unidades: unidades ?? [] }} />
      </main>
    </div>
  )
}
