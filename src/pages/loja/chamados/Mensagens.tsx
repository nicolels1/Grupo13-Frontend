import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'
import { Check, CheckCheck, FileText, LoaderCircle, Paperclip, SendHorizontal, X } from 'lucide-react'
import { cn } from 'cn'

import { api, type Esquema } from '@/lib/api'
import { hora } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'
import { ehImagem, problemaDoArquivo, TIPOS_DO_ANEXO } from './anexos'

type Mensagem = Esquema<'MensagemSaida'>

// um balão da conversa: os do cliente à direita em marinho, os da equipe à esquerda em branco, com a
// inicial de quem atendeu num círculo aço. Mensagens seguidas da mesma pessoa (continuacao) ficam
// coladas, sem repetir nome e inicial. O horário fica embaixo do balão; nas do cliente, com ✓ (enviada)
// ou ✓✓ em aço (a equipe já leu)
export function Balao({
  minha,
  continuacao = false,
  autor,
  texto,
  criadoEm,
  lidaEm,
  anexo,
}: {
  minha: boolean
  continuacao?: boolean
  autor: string
  texto: string | null
  criadoEm: string
  lidaEm?: string | null
  anexo?: { idChamado: number; idMensagem: number; nome: string } | null
}) {
  return (
    <li className={cn('flex gap-2.5', minha ? 'justify-end' : 'justify-start', !continuacao && 'pt-3')}>
      {!minha && (
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-aco text-sm font-medium text-white',
            continuacao && 'invisible',
          )}
          aria-hidden="true"
        >
          {autor.charAt(0)}
        </span>
      )}
      <div className={cn('flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]', minha ? 'items-end' : 'items-start')}>
        {!minha && !continuacao && <span className="px-1 text-xs font-medium text-marinho">{autor}</span>}
        {minha && <span className="sr-only">{autor}</span>}
        {/* o canto do lado de quem fala fica menos arredondado, apontando para a pessoa */}
        <div
          className={cn(
            'space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed',
            minha ? 'rounded-br-sm bg-marinho text-white' : 'rounded-bl-sm bg-background shadow-xs',
          )}
        >
          {anexo && <AnexoDaMensagem {...anexo} minha={minha} />}
          {texto && <p className="whitespace-pre-line">{texto}</p>}
        </div>
        <p className="flex items-center gap-1 px-1 text-[0.7rem] text-muted-foreground tabular-nums">
          {hora(criadoEm)}
          {minha &&
            (lidaEm ? (
              <CheckCheck className="size-4 text-aco" aria-label="Lida pela equipe" />
            ) : (
              <Check className="size-3.5" aria-label="Enviada" />
            ))}
        </p>
      </div>
    </li>
  )
}

// o anexo fica na área privada: a API dá um link temporário quando a mensagem aparece.
// Foto aparece dentro do balão (clicar abre grande); PDF vira um botão de arquivo
function AnexoDaMensagem({ idChamado, idMensagem, nome, minha }: { idChamado: number; idMensagem: number; nome: string; minha: boolean }) {
  const { dados, erro } = useCarregar(
    () => api<Esquema<'AnexoLink'>>(`/chamados/${idChamado}/mensagens/${idMensagem}/anexo`),
    [idChamado, idMensagem],
  )
  if (erro) return <p className="text-xs opacity-80">Não foi possível abrir o anexo {nome}.</p>
  if (!dados) {
    return (
      <span className="flex items-center gap-2 text-xs opacity-80">
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Carregando {nome}
      </span>
    )
  }
  if (ehImagem(nome)) {
    return (
      <a href={dados.url} target="_blank" rel="noreferrer" className="block" aria-label={`Abrir a foto ${nome} em tamanho grande`}>
        <img src={dados.url} alt={nome} className="max-h-64 w-full max-w-xs rounded-lg object-cover" />
      </a>
    )
  }
  return (
    <a
      href={dados.url}
      target="_blank"
      rel="noreferrer"
      className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm underline-offset-4 hover:underline', minha ? 'bg-white/10' : 'bg-superficie')}
    >
      <FileText className="size-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{nome}</span>
    </a>
  )
}

// caixa de escrever: texto (Enter envia, Shift+Enter quebra a linha) e o clipe para anexar uma foto
// ou PDF, com prévia antes de enviar
export function Compositor({
  idChamado,
  aoEnviar,
}: {
  idChamado: number
  aoEnviar: (mensagem: Mensagem) => void
}) {
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)
  const previa = useMemo(() => (arquivo && arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null), [arquivo])
  useEffect(() => () => {
    if (previa) URL.revokeObjectURL(previa)
  }, [previa])

  function escolher(lista: FileList | null) {
    const escolhido = lista?.[0]
    if (!escolhido) return
    const problema = problemaDoArquivo(escolhido)
    setErro(problema)
    if (!problema) setArquivo(escolhido)
  }

  async function enviar(evento?: SubmitEvent) {
    evento?.preventDefault()
    if (enviando || (!texto.trim() && !arquivo)) return
    setErro(null)
    setEnviando(true)
    try {
      let mensagem: Mensagem
      if (arquivo) {
        const dados = new FormData()
        dados.append('arquivo', arquivo)
        if (texto.trim()) dados.append('conteudo', texto.trim())
        mensagem = await api<Mensagem>(`/chamados/${idChamado}/anexos`, { metodo: 'POST', corpo: dados })
      } else {
        mensagem = await api<Mensagem>(`/chamados/${idChamado}/mensagens`, { metodo: 'POST', corpo: { conteudo: texto.trim() } })
      }
      setTexto('')
      setArquivo(null)
      aoEnviar(mensagem)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault()
      void enviar()
    }
  }

  // texto, clipe e enviar ficam numa caixa só, que acende em aço quando está em foco
  return (
    <form onSubmit={(e) => void enviar(e)} className="shrink-0 space-y-2 border-t bg-background p-3 sm:p-4">
      {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}

      <div className="overflow-hidden rounded-xl border border-input bg-background transition-colors focus-within:border-aco focus-within:ring-3 focus-within:ring-ring/30">
        {arquivo && (
          <div className="flex items-center gap-3 border-b bg-superficie p-2">
            {previa ? (
              <img src={previa} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-background">
                <FileText className="size-6 text-aco" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm">{arquivo.name}</span>
            <button
              type="button"
              onClick={() => setArquivo(null)}
              aria-label={`Tirar o anexo ${arquivo.name}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-background"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1 p-1.5">
          <button
            type="button"
            onClick={() => seletor.current?.click()}
            aria-label="Anexar foto ou PDF"
            title="Anexar foto ou PDF (até 10 MB)"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-aco hover:bg-aco-fundo focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </button>
          <input
            ref={seletor}
            type="file"
            accept={TIPOS_DO_ANEXO.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              escolher(e.target.files)
              e.target.value = ''
            }}
          />
          <label htmlFor={`mensagem-${idChamado}`} className="sr-only">Mensagem</label>
          <textarea
            id={`mensagem-${idChamado}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder={arquivo ? 'Escreva algo sobre o anexo (opcional)' : 'Escreva uma mensagem'}
            rows={1}
            maxLength={5000}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={enviando || (!texto.trim() && !arquivo)}
            aria-label="Enviar mensagem"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-marinho text-white hover:bg-marinho/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-superficie disabled:text-muted-foreground"
          >
            {enviando ? (
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <SendHorizontal className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p className="px-1 text-xs text-muted-foreground max-sm:hidden">Enter envia e Shift+Enter quebra a linha. Foto ou PDF de até 10 MB.</p>
    </form>
  )
}
