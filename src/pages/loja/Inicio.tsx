import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, MessageCircle, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { api, type Esquema } from '@/lib/api'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'
import { CartaoProduto } from './componentes/CartaoProduto'

const SLIDES = [
  {
    titulo: 'Linho',
    texto: 'Peças leves para a primavera e o verão.',
    acao: 'Ver as novidades',
    para: '/loja/produtos?ordem=novidades',
    fundo: 'bg-marinho',
  },
  {
    titulo: 'Alfaiataria',
    texto: 'Cortes retos que vão do trabalho ao fim de semana.',
    acao: 'Ver a alfaiataria',
    para: '/loja/produtos?busca=alfaiataria',
    fundo: 'bg-marinho-escuro',
  },
  {
    titulo: 'Retire grátis na loja',
    texto: 'Compre pelo site e retire em qualquer loja da rede, sem pagar frete.',
    acao: 'Saber como funciona',
    para: '/loja/ajuda#pedidos-e-entrega',
    fundo: 'bg-aco',
  },
]

// frete e retirada grátis já estão na faixa do topo e no carrossel: aqui entram as outras vantagens
const VANTAGENS = [
  { icone: RefreshCcw, texto: 'Troca em até 30 dias em qualquer loja' },
  { icone: CreditCard, texto: 'Pague com Pix ou cartão' },
  { icone: MessageCircle, texto: 'Atendimento pelo chat' },
]

const TROCA_A_CADA_MS = 6000

export function InicioLoja() {
  const { dados: categorias } = useCategorias()
  const novidades = useCarregar(
    () => api<Esquema<'PaginaProdutos'>>('/produtos', { params: { limit: 8, ordem: 'novidades' } }),
    [],
  )
  const ativas = (categorias ?? []).filter((c) => c.ativo)

  return (
    <>
      <Destaques />

      <section aria-label="Vantagens" className="bg-aco text-white">
        <ul className="mx-auto grid max-w-7xl gap-3 px-4 py-4 text-sm sm:grid-cols-3 sm:px-6">
          {VANTAGENS.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-center gap-2 sm:justify-center">
              <Icone className="size-4 shrink-0" aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-novidades" className="mx-auto max-w-7xl space-y-6 px-4 py-14 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="titulo-novidades" className="font-titulo text-3xl">Novidades</h2>
          <Link to="/loja/produtos?ordem=novidades" className="text-sm underline underline-offset-4 hover:text-aco">
            Ver todas
          </Link>
        </div>
        {novidades.carregando && <Carregando />}
        {novidades.erro && <Aviso mensagem={novidades.erro} />}
        {novidades.dados && novidades.dados.items.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
            {novidades.dados.items.map((produto) => <CartaoProduto key={produto.id_produto} produto={produto} />)}
          </div>
        )}
        {novidades.dados?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">As peças da nova coleção chegam em breve.</p>
        )}
      </section>

      {ativas.length > 0 && <CarrosselCategorias categorias={ativas} />}
    </>
  )
}

