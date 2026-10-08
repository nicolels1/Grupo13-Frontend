import { useState, type ReactNode, type SubmitEvent } from 'react'
import { Package, Search, ShoppingBag, User } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Logo } from '@/components/Logo'
import type { Esquema } from '@/lib/api'
import { useCategorias } from '@/lib/listas'
import { CarrinhoProvider } from '@/pages/loja/carrinho/CarrinhoProvider'
import { useCarrinho } from '@/pages/loja/carrinho/contexto'
import { GavetaCarrinho } from '@/pages/loja/carrinho/GavetaCarrinho'
import { useChamadosDaConta } from '@/pages/loja/conta/useChamadosDaConta'

// plataforma do cliente: a vitrine é pública; a conta aparece à direita do topo
export function LayoutCliente() {
  const { dados: categorias } = useCategorias()
  const ativas = (categorias ?? []).filter((c) => c.ativo)

  return (
    <CarrinhoProvider>
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <p className="bg-marinho-escuro px-4 py-2 text-center text-[0.7rem] font-medium tracking-[0.12em] text-white uppercase">
          Frete grátis a partir de R$ 299 e retirada grátis na loja
        </p>

        <header className="border-b">
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:gap-x-8">
            <Logo para="/loja" className="text-lg sm:text-2xl" />
            <Categorias categorias={ativas} />
            <BuscaDaLoja />
            <div className="col-start-2 row-start-1 flex items-center justify-end gap-5 lg:col-start-auto lg:row-start-auto">
              <Conta />
              <LinkPedidos />
              <BotaoCarrinho />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <Rodape categorias={ativas} />
        <GavetaCarrinho />
      </div>
    </CarrinhoProvider>
  )
}

// Meus pedidos à vista no topo: dentro do menu da conta pouca gente achava. Sem login, a proteção
// da rota leva a Entrar e volta para cá; conta da equipe não tem pedidos de cliente
function LinkPedidos() {
  const { perfil } = useAuth()
  if (perfil?.tipo_conta === 'interna') return null
  return (
    <Link to="/loja/pedidos" aria-label="Meus pedidos" className="flex items-center gap-1.5 text-sm whitespace-nowrap hover:text-aco">
      <Package className="size-5" aria-hidden="true" />
      <span className="hidden lg:inline" aria-hidden="true">Pedidos</span>
    </Link>
  )
}

// ícone do carrinho com o número de peças; abre a gaveta em vez de trocar de página
function BotaoCarrinho() {
  const { quantidadeTotal, abrirGaveta } = useCarrinho()
  return (
    <button
      type="button"
      onClick={abrirGaveta}
      aria-label={quantidadeTotal > 0 ? `Carrinho, ${quantidadeTotal} ${quantidadeTotal === 1 ? 'peça' : 'peças'}` : 'Carrinho'}
      className="relative hover:text-aco"
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {quantidadeTotal > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2.5 flex size-4.5 items-center justify-center rounded-full bg-terracota text-[0.65rem] font-medium text-white tabular-nums"
        >
          {quantidadeTotal}
        </span>
      )}
    </button>
  )
}

function Categorias({ categorias }: { categorias: Esquema<'CategoriaSaida'>[] }) {
  const local = useLocation()
  const [params] = useSearchParams()
  const naLista = local.pathname === '/loja/produtos'
  const categoriaAtual = naLista ? params.get('categoria') : null

  return (
    <nav
      aria-label="Categorias"
      className="col-span-2 row-start-3 -mx-4 flex min-w-0 gap-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:col-span-1 lg:row-start-auto lg:mx-0 lg:px-0"
    >
      <LinkCategoria para="/loja/produtos" ativa={naLista && !categoriaAtual && !params.get('busca')}>
        Todos
      </LinkCategoria>
      {categorias.map((categoria) => (
        <LinkCategoria
          key={categoria.id_categoria}
          para={`/loja/produtos?categoria=${categoria.id_categoria}`}
          ativa={categoriaAtual === String(categoria.id_categoria)}
        >
          {categoria.nome}
        </LinkCategoria>
      ))}
    </nav>
  )
}

function LinkCategoria({ para, ativa, children }: { para: string; ativa: boolean; children: ReactNode }) {
  return (
    <Link
      to={para}
      aria-current={ativa ? 'page' : undefined}
      className={cn(
        'shrink-0 border-b-2 py-1 text-sm transition-colors',
        ativa ? 'border-foreground font-medium' : 'border-transparent hover:border-border',
      )}
    >
      {children}
    </Link>
  )
}

