import { LayoutGrid, LogOut, MapPin, MessageCircle, Package } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { useChamadosDaConta } from './useChamadosDaConta'

// seções da conta. Nas abas todas seguem o mesmo padrão (a aberta preenchida em marinho, como a faixa
// de cima); a cor de cada seção fica só nos cartões da visão geral
const SECOES = [
  { para: '/loja/conta', rotulo: 'Visão geral', icone: LayoutGrid, exata: true },
  { para: '/loja/pedidos', rotulo: 'Meus pedidos', icone: Package },
  { para: '/loja/chamados', rotulo: 'Chamados', icone: MessageCircle },
  { para: '/loja/enderecos', rotulo: 'Endereços', icone: MapPin },
]

// área "Minha conta": fica dentro do layout da loja (topo, categorias, busca e carrinho continuam).
// As seções viram abas logo abaixo da faixa marinho, para o conteúdo usar a largura toda;
// fundo superfície com o conteúdo em cartões brancos, para a área não parecer uma folha em branco.
// Só aqui os cantos são arredondados: o --radius do contêiner vale para botões, campos e cartões da área.
// O -mb-20 cobre a margem branca de cima do rodapé, para o fundo superfície ir até ele
export function AreaDaConta() {
  const { perfil, sair } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  // escrever avaliação nasce de Meus pedidos: a aba dele fica acesa lá também
  const emAvaliacao = local.pathname.startsWith('/loja/avaliar')
  const { naoLidas } = useChamadosDaConta()
  const primeiroNome = perfil?.nome.split(' ')[0] ?? ''

  function sairDaConta() {
    navegar('/loja', { replace: true })
    void sair()
  }

  return (
    <div className="-mb-20 bg-superficie pb-20 [--radius:0.625rem]">
      <div className="bg-marinho text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="text-sm text-white/80">Olá, {primeiroNome}</p>
          <p className="font-titulo text-4xl">Minha conta</p>
        </div>
      </div>

      {/* abas: no celular deslizam para o lado (sem mostrar a barra); "Sair" fica no fim, separado das seções */}
      <nav aria-label="Minha conta" className="border-b bg-background">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECOES.map(({ para, rotulo, icone: Icone, exata }) => (
            <li key={para} className="shrink-0">
              <NavLink
                to={para}
                end={exata}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-2.5 rounded-lg px-4 text-sm whitespace-nowrap transition-colors',
                    isActive || (emAvaliacao && para === '/loja/pedidos') ? 'bg-marinho font-medium text-white' : 'text-muted-foreground hover:bg-superficie hover:text-foreground',
                  )
                }
              >
                <Icone className="size-5" aria-hidden="true" />
                {rotulo}
                {para === '/loja/chamados' && naoLidas > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracota px-1.5 text-xs font-medium text-white tabular-nums">
                    {naoLidas}
                    <span className="sr-only"> {naoLidas === 1 ? 'resposta nova' : 'respostas novas'}</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          <li className="ml-auto shrink-0 pl-4">
            <button
              type="button"
              onClick={sairDaConta}
              className="flex h-10 items-center gap-2.5 rounded-lg px-4 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-superficie hover:text-foreground"
            >
              <LogOut className="size-5" aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-10">
        <Outlet />
      </div>
    </div>
  )
}
