import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { plural, STATUS_CONTA } from '@/lib/formato'
import { limparListas } from '@/lib/listas'
import { BLOCO_ACO } from './componentes/estilos'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Modelo = Esquema<'ModeloSaida'>
type Permissao = Esquema<'PermissaoSaida'>
type Unidade = Esquema<'UnidadeSaida'>
type Pessoa = Esquema<'UsuarioDetalhe'>
type ListaModelos = Esquema<'Lista_ModeloSaida_'>
type ListaPermissoes = Esquema<'Lista_PermissaoSaida_'>
type Metodo = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

const POR_PAGINA = 25

// grupos das permissões no editor de modelos (os códigos são os do banco)
const GRUPOS: [string, string[]][] = [
  ['Contas', ['gerenciar_contas', 'gerenciar_modelos_acesso']],
  ['Cadastros', ['gerenciar_catalogo', 'gerenciar_unidades']],
  ['Estoque', ['movimentar_estoque', 'definir_estoque_minimo']],
  ['Transferência', ['solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia']],
  ['Vendas', ['registrar_venda_fisica', 'preparar_entregar_pedido', 'cancelar_pedido_equipe', 'corrigir_cadastro_cliente']],
  ['Clientes', ['atender_chamado', 'moderar_avaliacoes']],
]

export function Gestao() {
  const [aba, setAba] = useState('pessoas')
  return (
    <>
      <Cabecalho
        titulo="Gestão"
        subtitulo="Quem usa a plataforma, o que cada modelo de acesso permite e as unidades da rede."
        abas={
          <Abas
            semLinha
            rotulo="Gestão"
            valor={aba}
            aoMudar={setAba}
            abas={[
              { valor: 'pessoas', rotulo: 'Pessoas' },
              { valor: 'modelos', rotulo: 'Modelos de acesso' },
              { valor: 'unidades', rotulo: 'Unidades' },
            ]}
          />
        }
      />
      {aba === 'pessoas' && <Pessoas />}
      {aba === 'modelos' && <Modelos />}
      {aba === 'unidades' && <Unidades />}
    </>
  )
}

// ---------- pessoas ----------

