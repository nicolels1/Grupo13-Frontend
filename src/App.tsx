import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router'

import { AuthProvider } from '@/auth/AuthProvider'
import { ErroDaPagina, NaoEncontrada, RotaInicial } from '@/pages/Basicas'
import { rotasInterno } from '@/rotas/rotasInterno'
import { rotasLoja } from '@/rotas/rotasLoja'

// as rotas de cada plataforma ficam no próprio arquivo em rotas/, para a loja e o
// interno crescerem sem mexer no mesmo lugar
const roteador = createBrowserRouter([
  {
    // trocar de página por link mantinha a rolagem da página anterior (do rodapé, abria a próxima
    // já embaixo). O ScrollRestoration leva ao topo, devolve a rolagem no voltar do navegador e
    // respeita âncoras (#) e o preventScrollReset dos filtros da lista
    element: (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    ),
    errorElement: <ErroDaPagina />,
    children: [
      { path: '/', element: <RotaInicial /> },
      ...rotasLoja,
      ...rotasInterno,
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
