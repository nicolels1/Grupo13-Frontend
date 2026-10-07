import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Clock, Store, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Button, buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { useCarrinho } from './carrinho/contexto'
import { useResumo, type ResumoCarrinho } from './carrinho/useResumo'
import { FormEndereco } from './checkout/FormEndereco'
import { Pagamento } from './checkout/Pagamento'
import { rotuloTamanho } from './componentes/tamanhos'

type Pedido = Esquema<'PedidoSaida'>
type Endereco = Esquema<'EnderecoSaida'>
type Modalidade = 'entrega' | 'retirada'

// pedido aguardando pagamento desta aba: sobrevive ao recarregar a página, para não reservar duas vezes
const CHAVE_PEDIDO = 'casa-lorenzi:pedido-em-aberto'

function lerPedidoGuardado() {
  try {
    return Number(sessionStorage.getItem(CHAVE_PEDIDO)) || null
  } catch {
    return null
  }
}

function guardarPedido(id: number | null) {
  try {
    if (id) sessionStorage.setItem(CHAVE_PEDIDO, String(id))
    else sessionStorage.removeItem(CHAVE_PEDIDO)
  } catch {
    // sem armazenamento: recarregar a página só perde a retomada
  }
}

// checkout em uma página (design): Receber → Endereço ou loja → Pagamento, resumo fixo ao lado
export function CheckoutLoja() {
  const navegar = useNavigate()
  const { itens, esvaziar } = useCarrinho()
  const resumo = useResumo()
  const enderecos = useCarregar(() => api<Esquema<'Lista_EnderecoSaida_'>>('/enderecos'), [])
  const [modalidade, setModalidade] = useState<Modalidade | null>(null)
  const [idEndereco, setIdEndereco] = useState<number | null>(null)
  const [idLoja, setIdLoja] = useState<number | null>(null)
  const [novoEndereco, setNovoEndereco] = useState(false)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [retomando, setRetomando] = useState(() => lerPedidoGuardado() !== null)
  const { enviar, enviando, erro } = useEnviar()

  // retoma o pedido desta aba se ele ainda espera pagamento
  useEffect(() => {
    const id = lerPedidoGuardado()
    if (!id) return
    api<Pedido>(`/pedidos/${id}`)
      .then((achado) => {
        if (achado.status === 'aguardando_pagamento') setPedido(achado)
        else guardarPedido(null)
      })
      .catch(() => guardarPedido(null))
      .finally(() => setRetomando(false))
  }, [])

  const dadosResumo = resumo.dados
  const listaEnderecos = enderecos.dados?.items ?? []
  // escolhas padrão: entrega se der, o primeiro endereço salvo e a primeira loja
  const modalidadeEfetiva: Modalidade | null =
    modalidade ?? (dadosResumo ? (dadosResumo.entrega_disponivel ? 'entrega' : dadosResumo.lojas_retirada.length ? 'retirada' : null) : null)
  const enderecoEfetivo = idEndereco ?? listaEnderecos[0]?.id_endereco ?? null
  const lojaEfetiva = idLoja ?? dadosResumo?.lojas_retirada[0]?.id_unidade ?? null

  const aoAtualizar = useCallback(
    (atualizado: Pedido) => {
      setPedido(atualizado)
      if (atualizado.status === 'pago') {
        guardarPedido(null)
        esvaziar()
        navegar(`/loja/pedido-confirmado/${atualizado.id_pedido}`, { replace: true })
      }
    },
    [esvaziar, navegar],
  )

  async function irParaPagamento() {
    const criado = await enviar(() =>
      api<Pedido>('/pedidos', {
        metodo: 'POST',
        corpo: {
          itens: itens.map(({ id_variante, quantidade }) => ({ id_variante, quantidade })),
          modalidade: modalidadeEfetiva,
          id_endereco: modalidadeEfetiva === 'entrega' ? enderecoEfetivo : null,
          id_unidade_retirada: modalidadeEfetiva === 'retirada' ? lojaEfetiva : null,
        },
      }),
    )
    if (criado) {
      guardarPedido(criado.id_pedido)
      setPedido(criado)
    }
  }

  // mudar a entrega depois da reserva: cancela o pedido (libera as peças) e volta a escolher
  async function alterarEntrega() {
    if (!pedido) return
    const cancelado = await enviar(() => api<Pedido>(`/pedidos/${pedido.id_pedido}/cancelar`, { metodo: 'POST' }))
    if (cancelado) {
      guardarPedido(null)
      setPedido(null)
      // o botão fica no bloco 3, embaixo: leva a pessoa (e o foco) de volta ao bloco 1 para escolher
      requestAnimationFrame(() => {
        const bloco = document.getElementById('bloco-1')
        bloco?.scrollIntoView({ block: 'start' })
        bloco?.focus({ preventScroll: true })
      })
    }
  }

  // o backend cancela a reserva vencida por uma tarefa agendada; cancelar aqui também evita que o
  // pedido antigo segure as peças até ela rodar (se já foi cancelado, a recusa não importa)
  function reservaVenceu() {
    if (pedido) void api(`/pedidos/${pedido.id_pedido}/cancelar`, { metodo: 'POST' }).catch(() => undefined)
    guardarPedido(null)
    setPedido(null)
  }

  if (retomando) return <Carregando texto="Retomando seu pedido..." />

  if (itens.length === 0 && !pedido) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <p>Seu carrinho está vazio.</p>
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Ver as peças</Link>
      </div>
    )
  }

  const travado = pedido !== null
  const podeReservar =
    modalidadeEfetiva === 'entrega' ? enderecoEfetivo !== null : modalidadeEfetiva === 'retirada' && lojaEfetiva !== null

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6">
      <h1 className="mb-6 font-titulo text-4xl">Finalizar compra</h1>

      <ResumoNoCelular resumo={dadosResumo} pedido={pedido} modalidade={modalidadeEfetiva} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {resumo.erro && <Aviso mensagem={resumo.erro} />}

          <Bloco numero={1} titulo="Como você quer receber">
            {!dadosResumo ? (
              <Carregando />
            ) : travado ? (
              <Escolhido>
                {pedido.modalidade === 'entrega' ? 'Entrega em casa' : 'Retirada na loja'}
              </Escolhido>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Como você quer receber">
                <Opcao
                  marcada={modalidadeEfetiva === 'entrega'}
                  aoMarcar={() => setModalidade('entrega')}
                  desativada={!dadosResumo.entrega_disponivel}
                  icone={<Truck className="size-5" aria-hidden="true" />}
                  titulo="Entrega em casa"
                  detalhe={
                    !dadosResumo.entrega_disponivel
                      ? 'Indisponível para estas peças agora'
                      : Number(dadosResumo.frete_entrega) === 0
                        ? 'Frete grátis'
                        : `Frete de ${moeda(dadosResumo.frete_entrega)}`
                  }
                />
                <Opcao
                  marcada={modalidadeEfetiva === 'retirada'}
                  aoMarcar={() => setModalidade('retirada')}
                  desativada={dadosResumo.lojas_retirada.length === 0}
                  icone={<Store className="size-5" aria-hidden="true" />}
                  titulo="Retirar na loja"
                  detalhe={dadosResumo.lojas_retirada.length === 0 ? 'Nenhuma loja tem todas as peças agora' : 'Grátis'}
                />
              </div>
            )}
          </Bloco>

          <Bloco numero={2} titulo={modalidadeEfetiva === 'retirada' ? 'Loja para retirar' : 'Endereço de entrega'}>
            {travado ? (
              <Escolhido>
                {pedido.modalidade === 'entrega' && pedido.endereco_entrega
                  ? `${pedido.endereco_entrega.rua}, ${pedido.endereco_entrega.numero}, ${pedido.endereco_entrega.cidade} (${pedido.endereco_entrega.uf})`
                  : pedido.unidade}
              </Escolhido>
            ) : modalidadeEfetiva === 'retirada' ? (
              <div className="space-y-2" role="radiogroup" aria-label="Loja para retirar">
                {dadosResumo?.lojas_retirada.map((loja) => (
                  <Opcao
                    key={loja.id_unidade}
                    marcada={lojaEfetiva === loja.id_unidade}
                    aoMarcar={() => setIdLoja(loja.id_unidade)}
                    titulo={loja.nome}
                    detalhe={`${loja.cidade} (${loja.uf}). O pedido fica separado por 7 dias depois do aviso de pronto.`}
                  />
                ))}
              </div>
            ) : enderecos.carregando ? (
              <Carregando />
            ) : listaEnderecos.length === 0 || novoEndereco ? (
              <FormEndereco
                aoSalvar={(criado) => {
                  enderecos.recarregar()
                  setIdEndereco(criado.id_endereco)
                  setNovoEndereco(false)
                }}
                aoCancelar={listaEnderecos.length > 0 ? () => setNovoEndereco(false) : undefined}
              />
            ) : (
              <div className="space-y-2">
                <div className="space-y-2" role="radiogroup" aria-label="Endereço de entrega">
                  {listaEnderecos.map((e: Endereco) => (
                    <Opcao
                      key={e.id_endereco}
                      marcada={enderecoEfetivo === e.id_endereco}
                      aoMarcar={() => setIdEndereco(e.id_endereco)}
                      titulo={`${e.rua}, ${e.numero}${e.complemento ? `, ${e.complemento}` : ''}`}
                      detalhe={`${e.bairro}, ${e.cidade} (${e.uf}), CEP ${e.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}`}
                    />
                  ))}
                </div>
                <button type="button" onClick={() => setNovoEndereco(true)} className="text-sm font-medium underline underline-offset-4">
                  Usar outro endereço
                </button>
              </div>
            )}
          </Bloco>

          <Bloco numero={3} titulo="Pagamento">
            {pedido ? (
              <div className="space-y-5">
                <ContadorReserva expiraEm={pedido.reserva_expira_em} aoVencer={reservaVenceu} />
                <Pagamento pedido={pedido} aoAtualizar={aoAtualizar} />
                <button
                  type="button"
                  onClick={() => void alterarEntrega()}
                  disabled={enviando}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Mudar a forma de receber (libera a reserva)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ao continuar, separamos as peças para você por 15 minutos enquanto paga.
                </p>
                {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
                <Button
                  size="loja"
                  className="w-full sm:w-full"
                  onClick={() => void irParaPagamento()}
                  disabled={!podeReservar || enviando || Boolean(resumo.erro)}
                >
                  {enviando ? 'Separando as peças...' : 'Continuar para o pagamento'}
                </Button>
              </div>
            )}
          </Bloco>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <ResumoDoPedido resumo={dadosResumo} pedido={pedido} modalidade={modalidadeEfetiva} />
        </aside>
      </div>
    </div>
  )
}

