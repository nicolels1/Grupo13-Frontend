import type { RouteObject } from 'react-router'

import { ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { Cadastro, Entrar } from '@/pages/Entrar'
import { AjudaLoja } from '@/pages/loja/Ajuda'
import { AvaliarPeca } from '@/pages/loja/Avaliar'
import { CarrinhoLoja } from '@/pages/loja/Carrinho'
import { ChamadosCliente, ConversaCliente, NovoChamadoCliente, SemChamadoEscolhido } from '@/pages/loja/Chamados'
import { CheckoutLoja } from '@/pages/loja/Checkout'
import { ConfirmacaoPedido } from '@/pages/loja/Confirmacao'
import { Enderecos } from '@/pages/loja/Enderecos'
import { AreaDaConta } from '@/pages/loja/conta/AreaDaConta'
import { VisaoGeralConta } from '@/pages/loja/conta/VisaoGeralConta'
import { InicioLoja } from '@/pages/loja/Inicio'
import { MeusPedidos } from '@/pages/loja/MeusPedidos'
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
      { path: 'carrinho', element: <CarrinhoLoja /> },
      {
        path: 'checkout',
        element: (
          <ExigeLogin tipo="cliente">
            <CheckoutLoja />
          </ExigeLogin>
        ),
      },
      {
        path: 'pedido-confirmado/:idPedido',
        element: (
          <ExigeLogin tipo="cliente">
            <ConfirmacaoPedido />
          </ExigeLogin>
        ),
      },
      // área "Minha conta": login de cliente e o menu das seções em volta; os endereços das
      // páginas não mudam (/loja/pedidos, /loja/chamados...) e /loja/conta é a visão geral
      {
        element: (
          <ExigeLogin tipo="cliente">
            <AreaDaConta />
          </ExigeLogin>
        ),
        children: [
          { path: 'conta', element: <VisaoGeralConta /> },
          { path: 'pedidos', element: <MeusPedidos /> },
          { path: 'avaliar/:idItem', element: <AvaliarPeca /> },
          { path: 'enderecos', element: <Enderecos /> },
          {
            path: 'chamados',
            element: <ChamadosCliente />,
            children: [
              { index: true, element: <SemChamadoEscolhido /> },
              { path: 'novo', element: <NovoChamadoCliente /> },
              { path: ':idChamado', element: <ConversaCliente /> },
            ],
          },
        ],
      },
    ],
  },
]
