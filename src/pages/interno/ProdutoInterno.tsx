import { Fragment, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ChevronLeft, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Etiqueta } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { corDaPeca, coresDoProduto, ordenarTamanhos } from '@/lib/cores'
import { CANAIS, dataLonga, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Produto = Esquema<'ProdutoSaida'>
type Canal = Esquema<'EstoqueItem'>['canal']
type DadosProduto = { nome: string; id_categoria: string; descricao_cliente: string; descricao_tecnica: string; ativo: boolean }
// estoque inicial de uma variação nova: onde e quanto, como digitado
type EstoqueInicial = { id_unidade: string; canal: Canal; quantidade: string }
type VarianteNova = { cor: string; tamanho: string; sku: string; preco: string; estoque_inicial: EstoqueInicial[] }
type VarianteEditada = { id_variante: number; sku: string; preco: string; ativo: boolean }

const DADOS_VAZIOS: DadosProduto = { nome: '', id_categoria: '', descricao_cliente: '', descricao_tecnica: '', ativo: true }
const VARIANTE_VAZIA: VarianteNova = { cor: '', tamanho: '', sku: '', preco: '', estoque_inicial: [] }

function SecaoTitulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
      <h2 className="text-lg font-medium">{children}</h2>
      {extra}
    </div>
  )
}

// a API recebe a variante nova com o estoque inicial já em números
function varianteParaApi(v: VarianteNova) {
  return {
    cor: v.cor.trim() || 'Única',
    tamanho: v.tamanho.trim() || 'U',
    sku: v.sku,
    preco: v.preco,
    estoque_inicial: v.estoque_inicial
      .filter((e) => e.id_unidade && Number(e.quantidade) > 0)
      .map((e) => ({ id_unidade: Number(e.id_unidade), canal: e.canal, quantidade: Number(e.quantidade) })),
  }
}

export function ProdutoInterno() {
  const { idProduto } = useParams()
  const novo = idProduto === 'novo'
  const produto = useCarregar(() => (novo ? null : api<Produto>(`/produtos/${idProduto}`)), [idProduto])

  if (!novo && produto.carregando && !produto.dados) return <Carregando />
  if (produto.erro) return <Aviso mensagem={produto.erro} />
  return <FormularioProduto key={idProduto} produto={novo ? null : produto.dados} recarregar={produto.recarregar} />
}

