import { useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { temPermissao } from '@/auth/areas'
import { Aviso, Carregando, Vazio } from '@/components/Estados'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { Etiqueta, NomePeca } from '@/components/Peca'
import { Status } from '@/components/Status'
import { Button } from '@/components/ui/button'
import { Campo, Input, Label, Select } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api } from '@/lib/api'
import { CANAIS, codigoTransferencia, dataCurta, hora, plural } from '@/lib/formato'
import { nomeUnidade, useVariantes } from '@/lib/listas'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

function soma(t, campo) {
  return t.itens.reduce((total, item) => total + (item[campo] ?? 0), 0)
}

export function Transferencias() {
  const { perfil } = useAuth()
  const { unidade, unidades } = useUnidadeEscolhida()
  const [params, setParams] = useSearchParams()
  const [aba, setAba] = useState('chegando')
  const idVer = params.get('ver')
  const nova = params.get('nova') === '1'
  const idUnidade = unidade ? Number(unidade) : null

  const lista = useCarregar(() => api('/transferencias', { params: { id_unidade: unidade, limit: 200 } }), [unidade])
  const todas = lista.dados?.items ?? []
  const chegando = todas.filter((t) => t.status === 'enviada' && (!idUnidade || t.id_unidade_destino === idUnidade))
  const paraEnviar = todas.filter((t) => t.status === 'solicitada' && (!idUnidade || t.id_unidade_origem === idUnidade))
  const visiveis = { chegando, enviar: paraEnviar, todas }[aba]
  const escolhida = todas.find((t) => String(t.id_transferencia) === idVer) ?? (!nova ? visiveis[0] : null)

  function ver(id) {
    setParams({ ver: String(id) }, { replace: true })
  }

  function aposCriar(transferencia) {
    lista.recarregar()
    setAba('todas')
    ver(transferencia.id_transferencia)
  }

  const descricao = (t) => {
    const origem = t.id_unidade_origem === idUnidade ? 'Daqui' : `De ${nomeUnidade(unidades, t.id_unidade_origem)}`
    const destino = t.id_unidade_destino === idUnidade ? 'para cá' : `para ${nomeUnidade(unidades, t.id_unidade_destino)}`
    return `${origem} ${destino}, ${plural(soma(t, 'quantidade_solicitada'), 'peça')}`
  }

  return (
    <>
      <Cabecalho titulo="Transferências">
        {temPermissao(perfil, 'solicitar_transferencia') && (
          <Button size="lg" className="h-11 px-4" onClick={() => setParams({ nova: '1' }, { replace: true })}>
            <Plus aria-hidden="true" /> Pedir peças a outra unidade
          </Button>
        )}
      </Cabecalho>

      <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
        <div>
          <Abas
            rotulo="Transferências"
            valor={aba}
            aoMudar={setAba}
            abas={[
              { valor: 'chegando', rotulo: 'Chegando', contagem: chegando.length },
              { valor: 'enviar', rotulo: 'Para enviar', contagem: paraEnviar.length },
              { valor: 'todas', rotulo: 'Todas' },
            ]}
          />
          {lista.erro && <Aviso mensagem={lista.erro} />}
          {lista.carregando && !lista.dados && <Carregando />}
          {lista.dados && visiveis.length === 0 && <p className="py-8 text-sm text-muted-foreground">Nenhuma transferência aqui.</p>}
          <ul>
            {visiveis.map((t) => (
              <li key={t.id_transferencia}>
                <button
                  type="button"
                  onClick={() => ver(t.id_transferencia)}
                  aria-current={escolhida?.id_transferencia === t.id_transferencia ? 'true' : undefined}
                  className={cn(
                    'w-full space-y-2 border-b px-3 py-4 text-left hover:bg-superficie',
                    escolhida?.id_transferencia === t.id_transferencia && !nova && 'bg-superficie',
                  )}
                >
                  <span className="flex items-center justify-between">
                    <Etiqueta>{codigoTransferencia(t.id_transferencia)}</Etiqueta>
                    <Status tipo="transferencia" valor={t.status} />
                  </span>
                  <span className="block text-sm">{descricao(t)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          {nova ? (
            <NovaTransferencia aoCriar={aposCriar} aoFechar={() => setParams({}, { replace: true })} />
          ) : escolhida ? (
            <DetalheTransferencia key={escolhida.id_transferencia} transferencia={escolhida} aoMudar={lista.recarregar} />
          ) : (
            lista.dados && <Vazio>Escolha uma transferência na lista.</Vazio>
          )}
        </div>
      </div>
    </>
  )
}

// o que falta acontecer, ao lado da etiqueta de status (só enquanto a transferência anda)
const PROXIMO_PASSO = { solicitada: 'Esperando envio', enviada: 'Esperando conferência' }

function DetalheTransferencia({ transferencia: t, aoMudar }) {
  const { perfil } = useAuth()
  const { unidades } = useUnidadeEscolhida()
  const pecas = useVariantes(t.itens.map((i) => i.id_variante))
  const podeEnviar = t.status === 'solicitada' && temPermissao(perfil, 'enviar_transferencia')
  const podeCancelar = t.status === 'solicitada' && temPermissao(perfil, 'solicitar_transferencia')
  const podeReceber = t.status === 'enviada' && temPermissao(perfil, 'receber_transferencia')
  const editando = podeEnviar || podeReceber
  const campoBase = podeEnviar ? 'quantidade_solicitada' : 'quantidade_enviada'
  const [quantidades, setQuantidades] = useState(() => Object.fromEntries(t.itens.map((i) => [i.id_item_transferencia, String(i[campoBase] ?? 0)])))
  const [tipoDiferenca, setTipoDiferenca] = useState('perda')
  const [motivoDiferenca, setMotivoDiferenca] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const { enviar, enviando, erro } = useEnviar()

  const faltaram = podeReceber ? t.itens.reduce((total, i) => total + Math.max(0, (i.quantidade_enviada ?? 0) - Number(quantidades[i.id_item_transferencia] || 0)), 0) : 0
  const itensAlterados = t.itens
    .filter((i) => Number(quantidades[i.id_item_transferencia]) !== i[campoBase])
    .map((i) => ({ id_item_transferencia: i.id_item_transferencia, quantidade: Number(quantidades[i.id_item_transferencia] || 0) }))

  async function confirmar(evento) {
    evento.preventDefault()
    const acao = podeEnviar ? 'enviar' : 'receber'
    const corpo = podeEnviar
      ? { itens: itensAlterados }
      : { itens: itensAlterados, tipo_diferenca: tipoDiferenca, motivo_diferenca: motivoDiferenca.trim() || null }
    const ok = await enviar(() => api(`/transferencias/${t.id_transferencia}/${acao}`, { metodo: 'POST', corpo }))
    if (ok) aoMudar()
  }

  async function cancelar(evento) {
    evento.preventDefault()
    const ok = await enviar(() => api(`/transferencias/${t.id_transferencia}/cancelar`, { metodo: 'POST', corpo: { motivo: motivoCancelamento } }))
    if (ok) aoMudar()
  }

  const etapas = [
    { rotulo: 'Pedida', quando: t.solicitada_em, feita: true },
    { rotulo: 'Enviada', quando: t.enviada_em, feita: Boolean(t.enviada_em) },
    t.status === 'cancelada'
      ? { rotulo: 'Cancelada', quando: t.cancelada_em, feita: true, detalhe: t.motivo_cancelamento }
      : { rotulo: 'Recebida', quando: t.recebida_em, feita: Boolean(t.recebida_em) },
  ]

  return (
    <form onSubmit={confirmar} className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta>{codigoTransferencia(t.id_transferencia)}</Etiqueta>
          <Status tipo="transferencia" valor={t.status} />
          {PROXIMO_PASSO[t.status] && <span className="text-sm text-muted-foreground">{PROXIMO_PASSO[t.status]}</span>}
        </div>
        <h2 className="text-2xl font-medium">
          De {nomeUnidade(unidades, t.id_unidade_origem)} para {nomeUnidade(unidades, t.id_unidade_destino)}
        </h2>
      </div>

      <ol className="grid grid-cols-3 gap-4">
        {etapas.map((etapa) => (
          <li key={etapa.rotulo} className={cn('border-t-[3px] pt-3', etapa.feita ? (etapa.rotulo === 'Cancelada' ? 'border-ferrugem' : 'border-foreground') : 'border-border')}>
            <p className="font-medium">{etapa.rotulo}</p>
            <p className="text-sm text-muted-foreground">
              {etapa.quando ? `${dataCurta(etapa.quando)} às ${hora(etapa.quando)}` : 'ainda não'}
            </p>
            {etapa.detalhe && <p className="text-sm text-muted-foreground">{etapa.detalhe}</p>}
          </li>
        ))}
      </ol>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pl-2 font-medium">Peça</th>
              <th className="font-medium">Sai do</th>
              <th className="font-medium">Entra no</th>
              <th className="text-right font-medium">Pedidas</th>
              <th className="text-right font-medium">Enviadas</th>
              <th className="pr-2 text-right font-medium">{podeEnviar ? 'Enviar' : 'Chegaram'}</th>
            </tr>
          </thead>
          <tbody>
            {t.itens.map((item) => {
              const peca = pecas.dados?.[item.id_variante]
              const valor = quantidades[item.id_item_transferencia]
              const diferente = podeReceber && Number(valor) < (item.quantidade_enviada ?? 0)
              return (
                <tr key={item.id_item_transferencia} className="border-b">
                  <td className="py-3 pl-2">
                    {peca ? <NomePeca produto={peca.produto} cor={peca.cor} tamanho={peca.tamanho} /> : `Peça ${item.id_variante}`}
                  </td>
                  <td>{CANAIS[item.canal_saida]}</td>
                  <td>{CANAIS[item.canal_entrada]}</td>
                  <td className="text-right">{item.quantidade_solicitada}</td>
                  <td className="text-right">{item.quantidade_enviada ?? '—'}</td>
                  <td className="py-2 pr-2 text-right">
                    {editando ? (
                      <>
                        <Label htmlFor={`qtd-${item.id_item_transferencia}`} className="sr-only">Quantidade</Label>
                        <Input
                          id={`qtd-${item.id_item_transferencia}`}
                          type="number"
                          min={0}
                          max={podeReceber ? item.quantidade_enviada : undefined}
                          value={valor}
                          onChange={(e) => setQuantidades({ ...quantidades, [item.id_item_transferencia]: e.target.value })}
                          className={cn('ml-auto w-20 text-right', diferente && 'border-terracota bg-terracota-fundo')}
                          required
                        />
                      </>
                    ) : (
                      item.quantidade_recebida ?? '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pecas.erro && <Aviso mensagem={pecas.erro} />}

      {faltaram > 0 && (
        <div className="space-y-4 border-l-4 border-terracota bg-terracota-fundo p-5">
          <div className="space-y-1">
            <p className="font-medium">Chegaram {plural(faltaram, 'peça', 'peças')} a menos do que foi enviado</p>
            <p className="text-sm text-muted-foreground">A entrada registra o que chegou e a diferença vira uma saída com o motivo abaixo.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <Campo id="tipo-diferenca" rotulo="Registrar como">
              <Select id="tipo-diferenca" value={tipoDiferenca} onChange={(e) => setTipoDiferenca(e.target.value)} className="bg-background">
                <option value="perda">Perda</option>
                <option value="avaria">Avaria</option>
              </Select>
            </Campo>
            <Campo id="motivo-diferenca" rotulo="Motivo">
              <Input id="motivo-diferenca" value={motivoDiferenca} onChange={(e) => setMotivoDiferenca(e.target.value)} maxLength={500} className="bg-background" required />
            </Campo>
          </div>
        </div>
      )}

      {erro && <Aviso mensagem={erro} />}

      {cancelando ? (
        <div className="space-y-3 border p-4">
          <Campo id="motivo-cancelamento" rotulo="Por que cancelar?">
            <Input id="motivo-cancelamento" value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} minLength={3} maxLength={500} />
          </Campo>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCancelando(false)}>Voltar</Button>
            <Button type="button" variant="destructive" disabled={enviando || motivoCancelamento.trim().length < 3} onClick={cancelar}>
              Cancelar transferência
            </Button>
          </div>
        </div>
      ) : (
        (editando || podeCancelar) && (
          <div className="flex flex-wrap justify-end gap-2">
            {podeCancelar && (
              <Button type="button" variant="outline" size="lg" className="h-11 px-4" onClick={() => setCancelando(true)}>
                <X aria-hidden="true" /> Cancelar
              </Button>
            )}
            {editando && (
              <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>
                <Check aria-hidden="true" /> {podeEnviar ? 'Confirmar envio' : 'Confirmar recebimento'}
              </Button>
            )}
          </div>
        )
      )}
    </form>
  )
}

function NovaTransferencia({ aoCriar, aoFechar }) {
  const { unidade, unidades } = useUnidadeEscolhida()
  const ativas = unidades.filter((u) => u.ativo)
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState(unidade)
  const [termo, setTermo] = useState('')
  const [itens, setItens] = useState([])
  const { enviar, enviando, erro } = useEnviar()
  const tipo = (id) => unidades.find((u) => String(u.id_unidade) === String(id))?.tipo

  const achadas = useCarregar(
    () => (origem && termo.trim().length >= 2 ? api('/estoque', { params: { id_unidade: origem, busca: termo.trim(), limit: 40 } }) : null),
    [origem, termo],
  )

  function adicionar(linha) {
    const canalSaida = tipo(origem) === 'cd' ? 'online' : linha.canal
    const canalEntrada = tipo(destino) === 'cd' ? 'online' : canalSaida
    const chave = `${linha.id_variante}-${canalSaida}-${canalEntrada}`
    if (itens.some((i) => i.chave === chave)) return
    setItens([...itens, { chave, linha, canal_saida: canalSaida, canal_entrada: canalEntrada, quantidade: '1' }])
  }

  function mudarItem(chave, campo, valor) {
    setItens(itens.map((i) => (i.chave === chave ? { ...i, [campo]: valor } : i)))
  }

  async function pedir(evento) {
    evento.preventDefault()
    const corpo = {
      id_unidade_origem: Number(origem),
      id_unidade_destino: Number(destino),
      itens: itens.map((i) => ({
        id_variante: i.linha.id_variante,
        canal_saida: i.canal_saida,
        canal_entrada: i.canal_entrada,
        quantidade: Number(i.quantidade),
      })),
    }
    const criada = await enviar(() => api('/transferencias', { metodo: 'POST', corpo }))
    if (criada) aoCriar(criada)
  }

  const linhasAchadas = (achadas.dados?.items ?? []).filter((l) => l.disponivel > 0)

  return (
    <form onSubmit={pedir} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-medium">Pedir peças a outra unidade</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}><X /></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="tr-origem" rotulo="Pedir de">
          <Select id="tr-origem" value={origem} onChange={(e) => { setOrigem(e.target.value); setItens([]) }} required>
            <option value="" disabled>Escolha a unidade</option>
            {ativas.filter((u) => String(u.id_unidade) !== String(destino)).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
          </Select>
        </Campo>
        <Campo id="tr-destino" rotulo="Para">
          <Select id="tr-destino" value={destino} onChange={(e) => { setDestino(e.target.value); setItens([]) }} required>
            <option value="" disabled>Escolha a unidade</option>
            {ativas.filter((u) => String(u.id_unidade) !== String(origem)).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
          </Select>
        </Campo>
      </div>

      {origem && (
        <Campo id="tr-busca" rotulo="Adicionar peça" dica="Só aparecem as peças com saldo disponível na unidade de origem.">
          <Input id="tr-busca" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Etiqueta ou nome da peça" autoComplete="off" />
          {linhasAchadas.length > 0 && (
            <ul className="max-h-64 overflow-y-auto border">
              {linhasAchadas.map((l) => (
                <li key={`${l.id_variante}-${l.canal}`}>
                  <button type="button" onClick={() => adicionar(l)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-superficie">
                    <NomePeca produto={l.produto} cor={l.cor} tamanho={`${l.tamanho}, ${l.sku}`} />
                    <span className="shrink-0 text-xs text-muted-foreground">{CANAIS[l.canal]}: {l.disponivel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {achadas.dados && linhasAchadas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça disponível com esse nome.</p>}
        </Campo>
      )}

      {itens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 font-medium">Peça</th>
                <th className="font-medium">Sai do</th>
                <th className="font-medium">Entra no</th>
                <th className="text-right font-medium">Quantidade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.chave} className="border-b">
                  <td className="py-3"><NomePeca produto={i.linha.produto} cor={i.linha.cor} tamanho={i.linha.tamanho} /></td>
                  <td>{CANAIS[i.canal_saida]}</td>
                  <td>
                    <Select
                      aria-label="Entra no canal"
                      value={i.canal_entrada}
                      disabled={tipo(destino) === 'cd'}
                      onChange={(e) => mudarItem(i.chave, 'canal_entrada', e.target.value)}
                      className="w-36"
                    >
                      {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </Select>
                  </td>
                  <td className="text-right">
                    <Input
                      aria-label="Quantidade"
                      type="number"
                      min={1}
                      max={i.linha.disponivel}
                      value={i.quantidade}
                      onChange={(e) => mudarItem(i.chave, 'quantidade', e.target.value)}
                      className="ml-auto w-20 text-right"
                      required
                    />
                  </td>
                  <td className="pl-2 text-right">
                    <Button type="button" variant="ghost" size="icon" aria-label="Tirar peça" onClick={() => setItens(itens.filter((x) => x.chave !== i.chave))}>
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erro && <Aviso mensagem={erro} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" className="h-11 px-4" onClick={aoFechar}>Descartar</Button>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando || itens.length === 0 || !destino}>
          {enviando ? 'Pedindo...' : 'Pedir transferência'}
        </Button>
      </div>
    </form>
  )
}
