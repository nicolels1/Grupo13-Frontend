import { Plus } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Status } from '@/components/Status'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, haQuanto } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import type { ContextoChamados } from './chamados/contexto'
import { IconeDaCategoria } from './chamados/IconeDaCategoria'

type Chamado = Esquema<'ChamadoSaida'>

// /loja/chamados dentro da área "Minha conta": um cartão só, com a lista à esquerda e a conversa
// (ou o chamado novo) à direita. No computador o cartão tem altura fixa e cada lado rola sozinho;
// no celular aparece um de cada vez, a lista ou a conversa
export function ChamadosCliente() {
  const local = useLocation()
  const lista = useCarregar(() => api<Esquema<'Pagina_ChamadoSaida_'>>('/chamados', { params: { limit: 50 } }), [])
  const naLista = local.pathname.replace(/\/$/, '') === '/loja/chamados'
  const contexto: ContextoChamados = { recarregarLista: lista.recarregar }
  const chamados = lista.dados?.items ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Chamados</h1>
          <p className="text-sm text-muted-foreground">Converse com a equipe sobre pedidos, trocas e dúvidas.</p>
        </div>
        <Link to="/loja/chamados/novo" className={cn(buttonVariants({ size: 'loja' }), 'rounded-full sm:w-auto')}>
          <Plus className="size-4" aria-hidden="true" />
          Novo chamado
        </Link>
      </div>

      <div className="grid overflow-hidden rounded-xl border bg-background shadow-xs lg:h-[clamp(32rem,calc(100dvh-8rem),44rem)] lg:grid-cols-[21rem_minmax(0,1fr)]">
        <nav aria-label="Seus chamados" className={cn('flex min-h-0 flex-col lg:border-r', !naLista && 'hidden lg:flex')}>
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
            <span className="font-medium">Seus chamados</span>
            {lista.dados && <span className="rounded-full bg-aco-fundo px-2.5 py-0.5 text-xs font-medium text-marinho tabular-nums">{lista.dados.total}</span>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.carregando && !lista.dados && <Carregando />}
            {lista.erro && <div className="p-4"><Aviso mensagem={lista.erro} /></div>}
            {lista.dados && chamados.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
            )}
            <ul className="divide-y">
              {chamados.map((chamado) => (
                <li key={chamado.id_chamado}>
                  <ItemDaLista chamado={chamado} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <section className={cn('flex min-h-0 min-w-0 flex-col', naLista && 'hidden lg:flex')}>
          <Outlet context={contexto} />
        </section>
      </div>
    </div>
  )
}

// linha da lista: ícone do assunto (aço; cinza quando concluído), título, há quanto tempo mudou,
// situação e o contador terracota de respostas novas
function ItemDaLista({ chamado }: { chamado: Chamado }) {
  const concluido = chamado.status === 'concluido'
  const novas = chamado.mensagens_nao_lidas
  return (
    <NavLink
      to={`/loja/chamados/${chamado.id_chamado}`}
      className={({ isActive }) =>
        cn(
          'group flex gap-3 border-l-[3px] px-4 py-4 transition-colors',
          isActive ? 'border-aco bg-aco-fundo' : 'border-transparent hover:bg-superficie',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              concluido ? 'bg-superficie text-muted-foreground' : isActive ? 'bg-aco text-white' : 'bg-aco-fundo text-aco',
            )}
          >
            <IconeDaCategoria categoria={chamado.categoria} className="size-5" />
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className={cn('truncate text-sm', novas > 0 ? 'font-semibold' : 'font-medium')}>{chamado.assunto}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{haQuanto(chamado.atualizado_em)}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Status tipo="chamado" valor={chamado.status} />
              <span className="truncate">{CATEGORIAS_CHAMADO[chamado.categoria]}</span>
              {novas > 0 && (
                <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-terracota px-1.5 font-medium text-white tabular-nums">
                  {novas}
                  <span className="sr-only"> {novas === 1 ? 'resposta nova' : 'respostas novas'}</span>
                </span>
              )}
            </span>
          </span>
        </>
      )}
    </NavLink>
  )
}
