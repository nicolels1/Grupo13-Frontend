import { createBrowserRouter, RouterProvider } from 'react-router'

import { AREAS } from '@/auth/areas'
import { AuthProvider } from '@/auth/AuthProvider'
import { ExigeArea, ExigeLogin } from '@/auth/Protecao'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { LayoutInterno } from '@/layouts/LayoutInterno'
import { EmConstrucao, ErroDaPagina, NaoEncontrada, RotaInicial } from '@/pages/Basicas'
import { Entrar } from '@/pages/Entrar'

// cada área da barra interna ganha sua rota protegida pela permissão da área;
// as telas de verdade substituem o EmConstrucao conforme forem feitas
const rotasInternas = AREAS.map((area) => ({
  ...(area.caminho ? { path: area.caminho } : { index: true }),
  element: (
    <ExigeArea area={area}>
      <EmConstrucao titulo={area.rotulo} />
    </ExigeArea>
  ),
}))

const roteador = createBrowserRouter([
  {
    errorElement: <ErroDaPagina />,
    children: [
      { path: '/', element: <RotaInicial /> },
      { path: '/entrar', element: <Entrar /> },
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
        children: [{ index: true, element: <EmConstrucao titulo="Vitrine" /> }],
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
