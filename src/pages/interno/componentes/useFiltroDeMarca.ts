import { useState } from 'react'

import { marcasVistas, type Marca } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'

export type FiltroDeMarca = {
  // a marca que vai no ?marca= da lista (undefined: sem filtro)
  marca: Marca | undefined
  valor: string
  mudar: (valor: string) => void
  mostra: boolean
}

// filtro de marca das listas da equipe (estoque, transferências, pedidos e chamados). Só aparece para quem
// vê as duas marcas e com "Todas as unidades" no topo: a unidade já é de uma marca, e quem vê uma só
// já recebe só ela do backend
export function useFiltroDeMarca(aoMudar?: () => void): FiltroDeMarca {
  const { perfil } = useAuth()
  const { unidade } = useUnidadeEscolhida()
  const [valor, setValor] = useState('')
  const mostra = !unidade && marcasVistas(perfil).size > 1
  return {
    marca: mostra && valor ? (valor as Marca) : undefined,
    valor,
    mudar: (novo) => {
      setValor(novo)
      aoMudar?.()
    },
    mostra,
  }
}
