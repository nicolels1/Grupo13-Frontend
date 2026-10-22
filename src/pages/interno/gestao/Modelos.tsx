import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { plural } from '@/lib/formato'
import { BLOCO_ACO } from '../componentes/estilos'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Modelo = Esquema<'ModeloSaida'>
type Permissao = Esquema<'PermissaoSaida'>
type ListaModelos = Esquema<'Lista_ModeloSaida_'>
type ListaPermissoes = Esquema<'Lista_PermissaoSaida_'>

// aba Modelos de acesso da Gestão: os modelos e as permissões de cada um

// grupos das permissões no editor de modelos (os códigos são os do banco)
const GRUPOS: [string, string[]][] = [
  ['Contas', ['gerenciar_contas', 'gerenciar_modelos_acesso']],
  ['Cadastros', ['gerenciar_catalogo', 'gerenciar_unidades']],
  ['Estoque', ['movimentar_estoque', 'definir_estoque_minimo']],
  ['Transferência', ['solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia']],
  ['Vendas', ['registrar_venda_fisica', 'preparar_entregar_pedido', 'cancelar_pedido_equipe', 'corrigir_cadastro_cliente']],
  ['Clientes', ['atender_chamado', 'moderar_avaliacoes']],
  // que marca a pessoa vê nas listas e pode abrir ou mudar; sem nenhuma, as listas da equipe dão 403
  ['Marcas', ['ver_marca_lorenzi', 'ver_marca_vulto']],
]

// grupos na ordem de GRUPOS; permissão nova do banco que não está no mapa cai em "Outras"
function agruparPermissoes(permissoes: Permissao[]): [string, Permissao[]][] {
  const porCodigo: Record<string, Permissao> = Object.fromEntries(permissoes.map((p) => [p.codigo, p]))
  const conhecidos = new Set(GRUPOS.flatMap(([, codigos]) => codigos))
  const outras = permissoes.map((p) => p.codigo).filter((c) => !conhecidos.has(c))
  return [...GRUPOS, ['Outras', outras] as [string, string[]]]
    .map(([nome, codigos]): [string, Permissao[]] => [nome, codigos.map((c) => porCodigo[c]).filter((p): p is Permissao => Boolean(p))])
    .filter(([, lista]) => lista.length > 0)
}

// lista dos modelos à esquerda; à direita, o modelo escolhido com as permissões agrupadas por área
export function Modelos() {
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
