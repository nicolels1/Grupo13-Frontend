import { useCallback, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, PRIORIDADES } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { ChamadoAberto } from './atendimento/Conversa'
import { ItemDaFila } from './atendimento/Fila'
import { SeletorDeMarca } from './componentes/FiltroDeMarca'
import { useFiltroDeMarca } from './componentes/useFiltroDeMarca'

type Fila = 'sem' | 'meus' | 'respondeu' | 'andamento' | 'concluidos'

const POR_PAGINA = 25

// filas do menu da esquerda: cada uma vira os filtros do GET /atendimento/chamados
const FILAS: { valor: Fila; rotulo: string; filtros: Record<string, string | boolean> }[] = [
  { valor: 'sem', rotulo: 'Sem responsável', filtros: { sem_responsavel: true, status: 'aberto' } },
  { valor: 'meus', rotulo: 'Meus em andamento', filtros: { meus: true, status: 'em_andamento' } },
  { valor: 'respondeu', rotulo: 'Cliente respondeu', filtros: { meus: true, com_mensagem_nova: true } },
  { valor: 'andamento', rotulo: 'Todos em andamento', filtros: { status: 'em_andamento' } },
  { valor: 'concluidos', rotulo: 'Concluídos', filtros: { status: 'concluido' } },
]

// filtros de cada fila, montados uma vez: a lista recarrega só quando a fila muda
const FILTROS_DA_FILA = Object.fromEntries(FILAS.map((f) => [f.valor, f.filtros])) as Record<Fila, (typeof FILAS)[number]['filtros']>

// caixa de entrada em três colunas (design, seção Atendimento): filas, lista e conversa.
// A mesma tela atende /interno/atendimento e /interno/atendimento/:idChamado; o chamado aberto
// fica na terceira coluna. No celular, a conversa toma a tela e há um link de volta para a fila.
export function Atendimento() {
  const { idChamado } = useParams()
  const { unidade } = useUnidadeEscolhida()
  const [fila, setFila] = useState<Fila>('sem')
  const [categoria, setCategoria] = useState('')
  // a prioridade que vale: a definida por quem assumiu ou, sem ela, a sugerida pela IA
  const [prioridade, setPrioridade] = useState('')
  const [offset, setOffset] = useState(0)
  const filtros = FILTROS_DA_FILA[fila]
  const filtroMarca = useFiltroDeMarca(() => setOffset(0))
  const marca = filtroMarca.marca

  const lista = useCarregar(
    () => api<Esquema<'Pagina_ChamadoEquipe_'>>('/atendimento/chamados', { params: { ...filtros, categoria, prioridade, id_unidade: unidade, marca, limit: POR_PAGINA, offset } }),
    [filtros, categoria, prioridade, unidade, marca, offset],
  )
  // contagem de cada fila (só o total, uma linha por consulta)
  const contagens = useCarregar(
    () => Promise.all(FILAS.map((f) => api<Esquema<'Pagina_ChamadoEquipe_'>>('/atendimento/chamados', { params: { ...f.filtros, id_unidade: unidade, marca, limit: 1 } }).then((r) => r.total))),
    [unidade, marca],
  )
  const { recarregar: recarregarLista } = lista
  const { recarregar: recarregarContagens } = contagens
  const aoMudarChamado = useCallback(() => {
    recarregarLista()
    recarregarContagens()
  }, [recarregarLista, recarregarContagens])

  function mudarFila(valor: Fila) {
    setFila(valor)
    setOffset(0)
  }

  return (
    <>
      <Cabecalho titulo="Atendimento" subtitulo="Chamados abertos pelos clientes no site." />
      <div className="grid gap-6 lg:grid-cols-[11rem_17rem_minmax(0,1fr)]">
        <nav aria-label="Filas" className={cn('lg:hidden', idChamado && 'hidden')}>
          <Abas
            rotulo="Filas"
            valor={fila}
            aoMudar={mudarFila}
            abas={FILAS.map((f, i) => ({ valor: f.valor, rotulo: f.rotulo, contagem: contagens.dados?.[i] }))}
          />
        </nav>
        <nav aria-label="Filas" className="hidden lg:block">
          {FILAS.map((f, i) => (
            <button
              key={f.valor}
              type="button"
              aria-current={fila === f.valor ? 'true' : undefined}
              onClick={() => mudarFila(f.valor)}
              className={cn('flex w-full justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-superficie', fila === f.valor && 'bg-superficie font-medium')}
            >
              {f.rotulo}
              <span className="tabular-nums text-muted-foreground">{contagens.dados?.[i] ?? ''}</span>
            </button>
          ))}
        </nav>

        <section aria-label="Chamados da fila" className={cn('min-w-0 lg:border-x lg:px-4', idChamado && 'hidden lg:block')}>
          <Select aria-label="Categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setOffset(0) }} className="mb-2">
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIAS_CHAMADO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
          <Select aria-label="Prioridade" value={prioridade} onChange={(e) => { setPrioridade(e.target.value); setOffset(0) }} className="mb-2">
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORIDADES).reverse().map(([v, r]) => <option key={v} value={v}>{r} (definida ou sugerida)</option>)}
            <option value="sem">Sem prioridade</option>
          </Select>
          <SeletorDeMarca filtro={filtroMarca} className="mb-2" />
          {lista.erro && <Aviso mensagem={lista.erro} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados?.items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum chamado nesta fila.</p>}
          <ul>
            {lista.dados?.items.map((c) => <ItemDaFila key={c.id_chamado} chamado={c} aberto={String(c.id_chamado) === idChamado} />)}
          </ul>
          <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="chamados" />
        </section>

        <div className={cn('min-w-0', !idChamado && 'hidden lg:block')}>
          {idChamado ? (
            <>
              <Link to="/interno/atendimento" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden">
                <ChevronLeft className="size-4" aria-hidden="true" /> Voltar para a fila
              </Link>
              <ChamadoAberto key={idChamado} idChamado={idChamado} aoMudar={aoMudarChamado} />
            </>
          ) : (
            <Vazio>Escolha um chamado na lista para ver a conversa.</Vazio>
          )}
        </div>
      </div>
    </>
  )
}
