import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { api } from '@/lib/api'
import { coresDoProduto, corDaPeca, ordenarTamanhos } from '@/lib/cores'
import { moeda } from '@/lib/formato'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'

const VISTAS = ['Frente', 'Costas', 'Detalhe', 'Look completo']

export function ProdutoLoja() {
  const { idProduto } = useParams()
  const { dados: produto, erro, carregando } = useCarregar(() => api(`/produtos/${idProduto}`), [idProduto])

  if (carregando) return <Carregando />
  if (erro) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <Aviso titulo="Produto indisponível" mensagem={erro} />
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline' })}>Ver outros produtos</Link>
      </div>
    )
  }
  // a chave reinicia a escolha de cor e tamanho ao trocar de produto
  return <DetalheProduto key={produto.id_produto} produto={produto} />
}

function DetalheProduto({ produto }) {
  const { dados: categorias } = useCategorias()
  const categoria = categorias?.find((c) => c.id_categoria === produto.id_categoria)
  const cores = coresDoProduto(produto)
  const [cor, setCor] = useState(cores[0] ?? null)
  const doCor = produto.variantes.filter((v) => v.cor === cor)
  const tamanhos = ordenarTamanhos(new Set(produto.variantes.map((v) => v.tamanho)))
  const [tamanho, setTamanho] = useState(() => (tamanhos.length === 1 ? tamanhos[0] : null))
  const variante = doCor.find((v) => v.tamanho === tamanho) ?? null
  const preco = variante?.preco ?? doCor[0]?.preco ?? produto.variantes[0]?.preco

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-xs uppercase tracking-[0.1em] text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        {categoria && (
          <>
            <Link to={`/loja/produtos?categoria=${categoria.id_categoria}`} className="hover:text-foreground">{categoria.nome}</Link>
            <span className="mx-2" aria-hidden="true">/</span>
          </>
        )}
        <span className="text-foreground">{produto.nome}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem]">
        <div className="grid grid-cols-2 gap-1.5">
          {VISTAS.map((vista) => (
            <div key={vista} className="relative aspect-[3/4]" style={{ backgroundColor: corDaPeca(cor, produto.id_produto) }}>
              <span className="absolute bottom-3 left-3 text-[0.65rem] uppercase tracking-[0.12em] text-black/40">
                {vista}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl uppercase tracking-[0.08em]">{produto.nome}</h1>
            <p className="text-lg">{moeda(preco)}</p>
          </div>

          {cores.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm">Cor: <span className="text-muted-foreground">{cor}</span></legend>
              <div className="flex flex-wrap gap-2">
                {cores.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    aria-pressed={cor === opcao}
                    aria-label={opcao}
                    title={opcao}
                    onClick={() => setCor(opcao)}
                    className={cn('size-9 p-0.5', cor === opcao ? 'ring-1 ring-foreground' : 'hover:ring-1 hover:ring-border')}
                  >
                    <span className="block size-full" style={{ backgroundColor: corDaPeca(opcao) }} />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {tamanhos.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm">Tamanho: <span className="text-muted-foreground">{tamanho ?? 'escolha'}</span></legend>
              <div className="grid grid-cols-5 gap-1.5">
                {tamanhos.map((opcao) => {
                  const existe = doCor.some((v) => v.tamanho === opcao)
                  return (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={tamanho === opcao}
                      disabled={!existe}
                      onClick={() => setTamanho(opcao)}
                      className={cn(
                        'h-11 border text-sm transition-colors',
                        tamanho === opcao ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-foreground',
                        !existe && 'cursor-not-allowed text-muted-foreground line-through opacity-50',
                      )}
                    >
                      {opcao}
                    </button>
                  )
                })}
              </div>
              {doCor.length < tamanhos.length && (
                <p className="text-xs text-muted-foreground">Os tamanhos riscados não existem nesta cor.</p>
              )}
            </fieldset>
          )}

          <div className="space-y-3 border bg-superficie p-4 text-sm">
            <p className="font-medium uppercase tracking-[0.1em]">Compre nas nossas lojas</p>
            <p className="text-muted-foreground">
              A compra pelo site chega em breve. Enquanto isso, nossa equipe tira suas dúvidas sobre esta peça.
            </p>
            <Link
              to={`/loja/chamados/novo${variante ? `?variante=${variante.id_variante}` : ''}`}
              state={{ peca: variante ? `${produto.nome}, ${variante.cor}, ${variante.tamanho}` : produto.nome }}
              className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full uppercase tracking-[0.12em]')}
            >
              <MessageCircle aria-hidden="true" />
              Tirar dúvida sobre a peça
            </Link>
          </div>

          <details open className="border-t pt-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.12em]">Descrição</summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{produto.descricao_cliente}</p>
          </details>
          <details className="border-t pt-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.12em]">Retirada e trocas</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Troca ou devolução em qualquer loja da rede em até 30 dias, levando a peça e um documento.
            </p>
          </details>
          {variante && <p className="text-xs text-muted-foreground">Ref. {variante.sku}</p>}
        </div>
      </div>
    </div>
  )
}
