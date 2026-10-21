import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao, type CodigoPermissao } from '@/auth/areas'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { NomeDaLoja } from '@/components/Logo'
import { Cabecalho } from '@/components/Navegacao'
import { OrigemMigracao } from '@/components/OrigemMigracao'
import { Status } from '@/components/Status'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta, dataLonga, mascaraCpf, moeda, numero, plural } from '@/lib/formato'
import { lojaDaMarca } from '@/lib/lojaEscolhida'
import { useCarregar } from '@/lib/useCarregar'
import { nomeDaCategoria, saldosPorLoja } from '@/pages/loja/conta/pontosDaConta'
import { nomeDoCliente, rotuloConsentimento, rotuloMovimentoPontos, telefoneFormatado } from './regrasCliente'

type Cliente = Esquema<'ClienteSemContaSaida'>

// quem pode ver os pontos de um cliente (o mesmo do GET /fidelidade/clientes/pontos)
const VER_PONTOS: CodigoPermissao[] = ['atender_chamado', 'registrar_venda_fisica', 'gerenciar_fidelidade']
const CANAIS_VENDA: Record<string, string> = { loja: 'Loja', site: 'Site', app: 'App' }
// a ficha mostra os mais recentes; o resto fica nas áreas Pedidos e Atendimento
const ULTIMOS = 20

