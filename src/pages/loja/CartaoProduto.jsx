import { Link } from 'react-router'

import { coresDoProduto, corDaPeca, faixaDePreco } from '@/lib/cores'
import { moeda, plural } from '@/lib/formato'

// cartão da vitrine: bloco na cor da primeira variante (no lugar da foto), nome, preço e cores
export function CartaoProduto({ produto }) {
  const cores = coresDoProduto(produto)
  const preco = faixaDePreco(produto)

  return (
    <Link to={`/loja/produtos/${produto.id_produto}`} className="group block space-y-2">
      <div
        className="relative aspect-[3/4] transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: corDaPeca(cores[0], produto.id_produto) }}
      >
        {cores.length > 1 && (
          <span className="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
            {cores.slice(0, 5).map((cor) => (
              <span key={cor} className="size-3 border border-white/70" style={{ backgroundColor: corDaPeca(cor) }} />
            ))}
          </span>
        )}
      </div>
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-sm uppercase tracking-[0.08em] group-hover:underline">{produto.nome}</h3>
        {preco && (
          <p className="text-sm">
            {preco.menor === preco.maior ? moeda(preco.menor) : `A partir de ${moeda(preco.menor)}`}
          </p>
        )}
        {cores.length > 0 && <p className="text-xs text-muted-foreground">{plural(cores.length, 'cor', 'cores')}</p>}
      </div>
    </Link>
  )
}
