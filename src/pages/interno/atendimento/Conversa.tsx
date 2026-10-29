import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Info, Paperclip, Send, X } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Abas } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { api, ErroApi, type Esquema } from '@/lib/api'
import { separarConversa, type Fala } from '@/lib/conversaDoAssistente'
import { CATEGORIAS_CHAMADO, dataHora, dataLonga, hora, tamanhoArquivo } from '@/lib/formato'
import { useCarregar, useEnviar, useIntervalo } from '@/lib/useCarregar'
import { Prioridade } from './Fila'
import { PainelDoChamado } from './PainelDoChamado'
import { comoChamar, nomeDoCanalExterno, origemDoChamado, quemAbriu, respostaNaConversa, respostaNaoChega, semCadastro } from './regrasChamado'

type Chamado = Esquema<'ChamadoEquipe'>
type Mensagem = Esquema<'MensagemSaida'>
type Historico = Esquema<'Lista_HistoricoSaida_'>

// conversa do chamado: as mensagens, os anexos e a resposta (ou nota interna)

const INTERVALO_ATUALIZACAO = 20000

// conversa e painel do chamado aberto, na terceira coluna da caixa de entrada.
// `aoMudar` atualiza a lista e as contagens quando o chamado muda (assumir, concluir, prioridade)
export function ChamadoAberto({ idChamado, aoMudar }: { idChamado: string; aoMudar: () => void }) {
  const chamado = useCarregar(() => api<Chamado>(`/atendimento/chamados/${idChamado}`), [idChamado])
  const mensagens = useCarregar(() => api<Esquema<'Lista_MensagemSaida_'>>(`/atendimento/chamados/${idChamado}/mensagens`), [idChamado])
  const historico = useCarregar(() => api<Historico>(`/atendimento/chamados/${idChamado}/historico`), [idChamado])
  useIntervalo(mensagens.recarregar, INTERVALO_ATUALIZACAO)

  if (chamado.carregando && !chamado.dados) return <Carregando />
  if (chamado.erro || !chamado.dados) return <Aviso mensagem={chamado.erro ?? 'Chamado não encontrado.'} />
  const c = chamado.dados
  const concluido = c.status === 'concluido'
  // chamado aberto pelo assistente virtual: o resumo que o cliente confirmou e, à parte, a conversa com o assistente
  const { resumo, conversa } = separarConversa(c.descricao)

  function atualizarTudo() {
    chamado.recarregar()
    historico.recarregar()
    aoMudar()
  }

  function aposResponder() {
    mensagens.recarregar()
    atualizarTudo()
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-medium">{c.assunto}</h2>
          <p className="text-sm text-muted-foreground">
            Chamado {c.id_chamado}, aberto por {quemAbriu(c)} em {dataLonga(c.criado_em)} às {hora(c.criado_em)}, {CATEGORIAS_CHAMADO[c.categoria]?.toLowerCase()}
          </p>
          {c.canal_externo && (
            <p className="flex flex-wrap gap-2 pt-1">
              <Etiqueta>{origemDoChamado(c)}</Etiqueta>
              {semCadastro(c) && <Etiqueta alerta>Sem cadastro</Etiqueta>}
            </p>
          )}
        </div>
        <Prioridade chamado={c} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6">
          <ol aria-label="Mensagens" className="space-y-5">
            {conversa.length > 0 && <ConversaComAssistente conversa={conversa} cliente={comoChamar(c)} />}
            <Mensagem mensagem={{ conteudo: resumo, autor: quemAbriu(c), criado_em: c.criado_em }} />
            {mensagens.dados?.items.map((m) => <Mensagem key={m.id_mensagem} mensagem={m} />)}
          </ol>
          {mensagens.erro && <Aviso mensagem={mensagens.erro} />}

          {!concluido && <Responder chamado={c} aoEnviar={aposResponder} />}
        </div>

        <PainelDoChamado chamado={c} historico={historico} aoMudar={atualizarTudo} />

      </div>
    </>
  )
}

