import { Fragment, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { Link, NavLink, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, Miniatura, NomePeca } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, todasAsPaginas, type Esquema } from '@/lib/api'
import { ordenarTamanhos } from '@/lib/cores'
import { CANAIS, dataCurta, hora, plural, TIPOS_MOVIMENTACAO } from '@/lib/formato'
import { useAdiado, useCarregar, useEnviar } from '@/lib/useCarregar'

type ItemEstoque = Esquema<'EstoqueItem'>
type Canal = ItemEstoque['canal']
type Produto = { produto: string; linhas: ItemEstoque[]; cores: string[]; tamanhos: string[]; abaixo: number }
// as linhas de uma variante numa unidade, com os dois canais lado a lado
type Grupo = ItemEstoque & { chave: string; canais: Partial<Record<Canal, ItemEstoque>> }

const PRODUTOS_POR_PAGINA = 30

// subabas da área Estoque: Saldo, Movimentações e Histórico do estoque (vão no bloco do Cabecalho)
export function AbasEstoque() {
  const aba = ({ isActive }: { isActive: boolean }) =>
    cn('border-b-2 pb-2 text-sm', isActive ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')
  return (
    <nav aria-label="Estoque" className="flex gap-6">
      <NavLink to="/interno/estoque" end className={aba}>Saldo</NavLink>
      <NavLink to="/interno/estoque/movimentacoes" className={aba}>Movimentações</NavLink>
      <NavLink to="/interno/estoque/historico" className={aba}>Histórico do estoque</NavLink>
    </nav>
  )
}

export function AcoesEstoque() {
  const { perfil } = useAuth()
  return (
    <>
      {temPermissao(perfil, 'solicitar_transferencia') && (
        <Link to="/interno/transferencias?nova=1" className={cn(buttonVariants({ variant: 'aco', size: 'lg' }), 'h-11 px-4')}>
          <ArrowLeftRight aria-hidden="true" /> Pedir transferência
        </Link>
      )}
      {temPermissao(perfil, 'movimentar_estoque') && (
        <Link to="/interno/estoque/movimentacoes?registrar=1" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-4')}>
          <Plus aria-hidden="true" /> Registrar movimentação
        </Link>
      )}
    </>
  )
}

const somar = (linhas: ItemEstoque[], campo: 'quantidade' | 'disponivel' = 'quantidade') => linhas.reduce((t, l) => t + l[campo], 0)

// junta as linhas da API (uma por variante, unidade e canal) em uma por produto.
// A API não manda o id do produto: o nome agrupa (é único no catálogo)
function porProduto(linhas: ItemEstoque[]): Produto[] {
  const grupos = new Map<string, ItemEstoque[]>()
  for (const l of linhas) {
    const doProduto = grupos.get(l.produto) ?? []
    doProduto.push(l)
    grupos.set(l.produto, doProduto)
  }
  return [...grupos.entries()]
    .map(([produto, doProduto]) => ({
      produto,
      linhas: doProduto,
      cores: [...new Set(doProduto.map((l) => l.cor))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      tamanhos: ordenarTamanhos(new Set(doProduto.map((l) => l.tamanho))),
      abaixo: doProduto.filter((l) => l.abaixo_minimo).length,
    }))
    .sort((a, b) => a.produto.localeCompare(b.produto, 'pt-BR'))
}

// Saldo: uma linha por produto que abre a matriz cor × tamanho (design, seção Estoque)
export function Estoque() {
  const { unidade, unidades } = useUnidadeEscolhida()
  const [params] = useSearchParams()
  const [busca, setBusca] = useState('')
  const [canal, setCanal] = useState('')
  const [soAbaixo, setSoAbaixo] = useState(params.get('abaixo') === '1')
  const [offset, setOffset] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const buscaAplicada = useAdiado(busca.trim())

  const lista = useCarregar(
    () => todasAsPaginas<ItemEstoque>('/estoque', { id_unidade: unidade, canal, busca: buscaAplicada }),
    [unidade, canal, buscaAplicada],
  )
  const todos = porProduto(lista.dados ?? [])
  const produtos = soAbaixo ? todos.filter((p) => p.abaixo > 0) : todos
  const pagina = produtos.slice(offset, offset + PRODUTOS_POR_PAGINA)
  const filtro = <T,>(setter: (valor: T) => void) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const alvo = e.target
    setter((alvo instanceof HTMLInputElement && alvo.type === 'checkbox' ? alvo.checked : alvo.value) as T)
    setOffset(0)
  }
  const ondeTexto = unidade ? `na ${unidades.find((u) => String(u.id_unidade) === unidade)?.nome ?? 'unidade'}` : 'na rede, somando as unidades'

  return (
    <>
      <Cabecalho titulo="Estoque" subtitulo={`Saldo de cada peça ${ondeTexto}. Troque a unidade no topo.`} abas={<AbasEstoque />}>
        <AcoesEstoque />
      </Cabecalho>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3 sm:max-w-80">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar peça ou etiqueta</span>
          <input value={busca} onChange={filtro(setBusca)} placeholder="Buscar peça ou etiqueta" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <Select aria-label="Canal" value={canal} onChange={filtro(setCanal)} className="w-auto">
          <option value="">Loja física e online</option>
          {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>Só {r.toLowerCase()}</option>)}
        </Select>
        <label className="flex h-9 items-center gap-2 border border-input px-3 text-sm">
          <input type="checkbox" checked={soAbaixo} onChange={filtro(setSoAbaixo)} className="size-4 accent-marinho" />
          Só produtos com peça abaixo do mínimo
        </label>
      </div>

      {lista.erro && <Aviso mensagem={lista.erro}>Recarregue a página para tentar de novo.</Aviso>}
      {lista.carregando && <Carregando texto="Somando o estoque..." />}
      {lista.dados && !lista.carregando && produtos.length === 0 && (
        <Vazio>{soAbaixo ? 'Nenhum produto com peça abaixo do mínimo com esses filtros.' : 'Nenhuma peça com esses filtros. Confira a busca ou troque a unidade no topo.'}</Vazio>
      )}
      {!lista.carregando && pagina.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" />
                <th className="py-2 font-medium">Produto</th>
                <th className="text-right font-medium">Loja física</th>
                <th className="text-right font-medium">Online</th>
                <th className="text-right font-medium">Total</th>
                <th className="pr-2 text-right font-medium">Abaixo do mínimo</th>
              </tr>
            </thead>
            <tbody>
              {pagina.map((p) => {
                const aberta = aberto === p.produto
                const fisica = somar(p.linhas.filter((l) => l.canal === 'loja_fisica'))
                const online = somar(p.linhas.filter((l) => l.canal === 'online'))
                return (
                  <Fragment key={p.produto}>
                    {/* produto com peça abaixo do mínimo: a linha inteira em terracota-claro, como as pendências */}
                    <tr
                      className={cn(
                        'cursor-pointer border-b',
                        p.abaixo > 0 ? 'bg-terracota-fundo hover:bg-terracota-fundo/70' : cn('hover:bg-superficie', aberta && 'bg-superficie'),
                      )}
                      onClick={() => setAberto(aberta ? null : p.produto)}
                    >
                      <td className="pl-2">
                        <button type="button" aria-expanded={aberta} aria-label={`Matriz de ${p.produto}`} className="flex">
                          {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      </td>
                      <td className="py-3">
                        <span className="block">{p.produto}</span>
                        <span className="text-xs text-muted-foreground">{plural(p.cores.length, 'cor', 'cores')}, {plural(p.tamanhos.length, 'tamanho')}</span>
                      </td>
                      <td className="text-right tabular-nums">{canal === 'online' ? '—' : fisica}</td>
                      <td className="text-right tabular-nums">{canal === 'loja_fisica' ? '—' : online}</td>
                      <td className="text-right font-medium tabular-nums">{fisica + online}</td>
                      <td className="pr-2 text-right">
                        {p.abaixo > 0 ? <Etiqueta alerta>{p.abaixo}</Etiqueta> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                    {aberta && (
                      <tr className="border-b bg-superficie">
                        <td colSpan={6} className="px-4 pb-6 pt-2">
                          <MatrizProduto produto={p} aoMudar={lista.recarregar} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!lista.carregando && (
        <Paginacao pagina={{ total: produtos.length, limit: PRODUTOS_POR_PAGINA, offset }} aoMudar={setOffset} rotulo="produtos" />
      )}
    </>
  )
}

// matriz cor × tamanho do produto: a célula soma o saldo dos canais (e das unidades, sem unidade no topo);
// terracota quando alguma linha da célula está abaixo do mínimo. Clicar abre a peça.
function MatrizProduto({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const [celula, setCelula] = useState<{ cor: string; tamanho: string } | null>(null)
  const daCelula = (cor: string, tamanho: string) => produto.linhas.filter((l) => l.cor === cor && l.tamanho === tamanho)
  const escolhidas = celula ? daCelula(celula.cor, celula.tamanho) : []

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <div className="overflow-x-auto">
        <table className="text-sm">
          <caption className="sr-only">Saldo de {produto.produto} por cor e tamanho</caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-6 text-left font-medium">Cor</th>
              {produto.tamanhos.map((t) => <th key={t} className="w-16 px-1 text-center font-medium">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {produto.cores.map((cor) => (
              <tr key={cor}>
                <th scope="row" className="py-1 pr-6 text-left font-normal">
                  <span className="flex items-center gap-2"><Miniatura cor={cor} className="size-4" />{cor}</span>
                </th>
                {produto.tamanhos.map((tamanho) => {
                  const linhas = daCelula(cor, tamanho)
                  if (linhas.length === 0) return <td key={tamanho} className="px-1 text-center text-muted-foreground">—</td>
                  const abaixo = linhas.some((l) => l.abaixo_minimo)
                  const ativa = celula?.cor === cor && celula?.tamanho === tamanho
                  const total = somar(linhas)
                  return (
                    <td key={tamanho} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => setCelula(ativa ? null : { cor, tamanho })}
                        aria-pressed={ativa}
                        aria-label={`${cor}, ${tamanho}: ${total}${abaixo ? ', abaixo do mínimo' : ''}`}
                        className={cn(
                          'h-9 w-full border px-2 text-center tabular-nums',
                          abaixo ? 'border-terracota bg-terracota-fundo font-medium' : 'border-border bg-background hover:border-foreground',
                          ativa && 'ring-2 ring-foreground',
                        )}
                      >
                        {total}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pt-2 text-xs text-muted-foreground">Em terracota, abaixo do mínimo. Clique numa célula para ver a peça.</p>
      </div>

      <div className="min-w-0">
        {celula ? (
          <DetalheCelula key={`${celula.cor}-${celula.tamanho}`} linhas={escolhidas} aoMudar={aoMudar} />
        ) : (
          <p className="text-sm text-muted-foreground">Escolha uma cor e um tamanho para ver o saldo por canal e as últimas movimentações.</p>
        )}
      </div>
    </div>
  )
}

// junta as linhas de uma variante por unidade: { id_unidade, unidade, canais: { loja_fisica, online } }
function porUnidade(linhas: ItemEstoque[]): Grupo[] {
  const grupos = new Map<number, Grupo>()
  for (const l of linhas) {
    const grupo = grupos.get(l.id_unidade) ?? { chave: `${l.id_variante}-${l.id_unidade}`, ...l, canais: {} }
    grupo.canais[l.canal] = l
    grupos.set(l.id_unidade, grupo)
  }
  return [...grupos.values()]
}

function DetalheCelula({ linhas, aoMudar }: { linhas: ItemEstoque[]; aoMudar: () => void }) {
  const { perfil } = useAuth()
  const { unidade } = useUnidadeEscolhida()
  // a célula só abre quando tem pelo menos uma linha
  const peca = linhas[0]!
  const grupos = porUnidade(linhas)
  const movimentacoes = useCarregar(
    () => api<Esquema<'Pagina_MovimentacaoItem_'>>('/movimentacoes-estoque', { params: { id_variante: peca.id_variante, id_unidade: unidade, limit: 6 } }),
    [peca.id_variante, unidade],
  )
  // mínimo e realocação valem para uma unidade: só aparecem com a unidade escolhida no topo
  const grupo = unidade ? grupos.find((g) => String(g.id_unidade) === unidade) : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <NomePeca produto={peca.produto} cor={peca.cor} tamanho={`${peca.tamanho}, ${peca.sku}`} />
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            {!unidade && <th className="py-2 font-medium">Unidade</th>}
            <th className="py-2 font-medium">Canal</th>
            <th className="text-right font-medium">Saldo</th>
            <th className="text-right font-medium">Reservadas</th>
            <th className="text-right font-medium">Disponível</th>
            <th className="text-right font-medium">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={`${l.id_unidade}-${l.canal}`} className="border-b">
              {!unidade && <td className="py-2">{l.unidade}</td>}
              <td className="py-2">{CANAIS[l.canal]}</td>
              <td className="text-right tabular-nums">
                {/* o destaque fica em volta do número, não na célula inteira */}
                <span className={cn('inline-block min-w-8 px-1.5 py-0.5 text-center', l.abaixo_minimo && 'bg-terracota-fundo font-medium')}>
                  {l.quantidade}
                </span>
              </td>
              <td className="text-right tabular-nums">{l.quantidade_reservada}</td>
              <td className="text-right tabular-nums">{l.disponivel}</td>
              <td className="text-right tabular-nums">{l.estoque_minimo ?? <span className="text-muted-foreground">sem</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="space-y-2">
        <h3 className="font-medium">Últimas movimentações</h3>
        {movimentacoes.erro && <Aviso mensagem={movimentacoes.erro} />}
        {movimentacoes.carregando && !movimentacoes.dados && <Carregando />}
        <ul className="text-sm">
          {movimentacoes.dados?.items.map((m) => (
            <li key={m.id_movimentacao} className="grid grid-cols-[6.5rem_1fr_auto] gap-3 border-b py-2">
              <span className="text-muted-foreground">{dataCurta(m.criado_em)}, {hora(m.criado_em)}</span>
              <span className="truncate">
                {TIPOS_MOVIMENTACAO[m.tipo] ?? m.tipo}
                {!unidade && `, ${m.unidade}`}
                {m.motivo && <span className="text-muted-foreground">, {m.motivo}</span>}
              </span>
              <span className="font-medium tabular-nums">{m.quantidade > 0 ? `+${m.quantidade}` : `−${Math.abs(m.quantidade)}`}</span>
            </li>
          ))}
        </ul>
        {movimentacoes.dados?.items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação desta peça.</p>}
        <Link to={`/interno/estoque/movimentacoes?busca=${encodeURIComponent(peca.sku)}`} className="inline-block text-sm text-aco underline underline-offset-2">
          Ver todas as movimentações
        </Link>
      </section>

      {grupo ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {temPermissao(perfil, 'definir_estoque_minimo') && <DefinirMinimo grupo={grupo} aoMudar={aoMudar} />}
          {temPermissao(perfil, 'movimentar_estoque') && <Realocar grupo={grupo} aoMudar={aoMudar} />}
        </div>
      ) : (
        (temPermissao(perfil, 'definir_estoque_minimo') || temPermissao(perfil, 'movimentar_estoque')) && (
          <p className="text-xs text-muted-foreground">Para definir o mínimo ou passar peças entre canais, escolha a unidade no topo.</p>
        )
      )}
    </div>
  )
}

function DefinirMinimo({ grupo, aoMudar }: { grupo: Grupo; aoMudar: () => void }) {
  const inicial = (canal: Canal) => grupo.canais[canal]?.estoque_minimo ?? ''
  const [valores, setValores] = useState<Record<Canal, number | string>>({ loja_fisica: inicial('loja_fisica'), online: inicial('online') })
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const canais = (Object.keys(CANAIS) as Canal[]).filter((canal) => grupo.canais[canal])

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(false)
    const mudaram = canais.filter((canal) => String(valores[canal]) !== String(inicial(canal)))
    for (const canal of mudaram) {
      const ok = await enviar(() => api('/estoque/minimo', {
        metodo: 'PUT',
        corpo: {
          id_variante: grupo.id_variante,
          id_unidade: grupo.id_unidade,
          canal,
          estoque_minimo: valores[canal] === '' ? null : Number(valores[canal]),
        },
      }))
      if (!ok) return
    }
    setSalvo(true)
    aoMudar()
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <h3 className="font-medium">Estoque mínimo</h3>
      <div className="flex items-end gap-2">
        {canais.map((canal) => (
          <div key={canal} className="flex-1 space-y-1">
            <Label htmlFor={`min-${grupo.chave}-${canal}`} className="text-xs font-normal text-muted-foreground">{CANAIS[canal]}</Label>
            <Input
              id={`min-${grupo.chave}-${canal}`}
              type="number"
              min={0}
              placeholder="sem"
              value={valores[canal]}
              onChange={(e) => setValores({ ...valores, [canal]: e.target.value })}
              className="bg-background"
            />
          </div>
        ))}
        <Button type="submit" variant="outline" className="h-9" disabled={enviando}>Salvar</Button>
      </div>
      <p className="text-xs text-muted-foreground">Deixe vazio para tirar o mínimo do canal.</p>
      {erro && <Aviso mensagem={erro} />}
      {salvo && <Sucesso>Mínimo salvo.</Sucesso>}
    </form>
  )
}

function Realocar({ grupo, aoMudar }: { grupo: Grupo; aoMudar: () => void }) {
  const [origem, setOrigem] = useState<Canal>('loja_fisica')
  const [quantidade, setQuantidade] = useState('')
  const [feito, setFeito] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const destino = origem === 'loja_fisica' ? 'online' : 'loja_fisica'
  const disponivel = grupo.canais[origem]?.disponivel ?? 0

  async function realocar(evento: FormEvent) {
    evento.preventDefault()
    setFeito(null)
    const ok = await enviar(() => api('/realocacoes', {
      metodo: 'POST',
      corpo: { id_variante: grupo.id_variante, id_unidade: grupo.id_unidade, canal_origem: origem, quantidade: Number(quantidade) },
    }))
    if (ok) {
      setFeito(`${plural(Number(quantidade), 'peça passou', 'peças passaram')} para ${CANAIS[destino].toLowerCase()}.`)
      setQuantidade('')
      aoMudar()
    }
  }

  return (
    <form onSubmit={realocar} className="space-y-3">
      <h3 className="font-medium">Passar para o outro canal</h3>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`orig-${grupo.chave}`} className="text-xs font-normal text-muted-foreground">Sai de</Label>
          <Select id={`orig-${grupo.chave}`} value={origem} onChange={(e) => setOrigem(e.target.value as Canal)} className="bg-background">
            {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor={`qtd-${grupo.chave}`} className="text-xs font-normal text-muted-foreground">Peças</Label>
          <Input id={`qtd-${grupo.chave}`} type="number" min={1} max={disponivel || undefined} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="bg-background" required />
        </div>
        <Button type="submit" variant="outline" className="h-9" disabled={enviando || disponivel === 0}>Passar</Button>
      </div>
      <p className="text-xs text-muted-foreground">{plural(disponivel, 'disponível', 'disponíveis')} em {CANAIS[origem].toLowerCase()}.</p>
      {erro && <Aviso mensagem={erro} />}
      {feito && <Sucesso>{feito}</Sucesso>}
    </form>
  )
}
