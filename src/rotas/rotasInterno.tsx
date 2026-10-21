import type { ReactElement } from 'react'
import type { RouteObject } from 'react-router'

import { AREAS } from '@/auth/areas'
import { ExigeArea, ExigeLogin } from '@/auth/Protecao'
import { LayoutInterno } from '@/layouts/LayoutInterno'
import { RepassaContexto } from './RepassaContexto'
import { tela } from './tela'
import {
  Atendimento, Caixa, Catalogo, Clientes, Estoque, FichaCliente, Gestao, HistoricoEstoque, Moderacao, Movimentacoes, Pedidos, ProdutoInterno,
  Transferencias, VisaoGeral,
} from './telasInterno'

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
  // a ficha do cliente com conta e a do cliente da Vulto sem conta (P2)
  clientes: {
    tela: tela(<Clientes />),
    filhas: [
      { path: 'conta/:idCliente', element: tela(<FichaCliente tipo="conta" />) },
      { path: 'sem-conta/:idCliente', element: tela(<FichaCliente tipo="sem-conta" />) },
    ],
  },
  avaliacoes: { tela: tela(<Moderacao />) },
  // o chamado aberto é a mesma caixa de entrada com a terceira coluna preenchida
  atendimento: { tela: tela(<Atendimento />), filhas: [{ path: ':idChamado', element: tela(<Atendimento />) }] },
  catalogo: { tela: tela(<Catalogo />), filhas: [{ path: ':idProduto', element: tela(<ProdutoInterno />) }] },
  gestao: { tela: tela(<Gestao />) },
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