// o que o cliente já falou com o assistente antes de pedir uma pessoa, recolhido para não empurrar a conversa
// com a equipe para baixo
function ConversaComAssistente({ conversa, cliente }: { conversa: Fala[]; cliente: string }) {
  return (
    <li>
      <details className="border bg-background text-sm">
        <summary className="cursor-pointer px-4 py-3 font-medium">
          Conversa com o assistente virtual antes do chamado ({conversa.length} {conversa.length === 1 ? 'mensagem' : 'mensagens'})
        </summary>
        <ol className="space-y-2 border-t px-4 py-3">
          {conversa.map((fala, i) => (
            <li key={i} className="whitespace-pre-line">
              <span className="font-medium">{fala.de === 'cliente' ? cliente : 'Assistente virtual'}:</span> {fala.texto}
            </li>
          ))}
        </ol>
      </details>
    </li>
  )
}

// balão da conversa: cliente à esquerda, equipe à direita; nota interna em ardósia-claro com
// "Só a equipe vê" (design, seção Atendimento). A primeira mensagem é a descrição do chamado.
// a descrição do chamado entra como a primeira mensagem, sem id nem anexo
type MensagemNaTela = Pick<Mensagem, 'conteudo' | 'autor' | 'criado_em'> & Partial<Mensagem>

function Mensagem({ mensagem: m }: { mensagem: MensagemNaTela }) {
  const daEquipe = Boolean(m.da_equipe)
  return (
    <li className={cn('flex flex-col gap-1', daEquipe ? 'items-end' : 'items-start')}>
      <div className={cn('max-w-[85%] space-y-2 px-4 py-3 text-sm', m.interna ? 'bg-ardosia-clara' : daEquipe ? 'bg-aco-fundo' : 'bg-superficie')}>
        {m.interna && <span className="block text-xs font-medium text-ardosia">Só a equipe vê</span>}
        {m.conteudo && <p className="whitespace-pre-line">{m.conteudo}</p>}
        {m.anexo_nome && m.id_mensagem !== undefined && <Anexo mensagem={m as Mensagem} />}
      </div>
      <span className="text-xs text-muted-foreground">
        {m.autor}{m.interna && ', nota interna'}, {dataHora(m.criado_em)}
      </span>
    </li>
  )
}

// o arquivo fica na área privada do Storage: o link é pedido na hora e vale por pouco tempo.
// A aba nova abre antes da chamada para o navegador não bloquear a janela.
function Anexo({ mensagem: m }: { mensagem: Mensagem }) {
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    setErro(null)
    const janela = window.open('', '_blank')
    try {
      const { url } = await api<Esquema<'AnexoLink'>>(`/atendimento/chamados/${m.id_chamado}/mensagens/${m.id_mensagem}/anexo`)
      if (janela) janela.location.href = url
      else window.location.href = url
    } catch (falha) {
      janela?.close()
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível abrir o anexo. Tente de novo.')
    }
  }

  return (
    <div>
      <button type="button" onClick={abrir} className="flex items-center gap-2 border bg-background px-3 py-2 text-left text-xs hover:border-foreground">
        <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate underline underline-offset-2">{m.anexo_nome}</span>
        <span className="shrink-0 text-muted-foreground">{tamanhoArquivo(m.anexo_tamanho)}</span>
      </button>
      {erro && <p className="pt-1 text-xs text-destructive">{erro}</p>}
    </div>
  )
}

// mesmas regras do backend para anexo de chamado
const TIPOS_ANEXO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const ANEXO_MAXIMO = 10 * 1024 * 1024

