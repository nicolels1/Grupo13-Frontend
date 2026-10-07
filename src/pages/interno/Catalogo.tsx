import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { Miniatura } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { coresDoProduto, faixaDePreco } from '@/lib/cores'
import { moeda, plural } from '@/lib/formato'
import { limparListas } from '@/lib/listas'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type ListaCategorias = Esquema<'Lista_CategoriaSaida_'>
// o que useCarregar devolve, para passar a lista de categorias ao painel
type Carga<T> = { dados: T | null; erro: string | null; carregando: boolean; recarregar: () => void }

const POR_PAGINA = 25

export function Catalogo() {
  const [busca, setBusca] = useState('')
  const [idCategoria, setIdCategoria] = useState('')
  const [situacao, setSituacao] = useState('')
  const [offset, setOffset] = useState(0)
  // o painel de categorias usa a lista completa (com as desativadas), sem o cache da vitrine
  const categorias = useCarregar(() => api<ListaCategorias>('/categorias'), [])
  const lista = useCarregar(
    () => api<Esquema<'Pagina_ProdutoSaida_'>>('/produtos', { params: { busca: busca.trim(), id_categoria: idCategoria, ativo: situacao, limit: POR_PAGINA, offset } }),
    [busca, idCategoria, situacao, offset],
  )
  const nomeCategoria = (id: number) => categorias.dados?.items.find((c) => c.id_categoria === id)?.nome ?? '—'
  const filtro = (setter: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value)
    setOffset(0)
  }

  return (
    <>
      <Cabecalho titulo="Produtos" subtitulo="O que a loja vende: dados, variações de cor e tamanho e preços.">
        <Link to="/interno/catalogo/novo" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-4')}>
          <Plus aria-hidden="true" /> Novo produto
        </Link>
      </Cabecalho>

      <div className="grid gap-10 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3 sm:max-w-80">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Buscar produto</span>
              <input value={busca} onChange={filtro(setBusca)} placeholder="Buscar pelo nome" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <Select aria-label="Categoria" value={idCategoria} onChange={filtro(setIdCategoria)} className="w-auto">
              <option value="">Todas as categorias</option>
              {categorias.dados?.items.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
            </Select>
            <Select aria-label="Situação" value={situacao} onChange={filtro(setSituacao)} className="w-auto">
              <option value="">À venda e fora</option>
              <option value="true">À venda</option>
              <option value="false">Fora de venda</option>
            </Select>
          </div>

          {lista.erro && <Aviso mensagem={lista.erro} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados?.items.length === 0 && <Vazio>Nenhum produto encontrado.</Vazio>}
          {lista.dados && lista.dados.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pl-2 font-medium">Produto</th>
                    <th className="font-medium">Categoria</th>
                    <th className="font-medium">Variações</th>
                    <th className="text-right font-medium">Preço</th>
                    <th className="pl-6 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.dados.items.map((p) => {
                    const preco = faixaDePreco(p)
                    const cores = coresDoProduto(p)
                    return (
                      <tr key={p.id_produto} className="border-b hover:bg-superficie">
                        <td className="py-3 pl-2">
                          <Link to={`/interno/catalogo/${p.id_produto}`} className="flex items-center gap-3 hover:underline">
                            <Miniatura cor={cores[0]} />
                            {p.nome}
                          </Link>
                        </td>
                        <td>{nomeCategoria(p.id_categoria)}</td>
                        <td className="text-muted-foreground">
                          {plural(p.variantes.length, 'variação', 'variações')}, {plural(cores.length, 'cor', 'cores')}
                        </td>
                        <td className="text-right">
                          {preco ? (preco.menor === preco.maior ? moeda(preco.menor) : `${moeda(preco.menor)} a ${moeda(preco.maior)}`) : '—'}
                        </td>
                        <td className={cn('pl-6', !p.ativo && 'text-muted-foreground')}>{p.ativo ? 'à venda' : 'fora de venda'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="produtos" />
        </div>

        <Categorias categorias={categorias} />
      </div>
    </>
  )
}

function Categorias({ categorias }: { categorias: Carga<ListaCategorias> }) {
  const [nova, setNova] = useState('')
  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function salvar(caminho: string, metodo: 'POST' | 'PATCH', corpo: { nome?: string; ativo?: boolean }) {
    const ok = await enviar(() => api<Esquema<'CategoriaSaida'>>(caminho, { metodo, corpo }))
    if (ok) {
      limparListas('categorias')
      categorias.recarregar()
    }
    return ok
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault()
    if (await salvar('/categorias', 'POST', { nome: nova })) setNova('')
  }

  async function renomear(evento: FormEvent) {
    evento.preventDefault()
    if (!editando) return
    if (await salvar(`/categorias/${editando.id}`, 'PATCH', { nome: editando.nome })) setEditando(null)
  }

  return (
    <aside className="h-fit space-y-4 bg-superficie p-5" aria-labelledby="titulo-categorias">
      <h2 id="titulo-categorias" className="text-lg font-medium">Categorias</h2>
      {categorias.erro && <Aviso mensagem={categorias.erro} />}
      <ul className="text-sm">
        {categorias.dados?.items.map((c) => (
          <li key={c.id_categoria} className="flex items-center justify-between gap-2 border-b py-2">
            {editando && editando.id === c.id_categoria ? (
              <form onSubmit={renomear} className="flex flex-1 gap-1">
                <Label htmlFor={`cat-${c.id_categoria}`} className="sr-only">Nome da categoria</Label>
                <Input id={`cat-${c.id_categoria}`} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} minLength={2} maxLength={100} className="h-8 bg-background" autoFocus />
                <Button type="submit" size="sm" disabled={enviando}>Salvar</Button>
              </form>
            ) : (
              <>
                <button type="button" onClick={() => setEditando({ id: c.id_categoria, nome: c.nome })} className={cn('text-left hover:underline', !c.ativo && 'text-muted-foreground line-through')}>
                  {c.nome}
                </button>
                <Button variant="ghost" size="xs" disabled={enviando} onClick={() => salvar(`/categorias/${c.id_categoria}`, 'PATCH', { ativo: !c.ativo })}>
                  {c.ativo ? 'Desativar' : 'Reativar'}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={criar} className="flex gap-1">
        <Label htmlFor="nova-categoria" className="sr-only">Nova categoria</Label>
        <Input id="nova-categoria" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" minLength={2} maxLength={100} className="bg-background" required />
        <Button type="submit" variant="outline" className="h-9" disabled={enviando}>Criar</Button>
      </form>
      <p className="text-xs text-muted-foreground">Clique no nome para renomear. Categoria desativada some da loja e não recebe produtos novos.</p>
      {erro && <Aviso mensagem={erro} />}
    </aside>
  )
}