function Bloco({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`bloco-${numero}`} className="border p-5 sm:p-6">
      <h2 id={`bloco-${numero}`} tabIndex={-1} className="mb-4 flex scroll-mt-6 items-center gap-3 font-titulo text-2xl outline-none">
        <span className="flex size-8 items-center justify-center bg-marinho font-sans text-sm font-medium text-white">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Escolhido({ children }: { children: ReactNode }) {
  return <p className="bg-superficie px-4 py-3 text-sm">{children}</p>
}

// opção de rádio em cartão (entrega/retirada, endereço, loja): o cartão inteiro é clicável
function Opcao({
  marcada,
  aoMarcar,
  titulo,
  detalhe,
  icone,
  desativada,
}: {
  marcada: boolean
  aoMarcar: () => void
  titulo: string
  detalhe?: string
  icone?: ReactNode
  desativada?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        marcada ? 'border-marinho bg-aco-fundo' : 'hover:border-foreground',
        desativada && 'cursor-not-allowed opacity-50 hover:border-border',
      )}
    >
      <input type="radio" checked={marcada} onChange={aoMarcar} disabled={desativada} className="mt-1 accent-marinho" />
      {icone && <span className="mt-0.5">{icone}</span>}
      <span className="space-y-0.5">
        <span className="block font-medium">{titulo}</span>
        {detalhe && <span className="block text-sm text-muted-foreground">{detalhe}</span>}
      </span>
    </label>
  )
}

