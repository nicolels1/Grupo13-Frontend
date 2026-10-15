import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Paginacao } from '@/components/Navegacao'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { STATUS_CONTA } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { Painel, PainelLateral } from './paineis'

type Modelo = Esquema<'ModeloSaida'>
type Unidade = Esquema<'UnidadeSaida'>
type Pessoa = Esquema<'UsuarioDetalhe'>
type ListaModelos = Esquema<'Lista_ModeloSaida_'>
type ListaPermissoes = Esquema<'Lista_PermissaoSaida_'>
type Metodo = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

// aba Pessoas da Gestão: lista de contas internas, convite e detalhe de cada pessoa

const POR_PAGINA = 25

export function Pessoas() {
  const { unidades } = useUnidadeEscolhida()
  const [busca, setBusca] = useState('')
  const [idModelo, setIdModelo] = useState('')
  const [offset, setOffset] = useState(0)
  // id da pessoa aberta, 'nova' ou null
  const [aberta, setAberta] = useState<string | null>(null)
  const modelos = useCarregar(() => api<ListaModelos>('/modelos-acesso'), [])
  const lista = useCarregar(
    () => api<Esquema<'Pagina_UsuarioItem_'>>('/usuarios', { params: { tipo_conta: 'interna', busca: busca.trim(), id_modelo_acesso: idModelo, limit: POR_PAGINA, offset } }),
    [busca, idModelo, offset],
  )
  // Admins primeiro (e em destaque); o resto na ordem da API. A lista não diz quem é Admin, mas
  // traz o modelo de cada pessoa, e os modelos dizem qual é o de Admin
  const modelosAdmin = new Set((modelos.dados?.items ?? []).filter((m) => m.eh_admin).map((m) => m.id_modelo))
  const ehAdminDaLista = (id: number | null) => id !== null && modelosAdmin.has(id)
  const pessoasEmOrdem = [...(lista.dados?.items ?? [])].sort(
    (a, b) => Number(ehAdminDaLista(b.id_modelo_acesso)) - Number(ehAdminDaLista(a.id_modelo_acesso)),
  )
  const filtro = (setter: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value)
    setOffset(0)
  }

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_26rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3 sm:max-w-80">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Buscar nome ou e-mail</span>
              <input value={busca} onChange={filtro(setBusca)} placeholder="Buscar nome ou e-mail" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <Select aria-label="Modelo de acesso" value={idModelo} onChange={filtro(setIdModelo)} className="w-auto">
              <option value="">Todos os modelos</option>
              {modelos.dados?.items.map((m) => <option key={m.id_modelo} value={m.id_modelo}>{m.nome}</option>)}
            </Select>
          </div>
          <Button size="lg" className="h-10 px-4" onClick={() => setAberta('nova')}>
            <Plus aria-hidden="true" /> Convidar pessoa
          </Button>
        </div>

        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados?.items.length === 0 && <Vazio>Ninguém encontrado.</Vazio>}
        {lista.dados && lista.dados.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pl-2 font-medium">Pessoa</th>
                  <th className="font-medium">Modelo de acesso</th>
                  <th className="font-medium">Unidade</th>
                  <th className="font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {pessoasEmOrdem.map((p) => (
                  <tr
                    key={p.id_usuario}
                    className={cn(
                      'cursor-pointer border-b',
                      ehAdminDaLista(p.id_modelo_acesso)
                        ? cn('bg-aco-fundo hover:bg-aco-fundo/70', aberta === p.id_usuario && 'bg-aco-fundo/70')
                        : cn('hover:bg-superficie', aberta === p.id_usuario && 'bg-superficie'),
                    )}
                    onClick={() => setAberta(p.id_usuario)}
                  >
                    <td className="py-3 pl-2">
                      <button type="button" className="text-left font-medium hover:underline">{p.nome}</button>
                      <span className="block text-muted-foreground">{p.email}</span>
                    </td>
                    <td>{p.modelo_acesso ?? '—'}</td>
                    <td>{p.unidade ?? '—'}</td>
                    <td className={cn(p.status_conta !== 'ativa' && 'text-muted-foreground')}>{STATUS_CONTA[p.status_conta]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="pessoas" />
      </div>

      <PainelLateral
        aberto={aberta === 'nova'}
        titulo="Convidar pessoa"
        descricao="Conta interna com o modelo de acesso escolhido."
        aoFechar={() => setAberta(null)}
      >
        <ConvidarPessoa
          modelos={modelos.dados?.items ?? []}
          unidades={unidades}
          aoCriar={(pessoa) => { lista.recarregar(); setAberta(pessoa.id_usuario) }}
        />
      </PainelLateral>
      {aberta && aberta !== 'nova' && (
        <DetalhePessoa
          key={aberta}
          idUsuario={aberta}
          modelos={modelos.dados?.items ?? []}
          unidades={unidades}
          aoFechar={() => setAberta(null)}
          aoMudar={lista.recarregar}
        />
      )}
    </div>
  )
}

