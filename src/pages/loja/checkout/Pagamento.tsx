import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, CreditCard, LoaderCircle, QrCode } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'
import { useEnviar } from '@/lib/useCarregar'
import { soDigitos } from './cep'

type Pedido = Esquema<'PedidoSaida'>
type Metodo = 'pix' | 'cartao_credito' | 'cartao_debito'

const METODOS: { valor: Metodo; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
]

// pagamento simulado (ADR 0011 do backend): os dados do cartão não saem do navegador; este número recusa
const CARTAO_QUE_RECUSA = '4000000000000002'
const PIX_APROVA_EM_MS = 4000

function cobrancaPendente(pedido: Pedido) {
  return [...pedido.pagamentos]
    .filter((p) => p.tipo === 'pagamento' && p.status === 'pendente')
    .sort((a, b) => b.id_pagamento - a.id_pagamento)[0]
}

function faltaPagar(pedido: Pedido) {
  return Math.max(0, Number(pedido.valor_total) - Number(pedido.valor_pago))
}

export function Pagamento({ pedido, aoAtualizar }: { pedido: Pedido; aoAtualizar: (pedido: Pedido) => void }) {
  const [metodo, setMetodo] = useState<Metodo>('pix')
  const pixPendente = cobrancaPendente(pedido)?.metodo === 'pix'

  return (
    <div className="space-y-5">
      <fieldset disabled={pixPendente}>
        <legend className="sr-only">Forma de pagamento</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {METODOS.map((m) => (
            <label
              key={m.valor}
              className={cn(
                'flex cursor-pointer items-center gap-2 border p-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                metodo === m.valor ? 'border-marinho bg-aco-fundo font-medium' : 'hover:border-foreground',
              )}
            >
              <input
                type="radio"
                name="metodo"
                value={m.valor}
                checked={metodo === m.valor}
                onChange={() => setMetodo(m.valor)}
                className="accent-marinho"
              />
              {m.valor === 'pix' ? <QrCode className="size-4" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
              {m.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {metodo === 'pix' ? (
        <PagarComPix pedido={pedido} aoAtualizar={aoAtualizar} />
      ) : (
        <PagarComCartao key={metodo} pedido={pedido} metodo={metodo} aoAtualizar={aoAtualizar} />
      )}
    </div>
  )
}

// Pix: gera a cobrança, mostra QR e "copia e cola" de mentira e o gateway simulado aprova sozinho
function PagarComPix({ pedido, aoAtualizar }: { pedido: Pedido; aoAtualizar: (pedido: Pedido) => void }) {
  const { enviar, enviando, erro } = useEnviar()
  const [copiado, setCopiado] = useState(false)
  const pendente = cobrancaPendente(pedido)
  const cobranca = pendente?.metodo === 'pix' ? pendente : undefined
  const idCobranca = cobranca?.id_pagamento

  // o "banco" aprova o Pix alguns segundos depois de gerado; uma vez por cobrança
  useEffect(() => {
    if (!idCobranca) return
    const relogio = window.setTimeout(() => {
      void enviar(() =>
        api<Pedido>(`/pagamentos/${idCobranca}/simular`, { metodo: 'POST', corpo: { aprovado: true } }),
      ).then((atualizado) => {
        if (atualizado) aoAtualizar(atualizado)
      })
    }, PIX_APROVA_EM_MS)
    return () => window.clearTimeout(relogio)
  }, [idCobranca, enviar, aoAtualizar])

  async function gerar() {
    const atualizado = await enviar(() =>
      api<Pedido>(`/pedidos/${pedido.id_pedido}/pagamentos`, { metodo: 'POST', corpo: { metodo: 'pix' } }),
    )
    if (atualizado) aoAtualizar(atualizado)
  }

  if (!cobranca) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">O código Pix vale enquanto a reserva estiver ativa.</p>
        {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
        <Button size="loja" className="w-full sm:w-full" onClick={() => void gerar()} disabled={enviando}>
          {enviando ? 'Gerando o Pix...' : `Pagar ${moeda(faltaPagar(pedido))} com Pix`}
        </Button>
      </div>
    )
  }

  const copiaECola = `00020126580014br.gov.bcb.pix0136${cobranca.id_transacao_gateway ?? cobranca.id_pagamento}520400005303986540${cobranca.valor.length}${cobranca.valor}5802BR5912CASA LORENZI6009SAO PAULO6304SIMU`

  return (
    <div className="grid gap-5 border p-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <QrFalso semente={cobranca.id_transacao_gateway ?? String(cobranca.id_pagamento)} />
      <div className="min-w-0 space-y-3">
        <p className="font-medium">Pix de {moeda(cobranca.valor)} gerado</p>
        <p className="text-sm text-muted-foreground">
          Leia o QR no app do banco ou use o código abaixo. Nesta demonstração o pagamento é simulado e aprova sozinho em
          alguns segundos.
        </p>
        <div className="flex gap-2">
          <label htmlFor="pix-copia-e-cola" className="sr-only">Código Pix copia e cola</label>
          <Input id="pix-copia-e-cola" readOnly value={copiaECola} className="font-normal" onFocus={(e) => e.target.select()} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(copiaECola)
              setCopiado(true)
            }}
          >
            {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p role="status" className="flex items-center gap-2 text-sm text-aco">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Aguardando a confirmação do pagamento
        </p>
        {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
      </div>
    </div>
  )
}

const LADO_QR = 21
// os três quadrados de canto de um QR: começam em (0,0), (14,0) e (0,14) e têm 7 de lado
const CANTOS = [[0, 0], [LADO_QR - 7, 0], [0, LADO_QR - 7]]

// QR de enfeite, estável para a mesma cobrança: não é um Pix de verdade
function QrFalso({ semente }: { semente: string }) {
  let estado = [...semente].reduce((soma, letra) => (soma * 31 + letra.charCodeAt(0)) >>> 0, 7)
  const sorteio = () => {
    estado = (estado * 1103515245 + 12345) >>> 0
    return (estado >>> 16) % 2 === 0
  }

  const quadrados: { x: number; y: number }[] = []
  for (let y = 0; y < LADO_QR; y++) {
    for (let x = 0; x < LADO_QR; x++) {
      // margem de 1 em volta do canto fica vazia, como num QR real
      const perto = CANTOS.find(([cx, cy]) => x >= cx! - 1 && x <= cx! + 7 && y >= cy! - 1 && y <= cy! + 7)
      let cheio: boolean
      if (perto) {
        const [lx, ly] = [x - perto[0]!, y - perto[1]!]
        const dentro = lx >= 0 && lx <= 6 && ly >= 0 && ly <= 6
        const borda = lx === 0 || lx === 6 || ly === 0 || ly === 6
        const miolo = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
        cheio = dentro && (borda || miolo)
      } else {
        cheio = sorteio()
      }
      if (cheio) quadrados.push({ x, y })
    }
  }
  const lado = LADO_QR
  return (
    <svg viewBox={`0 0 ${lado} ${lado}`} className="size-40 bg-white p-2 ring-1 ring-border" role="img" aria-label="QR Code do Pix (simulado)">
      {quadrados.map(({ x, y }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="fill-marinho-escuro" />)}
    </svg>
  )
}

// cartão: número, nome, validade e CVV ficam só no navegador; o gateway simulado aprova ou recusa
function PagarComCartao({
  pedido,
  metodo,
  aoAtualizar,
}: {
  pedido: Pedido
  metodo: Exclude<Metodo, 'pix'>
  aoAtualizar: (pedido: Pedido) => void
}) {
  const [cartao, setCartao] = useState({ numero: '', nome: '', validade: '', cvv: '' })
  const [erros, setErros] = useState<Partial<Record<keyof typeof cartao, string>>>({})
  const [recusado, setRecusado] = useState(false)
  const { enviar, enviando, erro } = useEnviar()

  function mudar(chave: keyof typeof cartao, valor: string) {
    setCartao((atual) => ({ ...atual, [chave]: valor }))
    setErros((atuais) => ({ ...atuais, [chave]: undefined }))
  }

  function validar(chave: keyof typeof cartao): string | undefined {
    const digitos = soDigitos(cartao[chave])
    if (chave === 'numero' && (digitos.length < 13 || digitos.length > 19)) return 'O número do cartão tem de 13 a 19 dígitos.'
    if (chave === 'nome' && cartao.nome.trim().length < 3) return 'Escreva o nome como está no cartão.'
    if (chave === 'validade') {
      const [mes, ano] = [Number(digitos.slice(0, 2)), Number(digitos.slice(2, 4))]
      const agora = new Date()
      const vencido = 2000 + ano < agora.getFullYear() || (2000 + ano === agora.getFullYear() && mes < agora.getMonth() + 1)
      if (digitos.length !== 4 || mes < 1 || mes > 12) return 'Use o formato MM/AA, como 08/29.'
      if (vencido) return 'Este cartão está vencido.'
    }
    if (chave === 'cvv' && (digitos.length < 3 || digitos.length > 4)) return 'O CVV tem 3 ou 4 dígitos, no verso do cartão.'
    return undefined
  }

  function aoSair(chave: keyof typeof cartao) {
    if (cartao[chave]) setErros((atuais) => ({ ...atuais, [chave]: validar(chave) }))
  }

  async function pagar(evento: FormEvent) {
    evento.preventDefault()
    const encontrados = Object.fromEntries(
      (Object.keys(cartao) as (keyof typeof cartao)[]).map((c) => [c, validar(c)]),
    ) as typeof erros
    setErros(encontrados)
    if (Object.values(encontrados).some(Boolean)) return

    setRecusado(false)
    const resultado = await enviar(async () => {
      const comCobranca = await api<Pedido>(`/pedidos/${pedido.id_pedido}/pagamentos`, { metodo: 'POST', corpo: { metodo } })
      const cobranca = cobrancaPendente(comCobranca)
      if (!cobranca) return comCobranca
      const aprovado = soDigitos(cartao.numero) !== CARTAO_QUE_RECUSA
      return api<Pedido>(`/pagamentos/${cobranca.id_pagamento}/simular`, { metodo: 'POST', corpo: { aprovado } })
    })
    if (!resultado) return
    if (resultado.status !== 'pago') setRecusado(true)
    aoAtualizar(resultado)
  }

  const mascaraNumero = (texto: string) => soDigitos(texto).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
  const mascaraValidade = (texto: string) => {
    const d = soDigitos(texto).slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  return (
    <form onSubmit={(e) => void pagar(e)} noValidate className="space-y-4">
      <p className="bg-superficie p-3 text-sm text-muted-foreground">
        Pagamento simulado: os dados do cartão não saem do seu navegador. Use 4111 1111 1111 1111 para aprovar ou
        4000 0000 0000 0002 para ver uma recusa, com qualquer validade futura e CVV.
      </p>

      {recusado && (
        <p role="alert" className="border-l-4 border-ferrugem bg-ferrugem-fundo p-3 text-sm text-ferrugem">
          O banco recusou o pagamento. Confira os dados, tente outro cartão ou pague com Pix. Seus dados continuam
          preenchidos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Campo id="cartao-numero" rotulo="Número do cartão" className="sm:col-span-4" dica={erros.numero && <ErroCampo texto={erros.numero} />}>
          <Input
            id="cartao-numero"
            value={cartao.numero}
            onChange={(e) => mudar('numero', mascaraNumero(e.target.value))}
            onBlur={() => aoSair('numero')}
            inputMode="numeric"
            autoComplete="cc-number"
            aria-invalid={Boolean(erros.numero)}
            placeholder="0000 0000 0000 0000"
          />
        </Campo>
        <Campo id="cartao-nome" rotulo="Nome no cartão" className="sm:col-span-4" dica={erros.nome && <ErroCampo texto={erros.nome} />}>
          <Input
            id="cartao-nome"
            value={cartao.nome}
            onChange={(e) => mudar('nome', e.target.value)}
            onBlur={() => aoSair('nome')}
            autoComplete="cc-name"
            aria-invalid={Boolean(erros.nome)}
          />
        </Campo>
        <Campo id="cartao-validade" rotulo="Validade" className="sm:col-span-2" dica={erros.validade && <ErroCampo texto={erros.validade} />}>
          <Input
            id="cartao-validade"
            value={cartao.validade}
            onChange={(e) => mudar('validade', mascaraValidade(e.target.value))}
            onBlur={() => aoSair('validade')}
            inputMode="numeric"
            autoComplete="cc-exp"
            aria-invalid={Boolean(erros.validade)}
            placeholder="MM/AA"
          />
        </Campo>
        <Campo id="cartao-cvv" rotulo="CVV" className="sm:col-span-2" dica={erros.cvv && <ErroCampo texto={erros.cvv} />}>
          <Input
            id="cartao-cvv"
            value={cartao.cvv}
            onChange={(e) => mudar('cvv', soDigitos(e.target.value).slice(0, 4))}
            onBlur={() => aoSair('cvv')}
            inputMode="numeric"
            autoComplete="cc-csc"
            aria-invalid={Boolean(erros.cvv)}
          />
        </Campo>
      </div>

      {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
      <Button type="submit" size="loja" className="w-full sm:w-full" disabled={enviando}>
        {enviando ? 'Processando...' : `Pagar ${moeda(faltaPagar(pedido))}`}
      </Button>
    </form>
  )
}

function ErroCampo({ texto }: { texto: string }) {
  return <span role="alert" className="text-ferrugem">{texto}</span>
}