// "Comprar por categoria": carrossel com setas sobre o bloco ardósia. Categoria com foto (enviada no
// Catálogo) mostra a foto com o nome numa faixa marinho-escura translúcida (sem degradê, design);
// sem foto, continua o quadrado translúcido sobre o ardósia
function CarrosselCategorias({ categorias }: { categorias: Esquema<'CategoriaSaida'>[] }) {
  const [controle, setControle] = useState<CarouselApi>()
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(false)

  useEffect(() => {
    if (!controle) return
    const atualizar = () => {
      setPodeVoltar(controle.canScrollPrev())
      setPodeAvancar(controle.canScrollNext())
    }
    atualizar()
    controle.on('select', atualizar)
    controle.on('reInit', atualizar)
    return () => {
      controle.off('select', atualizar)
      controle.off('reInit', atualizar)
    }
  }, [controle])

  const seta = 'flex size-10 items-center justify-center bg-white/15 text-white hover:bg-white/30 disabled:pointer-events-none disabled:opacity-30'

  return (
    <section aria-labelledby="titulo-categorias" className="bg-ardosia text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 id="titulo-categorias" className="font-titulo text-3xl">Comprar por categoria</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => controle?.scrollPrev()} disabled={!podeVoltar} aria-label="Categorias anteriores" className={seta}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => controle?.scrollNext()} disabled={!podeAvancar} aria-label="Próximas categorias" className={seta}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <Carousel setApi={setControle} opts={{ align: 'start' }} aria-label="Categorias">
          <CarouselContent className="-ml-3">
            {categorias.map((categoria) => (
              <CarouselItem key={categoria.id_categoria} className="basis-1/2 pl-3 lg:basis-1/4">
                <Link
                  to={`/loja/produtos?categoria=${categoria.id_categoria}`}
                  className={cn(
                    'relative flex aspect-[4/3] items-end overflow-hidden font-titulo text-2xl',
                    categoria.imagem_url ? 'group' : 'border border-white/30 bg-white/10 p-5 transition-colors hover:bg-white/20',
                  )}
                >
                  {categoria.imagem_url ? (
                    <>
                      {/* a foto é decorativa: o nome da categoria está escrito embaixo */}
                      <img src={categoria.imagem_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                      <span className="relative w-full bg-marinho-escuro/70 px-5 py-3 group-hover:bg-marinho-escuro/85">{categoria.nome}</span>
                    </>
                  ) : (
                    categoria.nome
                  )}
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  )
}

function prefereMenosMovimento() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// carrossel de largura total: troca sozinho a cada 6 s, para enquanto o mouse ou o foco estão nele
// e não troca sozinho para quem pediu menos movimento no sistema
function Destaques() {
  const [controle, setControle] = useState<CarouselApi>()
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (!controle) return
    const aoTrocar = () => setAtual(controle.selectedScrollSnap())
    controle.on('select', aoTrocar)
    return () => {
      controle.off('select', aoTrocar)
    }
  }, [controle])

  useEffect(() => {
    if (!controle || pausado || prefereMenosMovimento()) return
    const relogio = window.setInterval(() => controle.scrollNext(), TROCA_A_CADA_MS)
    return () => window.clearInterval(relogio)
  }, [controle, pausado])

  return (
    <Carousel
      setApi={setControle}
      opts={{ loop: true }}
      aria-label="Destaques"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <CarouselContent className="ml-0">
        {SLIDES.map((slide, i) => (
          <CarouselItem key={slide.titulo} className="pl-0" aria-label={`${i + 1} de ${SLIDES.length}`}>
            <div className={cn('text-white', slide.fundo)}>
              <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end gap-5 px-4 pt-14 pb-20 sm:min-h-[32rem] sm:px-16">
                <h2 className="font-titulo text-5xl sm:text-7xl">{slide.titulo}</h2>
                <p className="max-w-md text-base text-white/85">{slide.texto}</p>
                <Link
                  to={slide.para}
                  tabIndex={i === atual ? 0 : -1}
                  className="inline-flex h-11 w-full items-center justify-center bg-white px-6 text-sm font-medium text-marinho-escuro hover:bg-white/90 sm:w-auto sm:self-start"
                >
                  {slide.acao}
                </Link>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <button
        type="button"
        onClick={() => controle?.scrollPrev()}
        aria-label="Destaque anterior"
        className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center bg-white/15 text-white hover:bg-white/30 sm:flex"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => controle?.scrollNext()}
        aria-label="Próximo destaque"
        className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center bg-white/15 text-white hover:bg-white/30 sm:flex"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.titulo}
            type="button"
            onClick={() => controle?.scrollTo(i)}
            aria-label={`Ir para o destaque ${i + 1}: ${slide.titulo}`}
            aria-current={i === atual}
            className={cn('h-1 w-8 transition-colors', i === atual ? 'bg-white' : 'bg-white/40 hover:bg-white/70')}
          />
        ))}
      </div>
    </Carousel>
  )
}
