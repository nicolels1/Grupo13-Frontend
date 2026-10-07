import { useOutletContext } from 'react-router'

import type { Esquema } from '@/lib/api'

export type UnidadeEscolhida = {
  // id da unidade em texto ('' = todas as unidades)
  unidade: string
  setUnidade: (unidade: string) => void
  unidades: Esquema<'UnidadeSaida'>[]
}

// unidade escolhida no topo da plataforma interna.
// As telas usam como filtro inicial; vem do <Outlet context> do LayoutInterno.
export function useUnidadeEscolhida() {
  return useOutletContext<UnidadeEscolhida>()
}
