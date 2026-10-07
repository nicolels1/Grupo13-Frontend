import { useEffect, useState } from 'react'
import { RefreshCcw, Store, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button, buttonVariants } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { api, type Esquema } from '@/lib/api'
import { coresDoProduto, corDaPeca, ordenarTamanhos } from '@/lib/cores'
import { moeda } from '@/lib/formato'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { AvaliacoesDoProduto } from './componentes/Avaliacoes'
import { fotosDaCor } from './componentes/fotos'
import { rotuloTamanho } from './componentes/tamanhos'

type Produto = Esquema<'ProdutoSaida'>
type Imagem = Esquema<'ImagemSaida'>

export function ProdutoLoja() {
  const { idProduto } = useParams()
  const { dados: produto, erro, carregando } = useCarregar(
    () => api<Produto>(`/produtos/${idProduto}`),
    [idProduto],
  )

  if (carregando) return <Carregando />
  if (erro || !produto) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <Aviso titulo="Produto indisponível" mensagem={erro ?? 'Este produto não está mais à venda.'} />
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline' })}>Ver outros produtos</Link>
      </div>
    )
  }
  // a chave reinicia a escolha de cor e tamanho ao trocar de produto
  return <DetalheProduto key={produto.id_produto} produto={produto} />
}

function DetalheProduto({ produto }: { produto: Produto }) {
  const navegar = useNavigate()
  const { dados: categorias } = useCategorias()
  const categoria = categorias?.find((c) => c.id_categoria === produto.id_categoria)
  const cores = coresDoProduto(produto)
  const [cor, setCor] = useState<string | null>(cores[0] ?? null)
  const daCor = produto.variantes.filter((v) => v.cor === cor)
  const tamanhos = ordenarTamanhos(daCor.map((v) => v.tamanho))
  const [tamanho, setTamanho] = useState<string | null>(() => (tamanhos.length === 1 ? tamanhos[0]! : null))
  const [faltaTamanho, setFaltaTamanho] = useState(false)
  const variante = daCor.find((v) => v.tamanho === tamanho) ?? null
  const preco = variante?.preco ?? daCor[0]?.preco ?? produto.variantes[0]?.preco
  const fotos = fotosDaCor(produto.imagens ?? [], cor)
  const tudoEsgotado = daCor.length > 0 && daCor.every((v) => v.disponivel === false)

  function trocarCor(novaCor: string) {
    setCor(novaCor)
    // mantém o tamanho se ele existe na nova cor
    if (!produto.variantes.some((v) => v.cor === novaCor && v.tamanho === tamanho)) setTamanho(null)
  }

  // o carrinho chega na próxima etapa: por enquanto o botão leva à página dele
  function adicionar() {
    if (!variante) {
      setFaltaTamanho(true)
      return
    }
    navegar('/loja/carrinho')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-sm text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        {categoria && (
          <>
            <Link to={`/loja/produtos?categoria=${categoria.id_categoria}`} className="hover:text-foreground">
              {categoria.nome}
            </Link>
            <span className="mx-2" aria-hidden="true">/</span>
          </>
        )}
        <span className="text-foreground" aria-current="page">{produto.nome}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* a chave recomeça a galeria na primeira foto quando a cor muda */}
        <Galeria key={cor} fotos={fotos} cor={cor} idProduto={produto.id_produto} nome={produto.nome} />

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-2">
            <h1 className="font-titulo text-3xl">{produto.nome}</h1>
            {preco && <p className="text-xl tabular-nums">{moeda(preco)}</p>}
          </div>

          {cores.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm">
                Cor: <span className="text-muted-foreground">{cor}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {cores.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    aria-pressed={cor === opcao}
                    aria-label={opcao}
                    title={opcao}
                    onClick={() => trocarCor(opcao)}
                    className={cn('size-10 p-0.5', cor === opcao ? 'ring-2 ring-marinho' : 'ring-1 ring-border hover:ring-foreground')}
                  >
                    <span className="block size-full" style={{ backgroundColor: corDaPeca(opcao) }} />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {tamanhos.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm">
                Tamanho: <span className="text-muted-foreground">{tamanho ? rotuloTamanho(tamanho) : 'escolha um'}</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {tamanhos.map((opcao) => {
                  const esgotado = daCor.find((v) => v.tamanho === opcao)?.disponivel === false
                  const rotulo = rotuloTamanho(opcao)
                  return (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={tamanho === opcao}
                      aria-label={esgotado ? `${rotulo}, esgotado` : rotulo}
                      disabled={esgotado}
                      onClick={() => {
                        setTamanho(opcao)
                        setFaltaTamanho(false)
                      }}
                      className={cn(
                        'h-12 min-w-12 border px-3 text-sm transition-colors',
                        tamanho === opcao ? 'border-marinho bg-marinho text-white' : 'hover:border-foreground',
                        esgotado && 'cursor-not-allowed text-muted-foreground line-through hover:border-border',
                      )}
                    >
                      {rotulo}
                    </button>
                  )
                })}
              </div>
              {faltaTamanho && <p className="mt-2 text-sm text-ferrugem">Escolha um tamanho para adicionar ao carrinho.</p>}
            </fieldset>
          )}

          {tudoEsgotado ? (
            <p className="border p-4 text-sm">Esta cor está esgotada no site. Escolha outra cor ou consulte as lojas.</p>
          ) : (
            <Button size="loja" className="w-full sm:w-full" onClick={adicionar}>
              Adicionar ao carrinho
            </Button>
          )}

          <ul className="space-y-3 border-y py-5 text-sm">
            <li className="flex gap-3">
              <Truck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span><span className="font-medium text-terracota">Frete grátis</span> em compras a partir de R$ 299.</span>
            </li>
            <li className="flex gap-3">
              <Store className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>Retire grátis em qualquer loja da rede.</span>
            </li>
            <li className="flex gap-3">
              <RefreshCcw className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>Troca ou devolução em até 30 dias em qualquer loja.</span>
            </li>
          </ul>

          <Accordion defaultValue={['descricao']}>
            <AccordionItem value="descricao">
              <AccordionTrigger className="text-base">Descrição</AccordionTrigger>
              <AccordionContent>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{produto.descricao_cliente}</p>
                {variante && <p className="text-xs text-muted-foreground tabular-nums">Ref. {variante.sku}</p>}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="trocas">
              <AccordionTrigger className="text-base">Retirada e trocas</AccordionTrigger>
              <AccordionContent>
                <p className="leading-relaxed text-muted-foreground">
                  O pedido fica separado na loja escolhida por 7 dias depois do aviso de que está pronto. Para trocar ou
                  devolver, leve a peça e um documento a qualquer loja em até 30 dias.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-sm text-muted-foreground">
            Dúvidas sobre a peça?{' '}
            <Link
              to={`/loja/chamados/novo${variante ? `?variante=${variante.id_variante}` : ''}`}
              state={{ peca: variante ? `${produto.nome}, ${variante.cor}, ${variante.tamanho}` : produto.nome }}
              className="text-foreground underline underline-offset-4"
            >
              Fale com a gente
            </Link>
          </p>
        </div>
      </div>

      <AvaliacoesDoProduto idProduto={produto.id_produto} />
    </div>
  )
}

