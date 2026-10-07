import { Fragment, useState } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { Link, NavLink, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api } from '@/lib/api'
import { CANAIS, dataCurta, dataLonga, hojeIso, paraApi, TIPOS_MOVIMENTACAO } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { GraficoEvolucao } from './GraficoEvolucao'

const POR_PAGINA = 60
const DIAS_NA_REGUA = 31

// subabas da área Estoque: Saldo, Movimentações e Histórico do estoque
export function AbasEstoque() {
  const aba = ({ isActive }) =>
    cn('-mb-px border-b-2 pb-2 text-sm', isActive ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')
  return (
    <nav aria-label="Estoque" className="mb-8 flex gap-6 border-b">
      <NavLink to="/interno/estoque" end className={aba}>Saldo</NavLink>
      <NavLink to="/interno/estoque/movimentacoes" className={aba}>Movimentações</NavLink>
      <NavLink to="/interno/estoque/historico" className={aba}>Histórico do estoque</NavLink>
    </nav>
  )
}

// Histórico do estoque: em construção até a Etapa 6 (frase-filtro, atalhos, régua e "naquele momento × agora")
export function HistoricoEstoque() {
  return (
    <>
      <Cabecalho titulo="Estoque"><AcoesEstoque /></Cabecalho>
      <AbasEstoque />
      <p className="text-sm text-muted-foreground">Tela em construção.</p>
    </>
  )
}

export function AcoesEstoque() {
  const { perfil } = useAuth()
  return (
    <>
      {temPermissao(perfil, 'solicitar_transferencia') && (
        <Link to="/interno/transferencias?nova=1" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
          <ArrowLeftRight aria-hidden="true" /> Pedir transferência
        </Link>
      )}
      {temPermissao(perfil, 'movimentar_estoque') && (
        <Link to="/interno/estoque/movimentacoes?registrar=1" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-4')}>
          <Plus aria-hidden="true" /> Registrar movimentação
        </Link>
      )}
    </>
  )
}

// junta as linhas da API (uma por variante, unidade e canal) em uma linha por variante e unidade
function agrupar(itens) {
  const grupos = new Map()
  for (const item of itens) {
    const chave = `${item.id_variante}-${item.id_unidade}`
    if (!grupos.has(chave)) grupos.set(chave, { chave, ...item, canais: {} })
    grupos.get(chave).canais[item.canal] = item
  }
  return [...grupos.values()]
}

function diasDaRegua() {
  const hoje = new Date(`${hojeIso()}T12:00:00`)
  return Array.from({ length: DIAS_NA_REGUA }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() - (DIAS_NA_REGUA - 1 - i))
    return d.toLocaleDateString('sv-SE')
  })
}