function Pessoas() {
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

function Painel({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return (
    <aside className="h-fit space-y-5 bg-superficie p-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar" onClick={aoFechar}><X /></Button>
      </div>
      {children}
    </aside>
  )
}

// painel lateral para criar (convidar pessoa, nova unidade), como Registrar movimentação no Estoque.
// Ver e editar o que já existe continua no Painel ao lado da lista
function PainelLateral({ aberto, titulo, descricao, aoFechar, children }: {
  aberto: boolean
  titulo: string
  descricao: string
  aoFechar: () => void
  children: ReactNode
}) {
  return (
    <Sheet open={aberto} onOpenChange={(abrir) => { if (!abrir) aoFechar() }}>
      <SheetContent className="overflow-y-auto sm:max-w-md!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg">{titulo}</SheetTitle>
          <SheetDescription>{descricao}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
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

// ---------- modelos de acesso ----------

// lista dos modelos à esquerda; à direita, o modelo escolhido com as permissões agrupadas por área
function Modelos() {
  const modelos = useCarregar(() => api<ListaModelos>('/modelos-acesso'), [])
  const permissoes = useCarregar(() => api<ListaPermissoes>('/permissoes'), [])
  // id do modelo aberto, 'novo' ou null (abre o primeiro)
  const [aberto, setAberto] = useState<number | 'novo' | null>(null)

  if (modelos.erro || permissoes.erro) return <Aviso mensagem={modelos.erro || permissoes.erro} />
  if (!modelos.dados || !permissoes.dados) return <Carregando />

  const lista = modelos.dados.items
  const escolhido = aberto === 'novo' ? null : (lista.find((m) => m.id_modelo === aberto) ?? lista[0])

  function aposSalvar(modelo: Modelo) {
    modelos.recarregar()
    setAberto(modelo.id_modelo)
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-3">
        <nav aria-label="Modelos de acesso" className="border-t border-foreground">
          {lista.map((m) => {
            const ativo = aberto !== 'novo' && escolhido?.id_modelo === m.id_modelo
            return (
              <button
                key={m.id_modelo}
                type="button"
                aria-current={ativo ? 'true' : undefined}
                onClick={() => setAberto(m.id_modelo)}
                className={cn('flex w-full items-baseline justify-between gap-3 border-b px-3 py-3 text-left hover:bg-superficie', ativo && 'bg-superficie')}
              >
                <span className={cn('font-medium', !m.ativo && 'text-muted-foreground line-through')}>{m.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.eh_admin ? 'todas' : plural(m.permissoes.length, 'permissão', 'permissões')}, {plural(m.pessoas, 'pessoa')}
                </span>
              </button>
            )
          })}
        </nav>
        <Button variant="outline" className="h-10 w-full" onClick={() => setAberto('novo')}>
          <Plus aria-hidden="true" /> Novo modelo
        </Button>
      </div>

      <EditorModelo
        key={aberto === 'novo' ? 'novo' : escolhido?.id_modelo}
        modelo={escolhido}
        modelos={lista}
        permissoes={permissoes.dados.items}
        aoSalvar={aposSalvar}
      />
    </div>
  )
}

// grupos na ordem de GRUPOS; permissão nova do banco que não está no mapa cai em "Outras"
function agruparPermissoes(permissoes: Permissao[]): [string, Permissao[]][] {
  const porCodigo: Record<string, Permissao> = Object.fromEntries(permissoes.map((p) => [p.codigo, p]))
  const conhecidos = new Set(GRUPOS.flatMap(([, codigos]) => codigos))
  const outras = permissoes.map((p) => p.codigo).filter((c) => !conhecidos.has(c))
  return [...GRUPOS, ['Outras', outras] as [string, string[]]]
    .map(([nome, codigos]): [string, Permissao[]] => [nome, codigos.map((c) => porCodigo[c]).filter((p): p is Permissao => Boolean(p))])
    .filter(([, lista]) => lista.length > 0)
}

function EditorModelo({ modelo, modelos, permissoes, aoSalvar }: {
  modelo: Modelo | null | undefined
  modelos: Modelo[]
  permissoes: Permissao[]
  aoSalvar: (modelo: Modelo) => void
}) {
  const novo = !modelo
  const [nome, setNome] = useState(modelo?.nome ?? '')
  const [marcadas, setMarcadas] = useState(() => new Set<string>(modelo?.permissoes ?? []))
  const [salvo, setSalvo] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  // as permissões da Gestão são só do Admin: ficam fora da edição dos outros modelos
  const editaveis = permissoes.filter((p) => !p.so_admin)
  const daGestao = permissoes.filter((p) => p.so_admin)
  const grupos = agruparPermissoes(editaveis)
  const original = new Set(modelo?.permissoes ?? [])
  const mudancas = editaveis.filter((p) => marcadas.has(p.codigo) !== original.has(p.codigo)).length
  const nomeMudou = Boolean(modelo) && nome.trim() !== modelo?.nome

  function marcar(codigos: string[], ligar: boolean) {
    setSalvo(null)
    const proximas = new Set(marcadas)
    for (const codigo of codigos) {
      if (ligar) proximas.add(codigo)
      else proximas.delete(codigo)
    }
    setMarcadas(proximas)
  }

  function copiarDe(idModelo: string) {
    const origem = modelos.find((m) => String(m.id_modelo) === idModelo)
    setMarcadas(new Set((origem?.permissoes ?? []).filter((c) => editaveis.some((p) => p.codigo === c))))
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(null)
    if (!modelo) {
      const criado = await enviar(() => api<Modelo>('/modelos-acesso', { metodo: 'POST', corpo: { nome, permissoes: [...marcadas] } }))
      if (criado) aoSalvar(criado)
      return
    }
    let atual: Modelo | undefined = modelo
    if (nomeMudou) {
      atual = await enviar(() => api<Modelo>(`/modelos-acesso/${modelo.id_modelo}`, { metodo: 'PATCH', corpo: { nome } }))
      if (!atual) return
    }
    if (mudancas > 0) {
      atual = await enviar(() => api<Modelo>(`/modelos-acesso/${modelo.id_modelo}/permissoes`, { metodo: 'PUT', corpo: { permissoes: [...marcadas] } }))
      if (!atual) return
    }
    setSalvo(`Modelo salvo. A mudança já vale para ${plural(modelo.pessoas, 'pessoa')}.`)
    aoSalvar(atual)
  }

  async function alternarAtivo() {
    if (!modelo) return
    setSalvo(null)
    const atual = await enviar(() => api<Modelo>(`/modelos-acesso/${modelo.id_modelo}`, { metodo: 'PATCH', corpo: { ativo: !modelo.ativo } }))
    if (atual) aoSalvar(atual)
  }

  if (modelo?.eh_admin) {
    return (
      <section className="space-y-4">
        <div className={cn(BLOCO_ACO, 'space-y-2')}>
          <h2 className="text-2xl font-medium">{modelo.nome}</h2>
          <p className="text-sm text-muted-foreground">{plural(modelo.pessoas, 'pessoa')} com este modelo.</p>
        </div>
        <p className="max-w-xl bg-superficie p-4 text-sm">
          O Admin tem todas as permissões, inclusive as que forem criadas depois, e é o único que gerencia contas,
          modelos de acesso e unidades. Por isso este modelo não é editado aqui.
        </p>
      </section>
    )
  }

  const travadoParaDesativar = !novo && modelo.ativo && modelo.pessoas > 0

  return (
    <form onSubmit={salvar} className="space-y-8">
      <div className={cn(BLOCO_ACO, 'space-y-2')}>
        <h2 className="text-2xl font-medium">{novo ? 'Novo modelo' : modelo.nome}</h2>
        {!novo && (
          <p className="text-sm text-muted-foreground">
            {plural(modelo.pessoas, 'pessoa')} com este modelo{!modelo.ativo && ' (desativado)'}. Mudanças valem na hora para todas elas;
            as exceções de cada pessoa ficam na conta dela.
          </p>
        )}
      </div>

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Campo id="modelo-nome" rotulo="Nome do modelo">
          <Input
            id="modelo-nome"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setSalvo(null) }}
            minLength={2}
            maxLength={100}
            placeholder="Ex.: Vendedor"
            required
          />
        </Campo>
        {novo && (
          <Campo id="modelo-base" rotulo="Começar igual a" opcional>
            <Select id="modelo-base" defaultValue="" onChange={(e) => copiarDe(e.target.value)}>
              <option value="">Nenhum (vazio)</option>
              {modelos.filter((m) => !m.eh_admin).map((m) => <option key={m.id_modelo} value={m.id_modelo}>{m.nome}</option>)}
            </Select>
          </Campo>
        )}
      </div>

      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {grupos.map(([grupo, lista]) => {
          const todas = lista.every((p) => marcadas.has(p.codigo))
          return (
            <fieldset key={grupo} className="space-y-1">
              <div className="flex items-baseline justify-between border-b border-foreground pb-2">
                <legend className="font-medium">{grupo}</legend>
                {lista.length > 1 && (
                  <button type="button" onClick={() => marcar(lista.map((p) => p.codigo), !todas)} className="text-xs underline underline-offset-2">
                    {todas ? 'Desmarcar todas' : 'Marcar todas'}
                  </button>
                )}
              </div>
              {lista.map((p) => {
                const ligada = marcadas.has(p.codigo)
                const mudou = ligada !== original.has(p.codigo)
                return (
                  <label key={p.codigo} className="flex cursor-pointer items-center gap-3 border-b py-2.5 text-sm hover:bg-superficie">
                    <input type="checkbox" checked={ligada} onChange={() => marcar([p.codigo], !ligada)} className="size-4 accent-marinho" />
                    <span className="flex-1">{p.descricao}</span>
                    {!novo && mudou && <span className="bg-terracota-fundo px-1.5 py-0.5 text-xs text-marinho-escuro shadow-[inset_2px_0_0_var(--terracota)]">{ligada ? 'vai ganhar' : 'vai perder'}</span>}
                  </label>
                )
              })}
            </fieldset>
          )
        })}
      </div>

      {daGestao.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Só o Admin tem: {daGestao.map((p) => p.descricao.toLowerCase()).join(', ')}.
        </p>
      )}

      {erro && <Aviso mensagem={erro} />}
      {salvo && <Sucesso>{salvo}</Sucesso>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        {novo ? <span /> : (
          <div className="space-y-1">
            <Button
              type="button"
              variant={modelo.ativo ? 'destructive' : 'outline'}
              disabled={enviando || travadoParaDesativar}
              onClick={alternarAtivo}
            >
              {modelo.ativo ? 'Desativar modelo' : 'Reativar modelo'}
            </Button>
            {travadoParaDesativar && (
              <p className="text-xs text-muted-foreground">Para desativar, troque antes o modelo das {plural(modelo.pessoas, 'pessoa')}.</p>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          {!novo && (mudancas > 0 || nomeMudou) && (
            <span className="text-sm text-muted-foreground">
              {mudancas > 0 ? plural(mudancas, 'mudança', 'mudanças') : 'Nome alterado'} sem salvar
            </span>
          )}
          <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando || (!novo && mudancas === 0 && !nomeMudou)}>
            {enviando ? 'Salvando...' : novo ? 'Criar modelo' : 'Salvar modelo'}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ---------- unidades ----------

type FormUnidade = {
  nome: string; tipo: string; despacha_online: boolean; cep: string; rua: string; numero: string
  complemento: string; bairro: string; cidade: string; uf: string
}

const UNIDADE_VAZIA: FormUnidade = {
  nome: '', tipo: 'loja', despacha_online: false, cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
}

function Unidades() {
  const unidades = useCarregar(() => api<Esquema<'Lista_UnidadeSaida_'>>('/unidades'), [])
  // id da unidade aberta, 'nova' ou null
  const [aberta, setAberta] = useState<number | 'nova' | null>(null)

  function aposSalvar(unidade: Unidade) {
    limparListas('unidades')
    unidades.recarregar()
    setAberta(unidade.id_unidade)
  }

  const escolhida = unidades.dados?.items.find((u) => u.id_unidade === aberta)

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_26rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Lojas atendem o público e têm estoque de loja física e online. O CD só despacha pedidos online.</p>
          <Button size="lg" className="h-10 px-4" onClick={() => setAberta('nova')}>
            <Plus aria-hidden="true" /> Nova unidade
          </Button>
        </div>
        {unidades.erro && <Aviso mensagem={unidades.erro} />}
        {unidades.carregando && !unidades.dados && <Carregando />}
        {unidades.dados && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pl-2 font-medium">Unidade</th>
                  <th className="font-medium">Tipo</th>
                  <th className="font-medium">Cidade</th>
                  <th className="font-medium">Despacha online</th>
                  <th className="font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {unidades.dados.items.map((u) => (
                  <tr
                    key={u.id_unidade}
                    onClick={() => setAberta(u.id_unidade)}
                    className={cn('cursor-pointer border-b hover:bg-superficie', aberta === u.id_unidade && 'bg-superficie', !u.ativo && 'text-muted-foreground')}
                  >
                    <td className="py-3 pl-2"><button type="button" className="font-medium hover:underline">{u.nome}</button></td>
                    <td>{u.tipo === 'cd' ? 'Centro de distribuição' : 'Loja'}</td>
                    <td>{u.cidade}, {u.uf}</td>
                    <td>{u.tipo === 'cd' ? 'sempre' : u.despacha_online ? 'sim' : 'não'}</td>
                    <td>{u.ativo ? 'ativa' : 'desativada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PainelLateral
        aberto={aberta === 'nova'}
        titulo="Nova unidade"
        descricao="Loja ou centro de distribuição. O tipo não muda depois de criada."
        aoFechar={() => setAberta(null)}
      >
        <FormularioUnidade key="nova" aoFechar={() => setAberta(null)} aoSalvar={aposSalvar} />
      </PainelLateral>
      {escolhida && <FormularioUnidade key={escolhida.id_unidade} unidade={escolhida} aoFechar={() => setAberta(null)} aoSalvar={aposSalvar} />}
    </div>
  )
}

function FormularioUnidade({ unidade, aoFechar, aoSalvar }: { unidade?: Unidade; aoFechar: () => void; aoSalvar: (unidade: Unidade) => void }) {
  const inicial: FormUnidade = unidade ? { ...UNIDADE_VAZIA, ...unidade, complemento: unidade.complemento ?? '' } : UNIDADE_VAZIA
  const [form, setForm] = useState(inicial)
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const mudar = (campo: keyof FormUnidade) => (e: ChangeEvent<HTMLInputElement>) => {
    setSalvo(false)
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }
  const cd = form.tipo === 'cd'
  // editar fica no Painel ao lado da lista; criar já vem dentro do painel lateral
  const Moldura = unidade ? Painel : SemMoldura

  async function salvar(evento: FormEvent | null, extra: Record<string, unknown> = {}) {
    evento?.preventDefault()
    setSalvo(false)
    const campos: (keyof FormUnidade)[] = ['nome', 'despacha_online', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf']
    let corpo: Record<string, unknown>
    if (unidade) {
      corpo = Object.fromEntries(campos.filter((c) => form[c] !== inicial[c]).map((c) => [c, c === 'complemento' ? form[c] || null : form[c]]))
      Object.assign(corpo, extra)
    } else {
      corpo = { ...Object.fromEntries(campos.map((c) => [c, form[c]])), tipo: form.tipo, complemento: form.complemento || null }
    }
    if (unidade && Object.keys(corpo).length === 0) return
    const salva = await enviar(() => api<Unidade>(unidade ? `/unidades/${unidade.id_unidade}` : '/unidades', { metodo: unidade ? 'PATCH' : 'POST', corpo }))
    if (salva) {
      setSalvo(true)
      aoSalvar(salva)
    }
  }

  return (
    <Moldura titulo={unidade?.nome ?? ''} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <Campo id="un-nome" rotulo="Nome">
          <Input id="un-nome" value={form.nome} onChange={mudar('nome')} minLength={2} maxLength={100} className="bg-background" required />
        </Campo>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Tipo</legend>
          <div className="flex gap-5 text-sm">
            {[['loja', 'Loja'], ['cd', 'Centro de distribuição']].map(([valor, rotulo]) => (
              <label key={valor} className={cn('flex items-center gap-2', unidade && 'text-muted-foreground')}>
                <input type="radio" name="un-tipo" value={valor} checked={form.tipo === valor} onChange={mudar('tipo')} disabled={Boolean(unidade)} />
                {rotulo}
              </label>
            ))}
          </div>
          {unidade && <p className="mt-1 text-xs text-muted-foreground">O tipo não muda depois de criada.</p>}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cd || form.despacha_online} onChange={mudar('despacha_online')} disabled={cd} />
          Despacha pedidos de entrega em casa
        </label>
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <Campo id="un-cep" rotulo="CEP">
            <Input id="un-cep" value={form.cep} onChange={mudar('cep')} inputMode="numeric" className="bg-background" required />
          </Campo>
          <Campo id="un-rua" rotulo="Rua">
            <Input id="un-rua" value={form.rua} onChange={mudar('rua')} maxLength={200} className="bg-background" required />
          </Campo>
          <Campo id="un-numero" rotulo="Número">
            <Input id="un-numero" value={form.numero} onChange={mudar('numero')} maxLength={20} className="bg-background" required />
          </Campo>
          <Campo id="un-complemento" rotulo="Complemento" opcional>
            <Input id="un-complemento" value={form.complemento} onChange={mudar('complemento')} maxLength={100} className="bg-background" />
          </Campo>
          <Campo id="un-uf" rotulo="UF">
            <Input id="un-uf" value={form.uf} onChange={mudar('uf')} maxLength={2} className="bg-background uppercase" required />
          </Campo>
          <Campo id="un-bairro" rotulo="Bairro">
            <Input id="un-bairro" value={form.bairro} onChange={mudar('bairro')} maxLength={100} className="bg-background" required />
          </Campo>
          <Campo id="un-cidade" rotulo="Cidade" className="col-span-2">
            <Input id="un-cidade" value={form.cidade} onChange={mudar('cidade')} maxLength={100} className="bg-background" required />
          </Campo>
        </div>
        {erro && <Aviso mensagem={erro} />}
        {salvo && <Sucesso>Unidade salva.</Sucesso>}
        <div className="flex items-center justify-between gap-2">
          {unidade ? (
            <Button type="button" variant="link" className="px-0" disabled={enviando} onClick={() => salvar(null, { ativo: !unidade.ativo })}>
              {unidade.ativo ? 'Desativar unidade' : 'Reativar unidade'}
            </Button>
          ) : <span />}
          <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar unidade'}</Button>
        </div>
      </form>
    </Moldura>
  )
}

function SemMoldura({ children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return <>{children}</>
}
