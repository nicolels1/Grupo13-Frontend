import { useSearchParams } from 'react-router'

import { Abas, Cabecalho } from '@/components/Navegacao'
import { TresNumeros } from './numeros/TresNumeros'
import { Modelos } from './gestao/Modelos'
import { Pessoas } from './gestao/Pessoas'
import { Unidades } from './gestao/Unidades'

type Aba = 'pessoas' | 'modelos' | 'unidades' | 'migracao'
const ABAS: Aba[] = ['pessoas', 'modelos', 'unidades', 'migracao']

// a Gestão é do Admin: as contas, os modelos de acesso, as unidades e o relatório da migração da Vulto (os
// 3 números da Entrega 3, Etapa 9). A aba fica no endereço (?aba=migracao), para dar para mandar o link
export function Gestao() {
  const [params, setParams] = useSearchParams()
  const pedida = params.get('aba') as Aba | null
  const aba: Aba = pedida && ABAS.includes(pedida) ? pedida : 'pessoas'
  return (
    <>
      <Cabecalho
        titulo="Gestão"
        subtitulo={aba === 'migracao'
          ? 'Relatório da migração da Vulto: o número calculado na migração, o que a plataforma soma depois da carga e a diferença para o sistema da Vulto.'
          : 'Quem usa a plataforma, o que cada modelo de acesso permite e as unidades da rede.'}
        abas={
          <Abas
            semLinha
            rotulo="Gestão"
            valor={aba}
            aoMudar={(v) => setParams(v === 'pessoas' ? {} : { aba: v }, { replace: true })}
            abas={[
              { valor: 'pessoas', rotulo: 'Pessoas' },
              { valor: 'modelos', rotulo: 'Modelos de acesso' },
              { valor: 'unidades', rotulo: 'Unidades' },
              { valor: 'migracao', rotulo: 'Migração da Vulto' },
            ]}
          />
        }
      />
      {aba === 'pessoas' && <Pessoas />}
      {aba === 'modelos' && <Modelos />}
      {aba === 'unidades' && <Unidades />}
      {aba === 'migracao' && <TresNumeros />}
    </>
  )
}