function Secao({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
        <h2 className="text-lg font-medium">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

// ficha de um cliente da Vulto sem conta: cadastro, pontos, pedidos, chamados e de onde o cadastro veio.
// Pontos e chamados só para quem pode vê-los (o backend confere de novo)
export function FichaCliente() {
  const { idCliente } = useParams()
  const { perfil } = useAuth()
  const cliente = useCarregar(() => api<Cliente>(`/vendas/clientes-sem-conta/${idCliente}`), [idCliente])
  const vePontos = VER_PONTOS.some((p) => temPermissao(perfil, p))
  const veChamados = temPermissao(perfil, 'atender_chamado')

  if (cliente.carregando && !cliente.dados) return <Carregando />
  if (cliente.erro || !cliente.dados) return <Aviso mensagem={cliente.erro ?? 'Cliente não encontrado.'} />
  const c = cliente.dados

  return (
    <>
      <Link to="/interno/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Clientes
      </Link>
      <Cabecalho
        titulo={nomeDoCliente(c)}
        subtitulo={c.id_usuario ? 'Cliente da Vulto que já criou a conta.' : 'Cliente da Vulto sem conta: entra com o CPF ou o e-mail quando criar a conta.'}
      />

      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Dado rotulo="CPF">{c.cpf ? mascaraCpf(c.cpf) : '—'}</Dado>
        <Dado rotulo="E-mail"><span className="break-all">{c.email ?? '—'}</span></Dado>
        <Dado rotulo="Telefone">{telefoneFormatado(c.telefone)}</Dado>
        <Dado rotulo="Mensagens da loja">{rotuloConsentimento(c.aceita_mensagem)}</Dado>
      </dl>

      {vePontos && <Pontos idCliente={c.id_cliente_sem_conta} />}
      <Pedidos idCliente={c.id_cliente_sem_conta} />
      {veChamados && <Chamados idCliente={c.id_cliente_sem_conta} />}

      <Secao titulo="Origem na Vulto">
        <OrigemMigracao tabela="cliente_sem_conta" idRegistro={c.id_cliente_sem_conta} />
      </Secao>
    </>
  )
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function Pontos({ idCliente }: { idCliente: number }) {
  const saldos = useCarregar(
    () => api<Esquema<'PontosDoCliente'>>('/fidelidade/clientes/pontos', { params: { id_cliente_sem_conta: idCliente } }),
    [idCliente],
  )
  const extrato = useCarregar(
    () => api<Esquema<'Pagina_MovimentoPontosSaida_'>>('/fidelidade/clientes/pontos/extrato', {
      params: { id_cliente_sem_conta: idCliente, limit: ULTIMOS },
    }),
    [idCliente],
  )

  return (
    <Secao titulo="Pontos">
      {saldos.erro && <Aviso mensagem={saldos.erro} />}
      {saldos.dados && (
        <ul className="mb-6 grid gap-4 sm:grid-cols-2">
          {saldosPorLoja(saldos.dados.saldos).map(({ loja, saldo }) => (
            <li key={loja} className="space-y-1 bg-superficie p-4 text-sm">
              <NomeDaLoja loja={loja} />
              {!saldo ? (
                <p className="text-muted-foreground">Sem pontos.</p>
              ) : (
                <>
                  <p><span className="text-2xl font-medium tabular-nums">{numero(saldo.saldo)}</span> pontos, valem {moeda(saldo.valor_em_reais)}</p>
                  <p className="text-muted-foreground">
                    {nomeDaCategoria(saldo.categoria)} desde {dataLonga(saldo.categoria_desde)}, {numero(saldo.ganhos_no_ano)} pontos ganhos no ano
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {extrato.erro && <Aviso mensagem={extrato.erro} />}
      {extrato.dados?.items.length === 0 && <Vazio>Nenhum movimento de pontos.</Vazio>}
      {extrato.dados && extrato.dados.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="pb-2 text-left text-xs text-muted-foreground">
              {extrato.dados.total > ULTIMOS ? `Os ${ULTIMOS} mais recentes de ${extrato.dados.total} movimentos` : 'Extrato'}
            </caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pl-2 font-medium">Data</th>
                <th className="font-medium">Loja</th>
                <th className="font-medium">Movimento</th>
                <th className="font-medium">Pedido</th>
                <th className="text-right font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {extrato.dados.items.map((m) => (
                <tr key={m.id_movimento} className="border-b">
                  <td className="py-2 pl-2 tabular-nums">{dataCurta(m.criado_em)}</td>
                  <td><NomeDaLoja loja={lojaDaMarca(m.marca)} className="text-xs" /></td>
                  <td>
                    {rotuloMovimentoPontos(m.tipo)}
                    {m.motivo && <span className="block text-xs text-muted-foreground">{m.motivo}</span>}
                  </td>
                  <td className="text-muted-foreground">{m.codigo_venda ?? '—'}</td>
                  <td className={cn('pr-2 text-right font-medium tabular-nums', m.pontos < 0 && 'text-ferrugem')}>
                    {m.pontos > 0 ? '+' : ''}{numero(m.pontos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  )
}

function Pedidos({ idCliente }: { idCliente: number }) {
  const pedidos = useCarregar(
    () => api<Esquema<'Pagina_PedidoSaida_'>>('/vendas/pedidos', { params: { id_cliente_sem_conta: idCliente, limit: ULTIMOS } }),
    [idCliente],
  )
  const total = pedidos.dados?.total ?? 0
  return (
    <Secao titulo="Pedidos" extra={pedidos.dados && <span className="text-sm text-muted-foreground">{plural(total, 'pedido')}</span>}>
      {pedidos.erro && <Aviso mensagem={pedidos.erro} />}
      {pedidos.dados?.items.length === 0 && <Vazio>Nenhum pedido.</Vazio>}
      {pedidos.dados && pedidos.dados.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pl-2 font-medium">Pedido</th>
                <th className="font-medium">Data</th>
                <th className="font-medium">Canal</th>
                <th className="font-medium">Unidade</th>
                <th className="text-right font-medium">Total</th>
                <th className="pl-6 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.dados.items.map((p) => (
                <tr key={p.id_pedido} className="border-b hover:bg-superficie">
                  <td className="py-2 pl-2">
                    <Link to={`/interno/pedidos?ver=${p.id_pedido}`} className="hover:underline">{p.codigo_venda}</Link>
                  </td>
                  <td className="tabular-nums">{dataCurta(p.criado_em)}</td>
                  <td>{CANAIS_VENDA[p.canal_venda] ?? p.canal_venda}</td>
                  <td className="text-muted-foreground">{p.unidade}</td>
                  <td className="text-right tabular-nums">{moeda(p.valor_total)}</td>
                  <td className="pl-6"><Status tipo="pedido" valor={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  )
}

function Chamados({ idCliente }: { idCliente: number }) {
  const chamados = useCarregar(
    () => api<Esquema<'Pagina_ChamadoSaida_'>>('/atendimento/chamados', { params: { id_cliente_sem_conta: idCliente, limit: ULTIMOS } }),
    [idCliente],
  )
  const total = chamados.dados?.total ?? 0
  return (
    <Secao titulo="Chamados" extra={chamados.dados && <span className="text-sm text-muted-foreground">{plural(total, 'chamado')}</span>}>
      {chamados.erro && <Aviso mensagem={chamados.erro} />}
      {chamados.dados?.items.length === 0 && <Vazio>Nenhum chamado.</Vazio>}
      {chamados.dados && chamados.dados.items.length > 0 && (
        <ul className="divide-y text-sm">
          {chamados.dados.items.map((ch) => (
            <li key={ch.id_chamado} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <Link to={`/interno/atendimento/${ch.id_chamado}`} className="min-w-0 hover:underline">
                <span className="font-medium">{ch.assunto}</span>
                <span className="block text-xs text-muted-foreground">
                  {CATEGORIAS_CHAMADO[ch.categoria] ?? ch.categoria}, {dataCurta(ch.criado_em)}
                  {ch.canal_externo && `, pelo ${ch.canal_externo === 'email' ? 'e-mail' : ch.canal_externo === 'whatsapp' ? 'WhatsApp' : 'Instagram'}`}
                </span>
              </Link>
              <Status tipo="chamado" valor={ch.status} />
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}
