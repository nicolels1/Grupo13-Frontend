import type { ReactElement } from 'react'
import { Outlet, useOutletContext, type RouteObject } from 'react-router'

import { AREAS } from '@/auth/areas'
import { ExigeArea, ExigeLogin } from '@/auth/Protecao'
import { LayoutInterno } from '@/layouts/LayoutInterno'
import { EmConstrucao } from '@/pages/Basicas'
import { Atendimento, ChamadoInterno } from '@/pages/interno/Atendimento'
import { Catalogo } from '@/pages/interno/Catalogo'
import { Estoque } from '@/pages/interno/Estoque'
import { Gestao } from '@/pages/interno/Gestao'
import { Movimentacoes } from '@/pages/interno/Movimentacoes'
import { ProdutoInterno } from '@/pages/interno/ProdutoInterno'
import { Transferencias } from '@/pages/interno/Transferencias'
import { VisaoGeral } from '@/pages/interno/VisaoGeral'

// telas de cada área da barra interna. Pedidos e Avaliações seguem em construção
// até o backend ter as rotas delas.
const TELAS: Record<string, { tela: ReactElement; filhas?: RouteObject[] }> = {
  '': { tela: <VisaoGeral /> },
  estoque: { tela: <Estoque />, filhas: [{ path: 'movimentacoes', element: <Movimentacoes /> }] },
  transferencias: { tela: <Transferencias /> },
  atendimento: { tela: <Atendimento />, filhas: [{ path: ':idChamado', element: <ChamadoInterno /> }] },
  catalogo: { tela: <Catalogo />, filhas: [{ path: ':idProduto', element: <ProdutoInterno /> }] },
  gestao: { tela: <Gestao /> },
}

// um <Outlet> aninhado começa sem contexto: repassa o do LayoutInterno (unidade escolhida)
function RepassaContexto() {
  return <Outlet context={useOutletContext()} />
}

// cada área ganha sua rota protegida pela permissão da área; as páginas internas da área
// (ex.: o chamado aberto) ficam sob a mesma proteção
const rotasDasAreas = AREAS.map((area): RouteObject => {
  const { tela, filhas = [] } = TELAS[area.caminho] ?? { tela: <EmConstrucao titulo={area.rotulo} /> }
  const protegida = (
    <ExigeArea area={area}>
      <RepassaContexto />
    </ExigeArea>
  )
  if (!area.caminho) return { index: true, element: <ExigeArea area={area}>{tela}</ExigeArea> }
  return { path: area.caminho, element: protegida, children: [{ index: true, element: tela }, ...filhas] }
})

export const rotasInterno: RouteObject[] = [
  {
    path: '/interno',
    element: (
      <ExigeLogin tipo="interna">
        <LayoutInterno />
      </ExigeLogin>
    ),
    children: rotasDasAreas,
  },
]
