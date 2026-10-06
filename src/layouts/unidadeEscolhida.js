import { useOutletContext } from 'react-router'

// unidade escolhida no topo da plataforma interna ('' = todas as unidades).
// As telas usam como filtro inicial; vem do <Outlet context> do LayoutInterno.
export function useUnidadeEscolhida() {
  return useOutletContext()
}
