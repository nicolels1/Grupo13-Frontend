import type { ReactNode } from 'react'
import { ChevronRight, CircleHelp, MapPin, MessageCircle, Package } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { api, type Esquema } from '@/lib/api'
import { plural } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { pedidosDoCliente, resumoDosPedidos } from './pedidosDaConta'
import { useChamadosDaConta } from './useChamadosDaConta'

// visão geral da conta: um cartão para cada seção, com o ícone na cor dela e o que importa de relance
export function VisaoGeralConta() {
  const { perfil } = useAuth()
  const chamados = useChamadosDaConta()
  const pedidos = useCarregar(() => api<Esquema<'Pagina_PedidoSaida_'>>('/pedidos', { params: { limit: 100 } }), [])
  const enderecos = useCarregar(() => api<Esquema<'Lista_EnderecoSaida_'>>('/enderecos'), [])
  const meusPedidos = pedidos.dados ? pedidosDoCliente(pedidos.dados.items) : null
  const resumo = meusPedidos ? resumoDosPedidos(meusPedidos) : null
  const quantosEnderecos = enderecos.dados?.items.length

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Visão geral da conta</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bloco para="/loja/pedidos" cor="bg-marinho" preenchido="hover:border-marinho hover:bg-marinho" icone={<Package className="size-6" aria-hidden="true" />} titulo="Meus pedidos">
          {!resumo ? null : meusPedidos?.length === 0 ? (
            <Linha>Você ainda não tem pedidos.</Linha>
          ) : (
            <>
              {resumo.aguardando > 0 && <Linha destaque>{plural(resumo.aguardando, 'aguardando pagamento', 'aguardando pagamento')}</Linha>}
              {resumo.aCaminho > 0 && <Linha>{plural(resumo.aCaminho, 'pedido a caminho', 'pedidos a caminho')}</Linha>}
              {resumo.paraAvaliar > 0 && <Linha>{plural(resumo.paraAvaliar, 'peça para avaliar', 'peças para avaliar')}</Linha>}
              {resumo.aguardando + resumo.aCaminho + resumo.paraAvaliar === 0 && (
                <Linha>{plural(meusPedidos?.length ?? 0, 'pedido', 'pedidos')}, nada pendente.</Linha>
              )}
            </>
          )}
        </Bloco>

        <Bloco para="/loja/chamados" cor="bg-aco" preenchido="hover:border-aco hover:bg-aco" icone={<MessageCircle className="size-6" aria-hidden="true" />} titulo="Chamados">
          {!chamados.carregado ? null : (
            <>
              {chamados.naoLidas > 0 && <Linha destaque>{plural(chamados.naoLidas, 'resposta nova', 'respostas novas')}</Linha>}
              <Linha>
                {chamados.abertos > 0
                  ? plural(chamados.abertos, 'chamado aberto', 'chamados abertos')
                  : 'Nenhum chamado aberto. Converse com a equipe sobre pedidos, trocas e dúvidas.'}
              </Linha>
            </>
          )}
        </Bloco>

        <Bloco para="/loja/enderecos" cor="bg-ardosia" preenchido="hover:border-ardosia hover:bg-ardosia" icone={<MapPin className="size-6" aria-hidden="true" />} titulo="Endereços">
          {quantosEnderecos === undefined ? null : (
            <Linha>
              {quantosEnderecos === 0
                ? 'Nenhum endereço salvo ainda.'
                : `${plural(quantosEnderecos, 'endereço salvo', 'endereços salvos')} para a entrega.`}
            </Linha>
          )}
        </Bloco>

        {/* sem texto pequeno: preenchido de terracota, só letra grande tem contraste em branco */}
        <Bloco para="/loja/ajuda" cor="bg-terracota" preenchido="hover:border-terracota hover:bg-terracota" icone={<CircleHelp className="size-6" aria-hidden="true" />} titulo="Ajuda" />
      </div>

      <section aria-labelledby="titulo-dados" className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 id="titulo-dados" className="mb-4 font-titulo text-2xl">Seus dados</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium">{perfil?.nome}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="font-medium break-all">{perfil?.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

// linha de informação dentro do bloco; "destaque" marca o que pede ação com um ponto terracota
function Linha({ destaque, children }: { destaque?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 text-sm group-hover:text-white',
        destaque ? 'font-medium text-foreground' : 'text-muted-foreground',
      )}
    >
      {destaque && <span className="size-2 shrink-0 rounded-full bg-terracota ring-2 ring-background" aria-hidden="true" />}
      {children}
    </span>
  )
}

// cartão clicável inteiro: quadrado do ícone na cor da seção e, ao passar o mouse, o cartão
// todo pinta nessa cor com o texto em branco
function Bloco({ para, cor, preenchido, icone, titulo, children }: {
  para: string
  cor: string
  preenchido: string
  icone: ReactNode
  titulo: string
  children?: ReactNode
}) {
  return (
    <Link
      to={para}
      className={cn(
        'group flex min-h-44 flex-col justify-between gap-6 rounded-xl border bg-background p-6 shadow-xs transition-colors hover:text-white hover:shadow-md',
        preenchido,
      )}
    >
      <span className="flex items-start justify-between">
        <span className={cn('flex size-12 items-center justify-center rounded-lg text-white transition-colors group-hover:bg-white/15', cor)}>{icone}</span>
        <ChevronRight
          className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-white motion-reduce:transition-none"
          aria-hidden="true"
        />
      </span>
      <span className="space-y-1.5">
        <span className="block font-titulo text-2xl">{titulo}</span>
        {children && <span className="block space-y-1">{children}</span>}
      </span>
    </Link>
  )
}
