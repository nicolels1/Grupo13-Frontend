import { Suspense, type ReactElement } from 'react'

import { Carregando } from '@/components/Estados'

// tela que só baixa quando é aberta (React.lazy): enquanto o código dela chega, o topo e o rodapé
// do layout continuam e o miolo mostra "Carregando"
export const tela = (elemento: ReactElement) => <Suspense fallback={<Carregando />}>{elemento}</Suspense>
