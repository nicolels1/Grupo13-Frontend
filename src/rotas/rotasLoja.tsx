import type { RouteObject } from 'react-router'

import { ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { Cadastro, Entrar } from '@/pages/Entrar'
import { AjudaLoja } from '@/pages/loja/Ajuda'
import { ChamadosCliente, ConversaCliente, NovoChamadoCliente, SemChamadoEscolhido } from '@/pages/loja/Chamados'
import { InicioLoja } from '@/pages/loja/Inicio'
import { ProdutoLoja } from '@/pages/loja/Produto'
import { ProdutosLoja } from '@/pages/loja/Produtos'

export const rotasLoja: RouteObject[] = [
  { path: '/entrar', element: <Entrar /> },
  { path: '/cadastro', element: <Cadastro /> },
  {
    path: '/loja',
    element: <LayoutCliente />,
    children: [
      { index: true, element: <InicioLoja /> },
      { path: 'produtos', element: <ProdutosLoja /> },
      { path: 'produtos/:idProduto', element: <ProdutoLoja /> },
      { path: 'ajuda', element: <AjudaLoja /> },
      {
        path: 'chamados',
        element: (
          <ExigeLogin tipo="cliente">
            <ChamadosCliente />
          </ExigeLogin>
        ),
        children: [
          { index: true, element: <SemChamadoEscolhido /> },
          { path: 'novo', element: <NovoChamadoCliente /> },
          { path: ':idChamado', element: <ConversaCliente /> },
        ],
      },
    ],
  },
]
