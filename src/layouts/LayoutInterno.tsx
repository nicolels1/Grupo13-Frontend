import { useState } from 'react'
import { ChevronDown, MessageSquare, Store } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { cn } from 'cn'

import { AREAS, podeVerArea, veMarca } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Aviso } from '@/components/Estados'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUnidades } from '@/lib/listas'
import { useConversaAssistente } from '@/pages/interno/assistente/conversaAssistente'
import { PainelAssistente } from '@/pages/interno/assistente/PainelAssistente'
import type { UnidadeEscolhida } from './unidadeEscolhida'

// sublinhado da aba ativa na cor da área. Estoque (marinho) e Transferências (marinho-escuro)
// sumiriam sobre a faixa marinho-escura, então ficam em branco como as áreas sem cor própria.
const COR_DA_ABA: Record<string, string> = {
  pedidos: 'border-area-pedidos',
  atendimento: 'border-area-atendimento',
  avaliacoes: 'border-area-avaliacoes',
}

// plataforma interna: uma faixa com logo, áreas da conta, unidade em foco e o menu da pessoa
export function LayoutInterno() {
  const { perfil } = useAuth()
  const areas = AREAS.filter((area) => podeVerArea(perfil, area))
  // só as unidades das marcas que a pessoa vê: as da outra marca dariam 403 em toda tela
  const { dados: todas, erro: erroUnidades, recarregar: recarregarUnidades } = useUnidades()
  const unidades = (todas ?? []).filter((u) => veMarca(perfil, u.marca))
  // a unidade da conta é só o filtro inicial; dá para olhar qualquer outra
  const [unidade, setUnidade] = useState(perfil?.id_unidade ? String(perfil.id_unidade) : '')
  const contexto: UnidadeEscolhida = { unidade, setUnidade, unidades }
  // o assistente fica no layout: a conversa continua ao fechar o painel e trocar de tela
  const conversa = useConversaAssistente()
  const [assistenteAberto, setAssistenteAberto] = useState(false)
  // a unidade do topo vai para o assistente; fora da lista (carregando, de outra marca) conta como todas
  const unidadeDoTopo = unidades.find((u) => String(u.id_unidade) === unidade)
  const emFoco = unidadeDoTopo ? { id_unidade: unidadeDoTopo.id_unidade, nome: unidadeDoTopo.nome } : null

  // o filtro que vale precisa aparecer no seletor: sem opção para ele (lista carregando ou com erro, unidade
  // inativa ou de fora), o navegador mostraria "Todas" com outra unidade filtrando as telas
  const ativas = unidades.filter((u) => u.ativo)
  let foraDaLista: { rotulo: string; aviso: string | null } | null = null
  if (unidade && !ativas.some((u) => String(u.id_unidade) === unidade)) {
    const inativa = unidades.find((u) => String(u.id_unidade) === unidade)
    if (erroUnidades) foraDaLista = { rotulo: `Unidade ${unidade}`, aviso: null }
    else if (!todas) foraDaLista = { rotulo: 'Carregando unidades...', aviso: null }
    else if (inativa) {
      foraDaLista = { rotulo: `${inativa.nome} (inativa)`, aviso: `A unidade ${inativa.nome} está inativa. As telas seguem filtradas por ela até você escolher outra.` }
    } else {
      foraDaLista = { rotulo: `Unidade ${unidade} (indisponível)`, aviso: `A unidade ${unidade} não está entre as que sua conta vê. As telas seguem filtradas por ela até você escolher outra.` }
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="bg-marinho-escuro text-white">
        {/* duas linhas na mesma faixa: logo, unidade e pessoa em cima; as áreas embaixo (as nove não cabem ao lado da logo) */}
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 px-4 sm:px-6">
          <Logo para="/interno" className="py-4 text-lg" />

          <nav
            aria-label="Áreas"
            className="col-span-2 row-start-2 -mx-4 flex min-w-0 gap-6 overflow-x-auto border-t border-white/10 px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {areas.map((area) => (
              <NavLink
                key={area.caminho}
                to={area.caminho ? `/interno/${area.caminho}` : '/interno'}
                end={!area.caminho}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center border-b-2 py-3 text-sm transition-colors',
                    isActive
                      ? cn('font-medium text-white', COR_DA_ABA[area.caminho] ?? 'border-white')
                      : 'border-transparent text-white/70 hover:text-white',
                  )
                }
              >
                {area.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="col-start-2 row-start-1 flex items-center justify-end gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Store className="size-4 text-white/70" aria-hidden="true" />
              <span className="sr-only">Unidade em foco</span>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="max-w-44 bg-transparent py-1 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-ring [&>option]:text-foreground"
              >
                <option value="">Todas as unidades</option>
                {foraDaLista && <option value={unidade}>{foraDaLista.rotulo}</option>}
                {ativas.map((u) => (
                  <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setAssistenteAberto(true)}
              className="flex items-center gap-1.5 text-sm whitespace-nowrap outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              {/* no celular só o ícone, com o nome para o leitor de tela */}
              <span className="sr-only sm:not-sr-only">Assistente</span>
            </button>
            <MenuDaPessoa />
          </div>
        </div>
      </header>
      <PainelAssistente aberto={assistenteAberto} aoMudar={setAssistenteAberto} conversa={conversa} unidadeEmFoco={emFoco} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {erroUnidades && (
          <div className="mb-6">
            <Aviso
              titulo="Não foi possível carregar as unidades"
              mensagem={`${erroUnidades} ${unidade ? `As telas seguem filtradas pela unidade ${unidade}.` : 'As telas mostram todas as unidades.'}`}
            >
              <Button size="sm" variant="outline" onClick={recarregarUnidades}>Tentar de novo</Button>
            </Aviso>
          </div>
        )}
        {foraDaLista?.aviso && (
          <div className="mb-6">
            <Aviso titulo="Unidade fora da lista" mensagem={foraDaLista.aviso}>
              <Button size="sm" variant="outline" onClick={() => setUnidade('')}>Ver todas as unidades</Button>
            </Aviso>
          </div>
        )}
        <Outlet context={contexto} />
      </main>
    </div>
  )
}

function MenuDaPessoa() {
  const { perfil, sair } = useAuth()
  const navegar = useNavigate()
  if (!perfil) return null

  // vai para a loja antes de encerrar a sessão: sem isso a proteção do interno manda para /entrar
  function sairDaConta() {
    navegar('/loja', { replace: true })
    void sair()
  }
  const primeiroNome = perfil.nome.split(' ')[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm whitespace-nowrap outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        {primeiroNome}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* o rótulo do base-ui precisa estar dentro de um grupo */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground">
            <span className="block font-medium">{perfil.nome}</span>
            {perfil.modelo_acesso && (
              <span className="block font-normal text-muted-foreground">{perfil.modelo_acesso.nome}</span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sairDaConta}>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
