import { Suspense, type ReactElement } from 'react'
import { Outlet, useOutletContext, type RouteObject } from 'react-router'

import { AREAS } from '@/auth/areas'
import { ExigeArea, ExigeLogin } from '@/auth/Protecao'
import { Carregando } from '@/components/Estados'
import { LayoutInterno } from '@/layouts/LayoutInterno'
import {
  Atendimento, Caixa, Catalogo, Estoque, Gestao, HistoricoEstoque, Moderacao, Movimentacoes, Pedidos, ProdutoInterno, Transferencias,
  VisaoGeral,
} from './telasInterno'

// enquanto o código da tela chega, o topo do interno continua e o miolo mostra "Carregando"
const tela = (elemento: ReactElement) => <Suspense fallback={<Carregando />}>{elemento}</Suspense>

// telas de cada área da barra interna
const TELAS: Record<string, { tela: ReactElement; filhas?: RouteObject[] }> = {
  '': { tela: tela(<VisaoGeral />) },
  estoque: {
    tela: tela(<Estoque />),
    filhas: [
      { path: 'movimentacoes', element: tela(<Movimentacoes />) },
      { path: 'historico', element: tela(<HistoricoEstoque />) },
    ],
  },
  transferencias: { tela: tela(<Transferencias />) },
  caixa: { tela: tela(<Caixa />) },
  pedidos: { tela: tela(<Pedidos />) },
  avaliacoes: { tela: tela(<Moderacao />) },
  // o chamado aberto é a mesma caixa de entrada com a terceira coluna preenchida
  atendimento: { tela: tela(<Atendimento />), filhas: [{ path: ':idChamado', element: tela(<Atendimento />) }] },
  catalogo: { tela: tela(<Catalogo />), filhas: [{ path: ':idProduto', element: tela(<ProdutoInterno />) }] },
  gestao: { tela: tela(<Gestao />) },
}

// um <Outlet> aninhado começa sem contexto: repassa o do LayoutInterno (unidade escolhida)
function RepassaContexto() {
  return <Outlet context={useOutletContext()} />
}

// cada área ganha sua rota protegida pela permissão da área; as páginas internas da área
// (ex.: o chamado aberto) ficam sob a mesma proteção
const rotasDasAreas = AREAS.flatMap((area): RouteObject[] => {
  const telas = TELAS[area.caminho]
  if (!telas) return []
  const { tela, filhas = [] } = telas
  const protegida = (
    <ExigeArea area={area}>
      <RepassaContexto />
    </ExigeArea>
  )
  if (!area.caminho) return [{ index: true, element: <ExigeArea area={area}>{tela}</ExigeArea> }]
  return [{ path: area.caminho, element: protegida, children: [{ index: true, element: tela }, ...filhas] }]
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
