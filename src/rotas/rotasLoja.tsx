import { Hammer } from 'lucide-react'
import { Link, type RouteObject } from 'react-router'

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
// bloco aço-claro para a página não parecer quebrada enquanto a tela de verdade não chega
function emConstrucao(titulo: string, descricao: string) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-5 border-l-4 border-aco bg-aco-fundo p-8 sm:flex-row sm:items-start">
        <Hammer className="size-8 shrink-0 text-aco" aria-hidden="true" />
        <div className="space-y-4">
          <EmConstrucao titulo={titulo} descricao={descricao} />
          <Link to="/loja/produtos" className="inline-block text-sm font-medium underline underline-offset-4">
            Continuar comprando
          </Link>
        </div>
      </div>
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