export function Estoque() {
  const { unidade, setUnidade, unidades } = useUnidadeEscolhida()
  const [params] = useSearchParams()
  const [modo, setModo] = useState('agora')
  const [data, setData] = useState(hojeIso())
  const [horaEscolhida, setHoraEscolhida] = useState('18:00')
  const [busca, setBusca] = useState('')
  const [canal, setCanal] = useState('')
  const [soAbaixo, setSoAbaixo] = useState(params.get('abaixo') === '1')
  const [offset, setOffset] = useState(0)
  const [aberta, setAberta] = useState(null)
  const passado = modo === 'passado'
  const em = paraApi(data, horaEscolhida)

  const lista = useCarregar(() => {
    const filtros = { id_unidade: unidade, canal, busca: busca.trim(), limit: POR_PAGINA, offset }
    if (passado) return api('/estoque/historico', { params: { ...filtros, em } })
    return api('/estoque', { params: { ...filtros, abaixo_minimo: soAbaixo || undefined } })
  }, [unidade, canal, busca, soAbaixo, offset, passado, em])

  const grupos = agrupar(lista.dados?.items ?? [])
  const mudarFiltro = (setter) => (e) => {
    setter(e.target.value)
    setOffset(0)
  }

  return (
    <>
      <Cabecalho titulo="Estoque"><AcoesEstoque /></Cabecalho>
      <AbasEstoque />

      <section aria-labelledby="titulo-ver-em" className="mb-8 space-y-4 bg-superficie p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <h2 id="titulo-ver-em" className="font-medium">Ver o estoque em</h2>
            <div role="radiogroup" aria-label="Momento" className="flex gap-4 text-sm">
              {[['agora', 'Agora'], ['passado', 'Uma data passada']].map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={modo === valor}
                  onClick={() => { setModo(valor); setOffset(0) }}
                  className={cn('border-b-2 pb-1', modo === valor ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground')}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          {passado && (
            <div className="flex gap-2">
              <Label htmlFor="data-estoque" className="sr-only">Data</Label>
              <Input id="data-estoque" type="date" max={hojeIso()} value={data} onChange={(e) => { setData(e.target.value); setOffset(0) }} className="w-40 bg-background" />
              <Label htmlFor="hora-estoque" className="sr-only">Hora</Label>
              <Input id="hora-estoque" type="time" value={horaEscolhida} onChange={(e) => { setHoraEscolhida(e.target.value); setOffset(0) }} className="w-28 bg-background" />
            </div>
          )}
        </div>
        {passado && (
          <>
            <ReguaDeDatas valor={data} aoMudar={(d) => { setData(d); setOffset(0) }} />
            <p className="text-sm text-muted-foreground">
              Mostrando como estava em {dataLonga(`${data}T12:00:00`)} às {horaEscolhida}, horário de Brasília, somando as movimentações até esse momento. Reservas de pedidos online não entram nesse cálculo.
            </p>
          </>
        )}
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3 sm:max-w-80">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Buscar peça ou etiqueta</span>
          <input value={busca} onChange={mudarFiltro(setBusca)} placeholder="Buscar peça ou etiqueta" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <Select aria-label="Unidade" value={unidade} onChange={(e) => { setUnidade(e.target.value); setOffset(0) }} className="w-auto">
          <option value="">Todas as unidades</option>
          {unidades.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
        </Select>
        <Select aria-label="Canal" value={canal} onChange={mudarFiltro(setCanal)} className="w-auto">
          <option value="">Todos os canais</option>
          {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </Select>
        {!passado && (
          <label className="flex h-9 items-center gap-2 border border-input px-3 text-sm">
            <input type="checkbox" checked={soAbaixo} onChange={(e) => { setSoAbaixo(e.target.checked); setOffset(0) }} />
            Só abaixo do mínimo
          </label>
        )}
      </div>

      {lista.erro && <Aviso mensagem={lista.erro} />}
      {lista.carregando && !lista.dados && <Carregando />}
      {lista.dados && grupos.length === 0 && <Vazio>Nenhuma peça com esses filtros.</Vazio>}
      {grupos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" />
                <th className="py-2 font-medium">Peça</th>
                <th className="font-medium">Etiqueta</th>
                {!unidade && <th className="font-medium">Unidade</th>}
                <th className="text-right font-medium">Loja física</th>
                <th className="text-right font-medium">Online</th>
                <th className="text-right font-medium">Total</th>
                {!passado && <th className="pr-2 text-right font-medium">Mínimo</th>}
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const abertaAgora = aberta === g.chave
                const fisica = g.canais.loja_fisica
                const online = g.canais.online
                const total = (fisica?.quantidade ?? 0) + (online?.quantidade ?? 0)
                const abaixo = fisica?.abaixo_minimo || online?.abaixo_minimo
                return (
                  <Fragment key={g.chave}>
                    <tr
                      className={cn('cursor-pointer border-b hover:bg-superficie', abertaAgora && 'bg-superficie')}
                      onClick={() => setAberta(abertaAgora ? null : g.chave)}
                    >
                      <td className="pl-2">
                        <button type="button" aria-expanded={abertaAgora} aria-label={`Detalhes de ${g.produto}, ${g.cor}, ${g.tamanho}`} className="flex">
                          {abertaAgora ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      </td>
                      <td className="py-3"><NomePeca produto={g.produto} cor={g.cor} tamanho={g.tamanho} /></td>
                      <td><Etiqueta alerta={abaixo}>{g.sku}</Etiqueta></td>
                      {!unidade && <td className="text-muted-foreground">{g.unidade}</td>}
                      <Qtd linha={fisica} />
                      <Qtd linha={online} />
                      <td className="text-right font-medium">{total}</td>
                      {!passado && <td className="pr-2 text-right"><Minimo fisica={fisica} online={online} /></td>}
                    </tr>
                    {abertaAgora && (
                      <tr className="border-b bg-superficie">
                        <td colSpan={8} className="px-4 pb-6 pt-2">
                          <DetalhePeca grupo={g} passado={passado} em={em} aoMudar={lista.recarregar} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="linhas" />
    </>
  )
}

function Qtd({ linha }) {
  if (!linha) return <td className="text-right text-muted-foreground">—</td>
  return (
    <td className={cn('px-2 text-right', linha.abaixo_minimo && 'bg-terracota-fundo font-medium')}>
      {linha.quantidade}
      {linha.quantidade_reservada > 0 && (
        <span className="block text-xs text-muted-foreground">{linha.quantidade_reservada} reservada(s)</span>
      )}
    </td>
  )
}

function Minimo({ fisica, online }) {
  const partes = [['física', fisica], ['online', online]].filter(([, l]) => l?.estoque_minimo !== null && l?.estoque_minimo !== undefined)
  if (partes.length === 0) return <span className="text-muted-foreground">sem mínimo</span>
  return partes.map(([rotulo, l]) => (
    <span key={rotulo} className={cn('block', l.abaixo_minimo && 'font-medium')}>
      {l.abaixo_minimo && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-terracota align-middle" aria-label="abaixo do mínimo" />}
      {l.estoque_minimo} <span className="text-xs text-muted-foreground">{rotulo}</span>
    </span>
  ))
}

function ReguaDeDatas({ valor, aoMudar }) {
  const dias = diasDaRegua()
  return (
    <div role="radiogroup" aria-label="Escolher o dia" className="flex items-end overflow-x-auto border bg-background px-2 pb-2 pt-6">
      {dias.map((dia) => {
        const numero = Number(dia.slice(8))
        const escolhido = dia === valor
        return (
          <button
            key={dia}
            type="button"
            role="radio"
            aria-checked={escolhido}
            aria-label={dataLonga(`${dia}T12:00:00`)}
            onClick={() => aoMudar(dia)}
            className="group relative flex min-w-6 flex-1 flex-col items-center gap-1"
          >
            {escolhido && (
              <span className="absolute -top-5 whitespace-nowrap bg-marinho px-1.5 py-0.5 text-[0.65rem] text-white">{dataCurta(`${dia}T12:00:00`)}</span>
            )}
            <span className={cn('w-px', escolhido ? 'h-8 w-0.5 bg-terracota' : numero % 5 === 0 || numero === 1 ? 'h-4 bg-foreground' : 'h-2.5 bg-foreground/50 group-hover:bg-foreground')} />
            <span className={cn('text-[0.65rem]', numero % 5 === 0 || numero === 1 ? 'text-muted-foreground' : 'invisible')}>{numero}</span>
          </button>
        )
      })}
    </div>
  )
}

function DetalhePeca({ grupo, passado, em, aoMudar }) {
  const { perfil } = useAuth()
  const evolucao = useCarregar(
    () => api('/estoque/evolucao', { params: { id_variante: grupo.id_variante, id_unidade: grupo.id_unidade } }),
    [grupo.id_variante, grupo.id_unidade],
  )
  const movimentacoes = useCarregar(
    () => api('/movimentacoes-estoque', {
      params: { id_variante: grupo.id_variante, id_unidade: grupo.id_unidade, ate: passado ? em : undefined, limit: 4 },
    }),
    [grupo.id_variante, grupo.id_unidade, passado, em],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <h3 className="mb-2 font-medium">Últimos 30 dias</h3>
        {evolucao.carregando && <Carregando />}
        {evolucao.erro && <Aviso mensagem={evolucao.erro} />}
        {evolucao.dados && <GraficoEvolucao pontos={evolucao.dados.pontos} marca={passado ? `${em}:00-03:00` : null} />}
      </div>
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 font-medium">{passado ? 'Movimentações até a data escolhida' : 'Últimas movimentações'}</h3>
          {movimentacoes.erro && <Aviso mensagem={movimentacoes.erro} />}
          <ul className="text-sm">
            {movimentacoes.dados?.items.map((m) => (
              <li key={m.id_movimentacao} className="grid grid-cols-[3.5rem_1fr_auto] gap-3 border-b py-2">
                <span className="text-muted-foreground">{dataCurta(m.criado_em)}</span>
                <span className="truncate">{TIPOS_MOVIMENTACAO[m.tipo] ?? m.tipo}{m.motivo && `, ${m.motivo}`}</span>
                <span className="font-medium">{m.quantidade > 0 ? `+${m.quantidade}` : `−${Math.abs(m.quantidade)}`}</span>
              </li>
            ))}
          </ul>
          {movimentacoes.dados?.items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>}
          <Link to={`/interno/estoque/movimentacoes?busca=${encodeURIComponent(grupo.sku)}`} className="mt-2 inline-block text-sm underline underline-offset-2">
            Ver todas
          </Link>
        </section>
        {!passado && temPermissao(perfil, 'definir_estoque_minimo') && <DefinirMinimo grupo={grupo} aoMudar={aoMudar} />}
        {!passado && temPermissao(perfil, 'movimentar_estoque') && <Realocar grupo={grupo} aoMudar={aoMudar} />}
      </div>
    </div>
  )
}

function DefinirMinimo({ grupo, aoMudar }) {
  const inicial = (canal) => grupo.canais[canal]?.estoque_minimo ?? ''
  const [valores, setValores] = useState({ loja_fisica: inicial('loja_fisica'), online: inicial('online') })
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()

  async function salvar(evento) {
    evento.preventDefault()
    setSalvo(false)
    const mudaram = Object.keys(valores).filter((canal) => String(valores[canal]) !== String(inicial(canal)))
    for (const canal of mudaram) {
      const ok = await enviar(() => api('/estoque/minimo', {
        metodo: 'PUT',
        corpo: {
          id_variante: grupo.id_variante,
          id_unidade: grupo.id_unidade,
          canal,
          estoque_minimo: valores[canal] === '' ? null : Number(valores[canal]),
        },
      }))
      if (!ok) return
    }
    setSalvo(true)
    aoMudar()
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <h3 className="font-medium">Estoque mínimo</h3>
      <div className="flex items-end gap-2">
        {Object.entries(CANAIS).map(([canal, rotulo]) => (
          <div key={canal} className="flex-1 space-y-1">
            <Label htmlFor={`min-${grupo.chave}-${canal}`} className="text-xs font-normal text-muted-foreground">{rotulo}</Label>
            <Input
              id={`min-${grupo.chave}-${canal}`}
              type="number"
              min={0}
              placeholder="sem"
              value={valores[canal]}
              onChange={(e) => setValores({ ...valores, [canal]: e.target.value })}
              className="bg-background"
            />
          </div>
        ))}
        <Button type="submit" variant="outline" className="h-9" disabled={enviando}>Salvar</Button>
      </div>
      <p className="text-xs text-muted-foreground">Deixe vazio para tirar o mínimo do canal.</p>
      {erro && <Aviso mensagem={erro} />}
      {salvo && <Sucesso>Mínimo salvo.</Sucesso>}
    </form>
  )
}

function Realocar({ grupo, aoMudar }) {
  const [origem, setOrigem] = useState('loja_fisica')
  const [quantidade, setQuantidade] = useState('')
  const [feito, setFeito] = useState(null)
  const { enviar, enviando, erro } = useEnviar()
  const destino = origem === 'loja_fisica' ? 'online' : 'loja_fisica'
  const disponivel = grupo.canais[origem]?.disponivel ?? 0

  async function realocar(evento) {
    evento.preventDefault()
    setFeito(null)
    const ok = await enviar(() => api('/realocacoes', {
      metodo: 'POST',
      corpo: { id_variante: grupo.id_variante, id_unidade: grupo.id_unidade, canal_origem: origem, quantidade: Number(quantidade) },
    }))
    if (ok) {
      setFeito(`${quantidade} peça(s) passaram para ${CANAIS[destino].toLowerCase()}.`)
      setQuantidade('')
      aoMudar()
    }
  }

  return (
    <form onSubmit={realocar} className="space-y-3">
      <h3 className="font-medium">Passar para o outro canal</h3>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`orig-${grupo.chave}`} className="text-xs font-normal text-muted-foreground">Sai de</Label>
          <Select id={`orig-${grupo.chave}`} value={origem} onChange={(e) => setOrigem(e.target.value)} className="bg-background">
            {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor={`qtd-${grupo.chave}`} className="text-xs font-normal text-muted-foreground">Peças</Label>
          <Input id={`qtd-${grupo.chave}`} type="number" min={1} max={disponivel || undefined} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="bg-background" required />
        </div>
        <Button type="submit" variant="outline" className="h-9" disabled={enviando || disponivel === 0}>Passar</Button>
      </div>
      <p className="text-xs text-muted-foreground">{disponivel} disponível(is) em {CANAIS[origem].toLowerCase()}.</p>
      {erro && <Aviso mensagem={erro} />}
      {feito && <Sucesso>{feito}</Sucesso>}
    </form>
  )
}