function ConvidarPessoa({ modelos, unidades, aoCriar }: {
  modelos: Modelo[]
  unidades: Unidade[]
  aoCriar: (pessoa: Pessoa) => void
}) {
  const [form, setForm] = useState({ nome: '', email: '', id_modelo_acesso: '', id_unidade: '', senha_provisoria: '' })
  const { enviar, enviando, erro } = useEnviar()
  const mudar = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [campo]: e.target.value })

  async function convidar(evento: FormEvent) {
    evento.preventDefault()
    const pessoa = await enviar(() => api<Pessoa>('/usuarios', {
      metodo: 'POST',
      corpo: {
        nome: form.nome,
        email: form.email,
        id_modelo_acesso: Number(form.id_modelo_acesso),
        id_unidade: form.id_unidade ? Number(form.id_unidade) : null,
        senha_provisoria: form.senha_provisoria || null,
      },
    }))
    if (pessoa) aoCriar(pessoa)
  }

  return (
    <form onSubmit={convidar} className="space-y-4">
      <Campo id="conv-nome" rotulo="Nome">
        <Input id="conv-nome" value={form.nome} onChange={mudar('nome')} minLength={2} maxLength={150} className="bg-background" required />
      </Campo>
      <Campo id="conv-email" rotulo="E-mail corporativo">
        <Input id="conv-email" type="email" value={form.email} onChange={mudar('email')} className="bg-background" required />
      </Campo>
      <Campo id="conv-modelo" rotulo="Modelo de acesso">
        <Select id="conv-modelo" value={form.id_modelo_acesso} onChange={mudar('id_modelo_acesso')} className="bg-background" required>
          <option value="" disabled>Escolha</option>
          {modelos.filter((m) => m.ativo).map((m) => <option key={m.id_modelo} value={m.id_modelo}>{m.nome}</option>)}
        </Select>
      </Campo>
      <Campo id="conv-unidade" rotulo="Unidade" opcional dica="Só define a unidade que aparece primeiro nas telas.">
        <Select id="conv-unidade" value={form.id_unidade} onChange={mudar('id_unidade')} className="bg-background">
          <option value="">Nenhuma</option>
          {unidades.filter((u) => u.ativo).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
        </Select>
      </Campo>
      <Campo id="conv-senha" rotulo="Senha provisória" opcional dica="Vazia: a pessoa recebe um convite por e-mail para criar a senha.">
        <Input id="conv-senha" type="text" value={form.senha_provisoria} onChange={mudar('senha_provisoria')} minLength={6} maxLength={72} className="bg-background" autoComplete="off" />
      </Campo>
      {erro && <Aviso mensagem={erro} />}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={enviando}>{enviando ? 'Criando...' : 'Criar conta'}</Button>
    </form>
  )
}

