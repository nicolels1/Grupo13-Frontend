import { useEffect, useMemo, useState, type SubmitEvent } from 'react'
import { ArrowLeft, ImagePlus, Star, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Miniatura } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api, type Esquema } from '@/lib/api'
import { dataLonga } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { rotuloTamanho } from './componentes/tamanhos'

type Pedido = Esquema<'PedidoSaida'>
type Avaliacao = Esquema<'AvaliacaoSaida'>

// regras do backend (arquivos.FOTO_AVALIACAO e avaliacoes.PRAZO_DE_EDICAO), conferidas antes de enviar
const MAXIMO_DE_FOTOS = 5
const TAMANHO_MAXIMO = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const DIAS_PARA_EDITAR = 7
const LIMITE_DO_TEXTO = 2000
const ROTULOS_DA_NOTA = ['', 'Não gostei', 'Poderia ser melhor', 'Ok', 'Gostei', 'Amei']

function editavelAte(avaliacao: Avaliacao) {
  return new Date(new Date(avaliacao.criada_em).getTime() + DIAS_PARA_EDITAR * 24 * 60 * 60 * 1000)
}

// escrever (ou editar) a avaliação de uma peça de um pedido entregue: nota, texto opcional e até 5 fotos.
// Cartão centralizado; a faixa ardósia de cima (a cor das avaliações) diz qual peça está sendo avaliada
export function AvaliarPeca() {
  const { idItem } = useParams()
  const [params] = useSearchParams()
  const idPedido = params.get('pedido')
  // vindo das estrelas do cartão de Meus pedidos (?nota=), a nota já chega marcada
  const notaDaUrl = Number(params.get('nota'))
  const notaInicial = Number.isInteger(notaDaUrl) && notaDaUrl >= 1 && notaDaUrl <= 5 ? notaDaUrl : 0
  const pedido = useCarregar(() => (idPedido ? api<Pedido>(`/pedidos/${idPedido}`) : null), [idPedido])
  const item = pedido.dados?.itens.find((i) => String(i.id_item) === idItem)
  const idAvaliacao = item?.id_avaliacao ?? null
  const existente = useCarregar(() => (idAvaliacao ? api<Avaliacao>(`/avaliacoes/${idAvaliacao}`) : null), [idAvaliacao])

  if (!idPedido) return <Problema mensagem="Abra a avaliação pelo pedido, em Meus pedidos." />
  if (pedido.carregando || existente.carregando) return <Carregando />
  if (pedido.erro) return <Problema mensagem={pedido.erro} />
  if (!item) return <Problema mensagem="Essa peça não está neste pedido." />
  if (existente.erro) return <Problema mensagem={existente.erro} />

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border bg-background shadow-xs">
      <div className="space-y-5 bg-ardosia p-6 text-white sm:px-8">
        <Link to="/loja/pedidos" className="inline-flex items-center gap-1.5 text-sm text-white/90 underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para Meus pedidos
        </Link>
        <div className="flex items-center gap-4">
          <Miniatura cor={item.cor} foto={item.foto_url} className="size-14 rounded-full ring-4 ring-white/30" />
          <div className="min-w-0">
            <h1 className="font-titulo text-3xl leading-tight">{existente.dados ? 'Sua avaliação' : 'Avaliar peça'}</h1>
            <p className="text-white/90">
              {item.produto}, {item.cor}, tamanho {rotuloTamanho(item.tamanho)}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 sm:px-8">
        <FormAvaliacao idItem={item.id_item} existente={existente.dados} notaInicial={notaInicial} />
      </div>
    </div>
  )
}

function Problema({ mensagem }: { mensagem: string }) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16">
      <Aviso titulo="Não foi possível abrir a avaliação" mensagem={mensagem} />
      <Link to="/loja/pedidos" className={buttonVariants({ variant: 'outline' })}>Ir para Meus pedidos</Link>
    </div>
  )
}