// reserva de 15 minutos em terracota (design); vencida, o backend cancela o pedido sozinho
function ContadorReserva({ expiraEm, aoVencer }: { expiraEm: string | null; aoVencer: () => void }) {
  const [agora, setAgora] = useState(() => Date.now())
  const restante = expiraEm ? Math.max(0, new Date(expiraEm).getTime() - agora) : 0
  const vencida = expiraEm !== null && restante === 0

  useEffect(() => {
    if (vencida) return
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(relogio)
  }, [vencida])

  if (!expiraEm) return null
  if (vencida) {
    return (
      <div role="alert" className="space-y-3 border-l-4 border-terracota bg-superficie p-4 text-sm">
        <p>A reserva de 15 minutos venceu e as peças voltaram para o estoque. Faça o pedido de novo para separá-las.</p>
        <Button variant="outline" onClick={aoVencer}>Separar as peças de novo</Button>
      </div>
    )
  }

  const minutos = Math.floor(restante / 60000)
  const segundos = Math.floor((restante % 60000) / 1000)
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-terracota">
      <Clock className="size-4" aria-hidden="true" />
      <span>
        Peças separadas por mais{' '}
        <span className="tabular-nums" aria-live="off">{minutos}:{String(segundos).padStart(2, '0')}</span>
      </span>
    </p>
  )
}

