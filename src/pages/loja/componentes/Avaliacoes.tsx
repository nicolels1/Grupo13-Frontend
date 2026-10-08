import { useState, type FormEvent } from 'react'
import { ThumbsUp } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { dataLonga, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { Estrelas } from './Estrelas'
import { rotuloTamanho } from './tamanhos'

type Avaliacao = Esquema<'AvaliacaoSaida'>
type Foto = Esquema<'FotoSaida'>

const POR_PAGINA = 5

// avaliações publicadas do produto: nota média, barras de 5 a 1, fotos de clientes e a lista
export function AvaliacoesDoProduto({ idProduto }: { idProduto: number }) {
  const [comFotos, setComFotos] = useState(false)
  const [quantas, setQuantas] = useState(POR_PAGINA)
  const [fotoAberta, setFotoAberta] = useState<Foto | null>(null)
  const { dados, erro, carregando, recarregar } = useCarregar(
    () =>
      api<Esquema<'AvaliacoesDoProduto'>>(`/produtos/${idProduto}/avaliacoes`, {
        params: { limit: quantas, com_fotos: comFotos || undefined },
      }),
    [idProduto, quantas, comFotos],
  )

  const contagem = dados?.contagem_por_nota ?? []
  const totalGeral = contagem.reduce((soma, c) => soma + c.quantidade, 0)
  const fotosDeClientes = (dados?.items ?? []).flatMap((a) => a.fotos.filter((f) => f.url))

  return (
    // fundo superfície separa as avaliações da peça; a nota média vai num bloco marinho
    <section aria-labelledby="titulo-avaliacoes" className="mt-20 bg-superficie px-5 py-10 sm:px-10">
      <h2 id="titulo-avaliacoes" className="mb-8 font-titulo text-3xl">Avaliações</h2>

      {erro && <Aviso mensagem={erro} />}
      {!dados && carregando && <Carregando />}

      {dados && totalGeral === 0 && (
        <p className="text-sm text-muted-foreground">
          Esta peça ainda não tem avaliações. Quem compra pode avaliar em Meus pedidos depois de receber.
        </p>
      )}

      {dados && totalGeral > 0 && (
        <div className="grid gap-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="flex items-end gap-3 bg-marinho p-5 text-white">
              <span className="text-5xl font-medium tabular-nums">
                {Number(dados.media ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
              </span>
              <div className="space-y-1 pb-1">
                <Estrelas nota={Number(dados.media ?? 0)} clara />
                <p className="text-sm text-white/85">{plural(totalGeral, 'avaliação', 'avaliações')}</p>
              </div>
            </div>

            <ul className="space-y-2" aria-label="Avaliações por nota">
              {contagem.map(({ nota, quantidade }) => (
                <li key={nota} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0">{plural(nota, 'estrela', 'estrelas')}</span>
                  <span className="h-2 flex-1 bg-white" aria-hidden="true">
                    <span className="block h-full bg-marinho" style={{ width: `${(quantidade / totalGeral) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-muted-foreground">{quantidade}</span>
                </li>
              ))}
            </ul>

            {fotosDeClientes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Fotos de clientes</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {fotosDeClientes.slice(0, 8).map((foto) => (
                    <button
                      key={foto.id_foto}
                      type="button"
                      onClick={() => setFotoAberta(foto)}
                      aria-label="Ampliar foto de cliente"
                      className="aspect-square bg-white"
                    >
                      <img src={foto.url ?? ''} alt="" loading="lazy" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-4 flex w-fit items-center gap-2 text-sm">
              <Checkbox
                checked={comFotos}
                onCheckedChange={(marcado) => {
                  setComFotos(Boolean(marcado))
                  setQuantas(POR_PAGINA)
                }}
              />
              Só avaliações com fotos
            </label>

            {dados.items.length === 0 ? (
              <p className="border-t py-10 text-sm text-muted-foreground">Nenhuma avaliação com fotos ainda.</p>
            ) : (
              <ul>
                {dados.items.map((avaliacao) => (
                  <ItemAvaliacao
                    key={avaliacao.id_avaliacao}
                    avaliacao={avaliacao}
                    aoAbrirFoto={setFotoAberta}
                    aoMudar={recarregar}
                  />
                ))}
              </ul>
            )}

            {dados.items.length < dados.total && (
              <Button
                variant="outline"
                size="loja"
                className="mt-6"
                onClick={() => setQuantas((n) => n + POR_PAGINA)}
                disabled={carregando}
              >
                Mostrar mais avaliações
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={fotoAberta !== null} onOpenChange={(aberto) => !aberto && setFotoAberta(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogTitle className="sr-only">Foto de cliente</DialogTitle>
          {fotoAberta?.url && <img src={fotoAberta.url} alt="Foto enviada por quem comprou a peça" className="w-full" />}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function ItemAvaliacao({
  avaliacao,
  aoAbrirFoto,
  aoMudar,
}: {
  avaliacao: Avaliacao
  aoAbrirFoto: (foto: Foto) => void
  aoMudar: () => void
}) {
  const { sessao, perfil } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const { enviar, enviando, erro } = useEnviar()
  const [denunciando, setDenunciando] = useState(false)
  const [denunciada, setDenunciada] = useState(false)
  const ehCliente = Boolean(sessao) && perfil?.tipo_conta === 'cliente'

  // votar e denunciar pedem login de cliente; sem login, vai para Entrar e volta para o produto
  function exigirLogin() {
    if (ehCliente) return true
    navegar('/entrar', { state: { voltarPara: local.pathname + local.search } })
    return false
  }

  async function votarUtil() {
    if (!exigirLogin()) return
    const feito = await enviar(() => api(`/avaliacoes/${avaliacao.id_avaliacao}/util`, { metodo: 'POST' }))
    if (feito) aoMudar()
  }

  return (
    <li className="space-y-3 border-t py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Estrelas nota={avaliacao.nota} />
        <span className="text-sm font-medium">{avaliacao.autor}</span>
        <span className="text-sm text-muted-foreground">{dataLonga(avaliacao.criada_em)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Comprou na cor {avaliacao.cor}, tamanho {rotuloTamanho(avaliacao.tamanho)}
      </p>
      {avaliacao.texto && <p className="max-w-2xl text-sm leading-relaxed">{avaliacao.texto}</p>}

      {avaliacao.fotos.length > 0 && (
        <div className="flex gap-1.5">
          {avaliacao.fotos.filter((f) => f.url).map((foto) => (
            <button
              key={foto.id_foto}
              type="button"
              onClick={() => aoAbrirFoto(foto)}
              aria-label="Ampliar foto"
              className="size-20 bg-white"
            >
              <img src={foto.url ?? ''} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5 text-sm">
        <button
          type="button"
          onClick={() => void votarUtil()}
          disabled={enviando}
          className="flex items-center gap-1.5 hover:underline disabled:opacity-50"
        >
          <ThumbsUp className="size-4" aria-hidden="true" />
          Útil ({avaliacao.votos_util})
        </button>
        {denunciada ? (
          <span className="text-muted-foreground">Denúncia enviada para análise</span>
        ) : (
          <button
            type="button"
            onClick={() => exigirLogin() && setDenunciando(true)}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Denunciar
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-ferrugem">{erro}</p>}

      <DialogDenuncia
        idAvaliacao={avaliacao.id_avaliacao}
        aberto={denunciando}
        aoFechar={() => setDenunciando(false)}
        aoEnviar={() => {
          setDenunciando(false)
          setDenunciada(true)
        }}
      />
    </li>
  )
}

function DialogDenuncia({
  idAvaliacao,
  aberto,
  aoFechar,
  aoEnviar,
}: {
  idAvaliacao: number
  aberto: boolean
  aoFechar: () => void
  aoEnviar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const { enviar, enviando, erro } = useEnviar()
  const idCampo = `motivo-denuncia-${idAvaliacao}`

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    const feito = await enviar(() =>
      api(`/avaliacoes/${idAvaliacao}/denuncias`, { metodo: 'POST', corpo: { motivo: motivo.trim() } }),
    )
    if (feito) aoEnviar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent>
        <form onSubmit={(e) => void confirmar(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Denunciar avaliação</DialogTitle>
            <DialogDescription>A equipe analisa a denúncia e oculta a avaliação se ela não seguir as regras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor={idCampo} className="text-sm font-medium">Motivo</label>
            <Textarea
              id={idCampo}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: linguagem ofensiva, dados pessoais, não fala da peça"
              required
            />
          </div>
          {erro && <p className="text-sm text-ferrugem">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button>
            <Button type="submit" disabled={enviando || !motivo.trim()}>Enviar denúncia</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
