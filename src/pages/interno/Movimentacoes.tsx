import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Cabecalho, Paginacao } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { CANAIS, codigoTransferencia, dataCurta, hojeIso, hora, TIPOS_MOVIMENTACAO } from '@/lib/formato'
import { nomeUnidade } from '@/lib/listas'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { AbasEstoque, AcoesEstoque } from './Estoque'

type ItemEstoque = Esquema<'EstoqueItem'>
type Canal = ItemEstoque['canal']
type PaginaEstoque = Esquema<'Pagina_EstoqueItem_'>

const POR_PAGINA = 25
const PERIODOS = { 7: 'Últimos 7 dias', 30: 'Últimos 30 dias', 90: 'Últimos 90 dias', '': 'Todo o período' }

function diasAtras(dias: string) {
  if (!dias) return undefined
  const d = new Date(`${hojeIso()}T12:00:00`)
  d.setDate(d.getDate() - Number(dias))
  return d.toLocaleDateString('sv-SE')
}

export function Movimentacoes() {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(params.get('busca') ?? '')
  const [periodo, setPeriodo] = useState('7')
  const [tipo, setTipo] = useState('')
  const [offset, setOffset] = useState(0)
  const podeRegistrar = temPermissao(perfil, 'movimentar_estoque')
  // o formulário abre num painel lateral pelo botão "Registrar movimentação" (?registrar=1),
  // que também vem do Saldo, do Histórico e da Visão Geral
  const registrando = podeRegistrar && params.get('registrar') === '1'
  // vindo de outra página com ?registrar=1, a página já nasceria com o painel aberto e ele não
  // animaria a entrada: começa fechado e abre no quadro seguinte da tela
  const [montada, setMontada] = useState(false)
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setMontada(true))
    return () => cancelAnimationFrame(quadro)
  }, [])
  const [feito, setFeito] = useState<string | null>(null)

  const lista = useCarregar(
    () => api<Esquema<'Pagina_MovimentacaoItem_'>>('/movimentacoes-estoque', {
      params: { id_unidade: unidade, busca: busca.trim(), de: diasAtras(periodo), tipo, limit: POR_PAGINA, offset },
    }),
    [unidade, busca, periodo, tipo, offset],
  )
  const filtro = (setter: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value)
    setOffset(0)
  }

  function fecharRegistro() {
    const proximos = new URLSearchParams(params)
    proximos.delete('registrar')
    setParams(proximos, { replace: true })
  }

  // depois de registrar, o painel fecha sozinho e a confirmação fica em cima da lista
  function aposRegistrar(mensagem: string) {
    setFeito(mensagem)
    lista.recarregar()
    fecharRegistro()
  }

  return (
    <>
      <Cabecalho
        titulo="Estoque"
        subtitulo={`Tudo o que entrou e saiu do estoque ${unidade ? `da ${nomeUnidade(unidades, Number(unidade))}` : 'da rede'}, com quem fez e por quê.`}
        abas={<AbasEstoque />}
      >
        <AcoesEstoque />
      </Cabecalho>

      <div className="min-w-0">
        {feito && <div className="mb-4"><Sucesso>{feito}</Sucesso></div>}
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex h-9 min-w-56 flex-1 items-center gap-2 border border-input px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Buscar peça ou etiqueta</span>
            <input value={busca} onChange={filtro(setBusca)} placeholder="Buscar peça ou etiqueta" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <Select aria-label="Período" value={periodo} onChange={filtro(setPeriodo)} className="w-auto">
            {Object.entries(PERIODOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
          <Select aria-label="Tipo" value={tipo} onChange={filtro(setTipo)} className="w-auto">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPOS_MOVIMENTACAO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Select>
        </div>

        {lista.erro && <Aviso mensagem={lista.erro} />}
        {lista.carregando && !lista.dados && <Carregando />}
        {lista.dados?.items.length === 0 && <Vazio>Nenhuma movimentação nesse período.</Vazio>}
        {lista.dados && lista.dados.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pl-2 font-medium">Quando</th>
                  <th className="font-medium">O que aconteceu</th>
                  <th className="font-medium">Peça</th>
                  <th className="font-medium">Canal</th>
                  <th className="text-right font-medium">Qtd.</th>
                  <th className="pl-4 font-medium">Quem</th>
                  <th className="font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {lista.dados.items.map((m) => (
                  <tr key={m.id_movimentacao} className="border-b align-middle">
                    <td className="py-3 pl-2 text-muted-foreground">{dataCurta(m.criado_em)},<br />{hora(m.criado_em)}</td>
                    <td>{TIPOS_MOVIMENTACAO[m.tipo] ?? m.tipo}{!unidade && <span className="block text-xs text-muted-foreground">{m.unidade}</span>}</td>
                    <td>
                      <span className="block max-w-56 truncate">{m.produto}</span>
                      <span className="text-xs text-muted-foreground">{m.sku}</span>
                    </td>
                    <td>{CANAIS[m.canal]}</td>
                    <td className="text-right font-medium">{m.quantidade > 0 ? `+${m.quantidade}` : `−${Math.abs(m.quantidade)}`}</td>
                    <td className="pl-4">{m.autor ?? 'Automática'}</td>
                    <td className="max-w-48">
                      {m.id_transferencia && <Etiqueta>{codigoTransferencia(m.id_transferencia)}</Etiqueta>}
                      {m.id_pedido && <Etiqueta>Pedido {m.id_pedido}</Etiqueta>}
                      {m.id_chamado && <Etiqueta>Chamado {m.id_chamado}</Etiqueta>}
                      {m.motivo && <span className="block truncate text-muted-foreground" title={m.motivo}>{m.motivo}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao pagina={lista.dados} aoMudar={setOffset} rotulo="movimentações" />
      </div>

      <Sheet open={registrando && montada} onOpenChange={(abrir) => { if (!abrir) fecharRegistro() }}>
        <SheetContent className="overflow-y-auto sm:max-w-md!">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="text-lg">Registrar movimentação</SheetTitle>
            <SheetDescription>Entrada ou saída de peças que não veio de venda nem de transferência.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <RegistrarMovimentacao aoRegistrar={aposRegistrar} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

const TIPOS_MANUAIS = ['recebimento', 'avaria', 'perda', 'ajuste']

// formulário do painel lateral; cada abertura começa vazia (o painel desmonta ao fechar)
function RegistrarMovimentacao({ aoRegistrar }: { aoRegistrar: (mensagem: string) => void }) {
  const { unidade: unidadeTopo, unidades } = useUnidadeEscolhida()
  const [tipo, setTipo] = useState('recebimento')
  const [idUnidade, setIdUnidade] = useState(unidadeTopo)
  const [termo, setTermo] = useState('')
  const [peca, setPeca] = useState<ItemEstoque | null>(null)
  const [canal, setCanal] = useState<Canal>('loja_fisica')
  const [quantidade, setQuantidade] = useState('1')
  const [motivo, setMotivo] = useState('')
  const { enviar, enviando, erro } = useEnviar()

  // a peça é procurada na rede inteira: uma unidade pode receber uma peça que ainda não tinha
  const encontradas = useCarregar(
    () => (termo.trim().length >= 2 && !peca ? api<PaginaEstoque>('/estoque', { params: { busca: termo.trim(), limit: 30 } }) : null),
    [termo, peca],
  )
  const saldoAqui = useCarregar(
    () => (peca && idUnidade ? api<PaginaEstoque>('/estoque', { params: { id_variante: peca.id_variante, id_unidade: idUnidade } }) : null),
    [peca, idUnidade],
  )
  const opcoes = [...new Map((encontradas.dados?.items ?? []).map((e) => [e.id_variante, e])).values()].slice(0, 6)
  const disponivel = (c: Canal) => saldoAqui.dados?.items.find((l) => l.canal === c)?.disponivel ?? 0
  const precisaMotivo = tipo !== 'recebimento'
  const unidadeEscolhida = unidades.find((u) => String(u.id_unidade) === String(idUnidade))
  const canais: Canal[] = unidadeEscolhida?.tipo === 'cd' ? ['online'] : ['loja_fisica', 'online']

  const qtd = Number(quantidade) || 0
  const efeito = tipo === 'ajuste' ? qtd : tipo === 'recebimento' ? qtd : -qtd
  const fica = disponivel(canal) + efeito

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    if (!peca) return
    const ok = await enviar(() => api('/movimentacoes-estoque', {
      metodo: 'POST',
      corpo: {
        id_variante: peca.id_variante,
        id_unidade: Number(idUnidade),
        canal,
        tipo,
        quantidade: qtd,
        motivo: motivo.trim() || null,
      },
    }))
    if (ok) aoRegistrar(`${TIPOS_MOVIMENTACAO[tipo]} registrada: ${peca.sku}, ${efeito > 0 ? '+' : ''}${efeito}.`)
  }

  return (
    <form onSubmit={registrar} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">O que aconteceu</legend>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_MANUAIS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              className={cn('h-9 border px-3 text-sm', tipo === t ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:border-foreground')}
            >
              {TIPOS_MOVIMENTACAO[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <Campo id="mov-unidade" rotulo="Unidade">
        <Select id="mov-unidade" value={idUnidade} onChange={(e) => setIdUnidade(e.target.value)} className="bg-background" required>
          <option value="" disabled>Escolha a unidade</option>
          {unidades.filter((u) => u.ativo).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
        </Select>
      </Campo>

      <Campo id="mov-peca" rotulo="Peça">
        {peca ? (
          <div className="flex items-center justify-between gap-2 border border-input bg-background px-3 py-2">
            <NomePeca produto={peca.produto} cor={peca.cor} tamanho={`${peca.tamanho}, ${peca.sku}`} />
            <Button type="button" variant="ghost" size="sm" onClick={() => setPeca(null)}>Trocar</Button>
          </div>
        ) : (
          <>
            <Input id="mov-peca" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Etiqueta ou nome da peça" className="bg-background" autoComplete="off" />
            {opcoes.length > 0 && (
              <ul className="border bg-background">
                {opcoes.map((o) => (
                  <li key={o.id_variante}>
                    <button type="button" onClick={() => setPeca(o)} className="w-full px-3 py-2 text-left hover:bg-superficie">
                      <NomePeca produto={o.produto} cor={o.cor} tamanho={`${o.tamanho}, ${o.sku}`} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {encontradas.dados && opcoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça encontrada.</p>}
          </>
        )}
      </Campo>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">De qual estoque</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {canais.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="radio" name="mov-canal" value={c} checked={canal === c} onChange={() => setCanal(c)} />
              {CANAIS[c]}{peca && idUnidade && `, ${disponivel(c)} disponível(is)`}
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        id="mov-qtd"
        rotulo="Quantidade"
        dica={tipo === 'ajuste' ? 'Use + para entrada e − para saída (ex.: -2).' : peca && idUnidade ? `${CANAIS[canal]} fica com ${fica}.` : null}
      >
        <Input id="mov-qtd" type="number" min={tipo === 'ajuste' ? undefined : 1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-32 bg-background" required />
      </Campo>

      <Campo id="mov-motivo" rotulo="Motivo" opcional={!precisaMotivo}>
        <Textarea id="mov-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} required={precisaMotivo} className="bg-background" />
      </Campo>

      <p className="text-xs text-muted-foreground">
        Uma movimentação registrada não pode ser editada nem apagada. Para corrigir, registre um ajuste.
      </p>
      {erro && <Aviso mensagem={erro} />}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={enviando || !peca || !idUnidade || (tipo === 'ajuste' && qtd === 0)}>
        {enviando ? 'Registrando...' : `Registrar ${TIPOS_MOVIMENTACAO[tipo]?.toLowerCase()}`}
      </Button>
    </form>
  )
}
