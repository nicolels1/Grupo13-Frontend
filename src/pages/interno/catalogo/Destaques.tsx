import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Campo, Input, Textarea } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { problemaDaFoto, TIPOS_FOTO } from '../produto/regrasFoto'
import { problemaDoLink, trocarOrdem } from './regrasDestaque'

type Destaque = Esquema<'DestaqueSaida'>
type Textos = Pick<Destaque, 'titulo' | 'texto' | 'rotulo_botao' | 'link'>

const TEXTOS_VAZIOS: Textos = { titulo: '', texto: '', rotulo_botao: '', link: '' }

// slides do carrossel do topo da página inicial: texto, botão, link, foto, ordem e se aparecem na loja.
// A lista vem com os desativados (quem gerencia o catálogo vê todos); a loja mostra só os ativos
export function Destaques() {
  const lista = useCarregar(() => api<Esquema<'Lista_DestaqueSaida_'>>('/destaques'), [])
  // qual slide está com o formulário aberto ('novo' = criando um)
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  // apagar pede um segundo clique no mesmo slide
  const [apagando, setApagando] = useState<number | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  // foto: um seletor de arquivo só, apontado para o slide do botão clicado
  const seletor = useRef<HTMLInputElement>(null)
  const [alvo, setAlvo] = useState<Destaque | null>(null)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const slides = lista.dados?.items ?? []

  // faz a alteração e, se deu certo, avisa e recarrega a lista (a API devolve null no DELETE)
  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    setFeito(null)
    setErroFoto(null)
    const resultado = await enviar(acao)
    if (resultado === undefined) return false
    setFeito(mensagem)
    lista.recarregar()
    return true
  }

  async function salvar(dados: Textos) {
    const novo = editando === 'novo'
    const ok = await executar(
      () => (novo ? api('/destaques', { metodo: 'POST', corpo: dados }) : api(`/destaques/${editando}`, { metodo: 'PATCH', corpo: dados })),
      novo ? 'Slide criado no fim do carrossel. Envie a foto dele.' : 'Slide salvo.',
    )
    if (ok) setEditando(null)
  }

  function mover(indice: number, direcao: -1 | 1) {
    const trocas = trocarOrdem(slides, indice, direcao)
    void executar(async () => {
      for (const { id_destaque, ordem } of trocas) await api(`/destaques/${id_destaque}`, { metodo: 'PATCH', corpo: { ordem } })
    }, 'Ordem salva.')
  }

  function escolherFoto(slide: Destaque) {
    setAlvo(slide)
    setErroFoto(null)
    setFeito(null)
    seletor.current?.click()
  }

  function enviarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo || !alvo) return
    const problema = problemaDaFoto(arquivo)
    if (problema) {
      setErroFoto(problema)
      return
    }
    const formulario = new FormData()
    formulario.append('arquivo', arquivo)
    void executar(() => api(`/destaques/${alvo.id_destaque}/imagem`, { metodo: 'POST', corpo: formulario }), `Foto de ${alvo.titulo} salva.`)
  }

  function apagar(slide: Destaque) {
    if (apagando !== slide.id_destaque) {
      setApagando(slide.id_destaque)
      return
    }
    setApagando(null)
    void executar(() => api(`/destaques/${slide.id_destaque}`, { metodo: 'DELETE' }), `${slide.titulo} apagado.`)
  }

  return (
    <section aria-labelledby="titulo-destaques" className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="titulo-destaques" className="text-lg font-medium">Carrossel da página inicial</h2>
          <p className="text-sm text-muted-foreground">
            Os slides aparecem na loja nesta ordem e trocam sozinhos a cada 6 segundos. Desativado some da loja e continua aqui.
          </p>
        </div>
        {editando !== 'novo' && (
          <Button size="lg" className="h-11 px-4" onClick={() => { setEditando('novo'); setFeito(null) }}>
            <Plus aria-hidden="true" /> Novo slide
          </Button>
        )}
      </div>

      {lista.erro && <Aviso mensagem={lista.erro} />}
      {lista.carregando && !lista.dados && <Carregando />}
      {lista.dados && slides.length === 0 && editando !== 'novo' && <Vazio>Nenhum slide. Sem slide ativo, a página inicial começa direto nas vantagens.</Vazio>}

      {editando === 'novo' && <FormularioDestaque inicial={TEXTOS_VAZIOS} enviando={enviando} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />}

      <ol className="space-y-3">
        {slides.map((slide, i) => (
          <li key={slide.id_destaque} className={cn('border p-4', !slide.ativo && 'bg-superficie')}>
            {editando === slide.id_destaque ? (
              <FormularioDestaque inicial={slide} enviando={enviando} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* prévia do slide como aparece na loja: a foto ou o fundo marinho */}
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-marinho-escuro sm:w-48">
                  {slide.imagem_url && <img src={slide.imagem_url} alt="" className="absolute inset-0 size-full object-cover" />}
                  <span className="absolute bottom-2 left-2 font-titulo text-lg text-white drop-shadow">{slide.titulo}</span>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <p className={cn('font-medium', !slide.ativo && 'text-muted-foreground')}>
                    {i + 1}. {slide.titulo}
                    {!slide.ativo && <span className="ml-2 text-xs font-normal">desativado</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{slide.texto}</p>
                  <p className="text-sm">
                    Botão <span className="font-medium">{slide.rotulo_botao}</span> leva para <code className="text-xs">{slide.link}</code>
                  </p>
                  {!slide.imagem_url && <p className="text-xs text-terracota">Sem foto: na loja, o slide aparece com o fundo marinho.</p>}

                  <div className="flex flex-wrap gap-1 pt-1">
                    <Button variant="outline" size="sm" disabled={enviando} onClick={() => { setEditando(slide.id_destaque); setFeito(null) }}>Editar</Button>
                    <Button variant="outline" size="sm" disabled={enviando} onClick={() => escolherFoto(slide)}>
                      {slide.imagem_url ? 'Trocar foto' : 'Enviar foto'}
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={enviando || i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${slide.titulo}`}>
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={enviando || i === slides.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer ${slide.titulo}`}>
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={enviando}
                      onClick={() => void executar(
                        () => api(`/destaques/${slide.id_destaque}`, { metodo: 'PATCH', corpo: { ativo: !slide.ativo } }),
                        slide.ativo ? `${slide.titulo} saiu da loja.` : `${slide.titulo} voltou para a loja.`,
                      )}
                    >
                      {slide.ativo ? 'Desativar' : 'Reativar'}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={enviando} onClick={() => apagar(slide)} className="text-ferrugem">
                      {apagando === slide.id_destaque ? 'Confirmar: apagar slide e foto' : 'Apagar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      <input ref={seletor} type="file" accept={TIPOS_FOTO.join(',')} onChange={enviarFoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <p className="text-xs text-muted-foreground">Foto em JPG, PNG ou WEBP de até 5 MB, de preferência larga (o slide ocupa a largura da tela).</p>
      {(erroFoto || erro) && <Aviso mensagem={erroFoto || erro} />}
      {feito && <Sucesso>{feito}</Sucesso>}
    </section>
  )
}

function FormularioDestaque({ inicial, enviando, aoSalvar, aoCancelar }: {
  inicial: Textos
  enviando: boolean
  aoSalvar: (dados: Textos) => void
  aoCancelar: () => void
}) {
  const [dados, setDados] = useState<Textos>({ titulo: inicial.titulo, texto: inicial.texto, rotulo_botao: inicial.rotulo_botao, link: inicial.link })
  const [erroLink, setErroLink] = useState<string | null>(null)
  const mudar = (campo: keyof Textos) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDados({ ...dados, [campo]: e.target.value })

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const problema = problemaDoLink(dados.link)
    setErroLink(problema)
    if (!problema) aoSalvar(dados)
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <Campo id="destaque-titulo" rotulo="Título">
        <Input id="destaque-titulo" value={dados.titulo} onChange={mudar('titulo')} minLength={2} maxLength={80} required />
      </Campo>
      <Campo id="destaque-botao" rotulo="Texto do botão">
        <Input id="destaque-botao" value={dados.rotulo_botao} onChange={mudar('rotulo_botao')} minLength={2} maxLength={40} required />
      </Campo>
      <Campo id="destaque-texto" rotulo="Texto" className="sm:col-span-2">
        <Textarea id="destaque-texto" rows={2} value={dados.texto} onChange={mudar('texto')} minLength={2} maxLength={200} required />
      </Campo>
      <Campo id="destaque-link" rotulo="Página que o botão abre" dica="Uma página da loja, começando com /. Ex.: /loja/produtos?busca=linho" className="sm:col-span-2">
        <Input
          id="destaque-link"
          value={dados.link}
          onChange={mudar('link')}
          maxLength={300}
          aria-invalid={Boolean(erroLink) || undefined}
          aria-describedby={erroLink ? 'erro-destaque-link' : undefined}
          required
        />
      </Campo>
      {erroLink && <p id="erro-destaque-link" role="alert" className="text-sm text-ferrugem sm:col-span-2">{erroLink}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="lg" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar slide'}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={aoCancelar}>Cancelar</Button>
      </div>
    </form>
  )
}