// desktop: miniaturas na vertical à esquerda e a foto grande; celular: fotos deslizando com pontinhos.
// Sem foto cadastrada, um bloco na cor da peça ocupa o lugar
function Galeria({ fotos, cor, idProduto, nome }: { fotos: Imagem[]; cor: string | null; idProduto: number; nome: string }) {
  const [escolhida, setEscolhida] = useState(0)
  const [controle, setControle] = useState<CarouselApi>()
  const fundo = corDaPeca(cor, idProduto)

  useEffect(() => {
    if (!controle) return
    const aoTrocar = () => setEscolhida(controle.selectedScrollSnap())
    controle.on('select', aoTrocar)
    return () => {
      controle.off('select', aoTrocar)
    }
  }, [controle])

  if (fotos.length === 0) {
    return <div className="aspect-[3/4] w-full lg:max-w-xl" style={{ backgroundColor: fundo }} role="img" aria-label={`${nome}, cor ${cor ?? ''}`} />
  }

  const principal = fotos[escolhida] ?? fotos[0]!
  const descricao = (i: number) => `${nome}, cor ${cor ?? ''}, foto ${i + 1} de ${fotos.length}`

  return (
    <div>
      <div className="hidden gap-3 lg:flex">
        {fotos.length > 1 && (
          <ul className="flex w-20 shrink-0 flex-col gap-2">
            {fotos.map((foto, i) => (
              <li key={foto.id_imagem}>
                <button
                  type="button"
                  onClick={() => setEscolhida(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === escolhida}
                  className={cn('block aspect-[3/4] w-full', i === escolhida ? 'ring-2 ring-marinho' : 'opacity-80 hover:opacity-100')}
                  style={{ backgroundColor: fundo }}
                >
                  <img src={foto.url} alt="" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="aspect-[3/4] flex-1" style={{ backgroundColor: fundo }}>
          <img src={principal.url} alt={descricao(escolhida)} className="size-full object-cover" />
        </div>
      </div>

      <div className="lg:hidden">
        <Carousel setApi={setControle} aria-label="Fotos do produto">
          <CarouselContent className="ml-0">
            {fotos.map((foto, i) => (
              <CarouselItem key={foto.id_imagem} className="pl-0">
                <div className="aspect-[3/4]" style={{ backgroundColor: fundo }}>
                  <img src={foto.url} alt={descricao(i)} className="size-full object-cover" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {fotos.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {fotos.map((foto, i) => (
              <button
                key={foto.id_imagem}
                type="button"
                onClick={() => controle?.scrollTo(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === escolhida}
                className={cn('size-2 rounded-full', i === escolhida ? 'bg-marinho' : 'bg-border')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