function FormularioProduto({ produto, recarregar }: { produto: Produto | null; recarregar: () => void }) {
  const navegar = useNavigate()
  const categorias = useCarregar(() => api<Esquema<'Lista_CategoriaSaida_'>>('/categorias'), [])
  const inicial: DadosProduto = produto
    ? {
        nome: produto.nome,
        id_categoria: String(produto.id_categoria),
        descricao_cliente: produto.descricao_cliente,
        descricao_tecnica: produto.descricao_tecnica ?? '',
        ativo: produto.ativo,
      }
    : DADOS_VAZIOS
  const [dados, setDados] = useState(inicial)
  const [variantesNovas, setVariantesNovas] = useState<VarianteNova[]>(produto ? [] : [{ ...VARIANTE_VAZIA }])
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const mudar = (campo: keyof DadosProduto) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSalvo(false)
    const alvo = e.target
    setDados({ ...dados, [campo]: alvo instanceof HTMLInputElement && alvo.type === 'checkbox' ? alvo.checked : alvo.value })
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(false)
    if (!produto) {
      const criado = await enviar(() => api<Produto>('/produtos', {
        metodo: 'POST',
        corpo: {
          ...dados,
          id_categoria: Number(dados.id_categoria),
          variantes: variantesNovas.filter((v) => v.sku.trim()).map(varianteParaApi),
        },
      }))
      if (criado) {
        navegar(`/interno/catalogo/${criado.id_produto}`, { replace: true })
      }
      return
    }
    // só manda o que mudou
    const mudancas = Object.fromEntries(
      Object.entries(dados).filter(([campo, valor]) => valor !== inicial[campo as keyof DadosProduto]).map(([campo, valor]) => [campo, campo === 'id_categoria' ? Number(valor) : valor]),
    )
    if (Object.keys(mudancas).length === 0) return
    const ok = await enviar(() => api<Produto>(`/produtos/${produto.id_produto}`, { metodo: 'PATCH', corpo: mudancas }))
    if (ok) {
      setSalvo(true)
      recarregar()
    }
  }

  const ativas = (categorias.dados?.items ?? []).filter((c) => c.ativo || String(c.id_categoria) === dados.id_categoria)
  const cores = coresDoProduto(produto)
  const tamanhos = new Set(produto?.variantes.map((v) => v.tamanho))

  return (
    <>
      <Link to="/interno/catalogo" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Produtos
      </Link>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight">{produto ? produto.nome : 'Novo produto'}</h1>
          {produto && (
            <p className="text-sm text-muted-foreground">
              {plural(produto.variantes.length, 'variação', 'variações')}, {produto.ativo ? 'à venda' : 'fora de venda'}.
            </p>
          )}
        </div>
        {produto?.ativo && (
          <Link to={`/loja/produtos/${produto.id_produto}`} target="_blank" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
            Ver na loja online <ExternalLink aria-hidden="true" />
          </Link>
        )}
      </div>

      <form onSubmit={salvar} className="space-y-12">
        <section>
          <SecaoTitulo>Dados do produto</SecaoTitulo>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="prod-nome" rotulo="Nome">
              <Input id="prod-nome" value={dados.nome} onChange={mudar('nome')} minLength={2} maxLength={150} required />
            </Campo>
            <Campo id="prod-categoria" rotulo="Categoria">
              <Select id="prod-categoria" value={dados.id_categoria} onChange={mudar('id_categoria')} required>
                <option value="" disabled>Escolha</option>
                {ativas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
              </Select>
            </Campo>
            <Campo id="prod-desc-cliente" rotulo="Descrição no site" className="md:col-span-2">
              <Textarea id="prod-desc-cliente" rows={3} value={dados.descricao_cliente} onChange={mudar('descricao_cliente')} required />
            </Campo>
            <Campo id="prod-desc-tecnica" rotulo="Descrição técnica" dica="Composição, gramatura, modelagem. Só a equipe vê." className="md:col-span-2">
              <Textarea id="prod-desc-tecnica" rows={3} value={dados.descricao_tecnica} onChange={mudar('descricao_tecnica')} required />
            </Campo>
            {produto && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dados.ativo} onChange={mudar('ativo')} /> Produto à venda
              </label>
            )}
          </div>
        </section>

        {!produto && (
          <section>
            <SecaoTitulo
              extra={
                <Button type="button" variant="outline" onClick={() => setVariantesNovas([...variantesNovas, { ...VARIANTE_VAZIA }])}>
                  <Plus aria-hidden="true" /> Mais uma variação
                </Button>
              }
            >
              Variações
            </SecaoTitulo>
            <div className="space-y-4">
              {variantesNovas.map((v, i) => (
                <EditorVariante
                  key={i}
                  indice={i}
                  valor={v}
                  aoMudar={(novo) => setVariantesNovas(variantesNovas.map((x, j) => (j === i ? novo : x)))}
                  aoTirar={variantesNovas.length > 1 ? () => setVariantesNovas(variantesNovas.filter((_, j) => j !== i)) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {erro && <Aviso mensagem={erro} />}
        {salvo && <Sucesso>Dados do produto salvos.</Sucesso>}
        <div className="flex justify-end gap-2">
          {produto && (
            <Button type="button" variant="outline" size="lg" className="h-11 px-5" onClick={() => setDados(inicial)} disabled={enviando}>
              Descartar
            </Button>
          )}
          <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>
            {enviando ? 'Salvando...' : produto ? 'Salvar produto' : 'Criar produto'}
          </Button>
        </div>
      </form>

      {produto && (
        <>
          <section className="mt-14">
            <SecaoTitulo extra={<span className="text-sm text-muted-foreground">{plural(cores.length, 'cor', 'cores')}, {plural(tamanhos.size, 'tamanho')}</span>}>
              Variações
            </SecaoTitulo>
            <TabelaVariantes produto={produto} aoMudar={recarregar} />
          </section>
          <section className="mt-14">
            <SecaoTitulo>Nova variação</SecaoTitulo>
            <NovaVariante idProduto={produto.id_produto} aoCriar={recarregar} />
          </section>
        </>
      )}
    </>
  )
}

function EditorVariante({ indice, valor, aoMudar, aoTirar }: {
  indice: number | string
  valor: VarianteNova
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
              {unidades.filter((u) => u.ativo).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
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

function NovaVariante({ idProduto, aoCriar }: { idProduto: number; aoCriar: () => void }) {
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
      <EditorVariante indice="nova" valor={valor} aoMudar={setValor} />
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

function TabelaVariantes({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const [editando, setEditando] = useState<VarianteEditada | null>(null)
  const [historico, setHistorico] = useState<number | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const ordenadas = [...produto.variantes].sort((a, b) => {
    if (a.cor !== b.cor) return a.cor.localeCompare(b.cor, 'pt-BR')
    const ordem = ordenarTamanhos([a.tamanho, b.tamanho])
    return ordem[0] === a.tamanho ? -1 : 1
  })

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
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Cor</th>
            <th className="font-medium">Tamanho</th>
            <th className="font-medium">Etiqueta</th>
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
                        <Button type="button" variant="ghost" size="sm" onClick={() => setHistorico(historico === v.id_variante ? null : v.id_variante)}>
                          Histórico de preço
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando({ id_variante: v.id_variante, sku: v.sku, preco: v.preco, ativo: v.ativo })}>
                          Editar
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
                {historico === v.id_variante && (
                  <tr className="border-b bg-superficie">
                    <td colSpan={6} className="px-4 py-3"><HistoricoPreco idVariante={v.id_variante} /></td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="pt-3 text-xs text-muted-foreground">Cor e tamanho não mudam depois de criados: o estoque e os pedidos ficam presos à variação.</p>
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
