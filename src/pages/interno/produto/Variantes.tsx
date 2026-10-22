import { Fragment, useState, type ChangeEvent, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { OrigemMigracao } from '@/components/OrigemMigracao'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { corDaPeca, ordenarTamanhos } from '@/lib/cores'
import { CANAIS, dataLonga, moeda } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { VARIANTE_VAZIA, varianteParaApi } from './regrasVariante'

type Produto = Esquema<'ProdutoSaida'>
type Canal = Esquema<'EstoqueItem'>['canal']
// estoque inicial de uma variação nova: onde e quanto, como digitado
type EstoqueInicial = { id_unidade: string; canal: Canal; quantidade: string }
type VarianteNova = { cor: string; tamanho: string; sku: string; preco: string; estoque_inicial: EstoqueInicial[] }
type VarianteEditada = { id_variante: number; sku: string; preco: string; ativo: boolean }

// variações do produto: o editor de cada linha, a criação, a tabela e o histórico de preço

export function EditorVariante({ indice, valor, marca, aoMudar, aoTirar }: {
  indice: number | string
  valor: VarianteNova
  // marca do produto: o estoque inicial só entra numa unidade da mesma marca
  marca: string
  aoMudar: (valor: VarianteNova) => void
  aoTirar?: () => void
}) {
  const { unidades } = useUnidadeEscolhida()
  const campo = (nome: 'cor' | 'tamanho' | 'sku' | 'preco') => (e: ChangeEvent<HTMLInputElement>) => aoMudar({ ...valor, [nome]: e.target.value })
  const id = (nome: string) => `var-${indice}-${nome}`

  function mudarEstoque(j: number, nome: keyof EstoqueInicial, novo: string) {
    aoMudar({ ...valor, estoque_inicial: valor.estoque_inicial.map((e, k): EstoqueInicial => (k === j ? { ...e, [nome]: novo } : e)) })
  }

  return (
    <div className="space-y-4 bg-superficie p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_7rem_1fr_9rem_auto] md:items-end">
        <Campo id={id('cor')} rotulo="Cor">
          <Input id={id('cor')} value={valor.cor} onChange={campo('cor')} placeholder="Única" maxLength={50} className="bg-background" />
        </Campo>
        <Campo id={id('tamanho')} rotulo="Tamanho">
          <Input id={id('tamanho')} value={valor.tamanho} onChange={campo('tamanho')} placeholder="U" maxLength={20} className="bg-background" />
        </Campo>
        <Campo id={id('sku')} rotulo="Etiqueta (SKU)">
          <Input id={id('sku')} value={valor.sku} onChange={campo('sku')} maxLength={50} className="bg-background uppercase" required />
        </Campo>
        <Campo id={id('preco')} rotulo="Preço (R$)">
          <Input id={id('preco')} type="number" min={0} step="0.01" value={valor.preco} onChange={campo('preco')} className="bg-background" required />
        </Campo>
        {aoTirar && (
          <Button type="button" variant="ghost" size="icon" aria-label="Tirar variação" onClick={aoTirar} className="mb-0.5">
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Estoque inicial <span className="font-normal text-muted-foreground">opcional</span></p>
        {valor.estoque_inicial.map((e, j) => (
          <div key={j} className="flex flex-wrap items-center gap-2">
            <Select aria-label="Unidade" value={e.id_unidade} onChange={(ev) => mudarEstoque(j, 'id_unidade', ev.target.value)} className="w-48 bg-background" required>
              <option value="" disabled>Unidade</option>
              {unidades.filter((u) => u.ativo && u.marca === marca).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
            </Select>
            <Select aria-label="Canal" value={e.canal} onChange={(ev) => mudarEstoque(j, 'canal', ev.target.value)} className="w-36 bg-background">
              {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </Select>
            <Input aria-label="Quantidade" type="number" min={1} value={e.quantidade} onChange={(ev) => mudarEstoque(j, 'quantidade', ev.target.value)} className="w-24 bg-background" required />
            <Button type="button" variant="ghost" size="icon" aria-label="Tirar local" onClick={() => aoMudar({ ...valor, estoque_inicial: valor.estoque_inicial.filter((_, k) => k !== j) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="link"
          className="h-auto px-0"
          onClick={() => aoMudar({ ...valor, estoque_inicial: [...valor.estoque_inicial, { id_unidade: '', canal: 'loja_fisica', quantidade: '1' }] })}
        >
          + Adicionar local com peças
        </Button>
      </div>
    </div>
  )
}

export function NovaVariante({ idProduto, marca, aoCriar }: { idProduto: number; marca: string; aoCriar: () => void }) {
  const [valor, setValor] = useState<VarianteNova>({ ...VARIANTE_VAZIA })
  const [criada, setCriada] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function criar(evento: FormEvent) {
    evento.preventDefault()
    setCriada(null)
    const nova = await enviar(() => api<Esquema<'VarianteSaida'>>(`/produtos/${idProduto}/variantes`, { metodo: 'POST', corpo: varianteParaApi(valor) }))
    if (nova) {
      setCriada(`Variação ${nova.sku} criada.`)
      setValor({ ...VARIANTE_VAZIA })
      aoCriar()
    }
  }

  return (
    <form onSubmit={criar} className="space-y-3">
      <EditorVariante indice="nova" valor={valor} marca={marca} aoMudar={setValor} />
      {erro && <Aviso mensagem={erro} />}
      {criada && <Sucesso>{criada}</Sucesso>}
      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>
          <Plus aria-hidden="true" /> Criar variação
        </Button>
      </div>
    </form>
  )
}

export function TabelaVariantes({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const [editando, setEditando] = useState<VarianteEditada | null>(null)
  // o painel aberto embaixo de uma variação: o histórico de preço ou, na peça da Vulto, a origem
  const [painel, setPainel] = useState<{ id: number; tipo: 'historico' | 'origem' } | null>(null)
  const daVulto = produto.marca === 'vulto'
  const { enviar, enviando, erro } = useEnviar()
  const ordenadas = [...produto.variantes].sort((a, b) => {
    if (a.cor !== b.cor) return a.cor.localeCompare(b.cor, 'pt-BR')
    const ordem = ordenarTamanhos([a.tamanho, b.tamanho])
    return ordem[0] === a.tamanho ? -1 : 1
  })

  const aberto = (id: number, tipo: 'historico' | 'origem') => painel?.id === id && painel.tipo === tipo
  const alternar = (id: number, tipo: 'historico' | 'origem') => setPainel(aberto(id, tipo) ? null : { id, tipo })

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!editando) return
    const original = produto.variantes.find((v) => v.id_variante === editando.id_variante)
    if (!original) return
    const mudancas: { sku?: string; preco?: string; ativo?: boolean } = {}
    if (editando.sku !== original.sku) mudancas.sku = editando.sku
    if (Number(editando.preco) !== Number(original.preco)) mudancas.preco = editando.preco
    if (editando.ativo !== original.ativo) mudancas.ativo = editando.ativo
    if (Object.keys(mudancas).length > 0) {
      const ok = await enviar(() => api<Esquema<'VarianteSaida'>>(`/variantes/${editando.id_variante}`, { metodo: 'PATCH', corpo: mudancas }))
      if (!ok) return
      aoMudar()
    }
    setEditando(null)
  }

  return (
    <form onSubmit={salvar} className="overflow-x-auto">
      {erro && <div className="mb-3"><Aviso mensagem={erro} /></div>}
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Cor</th>
            <th className="font-medium">Tamanho</th>
            <th className="font-medium">Etiqueta</th>
            <th className="font-medium">Código de barras</th>
            <th className="text-right font-medium">Preço</th>
            <th className="pl-6 font-medium">Situação</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((v) => {
            const emEdicao = editando?.id_variante === v.id_variante
            return (
              <Fragment key={v.id_variante}>
                <tr className="border-b">
                  <td className="py-3 pl-2">
                    <span className="flex items-center gap-2">
                      <span className="size-3" style={{ backgroundColor: corDaPeca(v.cor) }} aria-hidden="true" />
                      {v.cor}
                    </span>
                  </td>
                  <td>{v.tamanho}</td>
                  <td>
                    {emEdicao ? (
                      <Input aria-label="Etiqueta" value={editando.sku} onChange={(e) => setEditando({ ...editando, sku: e.target.value })} className="h-8 w-40 uppercase" required />
                    ) : (
                      <Etiqueta>{v.sku}</Etiqueta>
                    )}
                  </td>
                  <td className="tabular-nums text-muted-foreground">{v.ean}</td>
                  <td className="text-right">
                    {emEdicao ? (
                      <Input aria-label="Preço" type="number" min={0} step="0.01" value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: e.target.value })} className="ml-auto h-8 w-28 text-right" required />
                    ) : (
                      moeda(v.preco)
                    )}
                  </td>
                  <td className="pl-6">
                    {emEdicao ? (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editando.ativo} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} /> ativa
                      </label>
                    ) : (
                      <span className={cn(!v.ativo && 'text-muted-foreground')}>{v.ativo ? 'ativa' : 'desativada'}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap pr-2 text-right">
                    {emEdicao ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(null)}>Cancelar</Button>
                        <Button type="submit" size="sm" disabled={enviando}>Salvar</Button>
                      </>
                    ) : (
                      <>
                        {daVulto && (
                          <Button type="button" variant="ghost" size="sm" aria-expanded={aberto(v.id_variante, 'origem')} onClick={() => alternar(v.id_variante, 'origem')}>
                            Origem
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="sm" aria-expanded={aberto(v.id_variante, 'historico')} onClick={() => alternar(v.id_variante, 'historico')}>
                          Histórico de preço
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando({ id_variante: v.id_variante, sku: v.sku, preco: v.preco, ativo: v.ativo })}>
                          Editar
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
                {painel?.id === v.id_variante && (
                  <tr className="border-b bg-superficie">
                    <td colSpan={7} className="px-4 py-3">
                      {painel.tipo === 'historico'
                        ? <HistoricoPreco idVariante={v.id_variante} />
                        : <OrigemMigracao tabela="variante" idRegistro={v.id_variante} />}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="pt-3 text-xs text-muted-foreground">
        Cor e tamanho não mudam depois de criados: o estoque e os pedidos ficam presos à variação. O código de barras que começa
        com 20 é o interno da loja, para a peça que veio sem o de fábrica.
      </p>
    </form>
  )
}

function HistoricoPreco({ idVariante }: { idVariante: number }) {
  const { dados, erro, carregando } = useCarregar(() => api<Esquema<'Lista_HistoricoPrecoSaida_'>>(`/variantes/${idVariante}/historico-preco`), [idVariante])
  if (carregando) return <Carregando />
  if (erro || !dados) return <Aviso mensagem={erro ?? 'Não foi possível carregar o histórico de preço.'} />
  if (dados.items.length === 0) return <p className="text-sm text-muted-foreground">Sem mudanças de preço.</p>
  return (
    <ul className="space-y-1 text-sm">
      {dados.items.map((h) => (
        <li key={h.id_historico_preco} className="flex gap-6">
          <span className="w-36 text-muted-foreground">{dataLonga(h.alterado_em)}</span>
          <span>{h.preco_anterior === null ? `criada com ${moeda(h.preco_novo)}` : `de ${moeda(h.preco_anterior)} para ${moeda(h.preco_novo)}`}</span>
        </li>
      ))}
    </ul>
  )
}
