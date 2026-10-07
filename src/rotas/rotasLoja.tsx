import type { RouteObject } from 'react-router'

import { ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { EmConstrucao } from '@/pages/Basicas'
import { Cadastro, Entrar } from '@/pages/Entrar'
import { AjudaLoja } from '@/pages/loja/Ajuda'
import { ChamadosCliente, ConversaCliente, NovoChamadoCliente, SemChamadoEscolhido } from '@/pages/loja/Chamados'
import { InicioLoja } from '@/pages/loja/Inicio'
import { ProdutoLoja } from '@/pages/loja/Produto'
import { ProdutosLoja } from '@/pages/loja/Produtos'

// telas da loja que ainda vão ser feitas: o caminho já existe para o menu e os botões
// levarem a algum lugar, e cada etapa troca o aviso pela tela de verdade
function emConstrucao(titulo: string, descricao: string) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <EmConstrucao titulo={titulo} descricao={descricao} />
    </div>
  )
}

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
      { path: 'carrinho', element: emConstrucao('Carrinho', 'O carrinho e a finalização da compra estão em construção.') },
      {
        path: 'pedidos',
        element: (
          <ExigeLogin tipo="cliente">
            {emConstrucao('Meus pedidos', 'O acompanhamento dos seus pedidos está em construção.')}
          </ExigeLogin>
        ),
      },
      {
        path: 'enderecos',
        element: (
          <ExigeLogin tipo="cliente">
            {emConstrucao('Endereços', 'O cadastro de endereços está em construção.')}
          </ExigeLogin>
        ),
      },
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
