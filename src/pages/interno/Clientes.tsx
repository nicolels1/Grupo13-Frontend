import { useState, type ChangeEvent } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { api, type Esquema } from '@/lib/api'
import { mascaraCpf } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { nomeDoCliente, telefoneFormatado } from './clientes/regrasCliente'

const POR_PAGINA = 25

// clientes da Vulto que ainda não criaram conta (P2): a busca e a lista; cada linha abre a ficha, com os
// pontos, os pedidos e os chamados da pessoa. Quem tem conta continua no Caixa, pela busca por CPF
export function Clientes() {
  const [busca, setBusca] = useState('')
  const [offset, setOffset] = useState(0)
  const lista = useCarregar(
    () => api<Esquema<'Pagina_ClienteSemContaSaida_'>>('/vendas/clientes-sem-conta', {
      params: { busca: busca.trim() || undefined, limit: POR_PAGINA, offset },
    }),
    [busca, offset],
  )

  function buscar(e: ChangeEvent<HTMLInputElement>) {
    setBusca(e.target.value)
    setOffset(0)
  }

  return (
    <>
      <Cabecalho titulo="Clientes" subtitulo="Clientes da Vulto que ainda não criaram conta: cadastro, pontos, pedidos e chamados." />

      <label className="mb-4 flex h-9 max-w-md items-center gap-2 border border-input px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Buscar cliente</span>
        <input
          value={busca}
          onChange={buscar}
          placeholder="CPF, telefone, nome ou e-mail"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {lista.erro && <Aviso mensagem={lista.erro} />}
      {lista.carregando && !lista.dados && <Carregando />}
      {lista.dados?.items.length === 0 && (
        <Vazio>{busca.trim() ? 'Nenhum cliente encontrado. CPF e telefone precisam estar completos.' : 'Nenhum cliente da Vulto sem conta.'}</Vazio>
      )}
      {lista.dados && lista.dados.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pl-2 font-medium">Cliente</th>
                <th className="font-medium">CPF</th>
                <th className="font-medium">E-mail</th>
                <th className="font-medium">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {lista.dados.items.map((c) => (
                <tr key={c.id_cliente_sem_conta} className="border-b hover:bg-superficie">
                  <td className="py-3 pl-2">
                    <Link to={`/interno/clientes/${c.id_cliente_sem_conta}`} className="hover:underline">{nomeDoCliente(c)}</Link>
                  </td>
                  <td className="tabular-nums">{c.cpf ? mascaraCpf(c.cpf) : '—'}</td>
                  <td className="break-all text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="tabular-nums text-muted-foreground">{telefoneFormatado(c.telefone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="clientes" />
    </>
  )
}
