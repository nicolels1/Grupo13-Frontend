import { useState, type FormEvent } from 'react'
import { Printer } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { dataCurta, dataHora, mascaraCpf, METODOS_PAGAMENTO, moeda, soDigitos } from '@/lib/formato'
import type { TrocaFeita } from '../troca/regrasTrocaDevolucao'
import { useCarregar } from '@/lib/useCarregar'
import { AtenderPedido } from '../troca/TrocaDevolucao'
import { useImprimirAoAbrir } from './useImprimirAoAbrir'

type Unidade = Esquema<'UnidadeSaida'>

// aba Troca ou devolução do Caixa: acha o pedido e registra no balcão, sem chamado

type TipoBusca = 'codigo_venda' | 'cpf' | 'id_pedido'

const BUSCAS: Record<TipoBusca, { rotulo: string; dica: string }> = {
  codigo_venda: { rotulo: 'Código da venda', dica: 'O código da notinha ou do pedido, como CL...' },
  cpf: { rotulo: 'CPF', dica: 'Mostra os pedidos entregues nos últimos 30 dias, pela conta ou pelo CPF na nota.' },
  id_pedido: { rotulo: 'Número do pedido', dica: 'O número que aparece no painel de pedidos.' },
}

export function TrocaOuDevolucao({ loja }: { loja: Unidade }) {
  const [tipoBusca, setTipoBusca] = useState<TipoBusca>('codigo_venda')
  const [termo, setTermo] = useState('')
  const [filtro, setFiltro] = useState<Record<string, string> | null>(null)
  const [idEscolhido, setIdEscolhido] = useState<number | null>(null)
  const [feito, setFeito] = useState<TrocaFeita | null>(null)

  const busca = useCarregar(() => (filtro ? api<Esquema<'Lista_PedidoSaida_'>>('/balcao/pedidos', { params: filtro }) : null), [filtro])
  const achados = busca.dados?.items ?? []
  const escolhido = achados.length === 1 ? achados[0] : achados.find((p) => p.id_pedido === idEscolhido)

  function buscar(evento: FormEvent) {
    evento.preventDefault()
    const valor = tipoBusca === 'codigo_venda' ? termo.trim().toUpperCase() : soDigitos(termo)
    setIdEscolhido(null)
    setFiltro({ [tipoBusca]: valor })
  }

  function recomecar() {
    setFeito(null)
    setFiltro(null)
    setTermo('')
    setIdEscolhido(null)
  }

  if (feito) return <ComprovanteFeito feito={feito} loja={loja} aoRecomecar={recomecar} />

  const termoOk = tipoBusca === 'cpf' ? soDigitos(termo).length === 11 : tipoBusca === 'id_pedido' ? soDigitos(termo).length > 0 : termo.trim().length > 0

  return (
    <div className="space-y-8">
      {/* a dica fica embaixo da linha toda: dentro do campo ela o empurrava e desalinhava os dois */}
      <form onSubmit={buscar} className="space-y-1.5">
        <div className="flex flex-wrap items-end gap-3">
          <Campo id="troca-tipo" rotulo="Buscar por" className="w-48">
            <Select id="troca-tipo" value={tipoBusca} onChange={(e) => { setTipoBusca(e.target.value as TipoBusca); setTermo('') }}>
              {Object.entries(BUSCAS).map(([valor, { rotulo }]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </Select>
          </Campo>
          <Campo id="troca-termo" rotulo={BUSCAS[tipoBusca].rotulo} className="w-full max-w-sm">
            <Input
              id="troca-termo"
              aria-describedby="troca-dica"
              value={termo}
              onChange={(e) => setTermo(tipoBusca === 'cpf' ? mascaraCpf(e.target.value) : e.target.value)}
              inputMode={tipoBusca === 'codigo_venda' ? 'text' : 'numeric'}
              placeholder={tipoBusca === 'cpf' ? '000.000.000-00' : undefined}
              autoComplete="off"
            />
          </Campo>
          <Button type="submit" variant="outline" size="lg" className="h-9 px-4" disabled={!termoOk || busca.carregando}>Buscar</Button>
        </div>
        <p id="troca-dica" className="text-xs text-muted-foreground">{BUSCAS[tipoBusca].dica}</p>
      </form>

      {busca.erro && <Aviso mensagem={busca.erro} />}
      {busca.carregando && filtro && <Carregando />}
      {busca.dados && achados.length === 0 && <Vazio>Nenhum pedido entregue nos últimos 30 dias com esse CPF. Tente pelo código da notinha.</Vazio>}

      {achados.length > 1 && (
        <ul className="max-w-2xl border-t">
          {achados.map((p) => (
            <li key={p.id_pedido}>
              <button
                type="button"
                onClick={() => setIdEscolhido(p.id_pedido)}
                aria-current={escolhido?.id_pedido === p.id_pedido ? 'true' : undefined}
                className={cn('flex w-full items-center justify-between gap-3 border-b px-3 py-3 text-left text-sm hover:bg-superficie', escolhido?.id_pedido === p.id_pedido && 'bg-superficie')}
              >
                <span className="flex items-center gap-2">
                  <Etiqueta>{p.codigo_venda}</Etiqueta>
                  <span>{p.unidade}, entregue em {dataCurta(p.entregue_em)}</span>
                </span>
                <span className="tabular-nums">{moeda(p.valor_total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {escolhido && (
        <AtenderPedido
          key={`${escolhido.id_pedido}-${escolhido.devolucao}`}
          pedido={escolhido}
          loja={loja}
          rota={`/balcao/pedidos/${escolhido.id_pedido}`}
          dicaSemEstorno="Diminua as peças ou faça a devolução pelo Atendimento."
          aoConcluir={setFeito}
        />
      )}
    </div>
  )
}

// comprovante da troca ou devolução: abre para imprimir na hora, como a notinha da venda
function ComprovanteFeito({ feito, loja, aoRecomecar }: { feito: TrocaFeita; loja: Unidade; aoRecomecar: () => void }) {
  const { imprimiu, imprimir } = useImprimirAoAbrir()
  const troca = feito.modo === 'troca'
  const [momento] = useState(() => new Date().toISOString())

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-lg font-medium">{troca ? 'Troca registrada' : 'Devolução registrada'}</p>
        <p className="text-sm text-muted-foreground">
          {imprimiu ? 'Se o comprovante não saiu, imprima de novo antes do próximo atendimento.' : 'Abrindo a impressão do comprovante...'}
        </p>
      </div>

      <section aria-label="Comprovante" className="notinha space-y-4 border bg-white p-5 text-sm text-foreground">
        <div className="space-y-0.5 text-center">
          <p className="font-logo uppercase tracking-[0.3em]">Casa Lorenzi</p>
          <p>{loja.nome}</p>
          <p>{dataHora(momento)}</p>
        </div>
        <p className="text-center font-medium">
          {troca ? 'Comprovante de troca' : 'Comprovante de devolução'}
          <span className="block font-normal">Venda <span className="tabular-nums">{feito.pedido.codigo_venda}</span></span>
        </p>
        <ul className="space-y-2">
          {feito.linhas.map(({ item, quantidade, nova }) => (
            <li key={item.id_item}>
              {quantidade} × {item.produto}
              <span className="block text-xs">Devolveu: {item.cor}, {item.tamanho}</span>
              {nova && <span className="block text-xs">Levou: {nova.cor}, {nova.tamanho}</span>}
            </li>
          ))}
        </ul>
        {feito.estornos.length > 0 && (
          <div className="space-y-1 border-t border-dashed border-foreground pt-3">
            {feito.estornos.map((e) => (
              <p key={e.id_pagamento} className="flex justify-between">
                <span>Estorno em {(METODOS_PAGAMENTO[e.metodo] ?? e.metodo).toLowerCase()}</span>
                <span className="tabular-nums">{moeda(e.valor)}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="lg" className="h-11 px-4" onClick={imprimir}>
          <Printer aria-hidden="true" /> Imprimir de novo
        </Button>
        <Button type="button" size="lg" className="h-11 px-5" disabled={!imprimiu} onClick={aoRecomecar}>
          Novo atendimento
        </Button>
      </div>
    </div>
  )
}
