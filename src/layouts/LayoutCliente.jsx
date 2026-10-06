import { useState } from 'react'
import { CircleHelp, Search, User } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Logo } from '@/components/Logo'
import { useCategorias } from '@/lib/listas'

const LINK_TOPO = 'flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] hover:text-muted-foreground'

// plataforma do cliente: a vitrine é pública; "Entrar" ou o nome de quem está logado
export function LayoutCliente() {
  const { sessao, perfil, sair } = useAuth()
  const { dados: categorias } = useCategorias()
  const ativas = (categorias ?? []).filter((c) => c.ativo)
  const logadoCliente = sessao && perfil?.tipo_conta === 'cliente'
  const local = useLocation()
  const [params] = useSearchParams()
  const naLista = local.pathname === '/loja/produtos'
  const categoriaAtual = naLista ? params.get('categoria') : null

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <p className="bg-marinho-escuro px-4 py-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.12em] text-white">
        Retire grátis na loja · Troca em qualquer loja em até 30 dias
      </p>

      <header className="border-b">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5 sm:px-6">
          <nav aria-label="Atalhos" className="flex items-center gap-6">
            <Link to="/loja/ajuda" className={LINK_TOPO}>
              <CircleHelp className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ajuda</span>
            </Link>
          </nav>
          <Logo para="/loja" className="text-xl sm:text-3xl" />
          <div className="flex items-center justify-end gap-4">
            {logadoCliente ? (
              <>
                <span className={cn(LINK_TOPO, 'hidden hover:text-foreground md:flex')}>
                  <User className="size-4" aria-hidden="true" />
                  {perfil.nome.split(' ')[0]}
                </span>
                <button type="button" onClick={sair} className={LINK_TOPO}>Sair</button>
              </>
            ) : (
              <Link to="/entrar" state={{ voltarPara: '/loja' }} className={LINK_TOPO}>
                <User className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pb-3 sm:px-6">
          <nav aria-label="Categorias" className="-mb-1 flex gap-6 overflow-x-auto pb-1">
            <Link to="/loja/produtos" className={linkCategoria(naLista && !categoriaAtual && !params.get('busca'))}>
              Todos
            </Link>
            {ativas.map((categoria) => (
              <Link
                key={categoria.id_categoria}
                to={`/loja/produtos?categoria=${categoria.id_categoria}`}
                aria-current={categoriaAtual === String(categoria.id_categoria) ? 'page' : undefined}
                className={linkCategoria(categoriaAtual === String(categoria.id_categoria))}
              >
                {categoria.nome}
              </Link>
            ))}
          </nav>
          <BuscaDaLoja />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 bg-superficie">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <ColunaRodape titulo="Ajuda">
            <Link to="/loja/ajuda">Central de ajuda</Link>
            <Link to="/loja/chamados">Meus chamados</Link>
          </ColunaRodape>
          <ColunaRodape titulo="Comprar">
            {ativas.slice(0, 6).map((c) => (
              <Link key={c.id_categoria} to={`/loja/produtos?categoria=${c.id_categoria}`}>{c.nome}</Link>
            ))}
          </ColunaRodape>
          <ColunaRodape titulo="Atendimento">
            <Link to="/loja/chamados/novo">Chat no site</Link>
            <span className="text-muted-foreground">Seg. a sáb., 9h às 21h<br />Dom. e feriados, 10h às 16h</span>
          </ColunaRodape>
        </div>
        <div className="mx-auto max-w-7xl border-t px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © 2026 Casa Lorenzi · Formas de pagamento: Pix, cartão de crédito, cartão de débito e dinheiro nas lojas
        </div>
      </footer>
    </div>
  )
}

function linkCategoria(ativa) {
  return cn(
    'shrink-0 border-b py-1 text-xs uppercase tracking-[0.12em] transition-colors',
    ativa ? 'border-foreground' : 'border-transparent hover:border-foreground',
  )
}

function ColunaRodape({ titulo, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm [&_a:hover]:underline">{children}</div>
    </div>
  )
}

function BuscaDaLoja() {
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [termo, setTermo] = useState(params.get('busca') ?? '')

  function buscar(evento) {
    evento.preventDefault()
    const texto = termo.trim()
    navegar(texto ? `/loja/produtos?busca=${encodeURIComponent(texto)}` : '/loja/produtos')
  }

  return (
    <form role="search" onSubmit={buscar} className="flex w-full items-center gap-2 border-b border-foreground py-1 sm:w-72">
      <Search className="size-4 shrink-0" aria-hidden="true" />
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
