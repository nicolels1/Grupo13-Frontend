import type { RouteObject } from 'react-router'

import { ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { InicioLoja } from '@/pages/loja/Inicio'
import { tela } from './tela'
import {
  AdicionarAoCarrinho, AjudaLoja, AreaDaConta, AvaliarPeca, Cadastro, CarrinhoLoja, ChamadosCliente, CheckoutLoja, ConfirmacaoCompra, ConversaCliente, Enderecos,
  Entrar, EsqueciSenha, MeusPedidos, MeusPontosLoja, NovoChamadoCliente, ProdutoLoja, ProdutosLoja, RedefinirSenha, SemChamadoEscolhido, VisaoGeralConta,
} from './telasLoja'

export const rotasLoja: RouteObject[] = [
  { path: '/entrar', element: tela(<Entrar />) },
  { path: '/cadastro', element: tela(<Cadastro />) },
  { path: '/esqueci-senha', element: tela(<EsqueciSenha />) },
  { path: '/redefinir-senha', element: tela(<RedefinirSenha />) },
  {
    path: '/loja',
    element: <LayoutCliente />,
    children: [
      { index: true, element: <InicioLoja /> },
      { path: 'produtos', element: tela(<ProdutosLoja />) },
      { path: 'produtos/:idProduto', element: tela(<ProdutoLoja />) },
      { path: 'ajuda', element: tela(<AjudaLoja />) },
      { path: 'carrinho', element: tela(<CarrinhoLoja />) },
      { path: 'carrinho/adicionar', element: tela(<AdicionarAoCarrinho />) },
      {
        path: 'checkout',
        element: <ExigeLogin tipo="cliente">{tela(<CheckoutLoja />)}</ExigeLogin>,
      },
      {
        path: 'compra-confirmada/:idCompra',
        element: <ExigeLogin tipo="cliente">{tela(<ConfirmacaoCompra />)}</ExigeLogin>,
      },
      // área "Minha conta": login de cliente e o menu das seções em volta; os endereços das
      // páginas não mudam (/loja/pedidos, /loja/chamados...) e /loja/conta é a visão geral
      {
        element: <ExigeLogin tipo="cliente">{tela(<AreaDaConta />)}</ExigeLogin>,
        children: [
          { path: 'conta', element: tela(<VisaoGeralConta />) },
          { path: 'pedidos', element: tela(<MeusPedidos />) },
          { path: 'avaliar/:idItem', element: tela(<AvaliarPeca />) },
          { path: 'enderecos', element: tela(<Enderecos />) },
          { path: 'pontos', element: tela(<MeusPontosLoja />) },
          {
            path: 'chamados',
            element: tela(<ChamadosCliente />),
            children: [
              { index: true, element: tela(<SemChamadoEscolhido />) },
              { path: 'novo', element: tela(<NovoChamadoCliente />) },
              { path: ':idChamado', element: tela(<ConversaCliente />) },
            ],
          },
        ],
      },
    ],
  },
]
