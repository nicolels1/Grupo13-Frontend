import { Link, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { plural } from '@/lib/formato'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { CartaoProduto } from './CartaoProduto'
import { rotuloTamanho } from './componentes/tamanhos'

const POR_PAGINA = 12

const ORDENS = [
  { valor: 'novidades', rotulo: 'Novidades' },
  { valor: 'menor_preco', rotulo: 'Menor preço' },
  { valor: 'maior_preco', rotulo: 'Maior preço' },
  { valor: 'nome', rotulo: 'Nome' },
]

// lista da vitrine: por categoria (?categoria=) ou pela busca do topo (?busca=), com filtros na URL
// para o link poder ser compartilhado e o voltar do navegador manter a escolha
export function ProdutosLoja() {
  const [params, setParams] = useSearchParams()
  const idCategoria = params.get('categoria') ?? ''
  const busca = params.get('busca') ?? ''
  // vários tamanhos marcados: a lista traz as peças que têm qualquer um deles
  const escolhidos = params.getAll('tamanho')
  const chaveTamanhos = escolhidos.join(',')
  const soDisponiveis = params.get('disponivel') === 'true'
  const ordem = params.get('ordem') ?? 'novidades'
  const quantos = Number(params.get('quantos')) || POR_PAGINA
  const { dados: categorias } = useCategorias()
  const categoria = categorias?.find((c) => String(c.id_categoria) === idCategoria)

  const { dados, erro, carregando } = useCarregar(
    () =>
      api<Esquema<'Pagina_ProdutoSaida_'>>('/produtos', {
        params: {
          id_categoria: idCategoria, busca, tamanho: escolhidos, disponivel: soDisponiveis || undefined, ordem,
          limit: quantos,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a lista muda de identidade a cada render; a chave não
    [idCategoria, busca, chaveTamanhos, soDisponiveis, ordem, quantos],
  )
  // só os tamanhos que existem na categoria ou na busca, já na ordem da grade
  const { dados: tamanhosAVenda } = useCarregar(
    () => api<Esquema<'Lista_str_'>>('/produtos/tamanhos', { params: { id_categoria: idCategoria, busca } }),
    [idCategoria, busca],
  )
  const tamanhos = tamanhosAVenda?.items ?? []

  const titulo = busca ? `Resultados para “${busca}”` : (categoria?.nome ?? 'Todos os produtos')
  const filtrando = escolhidos.length > 0 || soDisponiveis

  // trocar um filtro volta para a primeira página
  function aplicar(novos: URLSearchParams) {
    novos.delete('quantos')
    setParams(novos, { replace: true, preventScrollReset: true })
  }

  function mudar(chave: string, valor: string | null) {
    const novos = new URLSearchParams(params)
    if (valor) novos.set(chave, valor)
    else novos.delete(chave)
    aplicar(novos)
  }

  function alternarTamanho(opcao: string) {
    const novos = new URLSearchParams(params)
    novos.delete('tamanho')
    const marcados = escolhidos.includes(opcao) ? escolhidos.filter((t) => t !== opcao) : [...escolhidos, opcao]
    for (const t of marcados) novos.append('tamanho', t)
    aplicar(novos)
  }

  function mostrarMais() {
    const novos = new URLSearchParams(params)
    novos.set('quantos', String(quantos + POR_PAGINA))
    setParams(novos, { replace: true, preventScrollReset: true })
  }

  function limparFiltros() {
    const novos = new URLSearchParams(params)
    novos.delete('tamanho')
    novos.delete('disponivel')
    novos.delete('quantos')
    setParams(novos, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-sm text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground" aria-current="page">{busca ? 'Busca' : (categoria?.nome ?? 'Produtos')}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-titulo text-4xl">{titulo}</h1>
        {dados && <span className="text-sm text-muted-foreground">{plural(dados.total, 'produto')}</span>}
      </div>

      <div className="mb-8 flex flex-col gap-5 border-y py-5 lg:flex-row lg:items-center lg:justify-between">
        {tamanhos.length > 1 ? (
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Tamanho</legend>
            <span className="mr-1 text-sm font-medium" aria-hidden="true">Tamanho</span>
            {tamanhos.map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={escolhidos.includes(opcao)}
                onClick={() => alternarTamanho(opcao)}
                className={cn(
                  'h-9 min-w-9 border px-2 text-sm transition-colors',
                  escolhidos.includes(opcao) ? 'border-marinho bg-marinho text-white' : 'hover:border-foreground',
                )}
              >
                {rotuloTamanho(opcao)}
              </button>
            ))}
          </fieldset>
        ) : (
          // um tamanho só (ex.: acessórios) não tem o que filtrar
          <span />
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={soDisponiveis}
              onCheckedChange={(marcado) => mudar('disponivel', marcado ? 'true' : null)}
            />
            Só peças disponíveis
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Ordenar por</span>
            <Select value={ordem} onChange={(e) => mudar('ordem', e.target.value)} className="w-40">
              {ORDENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </Select>
          </label>
        </div>
      </div>

      {erro && <Aviso mensagem={erro} />}
      {dados && dados.items.length === 0 && (
        <div className="space-y-3 py-16 text-center text-sm text-muted-foreground">
          <p>Nenhuma peça encontrada{filtrando ? ' com esses filtros' : ''}.</p>
          {filtrando ? (
            <button type="button" onClick={limparFiltros} className="text-foreground underline underline-offset-4">
              Limpar filtros
            </button>
          ) : (
            <Link to="/loja/produtos" className="text-foreground underline underline-offset-4">Ver todos os produtos</Link>
          )}
        </div>
      )}
      {dados && dados.items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {dados.items.map((produto) => <CartaoProduto key={produto.id_produto} produto={produto} />)}
        </div>
      )}
      {carregando && <Carregando />}

      {dados && dados.total > 0 && (
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Você viu {dados.items.length} de {plural(dados.total, 'peça', 'peças')}
          </p>
          <div className="h-0.5 w-48 bg-border" aria-hidden="true">
            <div className="h-full bg-foreground" style={{ width: `${(dados.items.length / dados.total) * 100}%` }} />
          </div>
          {dados.items.length < dados.total && (
            <Button variant="outline" size="loja" onClick={mostrarMais} disabled={carregando}>
              Mostrar mais peças
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
