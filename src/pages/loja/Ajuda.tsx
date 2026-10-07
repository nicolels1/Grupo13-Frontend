import { useEffect } from 'react'
import { CreditCard, MessageCircle, Package, RefreshCcw, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Status } from '@/components/Status'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { api, type Esquema } from '@/lib/api'
import { useCarregar } from '@/lib/useCarregar'

// o id de cada assunto é a âncora usada pelos links do rodapé (ex.: /loja/ajuda#trocas-e-devolucoes)
const ASSUNTOS = [
  {
    id: 'pedidos-e-entrega',
    titulo: 'Pedidos e entrega',
    icone: Package,
    fundo: 'bg-marinho',
    perguntas: [
      {
        pergunta: 'Como acompanho meu pedido?',
        resposta: 'Em Meus pedidos você vê cada etapa: pago, enviado ou pronto para retirada, e entregue.',
      },
      {
        pergunta: 'O frete é grátis?',
        resposta: 'Sim, em compras a partir de R$ 299. A retirada na loja é sempre grátis.',
      },
      {
        pergunta: 'Qual o prazo para retirar meu pedido na loja?',
        resposta: 'O pedido fica separado na loja escolhida por 7 dias depois do aviso de que está pronto.',
      },
      {
        pergunta: 'Por quanto tempo as peças ficam reservadas no checkout?',
        resposta: 'Por 15 minutos. Se o pagamento não for concluído nesse tempo, as peças voltam para o estoque.',
      },
    ],
  },
  {
    id: 'trocas-e-devolucoes',
    titulo: 'Trocas e devoluções',
    icone: RefreshCcw,
    fundo: 'bg-terracota',
    perguntas: [
      {
        pergunta: 'Como faço para trocar ou devolver uma peça?',
        resposta:
          'Leve a peça e um documento a qualquer loja da rede em até 30 dias após a entrega. Na loja você troca por outra cor ou tamanho, ou devolve.',
      },
      {
        pergunta: 'Como recebo o dinheiro de uma devolução?',
        resposta: 'O estorno volta pelo mesmo meio de pagamento usado na compra.',
      },
    ],
  },
  {
    id: 'pagamento',
    titulo: 'Pagamento',
    icone: CreditCard,
    fundo: 'bg-aco',
    perguntas: [
      {
        pergunta: 'Quais formas de pagamento vocês aceitam?',
        resposta: 'No site, Pix, cartão de crédito e cartão de débito. Nas lojas, também dinheiro.',
      },
    ],
  },
  {
    id: 'sua-conta',
    titulo: 'Sua conta',
    icone: UserRound,
    fundo: 'bg-ardosia',
    perguntas: [
      {
        pergunta: 'Posso entrar com meu CPF?',
        resposta: 'Sim. Na tela de entrada, use o CPF ou o e-mail com a mesma senha da sua conta.',
      },
      {
        pergunta: 'Comprei numa loja informando o CPF. Onde vejo essa compra?',
        resposta: 'Depois de criar a conta com o mesmo CPF, as compras feitas nas lojas aparecem em Meus pedidos.',
      },
    ],
  },
]

