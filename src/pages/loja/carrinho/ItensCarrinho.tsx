import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { corDaPeca } from '@/lib/cores'
import { moeda } from '@/lib/formato'
import { rotuloTamanho } from '../componentes/tamanhos'
import { MAXIMO_POR_PECA, useCarrinho, type ItemDoCarrinho } from './contexto'
import type { ResumoCarrinho } from './useResumo'

type Removida = { item: ItemDoCarrinho; posicao: number; nome: string }

// peças do carrinho com quantidade e remover; remover mostra "Desfazer" no lugar, sem janela de confirmação
export function ItensCarrinho({ resumo, aoNavegar }: { resumo: ResumoCarrinho | null; aoNavegar?: () => void }) {
  const { itens, mudarQuantidade, remover, devolver } = useCarrinho()
  const [removida, setRemovida] = useState<Removida | null>(null)

  function tirar(item: ItemDoCarrinho, posicao: number, nome: string) {
    remover(item.id_variante)
    setRemovida({ item, posicao, nome })
  }

  return (
    <div>
      {removida && (
        <p role="status" className="flex items-center justify-between gap-3 bg-superficie px-3 py-2 text-sm">
          <span>{removida.nome} saiu do carrinho.</span>
          <button
            type="button"
            onClick={() => {
              devolver(removida.item, removida.posicao)
              setRemovida(null)
            }}
            className="font-medium underline underline-offset-4"
          >
            Desfazer
          </button>
        </p>
      )}

      <ul>
        {itens.map((item, posicao) => {
          const dados = resumo?.itens.find((i) => i.id_variante === item.id_variante)
          const nome = dados?.produto ?? 'Peça'
          return (
            <li key={item.id_variante} className="flex gap-4 border-b py-4">
              <Link
                to={`/loja/produtos/${item.id_produto}`}
                onClick={aoNavegar}
                className="block aspect-[3/4] w-20 shrink-0"
                style={{ backgroundColor: corDaPeca(dados?.cor, item.id_produto) }}
                aria-label={`Ver ${nome}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link to={`/loja/produtos/${item.id_produto}`} onClick={aoNavegar} className="font-medium hover:underline">
                  {nome}
                </Link>
                {dados && (
                  <p className="text-sm text-muted-foreground">
                    {dados.cor}, tamanho {rotuloTamanho(dados.tamanho)}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center border" role="group" aria-label={`Quantidade de ${nome}`}>
                    <button
                      type="button"
                      onClick={() => mudarQuantidade(item.id_variante, item.quantidade - 1)}
                      disabled={item.quantidade <= 1}
                      aria-label="Diminuir"
                      className="flex size-9 items-center justify-center hover:bg-superficie disabled:opacity-40"
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => mudarQuantidade(item.id_variante, item.quantidade + 1)}
                      disabled={item.quantidade >= MAXIMO_POR_PECA}
                      aria-label="Aumentar"
                      className="flex size-9 items-center justify-center hover:bg-superficie disabled:opacity-40"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="font-medium tabular-nums">{dados ? moeda(dados.subtotal) : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => tirar(item, posicao, nome)}
                  className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// "Faltam R$ 40 para o frete grátis" com barra; o valor mínimo vem da API
export function BarraFreteGratis({ resumo }: { resumo: ResumoCarrinho }) {
  const minimo = Number(resumo.frete_gratis_a_partir_de)
  const itens = Number(resumo.valor_itens)
  const falta = Math.max(0, minimo - itens)
  return (
    <div className="space-y-2">
      <p className="text-sm">
        {falta > 0 ? (
          <>Faltam <span className="font-medium tabular-nums">{moeda(falta)}</span> para o frete grátis na entrega.</>
        ) : (
          <span className="font-medium text-terracota">Frete grátis na entrega garantido.</span>
        )}
      </p>
      <div className="h-1.5 bg-superficie" aria-hidden="true">
        <div className="h-full bg-terracota" style={{ width: `${Math.min(100, (itens / minimo) * 100)}%` }} />
      </div>
    </div>
  )
}
