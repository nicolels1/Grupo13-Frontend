import { useState } from 'react'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { NomePeca } from '@/components/Peca'
import { Campo, Input } from '@/components/ui/input'
import { api, todasAsPaginas, type Esquema } from '@/lib/api'
import { ordenarTamanhos } from '@/lib/cores'
import { CANAIS } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'

type Unidade = Esquema<'UnidadeSaida'>
type ItemEstoque = Esquema<'EstoqueItem'>

// aba Consultar peça do Caixa: saldo de um produto em cor e tamanho, nesta loja e nas outras

// todas as linhas de estoque do produto em todas as unidades; a busca é por parte do nome, então
// filtra o nome exato no fim
async function estoqueDoProduto(produto: string) {
  const linhas = await todasAsPaginas<ItemEstoque>('/balcao/estoque', { busca: produto })
  return linhas.filter((l) => l.produto === produto)
}

const somaDisponivel = (linhas: ItemEstoque[]) => linhas.reduce((t, l) => t + l.disponivel, 0)

export function ConsultarPeca({ loja }: { loja: Unidade }) {
  const [termo, setTermo] = useState('')
  const [produto, setProduto] = useState<string | null>(null)
  const [celula, setCelula] = useState<{ cor: string; tamanho: string } | null>(null)

  const achadas = useCarregar(
    () => (termo.trim().length >= 2 && !produto ? api<Esquema<'Pagina_EstoqueItem_'>>('/balcao/estoque', { params: { busca: termo.trim(), limit: 200 } }) : null),
    [termo, produto],
  )
  const produtos = [...new Set((achadas.dados?.items ?? []).map((l) => l.produto))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const estoque = useCarregar(() => (produto ? estoqueDoProduto(produto) : null), [produto])
  const linhas = estoque.dados ?? []
  const cores = [...new Set(linhas.map((l) => l.cor))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const tamanhos = ordenarTamanhos(new Set(linhas.map((l) => l.tamanho)))
  const doCruzamento = (cor: string, tamanho: string) => linhas.filter((l) => l.cor === cor && l.tamanho === tamanho)
  const nestaLoja = (doCruz: ItemEstoque[]) => somaDisponivel(doCruz.filter((l) => l.id_unidade === loja.id_unidade && l.canal === 'loja_fisica'))

  function escolher(nome: string) {
    setProduto(nome)
    setTermo(nome)
    setCelula(null)
  }

  const ondeTem = celula ? doCruzamento(celula.cor, celula.tamanho).filter((l) => l.disponivel > 0) : []

  return (
    <div className="space-y-8">
      <Campo id="consulta-busca" rotulo="Peça" dica="Mostra o disponível de cada cor e tamanho nesta loja e na rede toda.">
        <Input
          id="consulta-busca"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setProduto(null); setCelula(null) }}
          placeholder="Etiqueta ou nome da peça"
          autoComplete="off"
          className="max-w-md"
        />
        {!produto && produtos.length > 0 && (
          <ul className="max-h-72 max-w-md overflow-y-auto border">
            {produtos.map((nome) => (
              <li key={nome}>
                <button type="button" onClick={() => escolher(nome)} className="w-full px-3 py-2 text-left text-sm hover:bg-superficie">
                  {nome}
                </button>
              </li>
            ))}
          </ul>
        )}
        {achadas.erro && <Aviso mensagem={achadas.erro} />}
        {!produto && achadas.dados && produtos.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça com esse nome.</p>}
      </Campo>

      {estoque.erro && <Aviso mensagem={estoque.erro} />}
      {estoque.carregando && produto && <Carregando />}

      {produto && estoque.dados && (
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-3">
            <h2 className="text-2xl font-medium">{produto}</h2>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-6 text-left font-medium">Cor</th>
                    {tamanhos.map((t) => <th key={t} className="w-20 px-2 text-center font-medium">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cores.map((cor) => (
                    <tr key={cor} className="border-b">
                      <th scope="row" className="py-2 pr-6 text-left font-normal">
                        <NomePeca produto={cor} />
                      </th>
                      {tamanhos.map((tamanho) => {
                        const doCruz = doCruzamento(cor, tamanho)
                        if (doCruz.length === 0) return <td key={tamanho} className="px-2 text-center text-muted-foreground">—</td>
                        const ativa = celula?.cor === cor && celula?.tamanho === tamanho
                        const aqui = nestaLoja(doCruz)
                        const rede = somaDisponivel(doCruz)
                        return (
                          <td key={tamanho} className="p-1">
                            <button
                              type="button"
                              onClick={() => setCelula({ cor, tamanho })}
                              aria-pressed={ativa}
                              aria-label={`${cor}, ${tamanho}: ${aqui} aqui, ${rede} na rede`}
                              className={cn('w-full px-2 py-1.5 text-center hover:bg-superficie', ativa && 'bg-superficie ring-1 ring-foreground')}
                            >
                              <span className={cn('block text-base font-medium tabular-nums', aqui === 0 && 'text-muted-foreground')}>{aqui}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">rede {rede}</span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Em cima, o disponível na loja física da {loja.nome}; embaixo, a soma de todas as unidades e canais.
            </p>
          </div>

          <div className="lg:border-l lg:pl-8">
            {celula ? (
              <div className="space-y-3">
                <p className="font-medium">{celula.cor}, {celula.tamanho}</p>
                {ondeTem.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem peça disponível em nenhuma unidade.</p>
                ) : (
                  <ul className="text-sm">
                    {ondeTem.map((l) => (
                      <li key={`${l.id_unidade}-${l.canal}`} className={cn('flex justify-between gap-3 border-b py-2', l.id_unidade === loja.id_unidade && 'font-medium')}>
                        <span>{l.unidade}, {CANAIS[l.canal].toLowerCase()}</span>
                        <span className="tabular-nums">{l.disponivel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escolha uma cor e tamanho para ver onde tem.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
