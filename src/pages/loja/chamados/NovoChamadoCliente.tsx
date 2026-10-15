import { useEffect, useMemo, useState, type SubmitEvent } from 'react'
import { FileText, Package, Paperclip, Plus, X } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { CATEGORIAS_CHAMADO, dataCurta } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { rotuloTamanho } from '../componentes/tamanhos'
import { problemaDoArquivo, TIPOS_DO_ANEXO } from './anexos'
import { CabecalhoDoLado } from './CabecalhoDoLado'
import { useContextoChamados } from './contexto'
import { IconeDaCategoria } from './IconeDaCategoria'

type Chamado = Esquema<'ChamadoSaida'>
type Pedido = Esquema<'PedidoSaida'>

// chamado novo. Vindo de Meus pedidos (?pedido=, ?categoria=) já nasce ligado ao pedido; vindo da
// página de um produto (?variante=), à peça; de um chamado concluído (?anterior=), continua aquele
export function NovoChamadoCliente() {
  const navegar = useNavigate()
  const { recarregarLista } = useContextoChamados()
  const [params] = useSearchParams()
  const local = useLocation()
  const peca = (local.state as { peca?: string } | null)?.peca
  const idPedido = params.get('pedido')
  const idVariante = params.get('variante')
  const idAnterior = params.get('anterior')
  const pedido = useCarregar(() => (idPedido ? api<Pedido>(`/pedidos/${idPedido}`) : null), [idPedido])
  const categoriaInicial = params.get('categoria') ?? (idVariante ? 'duvida' : '')
  const [categoria, setCategoria] = useState(categoriaInicial)
  const [assunto, setAssunto] = useState(peca ? `Dúvida sobre ${peca}` : '')
  const [descricao, setDescricao] = useState('')
  const [idItem, setIdItem] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const previa = useMemo(() => (arquivo && arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null), [arquivo])
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa)
  }, [previa])

  // os atalhos de assunto do lado vazio trocam só a ?categoria=: o formulário acompanha
  const [categoriaDaUrl, setCategoriaDaUrl] = useState(categoriaInicial)
  if (categoriaDaUrl !== categoriaInicial) {
    setCategoriaDaUrl(categoriaInicial)
    setCategoria(categoriaInicial)
  }

  // com o pedido carregado, o título já vem pronto (a pessoa pode trocar)
  const codigo = pedido.dados?.codigo_venda
  const assuntoSugerido = codigo
    ? categoria === 'troca_devolucao' ? `Troca ou devolução do pedido ${codigo}` : `Ajuda com o pedido ${codigo}`
    : ''

  async function abrir(evento: SubmitEvent) {
    evento.preventDefault()
    const criado = await enviar(async () => {
      const chamado = await api<Chamado>('/chamados', {
        metodo: 'POST',
        corpo: {
          categoria,
          assunto: (assunto || assuntoSugerido).trim(),
          descricao: descricao.trim(),
          id_pedido: idPedido ? Number(idPedido) : null,
          id_item_pedido: idItem ? Number(idItem) : null,
          id_variante: idVariante ? Number(idVariante) : null,
          id_chamado_anterior: idAnterior ? Number(idAnterior) : null,
        },
      })
      // a foto (ou PDF) vai como a primeira mensagem do chamado
      if (arquivo) {
        const dados = new FormData()
        dados.append('arquivo', arquivo)
        await api(`/chamados/${chamado.id_chamado}/anexos`, { metodo: 'POST', corpo: dados })
      }
      return chamado
    })
    if (criado) {
      recarregarLista()
      navegar(`/loja/chamados/${criado.id_chamado}`, { replace: true })
    }
  }

  return (
    <>
      <CabecalhoDoLado icone={<Plus className="size-5" aria-hidden="true" />} titulo="Novo chamado">
        <p className="text-sm text-muted-foreground">
          {idAnterior ? 'Continua um chamado já concluído.' : 'Conte o que aconteceu. Uma pessoa da equipe responde por aqui.'}
        </p>
      </CabecalhoDoLado>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={(e) => void abrir(e)} className="max-w-2xl space-y-6 p-4 sm:p-6">
          {idPedido && (
            <div className="flex items-center gap-3 rounded-lg bg-superficie p-4 text-sm">
              <Package className="size-5 shrink-0 text-marinho" aria-hidden="true" />
              {pedido.dados ? (
                <span>
                  Sobre o pedido <span className="font-medium tabular-nums">{pedido.dados.codigo_venda}</span>, de{' '}
                  {dataCurta(pedido.dados.criado_em)}
                </span>
              ) : pedido.erro ? (
                <span className="text-ferrugem">{pedido.erro}</span>
              ) : (
                <span>Carregando o pedido...</span>
              )}
            </div>
          )}
          {peca && !idPedido && <p className="rounded-lg bg-superficie p-4 text-sm">Sobre a peça {peca}</p>}

          {/* poucas opções: ficam todas à vista, em vez de escondidas num select */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Sobre o que é</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(CATEGORIAS_CHAMADO).map(([valor, rotulo]) => (
                <label
                  key={valor}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                    categoria === valor ? 'border-aco bg-aco-fundo font-medium' : 'hover:border-aco/60',
                  )}
                >
                  <input
                    type="radio"
                    name="categoria"
                    value={valor}
                    checked={categoria === valor}
                    onChange={() => setCategoria(valor)}
                    className="sr-only"
                    required
                  />
                  <IconeDaCategoria categoria={valor} className="size-5 shrink-0 text-aco" />
                  {rotulo}
                </label>
              ))}
            </div>
          </fieldset>

          {pedido.dados && pedido.dados.itens.length > 1 && (
            <Campo id="item" rotulo="Qual peça" opcional>
              <Select id="item" value={idItem} onChange={(e) => setIdItem(e.target.value)} className="h-11">
                <option value="">O pedido todo</option>
                {pedido.dados.itens.map((item) => (
                  <option key={item.id_item} value={item.id_item}>
                    {item.produto}, {item.cor}, tamanho {rotuloTamanho(item.tamanho)}
                  </option>
                ))}
              </Select>
            </Campo>
          )}

          <Campo id="assunto" rotulo="Título">
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder={assuntoSugerido || 'Em poucas palavras'}
              minLength={3}
              maxLength={200}
              className="h-11"
              required={!assuntoSugerido}
            />
          </Campo>
          <Campo id="descricao" rotulo="Mensagem">
            <Textarea id="descricao" rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={5000} required />
          </Campo>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Foto ou PDF <span className="font-normal text-muted-foreground">opcional</span>
            </p>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-xl border bg-superficie p-2.5 text-sm">
                {previa ? (
                  <img src={previa} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-background">
                    <FileText className="size-6 text-aco" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
                <button
                  type="button"
                  onClick={() => setArquivo(null)}
                  aria-label={`Tirar o anexo ${arquivo.name}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-background"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input p-4 text-sm transition-colors hover:border-aco hover:bg-aco-fundo has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-aco-fundo text-aco">
                  <Paperclip className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">Anexar foto ou PDF</span>
                  <span className="text-muted-foreground">JPG, PNG, WEBP ou PDF de até 10 MB</span>
                </span>
                <input
                  type="file"
                  accept={TIPOS_DO_ANEXO.join(',')}
                  className="sr-only"
                  onChange={(e) => {
                    const escolhido = e.target.files?.[0]
                    e.target.value = ''
                    if (!escolhido) return
                    const problema = problemaDoArquivo(escolhido)
                    setErroArquivo(problema)
                    if (!problema) setArquivo(escolhido)
                  }}
                />
              </label>
            )}
            {erroArquivo && <p role="alert" className="text-sm text-ferrugem">{erroArquivo}</p>}
          </div>

          {erro && <p role="alert" className="rounded-lg bg-ferrugem-fundo p-3 text-sm text-ferrugem">{erro}</p>}
          <Button type="submit" size="loja" disabled={enviando} className="rounded-full">
            {enviando ? 'Abrindo o chamado...' : 'Abrir chamado'}
          </Button>
        </form>
      </div>
    </>
  )
}
