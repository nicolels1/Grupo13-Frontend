import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowRight, RotateCcw, Send, Store, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SUGESTOES, TAMANHO_MAXIMO, type ConversaAssistente, type Fala, type UnidadeEmFoco } from './conversaAssistente'

// painel lateral do assistente interno (Entrega 4, ideia A): abre por cima de qualquer tela da plataforma.
// A conversa vem de fora (useConversaAssistente no layout), então continua ao fechar e trocar de tela
export function PainelAssistente({ aberto, aoMudar, conversa, unidadeEmFoco, unidades, aoTrocarUnidade }: {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  conversa: ConversaAssistente
  // a unidade selecionada no topo: vale quando a pergunta não diz a unidade; null = todas
  unidadeEmFoco: UnidadeEmFoco | null
  // as unidades do seletor do topo: trocar aqui troca lá (uma unidade selecionada só)
  unidades: UnidadeEmFoco[]
  aoTrocarUnidade: (id_unidade: number | null) => void
}) {
  // a selecionada sempre tem opção (inativa, por exemplo, não está na lista)
  const opcoes = unidadeEmFoco && !unidades.some((u) => u.id_unidade === unidadeEmFoco.id_unidade)
    ? [unidadeEmFoco, ...unidades]
    : unidades
  const { falas, enviando, avaliacao, respondeu, perguntar, avaliar, novaConversa } = conversa
  const [texto, setTexto] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  // respostas que já apareceram animadas: ao reabrir o painel, elas vêm inteiras
  const [animadas, setAnimadas] = useState<ReadonlySet<number>>(() => new Set())
  const marcarAnimada = useCallback((id: number) => {
    setAnimadas((atuais) => (atuais.has(id) ? atuais : new Set(atuais).add(id)))
  }, [])

  // a fala nova (e os pontinhos de "consultando") sempre à vista
  // sem devolver nada: no Chrome novo o scrollIntoView devolve uma Promise, e o React trataria o retorno do
  // efeito como a função de limpeza ("destroy is not a function")
  const rolarAteOFim = useCallback(() => {
    fim.current?.scrollIntoView?.({ block: 'end' })
  }, [])
  useEffect(() => {
    rolarAteOFim()
  }, [falas.length, enviando, aberto, rolarAteOFim])

  function enviar(evento?: FormEvent) {
    evento?.preventDefault()
    if (!texto.trim() || enviando) return
    void perguntar(texto, unidadeEmFoco)
    setTexto('')
  }

  // Enter envia; Shift+Enter quebra a linha
  function teclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={aoMudar}>
      <SheetContent className="w-full! gap-0 sm:max-w-md!">
        <SheetHeader className="border-b pr-24">
          <SheetTitle className="text-lg">Assistente</SheetTitle>
          <SheetDescription>Pergunte sobre vendas, estoque, peças paradas, pontos e a equipe. Os números vêm do sistema.</SheetDescription>
          <div className="space-y-1 pt-1 text-sm">
            <label className="flex items-center gap-1.5">
              <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Unidade selecionada</span>
              <select
                value={unidadeEmFoco ? String(unidadeEmFoco.id_unidade) : ''}
                onChange={(e) => aoTrocarUnidade(e.target.value ? Number(e.target.value) : null)}
                className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todas as unidades</option>
                {opcoes.map((u) => (
                  <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>
                ))}
              </select>
            </label>
            <p className="text-muted-foreground" data-testid="unidade-em-foco">
              {unidadeEmFoco
                ? `Perguntas sem unidade usam ${unidadeEmFoco.nome}.`
                : 'Perguntas sem unidade valem para a rede inteira.'}
            </p>
          </div>
          {falas.length > 0 && (
            <Button variant="ghost" size="sm" className="absolute top-3 right-12" onClick={novaConversa} disabled={enviando}>
              <RotateCcw aria-hidden="true" /> Nova
            </Button>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {falas.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Por exemplo:</p>
              <ul className="space-y-2">
                {SUGESTOES.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void perguntar(s, unidadeEmFoco)}
                      className="w-full border border-border px-3 py-2 text-left text-sm hover:border-foreground"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-4">
            {falas.map((fala) => (
              <li key={fala.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                <FalaNaTela
                  fala={fala}
                  animar={!animadas.has(fala.id)}
                  aoTerminar={() => marcarAnimada(fala.id)}
                  aoCrescer={rolarAteOFim}
                  aoAbrirLink={() => aoMudar(false)}
                  aoRefazer={perguntar}
                  enviando={enviando}
                />
              </li>
            ))}
          </ul>
          {enviando && <Consultando />}
          <div ref={fim} />
        </div>

        <div className="space-y-3 border-t p-4">
          {respondeu && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ajudou?</span>
              <Button variant="ghost" size="icon-sm" aria-label="Ajudou" aria-pressed={avaliacao === 'positiva'}
                      className={cn(avaliacao === 'positiva' && 'bg-muted text-foreground')} onClick={() => void avaliar('positiva')}>
                <ThumbsUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Não ajudou" aria-pressed={avaliacao === 'negativa'}
                      className={cn(avaliacao === 'negativa' && 'bg-muted text-foreground')} onClick={() => void avaliar('negativa')}>
                <ThumbsDown />
              </Button>
            </div>
          )}
          <form onSubmit={enviar} className="flex items-end gap-2">
            <label htmlFor="pergunta-assistente" className="sr-only">Sua pergunta</label>
            <textarea
              id="pergunta-assistente"
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={teclar}
              maxLength={TAMANHO_MAXIMO}
              placeholder="Escreva sua pergunta"
              className="min-h-10 flex-1 resize-none border border-input px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="lg" className="h-10 px-4" disabled={enviando || !texto.trim()}>
              <Send aria-hidden="true" /> Enviar
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// três pontinhos enquanto o assistente consulta (o leitor de tela ouve "Consultando...")
function Consultando() {
  return (
    <div role="status" className="mt-4 mr-10 flex h-8 items-center gap-1 border-l-4 border-marinho px-3">
      <span className="sr-only">Consultando...</span>
      {[0, 150, 300].map((atraso) => (
        <span
          key={atraso}
          aria-hidden="true"
          className="size-1.5 animate-bounce rounded-full bg-marinho/60 motion-reduce:animate-none"
          style={{ animationDelay: `${atraso}ms` }}
        />
      ))}
    </div>
  )
}

// a resposta aparece palavra por palavra, em no máximo DURACAO_MAXIMA_MS (resposta longa anda mais rápido).
// Sem animação (preferência do sistema, ou sem matchMedia), vem inteira. O leitor de tela lê o texto inteiro
// de uma vez, não cada pedaço
const PASSO_MS = 30
const DURACAO_MAXIMA_MS = 1200

function semAnimacao() {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useTextoAparecendo(texto: string, animar: boolean, aoCrescer: () => void, aoTerminar: () => void) {
  const pedacos = useMemo(() => texto.split(/(\s+)/), [texto])
  const [mostrados, setMostrados] = useState(() => (animar && !semAnimacao() ? 0 : pedacos.length))
  // os avisos mais recentes, sem reiniciar a animação quando quem chama recria as funções
  const avisos = useRef({ aoCrescer, aoTerminar })
  useEffect(() => {
    avisos.current = { aoCrescer, aoTerminar }
  })

  useEffect(() => {
    if (mostrados >= pedacos.length) {
      avisos.current.aoTerminar()
      return undefined
    }
    const porPasso = Math.max(1, Math.ceil(pedacos.length / (DURACAO_MAXIMA_MS / PASSO_MS)))
    const passo = setTimeout(() => {
      setMostrados((atual) => Math.min(pedacos.length, atual + porPasso))
      avisos.current.aoCrescer()
    }, PASSO_MS)
    return () => clearTimeout(passo)
  }, [mostrados, pedacos.length])

  const terminou = mostrados >= pedacos.length
  return { terminou, parcial: terminou ? texto : pedacos.slice(0, mostrados).join('') }
}

function RespostaNaTela({ fala, animar, aoTerminar, aoCrescer, aoAbrirLink }: {
  fala: Extract<Fala, { papel: 'assistente' }>
  animar: boolean
  aoTerminar: () => void
  aoCrescer: () => void
  aoAbrirLink: () => void
}) {
  const { terminou, parcial } = useTextoAparecendo(fala.texto, animar, aoCrescer, aoTerminar)
  return (
    <div className="mr-10 space-y-2 border-l-4 border-marinho px-3 py-1 text-sm">
      {terminou ? (
        <p className="whitespace-pre-line">{fala.texto}</p>
      ) : (
        <>
          <span className="sr-only">{fala.texto}</span>
          <p aria-hidden="true" className="whitespace-pre-line">{parcial}</p>
        </>
      )}
      {/* o link e a nota entram quando o texto termina */}
      {terminou && (
        <div className="animate-in fade-in space-y-2 duration-300 motion-reduce:animate-none">
          {fala.links.map((link) => (
            <Link key={link.url} to={link.url} onClick={aoAbrirLink} className="flex items-center gap-1 text-aco underline underline-offset-2">
              {link.rotulo} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ))}
          {fala.montada && <p className="text-xs text-muted-foreground">Resposta montada direto pelo sistema.</p>}
        </div>
      )}
    </div>
  )
}

function FalaNaTela({ fala, animar, aoTerminar, aoCrescer, aoAbrirLink, aoRefazer, enviando }: {
  fala: Fala
  animar: boolean
  aoTerminar: () => void
  aoCrescer: () => void
  aoAbrirLink: () => void
  aoRefazer: (pergunta: string, unidade: UnidadeEmFoco | null) => Promise<void>
  enviando: boolean
}) {
  if (fala.papel === 'usuario') {
    return (
      <div className="ml-10 space-y-1">
        <p className="bg-superficie px-3 py-2 text-sm whitespace-pre-line">{fala.texto}</p>
        {/* a unidade do topo quando a pergunta foi feita: a resposta usa essa se a pergunta não disse outra */}
        <p className="text-right text-xs text-muted-foreground">{fala.unidade ? `com ${fala.unidade.nome} selecionada` : 'com todas as unidades'}</p>
      </div>
    )
  }
  if (fala.papel === 'erro') {
    return (
      <div role="alert" className="mr-10 space-y-2 border-l-4 border-terracota bg-terracota/10 px-3 py-2 text-sm">
        <p>{fala.texto}</p>
        <Button variant="outline" size="sm" onClick={() => void aoRefazer(fala.pergunta, fala.unidade)} disabled={enviando}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  return <RespostaNaTela fala={fala} animar={animar} aoTerminar={aoTerminar} aoCrescer={aoCrescer} aoAbrirLink={aoAbrirLink} />
}