// campo de resposta: responder ao cliente ou nota interna, com texto e um anexo opcional. O cliente sem
// conta (o chamado migrado da Vulto) não vê resposta por aqui: só a nota interna, com o canal dele
function Responder({ chamado: c, aoEnviar }: { chamado: Chamado; aoEnviar: () => void }) {
  const soNota = respostaNaoChega(c)
  const [modo, setModo] = useState<'cliente' | 'interna'>(soNota ? 'interna' : 'cliente')
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const { enviar, enviando, erro } = useEnviar()
  const interna = modo === 'interna'

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (!escolhido) return
    if (!TIPOS_ANEXO.includes(escolhido.type)) {
      setErroArquivo('Esse tipo de arquivo não é aceito. Envie JPG, PNG, WEBP ou PDF.')
      return
    }
    if (escolhido.size > ANEXO_MAXIMO) {
      setErroArquivo(`O arquivo tem ${tamanhoArquivo(escolhido.size)}. Envie um de até 10 MB.`)
      return
    }
    setErroArquivo(null)
    setArquivo(escolhido)
  }

  async function responder(evento: FormEvent) {
    evento.preventDefault()
    const conteudo = texto.trim()
    const caminho = `/atendimento/chamados/${c.id_chamado}`
    const ok = await enviar(() => {
      if (!arquivo) return api<Mensagem>(`${caminho}/mensagens`, { metodo: 'POST', corpo: { conteudo, interna } })
      const formulario = new FormData()
      formulario.append('arquivo', arquivo)
      if (conteudo) formulario.append('conteudo', conteudo)
      formulario.append('interna', String(interna))
      return api<Mensagem>(`${caminho}/anexos`, { metodo: 'POST', corpo: formulario })
    })
    if (ok) {
      setTexto('')
      setArquivo(null)
      aoEnviar()
    }
  }

  return (
    <div className="space-y-2">
      {/* aviso para a equipe, com a cor de aviso (terracota) e não a das mensagens: não é uma fala da conversa */}
      {soNota && (
        <p role="note" className="flex items-start gap-3 border-l-4 border-terracota bg-terracota/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-terracota" aria-hidden="true" />
          <span>
            {quemAbriu(c)} não tem conta na plataforma e não vê respostas por aqui.
            {c.canal_externo && c.contato_externo
              ? ` Fale pelo ${nomeDoCanalExterno(c.canal_externo)} (${c.contato_externo}) e registre o combinado como nota interna.`
              : ' Registre o atendimento como nota interna.'}
          </span>
        </p>
      )}
      <form onSubmit={responder} className={cn('border focus-within:ring-2 focus-within:ring-ring', interna && 'border-ardosia')}>
      <div className="px-3 pt-2">
        <Abas
          rotulo="Tipo de resposta"
          valor={modo}
          aoMudar={setModo}
          abas={soNota
            ? [{ valor: 'interna', rotulo: 'Nota interna' }]
            : [{ valor: 'cliente', rotulo: `Responder a ${comoChamar(c)}` }, { valor: 'interna', rotulo: 'Nota interna' }]}
        />
      </div>
      <label htmlFor="resposta" className="sr-only">{interna ? 'Nota interna' : 'Mensagem'}</label>
      <textarea
        id="resposta"
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={5000}
        placeholder={interna ? 'Só a equipe vê esta nota' : `Escreva para ${comoChamar(c)}`}
        className={cn('block w-full resize-y px-4 py-3 text-sm outline-none', interna && 'bg-ardosia-clara')}
      />
      {arquivo && (
        <div className="flex items-center gap-2 border-t px-3 py-2 text-xs">
          <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{arquivo.name}</span>
          <span className="shrink-0 text-muted-foreground">{tamanhoArquivo(arquivo.size)}</span>
          <Button type="button" variant="ghost" size="icon" className="ml-auto size-7" aria-label="Tirar o anexo" onClick={() => setArquivo(null)}>
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t p-2">
        <input ref={seletor} type="file" accept={TIPOS_ANEXO.join(',')} onChange={escolher} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <Button type="button" variant="ghost" size="sm" onClick={() => seletor.current?.click()}>
          <Paperclip aria-hidden="true" /> Anexar
        </Button>
        <Button type="submit" size="lg" className="h-10 px-4" disabled={enviando || (!texto.trim() && !arquivo)}>
          <Send aria-hidden="true" /> {enviando ? 'Enviando...' : interna ? 'Salvar nota' : 'Enviar'}
        </Button>
      </div>
      {(erroArquivo || erro) && <div className="border-t p-3"><Aviso mensagem={erroArquivo || erro} /></div>}
      </form>
      {!interna && respostaNaConversa(c) && (
        <p className="text-xs text-muted-foreground">
          {comoChamar(c)} recebe esta resposta também na conversa com o assistente virtual, com o seu primeiro nome na frente.
        </p>
      )}
    </div>
  )
}
