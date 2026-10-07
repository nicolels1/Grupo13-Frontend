import { Link } from 'react-router'

import type { Esquema } from '@/lib/api'
import { coresDoProduto, corDaPeca, faixaDePreco } from '@/lib/cores'
import { moeda, plural } from '@/lib/formato'
import { fotosDaCor } from './componentes/fotos'

// cartão da vitrine: primeira foto da primeira cor (sem foto, um bloco na cor da peça), nome, preço e cores
export function CartaoProduto({ produto }: { produto: Esquema<'ProdutoSaida'> }) {
  const cores = coresDoProduto(produto)
  const preco = faixaDePreco(produto)
  const foto = fotosDaCor(produto.imagens ?? [], cores[0] ?? null)[0]
  const esgotado = produto.variantes.length > 0 && produto.variantes.every((v) => v.disponivel === false)

  return (
    <Link to={`/loja/produtos/${produto.id_produto}`} className="group block space-y-2">
      <div
        className="relative aspect-[3/4] overflow-hidden transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: corDaPeca(cores[0], produto.id_produto) }}
      >
        {foto && <img src={foto.url} alt="" loading="lazy" className="size-full object-cover" />}
        {esgotado && (
          <span className="absolute top-3 left-3 bg-white px-2 py-0.5 text-xs font-medium">Esgotado</span>
        )}
        {cores.length > 1 && (
          <span className="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
            {cores.slice(0, 5).map((cor) => (
              <span key={cor} className="size-3 border border-white/70" style={{ backgroundColor: corDaPeca(cor) }} />
            ))}
          </span>
        )}
      </div>
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-sm group-hover:underline">{produto.nome}</h3>
        {preco && (
          <p className="text-sm font-medium tabular-nums">
            {preco.menor === preco.maior ? moeda(preco.menor) : `A partir de ${moeda(preco.menor)}`}
          </p>
        )}
        {cores.length > 1 && <p className="text-xs text-muted-foreground">{plural(cores.length, 'cor', 'cores')}</p>}
      </div>
    </Link>
  )
}