function BuscaDaLoja() {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [termo, setTermo] = useState(params.get('busca') ?? '')

  function buscar(evento: SubmitEvent) {
    evento.preventDefault()
    const texto = termo.trim()
    navegar(texto ? `/loja/produtos?busca=${encodeURIComponent(texto)}` : '/loja/produtos')
  }

  return (
    <form
      role="search"
      onSubmit={buscar}
      className="col-span-2 flex min-w-0 items-center gap-2 bg-superficie px-4 py-2 focus-within:ring-2 focus-within:ring-ring lg:col-span-1 lg:w-64"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="busca-loja" className="sr-only">Buscar produtos</label>
      <input
        id="busca-loja"
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="O que você procura?"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}

// deslogado: "Entrar ou criar conta" sem voltarPara, para o login seguir pela rota "/",
// que leva cada tipo de conta à sua plataforma
function Conta() {
  const { sessao, perfil } = useAuth()

  if (sessao && perfil?.tipo_conta === 'cliente') return <LinkDaConta nome={perfil.nome} />
  if (sessao && perfil?.tipo_conta === 'interna') {
    return <Link to="/interno" className="text-sm hover:underline">Ir para a plataforma interna</Link>
  }
  return (
    <Link to="/entrar" className="flex items-center gap-2 text-sm whitespace-nowrap hover:underline">
      <User className="size-4" aria-hidden="true" />
      <span className="sm:hidden">Entrar</span>
      <span className="hidden sm:inline">Entrar ou criar conta</span>
    </Link>
  )
}

// logado: leva direto à área "Minha conta" (o menu das seções e o Sair ficam lá);
// o ponto terracota avisa resposta nova nos chamados. No celular fica só o ícone, como "Pedidos",
// para não cobrir a logo
function LinkDaConta({ nome }: { nome: string }) {
  const { naoLidas } = useChamadosDaConta()
  const primeiroNome = nome.split(' ')[0]

  return (
    <Link to="/loja/conta" className="group flex items-center gap-2 text-sm whitespace-nowrap">
      <span className="relative">
        <User className="size-5" aria-hidden="true" />
        {naoLidas > 0 && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-terracota ring-2 ring-background" />}
      </span>
      <span className="sr-only leading-tight sm:not-sr-only">
        <span className="hidden text-xs text-muted-foreground sm:block">Olá, {primeiroNome}</span>
        <span className="font-medium group-hover:underline">Minha conta</span>
      </span>
      {naoLidas > 0 && <span className="sr-only">, você tem resposta nova nos chamados</span>}
    </Link>
  )
}

function Rodape({ categorias }: { categorias: Esquema<'CategoriaSaida'>[] }) {
  return (
    <footer className="mt-20 bg-marinho-escuro text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <ColunaRodape titulo="Minha conta">
          <Link to="/loja/pedidos">Meus pedidos</Link>
          <Link to="/loja/chamados">Chamados</Link>
          <Link to="/loja/enderecos">Endereços</Link>
        </ColunaRodape>
        <ColunaRodape titulo="Ajuda">
          <Link to="/loja/ajuda">Central de ajuda</Link>
          <Link to="/loja/ajuda#trocas-e-devolucoes">Trocas e devoluções</Link>
          <Link to="/loja/ajuda#pedidos-e-entrega">Prazos de entrega</Link>
          <Link to="/loja/chamados/novo">Fale com a gente</Link>
        </ColunaRodape>
        <ColunaRodape titulo="Comprar">
          {categorias.slice(0, 6).map((c) => (
            <Link key={c.id_categoria} to={`/loja/produtos?categoria=${c.id_categoria}`}>{c.nome}</Link>
          ))}
        </ColunaRodape>
        <ColunaRodape titulo="Atendimento">
          <span className="text-white/70">
            Seg. a sáb., 9h às 21h
            <br />
            Dom. e feriados, 10h às 16h
          </span>
        </ColunaRodape>
      </div>
      <div className="mx-auto max-w-7xl border-t border-white/15 px-4 py-5 text-xs text-white/70 sm:px-6">
        © 2026 Casa Lorenzi. Pagamento por Pix, cartão de crédito, cartão de débito e dinheiro nas lojas.
      </div>
    </footer>
  )
}

function ColunaRodape({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm text-white/85 [&_a:hover]:text-white [&_a:hover]:underline">
        {children}
      </div>
    </div>
  )
}