function FormAvaliacao({ idItem, existente, notaInicial }: { idItem: number; existente: Avaliacao | null; notaInicial: number }) {
  const [nota, setNota] = useState(existente?.nota ?? notaInicial)
  const [texto, setTexto] = useState(existente?.texto ?? '')
  const [fotos, setFotos] = useState<File[]>([])
  const [erroFotos, setErroFotos] = useState<string | null>(null)
  const [publicada, setPublicada] = useState<Avaliacao | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  // a hora é lida uma vez, ao abrir: o prazo é de dias, não muda enquanto a pessoa escreve
  const [abertoEm] = useState(() => Date.now())
  const prazo = existente ? editavelAte(existente) : null
  const podeEditar = !existente || (prazo !== null && prazo.getTime() > abertoEm)
  const fotosJaEnviadas = existente?.fotos.length ?? 0
  const vagas = MAXIMO_DE_FOTOS - fotosJaEnviadas - fotos.length

  // prévias das fotos escolhidas; os endereços temporários são liberados quando a lista muda
  const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos])
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas])

  function escolher(lista: FileList | null) {
    if (!lista) return
    const novas = [...lista]
    const recusada = novas.find((f) => !TIPOS.includes(f.type) || f.size > TAMANHO_MAXIMO)
    if (recusada) {
      setErroFotos(`${recusada.name} não serve: use JPG, PNG ou WEBP de até 5 MB.`)
      return
    }
    if (novas.length > vagas) {
      setErroFotos(`Cabem mais ${vagas} ${vagas === 1 ? 'foto' : 'fotos'} nesta avaliação.`)
      return
    }
    setErroFotos(null)
    setFotos((atuais) => [...atuais, ...novas])
  }

  async function publicar(evento: SubmitEvent) {
    evento.preventDefault()
    const salva = await enviar(async () => {
      const corpo = { nota, texto: texto.trim() || null }
      const avaliacao = existente
        ? await api<Avaliacao>(`/avaliacoes/${existente.id_avaliacao}`, { metodo: 'PATCH', corpo })
        : await api<Avaliacao>('/avaliacoes', { metodo: 'POST', corpo: { id_item_pedido: idItem, ...corpo } })
      // fotos uma por vez, depois da avaliação existir (a rota recebe uma foto por chamada)
      for (const foto of fotos) {
        const dados = new FormData()
        dados.append('arquivo', foto)
        await api(`/avaliacoes/${avaliacao.id_avaliacao}/fotos`, { metodo: 'POST', corpo: dados })
      }
      return avaliacao
    })
    if (salva) {
      setFotos([])
      setPublicada(salva)
    }
  }

  if (publicada) {
    return (
      <div className="space-y-5">
        <Sucesso>{existente ? 'Avaliação atualizada.' : 'Avaliação publicada. Obrigado por contar como foi.'}</Sucesso>
        <p className="text-sm">
          Você pode editar até {dataLonga(editavelAte(publicada).toISOString())}, pelo link "Ver avaliação" em Meus pedidos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/loja/pedidos" className={cn(buttonVariants({ size: 'loja' }), 'rounded-full')}>Voltar para Meus pedidos</Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void publicar(e)} className="space-y-7">
      {existente && prazo && (
        <p className={cn('rounded-lg p-3 text-sm', podeEditar ? 'bg-aco-fundo' : 'bg-superficie')}>
          {podeEditar
            ? `Você pode editar até ${dataLonga(prazo.toISOString())}.`
            : `O prazo para editar acabou em ${dataLonga(prazo.toISOString())}.`}
        </p>
      )}

      <fieldset disabled={!podeEditar} className="space-y-7">
        {/* a nota fica num bloco ardósia-claro: é a parte principal da avaliação */}
        <div className="rounded-xl bg-ardosia-clara p-5">
          <p id="rotulo-nota" className="mb-3 font-medium">Sua nota</p>
          <div role="radiogroup" aria-labelledby="rotulo-nota" className="flex flex-wrap items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                aria-label={`${n} de 5: ${ROTULOS_DA_NOTA[n]}`}
                onClick={() => setNota(n)}
                className="rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Star className={cn('size-9', n <= nota ? 'fill-marinho text-marinho' : 'text-ardosia/40')} aria-hidden="true" />
              </button>
            ))}
            <span className="ml-3 text-sm font-medium text-marinho" aria-live="polite">{ROTULOS_DA_NOTA[nota]}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="texto-avaliacao" className="font-medium">
            Conte como foi <span className="font-normal text-muted-foreground">opcional</span>
          </label>
          <Textarea
            id="texto-avaliacao"
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_DO_TEXTO))}
            placeholder="Caimento, tecido, tamanho: o que ajudaria quem vai comprar"
            className="min-h-32"
            aria-describedby="contador-texto"
          />
          <p id="contador-texto" className="text-right text-xs text-muted-foreground">
            {texto.length} de {LIMITE_DO_TEXTO}
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-medium">
            Fotos <span className="font-normal text-muted-foreground">opcional, até {MAXIMO_DE_FOTOS}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {existente?.fotos.map((foto) => (
              <img key={foto.id_foto} src={foto.url ?? ''} alt="Foto já enviada" className="size-24 rounded-lg bg-superficie object-cover" />
            ))}
            {previas.map((url, i) => (
              <div key={url} className="relative size-24">
                <img src={url} alt={`Foto nova ${i + 1}`} className="size-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos((atuais) => atuais.filter((_, j) => j !== i))}
                  aria-label={`Tirar a foto nova ${i + 1}`}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-marinho-escuro/80 text-white"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {vagas > 0 && podeEditar && (
              <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-ardosia hover:bg-ardosia-clara has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <ImagePlus className="size-5" aria-hidden="true" />
                Adicionar
                <input
                  type="file"
                  accept={TIPOS.join(',')}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    escolher(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP de até 5 MB cada.</p>
          {erroFotos && <p role="alert" className="text-sm text-ferrugem">{erroFotos}</p>}
        </div>
      </fieldset>

      {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
      {podeEditar && (
        <Button type="submit" size="loja" className="rounded-full" disabled={enviando || nota === 0}>
          {enviando ? 'Publicando...' : existente ? 'Salvar alterações' : 'Publicar avaliação'}
        </Button>
      )}
      {nota === 0 && podeEditar && <p className="text-sm text-muted-foreground">Escolha uma nota para publicar.</p>}
    </form>
  )
}
