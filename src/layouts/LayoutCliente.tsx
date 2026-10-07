import { useState, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, Search, ShoppingBag, User } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Logo } from '@/components/Logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, type Esquema } from '@/lib/api'
import { useCategorias } from '@/lib/listas'
import { useCarregar } from '@/lib/useCarregar'

// plataforma do cliente: a vitrine é pública; a conta aparece à direita do topo
export function LayoutCliente() {
  const { dados: categorias } = useCategorias()
  const ativas = (categorias ?? []).filter((c) => c.ativo)

  return (
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
            <Link to="/loja/carrinho" aria-label="Carrinho" className="hover:text-aco">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Rodape categorias={ativas} />
    </div>
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
      className="col-span-2 row-start-3 -mx-4 flex min-w-0 gap-6 overflow-x-auto px-4 lg:col-span-1 lg:row-start-auto lg:mx-0 lg:px-0"
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

  function buscar(evento: FormEvent) {
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

  if (sessao && perfil?.tipo_conta === 'cliente') return <MenuDaConta nome={perfil.nome} />
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

function MenuDaConta({ nome }: { nome: string }) {
  const { sair } = useAuth()
  const local = useLocation()
  // confere de novo a cada troca de página, para o aviso sumir depois de ler a resposta
  const { dados } = useCarregar(
    () => api<Esquema<'Pagina_ChamadoSaida_'>>('/chamados', { params: { limit: 100 } }),
    [local.pathname],
  )
  const temNova = (dados?.items ?? []).some((c) => c.mensagens_nao_lidas > 0)
  const primeiroNome = nome.split(' ')[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 text-sm whitespace-nowrap outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        <span className="relative">
          <User className="size-4" aria-hidden="true" />
          {temNova && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-terracota" />}
        </span>
        Olá, {primeiroNome}
        {temNova && <span className="sr-only">, você tem resposta nova nos chamados</span>}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link to="/loja/pedidos" />}>Meus pedidos</DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/loja/chamados" />}>
          Chamados
          {temNova && <span className="ml-auto size-2 rounded-full bg-terracota" aria-label="Resposta nova" />}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/loja/enderecos" />}>Endereços</DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/loja/ajuda" />}>Ajuda</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void sair()}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Rodape({ categorias }: { categorias: Esquema<'CategoriaSaida'>[] }) {
  return (
    <footer className="mt-20 bg-marinho-escuro text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
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
