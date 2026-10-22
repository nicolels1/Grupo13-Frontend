import { useState, type ChangeEvent } from 'react'
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { api, type Esquema } from '@/lib/api'
import { mascaraCpf, STATUS_CONTA } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { caminhoDaFicha, nomeDoCliente, telefoneFormatado, type TipoCliente } from './clientes/regrasCliente'

const POR_PAGINA = 25

type PaginaComConta = Esquema<'Pagina_ClienteComConta_'>
type PaginaSemConta = Esquema<'Pagina_ClienteSemContaSaida_'>

// cada aba é uma lista do backend, com a sua paginação; a busca vale para as duas
const LISTAS: Record<TipoCliente, string> = { conta: '/vendas/clientes-com-conta', 'sem-conta': '/vendas/clientes-sem-conta' }

// clientes da plataforma: a conta é uma só nas duas lojas, então a separação é entre quem tem conta e quem
// veio da Vulto sem conta (P2), até criá-la. Cada linha abre a ficha, com os pontos das duas lojas, os
// pedidos e os chamados da pessoa. A aba fica no endereço (?aba=sem-conta), para dar para mandar o link
export function Clientes() {
  const [params, setParams] = useSearchParams()
  const aba: TipoCliente = params.get('aba') === 'sem-conta' ? 'sem-conta' : 'conta'
  const [busca, setBusca] = useState('')
  const [offset, setOffset] = useState(0)
  const termo = busca.trim() || undefined

  // a lista vem marcada com a aba dela: ao trocar de aba, a anterior continua na carga até a nova chegar,
  // e não pode ser desenhada com a tabela da outra (cada aba tem um formato)
  const carga = useCarregar(
    () => api<PaginaComConta | PaginaSemConta>(LISTAS[aba], { params: { busca: termo, limit: POR_PAGINA, offset } })
      .then((pagina) => ({ aba, pagina })),
    [aba, termo, offset],
  )
  const lista = { ...carga, dados: carga.dados?.aba === aba ? carga.dados.pagina : null }
  // quantos cada aba tem com a busca de agora: diz em qual das duas a pessoa está
  const contagens = useCarregar(
    () => Promise.all((['conta', 'sem-conta'] as const).map((t) => api<{ total: number }>(LISTAS[t], { params: { busca: termo, limit: 1 } })
      .then((r) => r.total))),
    [termo],
  )

  function buscar(e: ChangeEvent<HTMLInputElement>) {
    setBusca(e.target.value)
    setOffset(0)
  }

  function trocarAba(nova: TipoCliente) {
    setParams(nova === 'sem-conta' ? { aba: nova } : {}, { replace: true })
    setOffset(0)
  }

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        subtitulo="Cadastro, pontos das duas lojas, pedidos e chamados de cada cliente."
        abas={
          <Abas
            semLinha
            rotulo="Tipos de cliente"
            valor={aba}
            aoMudar={trocarAba}
            abas={[
              { valor: 'conta', rotulo: 'Com conta', contagem: contagens.dados?.[0] },
              { valor: 'sem-conta', rotulo: 'Sem conta (Vulto)', contagem: contagens.dados?.[1] },
            ]}
          />
        }
      />

      <label className="mb-4 flex h-9 max-w-md items-center gap-2 border border-input px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Buscar cliente</span>
        <input
          value={busca}
          onChange={buscar}
          placeholder={aba === 'conta' ? 'CPF, nome ou e-mail' : 'CPF, telefone, nome ou e-mail'}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {lista.erro && <Aviso mensagem={lista.erro} />}
      {!lista.dados && !lista.erro && <Carregando />}
      {lista.dados?.items.length === 0 && (
        <Vazio>
          {termo
            ? `Nenhum cliente ${aba === 'conta' ? 'com conta' : 'sem conta'} encontrado. ${aba === 'conta' ? 'O CPF precisa' : 'CPF e telefone precisam'} estar completos.`
            : aba === 'conta' ? 'Nenhum cliente com conta.' : 'Nenhum cliente da Vulto sem conta.'}
        </Vazio>
      )}
      {lista.dados && lista.dados.items.length > 0 && (
        aba === 'conta'
          ? <TabelaComConta clientes={(lista.dados as PaginaComConta).items} />
          : <TabelaSemConta clientes={(lista.dados as PaginaSemConta).items} />
      )}
      <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="clientes" />
    </>
  )
}

const CABECA = 'text-left text-xs text-muted-foreground'

function TabelaComConta({ clientes }: { clientes: PaginaComConta['items'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className={CABECA}>
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Cliente</th>
            <th className="font-medium">CPF</th>
            <th className="font-medium">E-mail</th>
            <th className="font-medium">Conta</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id_usuario} className="border-b hover:bg-superficie">
              <td className="py-3 pl-2">
                <Link to={caminhoDaFicha('conta', c.id_usuario)} className="hover:underline">{c.nome}</Link>
                {c.id_cliente_sem_conta !== null && <Etiqueta className="ml-2">Veio da Vulto</Etiqueta>}
              </td>
              <td className="tabular-nums">{c.cpf ? mascaraCpf(c.cpf) : '—'}</td>
              <td className="break-all text-muted-foreground">{c.email}</td>
              <td className="text-muted-foreground">{STATUS_CONTA[c.status_conta] ?? c.status_conta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelaSemConta({ clientes }: { clientes: PaginaSemConta['items'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className={CABECA}>
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Cliente</th>
            <th className="font-medium">CPF</th>
            <th className="font-medium">E-mail</th>
            <th className="font-medium">Telefone</th>
            <th className="font-medium">Conta</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id_cliente_sem_conta} className="border-b hover:bg-superficie">
              <td className="py-3 pl-2">
                {/* quem já criou a conta abre a ficha da conta, onde está o histórico */}
                <Link
                  to={c.id_usuario ? caminhoDaFicha('conta', c.id_usuario) : caminhoDaFicha('sem-conta', c.id_cliente_sem_conta)}
                  className="hover:underline"
                >
                  {nomeDoCliente(c)}
                </Link>
              </td>
              <td className="tabular-nums">{c.cpf ? mascaraCpf(c.cpf) : '—'}</td>
              <td className="break-all text-muted-foreground">{c.email ?? '—'}</td>
              <td className="tabular-nums text-muted-foreground">{telefoneFormatado(c.telefone)}</td>
              <td><Etiqueta>{c.id_usuario ? 'Já criou a conta' : 'Sem conta'}</Etiqueta></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
