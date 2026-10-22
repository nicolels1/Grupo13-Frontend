import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Clock, Store, Truck } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { Button, buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'
import { useCarregar, useEnviar, useIntervalo } from '@/lib/useCarregar'
import { useCarrinho } from './carrinho/contexto'
import { useResumo, type ResumoCarrinho } from './carrinho/useResumo'
import { FormEndereco } from './checkout/FormEndereco'
import { Pagamento } from './checkout/Pagamento'
import { guardarCompraEmAberto, lerCompraEmAberto } from './checkout/compraEmAberto'
import { UsarPontos, type PontosAplicados } from './checkout/UsarPontos'
import { rotuloTamanho } from './componentes/tamanhos'

type Compra = Esquema<'CompraSaida'>
type Endereco = Esquema<'EnderecoSaida'>
type Modalidade = 'entrega' | 'retirada'

// checkout em uma página (design): Receber → Endereço ou loja → Pagamento, resumo fixo ao lado.
// O carrinho junta as duas marcas e vira uma compra, com uma cobrança só; por dentro, o backend faz um
// pedido por marca, cada um saindo de uma unidade dela (ADR 0017 do backend)
export function CheckoutLoja() {
  const navegar = useNavigate()
  const { itens, esvaziar } = useCarrinho()
  const resumo = useResumo()
  const enderecos = useCarregar(() => api<Esquema<'Lista_EnderecoSaida_'>>('/enderecos'), [])
  const [modalidade, setModalidade] = useState<Modalidade | null>(null)
  const [idEndereco, setIdEndereco] = useState<number | null>(null)
  const [idLoja, setIdLoja] = useState<number | null>(null)
  const [novoEndereco, setNovoEndereco] = useState(false)
  const [compra, setCompra] = useState<Compra | null>(null)
  const [pontosAplicados, setPontosAplicados] = useState<PontosAplicados>({})
  const [venceuSemCobrar, setVenceuSemCobrar] = useState(false)
  const [retomando, setRetomando] = useState(() => lerCompraEmAberto() !== null)
  const { enviar, enviando, erro } = useEnviar()

  // retoma a compra desta aba se ela ainda espera pagamento
  useEffect(() => {
    const id = lerCompraEmAberto()
    if (!id) return
    api<Compra>(`/compras/${id}`)
      .then((achada) => {
        if (achada.status === 'aguardando_pagamento') setCompra(achada)
        else guardarCompraEmAberto(null)
      })
      .catch(() => guardarCompraEmAberto(null))
      .finally(() => setRetomando(false))
  }, [])

  const dadosResumo = resumo.dados
  const listaEnderecos = enderecos.dados?.items ?? []
  const variasMarcas = Boolean(dadosResumo?.marcas && dadosResumo.marcas.length > 1)

  // escolhas padrão: com duas marcas só entrega em casa (ADR 0017); senão entrega se der, primeiro endereço e primeira loja
  const modalidadeEfetiva: Modalidade | null = variasMarcas
    ? 'entrega'
    : (modalidade ?? (dadosResumo ? (dadosResumo.entrega_disponivel ? 'entrega' : dadosResumo.lojas_retirada.length ? 'retirada' : null) : null))
  const enderecoEfetivo = idEndereco ?? listaEnderecos[0]?.id_endereco ?? null
  const lojaEfetiva = idLoja ?? dadosResumo?.lojas_retirada[0]?.id_unidade ?? null
  // só valem os pontos de marcas que continuam no carrinho
  const pontosValidos = Object.entries(pontosAplicados).filter(
    (par): par is [string, NonNullable<PontosAplicados[string]>] =>
      par[1] !== undefined && Boolean(dadosResumo?.marcas.some((m) => m.marca === par[0])),
  )

  const aoAtualizar = useCallback(
    (atualizada: Compra) => {
      if (atualizada.status === 'pago') {
        guardarCompraEmAberto(null)
        esvaziar()
        navegar(`/loja/compra-confirmada/${atualizada.id_compra}`, { replace: true })
        return
      }
      // a resposta do pagamento chegou depois do prazo: o backend cancelou a compra sem cobrar nada
      if (atualizada.status === 'cancelado') {
        guardarCompraEmAberto(null)
        setCompra(null)
        setVenceuSemCobrar(true)
        return
      }
      setCompra(atualizada)
    },
    [esvaziar, navegar],
  )

  async function irParaPagamento() {
    setVenceuSemCobrar(false)
    const criada = await enviar(() =>
      api<Compra>('/compras', {
        metodo: 'POST',
        corpo: {
          itens: itens.map(({ id_variante, quantidade }) => ({ id_variante, quantidade })),
          modalidade: modalidadeEfetiva,
          id_endereco: modalidadeEfetiva === 'entrega' ? enderecoEfetivo : null,
          id_unidade_retirada: modalidadeEfetiva === 'retirada' ? lojaEfetiva : null,
          pontos_por_marca: Object.fromEntries(pontosValidos.map(([marca, aplicado]) => [marca, aplicado.pontos])),
        },
      }),
    )
    if (criada) {
      guardarCompraEmAberto(criada.id_compra)
      setCompra(criada)
      // os pontos já foram usados nesta compra; se ela for cancelada, voltam ao saldo e podem ser aplicados de novo
      setPontosAplicados({})
    }
  }

  // mudar a entrega depois da reserva: cancela a compra (libera as peças das duas marcas) e volta a escolher
  async function alterarEntrega() {
    if (!compra) return
    const cancelada = await enviar(() => api<Compra>(`/compras/${compra.id_compra}/cancelar`, { metodo: 'POST' }))
    if (cancelada) {
      guardarCompraEmAberto(null)
      setCompra(null)
      // o botão fica no bloco 3, embaixo: leva a pessoa (e o foco) de volta ao bloco 1 para escolher
      requestAnimationFrame(() => {
        const bloco = document.getElementById('bloco-1')
        bloco?.scrollIntoView({ block: 'start' })
        bloco?.focus({ preventScroll: true })
      })
    }
  }

  // o backend cancela a reserva vencida por uma tarefa agendada; cancelar aqui também evita que a
  // compra antiga segure as peças até ela rodar (se já foi cancelada, a recusa não importa)
  function reservaVenceu() {
    if (compra) void api(`/compras/${compra.id_compra}/cancelar`, { metodo: 'POST' }).catch(() => undefined)
    guardarCompraEmAberto(null)
    setCompra(null)
  }

  if (retomando) return <Carregando texto="Retomando sua compra..." />

  const travado = compra !== null
  if (itens.length === 0 && !travado) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <p>Seu carrinho está vazio.</p>
        <Link to="/loja/produtos" className={buttonVariants({ variant: 'outline', size: 'loja' })}>Ver as peças</Link>
      </div>
    )
  }

  const podeReservar =
    modalidadeEfetiva === 'entrega' ? enderecoEfetivo !== null : modalidadeEfetiva === 'retirada' && lojaEfetiva !== null

  // os pedidos da compra saem com a mesma modalidade e o mesmo endereço
  const primeiro = compra?.pedidos[0]
  // antes de reservar, o desconto dos pontos aplicados; depois, o da compra
  const descontoPrevisto = pontosValidos.reduce((soma, [, aplicado]) => soma + Number(aplicado.desconto), 0)

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6">
      <h1 className="mb-6 font-titulo text-4xl">Finalizar compra</h1>

      <ResumoNoCelular resumo={dadosResumo} compra={compra} modalidade={modalidadeEfetiva} desconto={descontoPrevisto} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {resumo.erro && <Aviso mensagem={resumo.erro} />}

          <Bloco numero={1} titulo="Como você quer receber">
            {!dadosResumo ? (
              <Carregando />
            ) : travado ? (
              <Escolhido>{primeiro?.modalidade === 'retirada' ? 'Retirada na loja' : 'Entrega em casa'}</Escolhido>
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
                  desativada={variasMarcas || dadosResumo.lojas_retirada.length === 0}
                  icone={<Store className="size-5" aria-hidden="true" />}
                  titulo="Retirar na loja"
                  detalhe={
                    variasMarcas
                      ? 'Retirada só com peças de uma marca (cada loja vende só a sua)'
                      : dadosResumo.lojas_retirada.length === 0
                        ? 'Nenhuma loja tem todas as peças agora'
                        : 'Grátis'
                  }
                />
              </div>
            )}
          </Bloco>

          <Bloco numero={2} titulo={modalidadeEfetiva === 'retirada' ? 'Loja para retirar' : 'Endereço de entrega'}>
            {travado ? (
              <Escolhido>
                {primeiro?.modalidade === 'entrega' && primeiro.endereco_entrega
                  ? `${primeiro.endereco_entrega.rua}, ${primeiro.endereco_entrega.numero}, ${primeiro.endereco_entrega.cidade} (${primeiro.endereco_entrega.uf})`
                  : primeiro?.unidade}
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
            {compra ? (
              <div className="space-y-5">
                <ContadorReserva expiraEm={compra.reserva_expira_em} aoVencer={reservaVenceu} />
                <Pagamento compra={compra} aoAtualizar={aoAtualizar} />
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
                {venceuSemCobrar && (
                  <p role="alert" className="border-l-4 border-terracota bg-superficie p-3 text-sm">
                    A reserva de 15 minutos venceu antes da confirmação do pagamento, e nada foi cobrado. Separe as
                    peças de novo para pagar.
                  </p>
                )}
                {dadosResumo && (
                  <UsarPontos marcas={dadosResumo.marcas} aplicados={pontosAplicados} aoMudar={setPontosAplicados} />
                )}
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
          <ResumoDoPedido resumo={dadosResumo} compra={compra} modalidade={modalidadeEfetiva} desconto={descontoPrevisto} />
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

  useIntervalo(() => setAgora(Date.now()), vencida ? null : 1000)

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

// valores: da compra quando já existe (o que vai ser cobrado), senão do carrinho menos os pontos aplicados
function valores(resumo: ResumoCarrinho | null, compra: Compra | null, modalidade: Modalidade | null, desconto: number) {
  if (compra) {
    return { itens: compra.valor_itens, frete: compra.valor_frete, desconto: compra.valor_desconto, total: compra.valor_total }
  }
  if (!resumo) return null
  const frete = modalidade === 'retirada' ? '0' : resumo.frete_entrega
  const total = Number(modalidade === 'retirada' ? resumo.total_retirada : resumo.total_entrega) - desconto
  return { itens: resumo.valor_itens, frete, desconto: desconto.toFixed(2), total: total.toFixed(2) }
}

function ResumoDoPedido({
  resumo,
  compra,
  modalidade,
  desconto,
}: {
  resumo: ResumoCarrinho | null
  compra: Compra | null
  modalidade: Modalidade | null
  desconto: number
}) {
  const linhas = compra ? compra.pedidos.flatMap((p) => p.itens) : (resumo?.itens ?? [])
  const conta = valores(resumo, compra, modalidade, desconto)
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
          {Number(conta.desconto) > 0 && (
            <div className="flex justify-between">
              <dt>Desconto com pontos</dt><dd className="tabular-nums">−{moeda(conta.desconto)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-base font-medium">
            <dt>Total</dt><dd className="tabular-nums">{moeda(conta.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

// no celular o resumo fica recolhido no topo, sempre mostrando o total (design)
function ResumoNoCelular(props: {
  resumo: ResumoCarrinho | null
  compra: Compra | null
  modalidade: Modalidade | null
  desconto: number
}) {
  const conta = valores(props.resumo, props.compra, props.modalidade, props.desconto)
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
