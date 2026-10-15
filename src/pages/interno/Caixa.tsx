import { useEffect, useState } from 'react'

import { useAuth } from '@/auth/contexto'
import { temPermissao, type CodigoPermissao } from '@/auth/areas'
import { Aviso } from '@/components/Estados'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { Campo, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { ConsultarPeca } from './caixa/ConsultarPeca'
import { NovaVenda } from './caixa/NovaVenda'
import { Retiradas } from './caixa/Retiradas'
import { TrocaOuDevolucao } from './caixa/TrocaOuDevolucao'
import { VendasDeHoje } from './caixa/VendasDeHoje'

type Aba = 'nova' | 'retiradas' | 'hoje' | 'consultar' | 'troca'

// abas do Caixa e a permissão que cada uma pede (as mesmas das rotas do backend)
const ABAS: { valor: Aba; rotulo: string; permissoes: CodigoPermissao[] }[] = [
  { valor: 'nova', rotulo: 'Nova venda', permissoes: ['registrar_venda_fisica'] },
  { valor: 'retiradas', rotulo: 'Retiradas', permissoes: ['preparar_entregar_pedido'] },
  { valor: 'hoje', rotulo: 'Vendas de hoje', permissoes: ['registrar_venda_fisica', 'preparar_entregar_pedido', 'registrar_troca_devolucao'] },
  { valor: 'consultar', rotulo: 'Consultar peça', permissoes: ['registrar_venda_fisica', 'registrar_troca_devolucao'] },
  { valor: 'troca', rotulo: 'Troca ou devolução', permissoes: ['registrar_troca_devolucao'] },
]

export function Caixa() {
  const { perfil } = useAuth()
  const { unidade, setUnidade, unidades } = useUnidadeEscolhida()
  const lojas = unidades.filter((u) => u.ativo && u.tipo === 'loja')
  // a loja do caixa é a unidade do seletor do topo (design: "visível no topo"). Quem tem unidade
  // abre travado nela; quem não tem (Admin) escolhe a loja antes da primeira venda
  const travada = perfil?.id_unidade ? String(perfil.id_unidade) : null
  const idLoja = travada ?? unidade
  const loja = unidades.find((u) => String(u.id_unidade) === idLoja)

  // o topo mostra a loja travada mesmo que a pessoa tenha olhado outra unidade em outra área
  useEffect(() => {
    if (travada && unidade !== travada) setUnidade(travada)
  }, [travada, unidade, setUnidade])

  const abas = ABAS.filter((a) => a.permissoes.some((codigo) => temPermissao(perfil, codigo)))
  const [aba, setAba] = useState<Aba>(abas[0]?.valor ?? 'nova')
  const vendendo = loja?.tipo === 'loja' && loja.ativo

  return (
    <>
      <Cabecalho
        titulo="Caixa"
        subtitulo={vendendo ? `Vendendo na ${loja.nome}` : undefined}
        abas={vendendo ? <Abas semLinha rotulo="Caixa" valor={aba} aoMudar={setAba} abas={abas} /> : undefined}
      />

      {travada && loja && !vendendo ? (
        <Aviso titulo="Sua unidade não tem caixa" mensagem="Venda, retirada e troca no balcão acontecem nas lojas ativas. Peça ao Admin para revisar a unidade da sua conta." />
      ) : !vendendo ? (
        unidades.length > 0 && (
          <div className="max-w-sm space-y-4">
            <p className="text-sm text-muted-foreground">
              {loja ? 'O CD não tem caixa.' : 'O caixa abre numa loja.'} Escolha a loja onde você vai vender; ela fica no seletor do topo.
            </p>
            <Campo id="caixa-loja" rotulo="Loja">
              <Select id="caixa-loja" value="" onChange={(e) => setUnidade(e.target.value)}>
                <option value="" disabled>Escolha a loja</option>
                {lojas.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
              </Select>
            </Campo>
          </div>
        )
      ) : (
        <>
          {aba === 'nova' && <NovaVenda key={idLoja} loja={loja} />}
          {aba === 'retiradas' && <Retiradas key={idLoja} loja={loja} />}
          {aba === 'hoje' && <VendasDeHoje key={idLoja} loja={loja} />}
          {aba === 'consultar' && <ConsultarPeca key={idLoja} loja={loja} />}
          {aba === 'troca' && <TrocaOuDevolucao key={idLoja} loja={loja} />}
        </>
      )}
    </>
  )
}
