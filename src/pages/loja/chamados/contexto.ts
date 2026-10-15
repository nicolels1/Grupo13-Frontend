import { useOutletContext } from 'react-router'

// o que a lista de chamados repassa pelo <Outlet context> para a conversa e o chamado novo
export type ContextoChamados = { recarregarLista: () => void }

export function useContextoChamados() {
  return useOutletContext<ContextoChamados>()
}