// valores: do pedido quando já existe (o que vai ser cobrado), senão do carrinho
function valores(resumo: ResumoCarrinho | null, pedido: Pedido | null, modalidade: Modalidade | null) {
  if (pedido) {
    return { itens: pedido.valor_itens, frete: pedido.valor_frete, total: pedido.valor_total }
  }
  if (!resumo) return null
  const frete = modalidade === 'retirada' ? '0' : resumo.frete_entrega
  const total = modalidade === 'retirada' ? resumo.total_retirada : resumo.total_entrega
  return { itens: resumo.valor_itens, frete, total }
}

function ResumoDoPedido({ resumo, pedido, modalidade }: { resumo: ResumoCarrinho | null; pedido: Pedido | null; modalidade: Modalidade | null }) {
  const linhas = pedido?.itens ?? resumo?.itens ?? []
  const conta = valores(resumo, pedido, modalidade)
  return (
    <div className="space-y-5 bg-superficie p-6">
      <h2 className="font-titulo text-2xl">Resumo</h2>
      <ul className="space-y-3">
        {linhas.map((linha) => (
          <li key={linha.id_variante} className="flex justify-between gap-3 text-sm">
            <span>
              <span className="block">{linha.quantidade}× {linha.produto}</span>
              <span className="text-muted-foreground">{linha.cor}, {rotuloTamanho(linha.tamanho)}</span>
            </span>
            <span className="shrink-0 tabular-nums">{moeda(Number(linha.preco_unitario) * linha.quantidade)}</span>
          </li>
        ))}
      </ul>
      {conta && (
        <dl className="space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt>Peças</dt><dd className="tabular-nums">{moeda(conta.itens)}</dd></div>
          <div className="flex justify-between">
            <dt>{modalidade === 'retirada' ? 'Retirada' : 'Frete'}</dt>
            <dd className="tabular-nums">{Number(conta.frete) === 0 ? 'Grátis' : moeda(conta.frete)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-medium">
            <dt>Total</dt><dd className="tabular-nums">{moeda(conta.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

// no celular o resumo fica recolhido no topo, sempre mostrando o total (design)
function ResumoNoCelular(props: { resumo: ResumoCarrinho | null; pedido: Pedido | null; modalidade: Modalidade | null }) {
  const conta = valores(props.resumo, props.pedido, props.modalidade)
  return (
    <details className="mb-6 border lg:hidden">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm">
        <span>Ver resumo</span>
        <span className="font-medium tabular-nums">{conta ? moeda(conta.total) : ''}</span>
      </summary>
      <ResumoDoPedido {...props} />
    </details>
  )
}
