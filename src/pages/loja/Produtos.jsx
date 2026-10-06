import { Link, useSearchParams } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { plural } from '@/lib/formato'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { CartaoProduto } from './CartaoProduto'

const POR_PAGINA = 12

// lista da vitrine: por categoria (?categoria=) ou pela busca do topo (?busca=), com "carregar mais"
export function ProdutosLoja() {
  const [params, setParams] = useSearchParams()
  const idCategoria = params.get('categoria') ?? ''
  const busca = params.get('busca') ?? ''
  const quantos = Number(params.get('quantos')) || POR_PAGINA
  const { dados: categorias } = useCategorias()
  const categoria = categorias?.find((c) => String(c.id_categoria) === idCategoria)

  const { dados, erro, carregando } = useCarregar(
    () => api('/produtos', { params: { id_categoria: idCategoria, busca, limit: quantos } }),
    [idCategoria, busca, quantos],
  )

  const titulo = busca ? `Busca: “${busca}”` : (categoria?.nome ?? 'Todos os produtos')

  function carregarMais() {
    const novos = new URLSearchParams(params)
    novos.set('quantos', String(quantos + POR_PAGINA))
    setParams(novos, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-xs uppercase tracking-[0.1em] text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground">{busca ? 'Busca' : (categoria?.nome ?? 'Produtos')}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-baseline gap-3 border-b pb-6">
        <h1 className="font-heading text-3xl uppercase tracking-[0.06em]">{titulo}</h1>
        {dados && <span className="text-sm text-muted-foreground">{plural(dados.total, 'produto')}</span>}
      </div>

      {erro && <Aviso mensagem={erro} />}
      {dados && dados.items.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado. <Link to="/loja/produtos" className="underline">Ver todos os produtos</Link>
        </p>
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
            Você viu {dados.items.length} de {dados.total} produtos
          </p>
          <div className="h-0.5 w-48 bg-border" aria-hidden="true">
            <div className="h-full bg-foreground" style={{ width: `${(dados.items.length / dados.total) * 100}%` }} />
          </div>
          {dados.items.length < dados.total && (
            <Button variant="outline" size="lg" className="px-8 uppercase tracking-[0.12em]" onClick={carregarMais} disabled={carregando}>
              Carregar mais
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