function DetalhePessoa({ idUsuario, modelos, unidades, aoFechar, aoMudar }: {
  idUsuario: string
  modelos: Modelo[]
  unidades: Unidade[]
  aoFechar: () => void
  aoMudar: () => void
}) {
  const pessoa = useCarregar(() => api<Pessoa>(`/usuarios/${idUsuario}`), [idUsuario])
  const permissoes = useCarregar(() => api<ListaPermissoes>('/permissoes'), [])
  const [aviso, setAviso] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function alterar(caminho: string, metodo: Metodo, corpo: object | undefined, mensagem: string) {
    setAviso(null)
    const ok = await enviar(() => api<unknown>(`/usuarios/${idUsuario}${caminho}`, { metodo, corpo }))
    if (ok) {
      setAviso(mensagem)
      pessoa.recarregar()
      aoMudar()
    }
  }

  if (pessoa.carregando && !pessoa.dados) return <Painel titulo="Pessoa" aoFechar={aoFechar}><Carregando /></Painel>
  if (pessoa.erro || !pessoa.dados) return <Painel titulo="Pessoa" aoFechar={aoFechar}><Aviso mensagem={pessoa.erro ?? 'Pessoa não encontrada.'} /></Painel>
  const p = pessoa.dados
  const ehAdmin = p.modelo_acesso?.eh_admin
  const excecao = (codigo: string) => p.excecoes.find((e) => e.codigo === codigo)?.efeito ?? ''

  function mudarExcecao(codigo: string, efeito: string) {
    if (!efeito) return alterar(`/excecoes/${codigo}`, 'DELETE', undefined, 'Exceção removida.')
    return alterar(`/excecoes/${codigo}`, 'PUT', { efeito }, 'Exceção salva.')
  }

  return (
    <Painel titulo={p.nome} aoFechar={aoFechar}>
      <p className="-mt-3 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        <span>{p.email}</span>
        <span>{STATUS_CONTA[p.status_conta]}</span>
      </p>
      {p.convite_pendente && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-input bg-background p-3 text-sm">
          A pessoa ainda não aceitou o convite.
          <Button variant="outline" size="sm" disabled={enviando} onClick={() => alterar('/reenviar-convite', 'POST', undefined, 'Convite reenviado. O link vale 24 horas.')}>
            Reenviar convite
          </Button>
        </div>
      )}

      <Campo id="pes-modelo" rotulo="Modelo de acesso">
        <Select
          id="pes-modelo"
          value={p.modelo_acesso?.id_modelo ?? ''}
          disabled={enviando}
          onChange={(e) => alterar('', 'PATCH', { id_modelo_acesso: Number(e.target.value) }, 'Modelo de acesso trocado.')}
          className="bg-background"
        >
          {modelos.filter((m) => m.ativo || m.id_modelo === p.modelo_acesso?.id_modelo).map((m) => <option key={m.id_modelo} value={m.id_modelo}>{m.nome}</option>)}
        </Select>
      </Campo>
      <Campo id="pes-unidade" rotulo="Unidade">
        <Select
          id="pes-unidade"
          value={p.id_unidade ?? ''}
          disabled={enviando}
          onChange={(e) => alterar('', 'PATCH', { id_unidade: e.target.value ? Number(e.target.value) : null }, 'Unidade trocada.')}
          className="bg-background"
        >
          <option value="">Nenhuma</option>
          {unidades.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
        </Select>
      </Campo>

      {!ehAdmin && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Exceções desta pessoa</h3>
          <p className="text-xs text-muted-foreground">Acrescenta ou retira uma permissão só desta pessoa, além do modelo.</p>
          {permissoes.erro && <Aviso mensagem={permissoes.erro} />}
          <ul className="text-sm">
            {permissoes.dados?.items.filter((perm) => !perm.so_admin).map((perm) => {
              const efeito = excecao(perm.codigo)
              const temNoModelo = p.permissoes.includes(perm.codigo) !== (efeito === 'acrescentar')
              return (
                <li key={perm.codigo} className="flex items-center justify-between gap-2 border-b py-1.5">
                  <span className={cn(efeito && 'font-medium')}>
                    {perm.descricao}
                    {!efeito && <span className="ml-1 text-xs text-muted-foreground">{temNoModelo ? '(pelo modelo)' : ''}</span>}
                  </span>
                  <Select
                    aria-label={`Exceção: ${perm.descricao}`}
                    value={efeito}
                    disabled={enviando}
                    onChange={(e) => mudarExcecao(perm.codigo, e.target.value)}
                    className="h-8 w-36 bg-background text-xs"
                  >
                    <option value="">Como no modelo</option>
                    <option value="acrescentar">Acrescentar</option>
                    <option value="retirar">Retirar</option>
                  </Select>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {erro && <Aviso mensagem={erro} />}
      {aviso && <Sucesso>{aviso}</Sucesso>}

      <div className="border-t pt-4">
        {p.status_conta === 'inativa' ? (
          <Button variant="outline" disabled={enviando} onClick={() => alterar('', 'PATCH', { status_conta: 'ativa' }, 'Conta reativada.')}>
            Reativar conta
          </Button>
        ) : (
          <Button variant="destructive" disabled={enviando} onClick={() => alterar('', 'PATCH', { status_conta: 'inativa' }, 'Conta desativada: o login foi bloqueado.')}>
            Desativar conta
          </Button>
        )}
      </div>
    </Painel>
  )
}
