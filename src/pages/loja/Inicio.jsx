import { Link } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { api } from '@/lib/api'
import { corDaPeca } from '@/lib/cores'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { CartaoProduto } from './CartaoProduto'

// tons do bloco de cada categoria, no lugar da foto
const TONS = ['Rosa', 'Azul claro', 'Caramelo', 'Off-white', 'Vinho', 'Grafite']

export function InicioLoja() {
  const { dados: categorias } = useCategorias()
  const novidades = useCarregar(() => api('/produtos', { params: { limit: 8 } }), [])
  const ativas = (categorias ?? []).filter((c) => c.ativo)

  return (
    <>
      <section className="bg-marinho text-white">
        <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end gap-5 px-4 py-14 sm:px-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">Primavera–Verão 2026</p>
          <h1 className="font-heading text-5xl font-light uppercase tracking-[0.06em] sm:text-7xl">Linho</h1>
          <div className="flex gap-8 text-xs uppercase tracking-[0.15em]">
            <Link to="/loja/produtos" className="border-b border-white pb-1 hover:text-white/80">Ver a coleção</Link>
            <Link to="/loja/ajuda" className="border-b border-terracota pb-1 hover:text-white/80">Central de ajuda</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-14 sm:px-6">
        <section aria-labelledby="titulo-novidades" className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 id="titulo-novidades" className="text-sm font-medium uppercase tracking-[0.15em]">Novidades</h2>
            <Link to="/loja/produtos" className="text-xs uppercase tracking-[0.12em] underline underline-offset-4">Ver tudo</Link>
          </div>
          {novidades.carregando && <Carregando />}
          {novidades.erro && <Aviso mensagem={novidades.erro} />}
          {novidades.dados?.items.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
              {novidades.dados.items.map((produto) => <CartaoProduto key={produto.id_produto} produto={produto} />)}
            </div>
          )}
          {novidades.dados?.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Os produtos da coleção chegam em breve.</p>
          )}
        </section>

        {ativas.length > 0 && (
          <section aria-labelledby="titulo-categorias" className="space-y-5">
            <h2 id="titulo-categorias" className="text-sm font-medium uppercase tracking-[0.15em]">Comprar por categoria</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {ativas.map((categoria, i) => (
                <Link key={categoria.id_categoria} to={`/loja/produtos?categoria=${categoria.id_categoria}`} className="group space-y-2">
                  <span
                    className="block aspect-[3/4] transition-opacity group-hover:opacity-90"
                    style={{ backgroundColor: corDaPeca(TONS[i % TONS.length]) }}
                  />
                  <span className="block text-xs uppercase tracking-[0.12em] group-hover:underline">{categoria.nome}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
