import { useState } from 'react'

import { Abas, Cabecalho } from '@/components/Navegacao'
import { Modelos } from './gestao/Modelos'
import { Pessoas } from './gestao/Pessoas'
import { Unidades } from './gestao/Unidades'

export function Gestao() {
  const [aba, setAba] = useState('pessoas')
  return (
    <>
      <Cabecalho
        titulo="Gestão"
        subtitulo="Quem usa a plataforma, o que cada modelo de acesso permite e as unidades da rede."
        abas={
          <Abas
            semLinha
            rotulo="Gestão"
            valor={aba}
            aoMudar={setAba}
            abas={[
              { valor: 'pessoas', rotulo: 'Pessoas' },
              { valor: 'modelos', rotulo: 'Modelos de acesso' },
              { valor: 'unidades', rotulo: 'Unidades' },
            ]}
          />
        }
      />
      {aba === 'pessoas' && <Pessoas />}
      {aba === 'modelos' && <Modelos />}
      {aba === 'unidades' && <Unidades />}
    </>
  )
}
