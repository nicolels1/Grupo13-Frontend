import { createBrowserRouter, Outlet, RouterProvider, useOutletContext } from 'react-router'

import { AREAS } from '@/auth/areas'
import { AuthProvider } from '@/auth/AuthProvider'
import { ExigeArea, ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { LayoutInterno } from '@/layouts/LayoutInterno'
import { EmConstrucao, ErroDaPagina, NaoEncontrada, RotaInicial } from '@/pages/Basicas'
import { Cadastro, Entrar } from '@/pages/Entrar'
import { Atendimento, ChamadoInterno } from '@/pages/interno/Atendimento'
import { Catalogo } from '@/pages/interno/Catalogo'
import { Estoque } from '@/pages/interno/Estoque'
import { Gestao } from '@/pages/interno/Gestao'
import { Movimentacoes } from '@/pages/interno/Movimentacoes'
import { ProdutoInterno } from '@/pages/interno/ProdutoInterno'
import { Transferencias } from '@/pages/interno/Transferencias'
import { VisaoGeral } from '@/pages/interno/VisaoGeral'
import { AjudaLoja } from '@/pages/loja/Ajuda'
import { ChamadosCliente, ConversaCliente, NovoChamadoCliente, SemChamadoEscolhido } from '@/pages/loja/Chamados'
import { InicioLoja } from '@/pages/loja/Inicio'
import { ProdutoLoja } from '@/pages/loja/Produto'
import { ProdutosLoja } from '@/pages/loja/Produtos'

// telas de cada área da barra interna. Pedidos e Avaliações seguem em construção
// até o backend ter as rotas delas.
const TELAS = {
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
const rotasInternas = AREAS.map((area) => {
  const { tela, filhas = [] } = TELAS[area.caminho] ?? { tela: <EmConstrucao titulo={area.rotulo} /> }
  const protegida = (
    <ExigeArea area={area}>
      <RepassaContexto />
    </ExigeArea>
  )
  if (!area.caminho) return { index: true, element: <ExigeArea area={area}>{tela}</ExigeArea> }
  return { path: area.caminho, element: protegida, children: [{ index: true, element: tela }, ...filhas] }
})

const roteador = createBrowserRouter([
  {
    errorElement: <ErroDaPagina />,
    children: [
      { path: '/', element: <RotaInicial /> },
      { path: '/entrar', element: <Entrar /> },
      { path: '/cadastro', element: <Cadastro /> },
      {
        path: '/interno',
        element: (
          <ExigeLogin tipo="interna">
            <LayoutInterno />
          </ExigeLogin>
        ),
        children: rotasInternas,
      },
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
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={roteador} />
    </AuthProvider>
  )
}