export function AjudaLoja() {
  const { sessao, perfil } = useAuth()
  const ehCliente = Boolean(sessao) && perfil?.tipo_conta === 'cliente'
  // assunto pedido pela âncora (rodapé ou cartões do topo): desce até ele e abre a primeira pergunta.
  // Navegando dentro do site o navegador não rola sozinho até a âncora; a chave da página rola de novo
  // mesmo quando o mesmo link é clicado duas vezes
  const { hash, key } = useLocation()
  const alvo = hash.slice(1)

  useEffect(() => {
    if (alvo) document.getElementById(alvo)?.scrollIntoView()
  }, [alvo, key])

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-sm text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground" aria-current="page">Central de ajuda</span>
      </nav>
      <h1 className="mb-8 font-titulo text-4xl">Central de ajuda</h1>

      <ul className="mb-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ASSUNTOS.map(({ id, titulo, icone: Icone, fundo }) => (
          <li key={id}>
            <Link
              to={{ hash: id }}
              aria-current={alvo === id ? 'location' : undefined}
              className={cn(
                'flex h-full flex-col gap-3 p-5 text-white transition-opacity hover:opacity-90',
                fundo,
                alvo === id && 'outline-3 outline-offset-3 outline-marinho-escuro',
              )}
            >
              <Icone className="size-6" aria-hidden="true" />
              {/* só texto grande nos blocos: branco sobre terracota não tem contraste para texto pequeno */}
              <span className="font-titulo text-2xl">{titulo}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-12">
          {ASSUNTOS.map(({ id, titulo, icone: Icone, fundo, perguntas }) => (
            <section key={id} id={id} aria-labelledby={`titulo-${id}`} className="scroll-mt-6">
              {/* faixa na cor do cartão do topo: liga o cartão ao assunto e marca onde a lista começa */}
              <h2 id={`titulo-${id}`} className={cn('flex items-center gap-3 px-5 py-4 font-titulo text-2xl text-white', fundo)}>
                <Icone className="size-6 shrink-0" aria-hidden="true" />
                {titulo}
              </h2>
              {/* o assunto que o link pediu ganha fundo e faixa aço nas perguntas, para ser notado mesmo
                  sem ver a rolagem; a chave recria o acordeão para abrir a primeira pergunta */}
              <Accordion
                key={`${id}-${alvo === id}`}
                defaultValue={alvo === id ? [perguntas[0]!.pergunta] : []}
                className={cn('border-l-4 px-5', alvo === id ? 'border-aco bg-aco-fundo' : 'border-transparent')}
              >
                {perguntas.map(({ pergunta, resposta }) => (
                  <AccordionItem key={pergunta} value={pergunta} className="border-b">
                    <AccordionTrigger className="py-4 text-base font-normal">{pergunta}</AccordionTrigger>
                    <AccordionContent>
                      <p className="max-w-2xl leading-relaxed text-muted-foreground">{resposta}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 bg-ardosia p-6 text-white">
            <MessageCircle className="size-6" aria-hidden="true" />
            <h2 className="font-titulo text-2xl">Não achou? Fale com a gente pelo chat</h2>
            <p className="text-sm text-white/85">
              A conversa fica salva na sua conta e qualquer atendente vê o histórico.
              {!ehCliente && ' Para conversar, você entra ou cria sua conta.'}
            </p>
            <Link
              to="/loja/chamados/novo"
              className="inline-flex h-11 w-full items-center justify-center bg-white px-6 text-sm font-medium text-marinho-escuro hover:bg-white/90"
            >
              Abrir conversa
            </Link>
            <p className="border-t border-white/25 pt-3 text-xs text-white/85">
              Seg. a sáb., 9h às 21h. Dom. e feriados, 10h às 16h.
            </p>
          </div>
          {ehCliente && <MeusChamadosResumo />}
        </aside>
      </div>
    </div>
  )
}

function MeusChamadosResumo() {
  const { dados } = useCarregar(
    () => api<Esquema<'Pagina_ChamadoSaida_'>>('/chamados', { params: { limit: 3 } }),
    [],
  )
  if (!dados || dados.items.length === 0) return null

  return (
    <section aria-labelledby="titulo-meus-chamados">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="titulo-meus-chamados" className="font-medium">Meus chamados</h2>
        <Link to="/loja/chamados" className="text-sm underline underline-offset-2">Ver todos</Link>
      </div>
      <ul>
        {dados.items.map((chamado) => (
          <li key={chamado.id_chamado}>
            <Link
              to={`/loja/chamados/${chamado.id_chamado}`}
              className="flex items-center justify-between gap-3 border-b py-3 text-sm hover:bg-superficie"
            >
              <span className="truncate">{chamado.assunto}</span>
              <Status tipo="chamado" valor={chamado.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
