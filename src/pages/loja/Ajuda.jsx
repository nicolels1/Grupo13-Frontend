import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { buttonVariants } from '@/components/ui/button'
import { api } from '@/lib/api'
import { STATUS_CHAMADO } from '@/lib/formato'
import { useCarregar } from '@/lib/useCarregar'

const PERGUNTAS = [
  {
    pergunta: 'Como faço para trocar ou devolver uma peça?',
    resposta:
      'Você pode trocar ou devolver em qualquer loja da rede em até 30 dias após a entrega. Leve a peça e um documento; na devolução, o estorno volta pelo mesmo meio de pagamento.',
  },
  {
    pergunta: 'Qual o prazo para retirar meu pedido na loja?',
    resposta: 'O pedido fica separado na loja escolhida por 7 dias depois do aviso de que está pronto.',
  },
  {
    pergunta: 'Por quanto tempo as peças ficam reservadas no checkout?',
    resposta: 'Por 15 minutos. Se o pagamento não for concluído nesse tempo, as peças voltam para o estoque.',
  },
  {
    pergunta: 'Posso entrar com meu CPF?',
    resposta: 'Sim. Na tela de entrada, escolha CPF e use a mesma senha da sua conta.',
  },
  {
    pergunta: 'Quais formas de pagamento vocês aceitam?',
    resposta: 'Pix, cartão de crédito e cartão de débito no site; nas lojas, também dinheiro.',
  },
]

export function AjudaLoja() {
  const { sessao, perfil } = useAuth()
  const ehCliente = sessao && perfil?.tipo_conta === 'cliente'

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Link to="/loja" className="mb-8 inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" /> Voltar às compras
      </Link>
      <h1 className="mb-12 font-heading text-3xl uppercase tracking-[0.08em]">Central de ajuda</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="titulo-perguntas">
          <h2 id="titulo-perguntas" className="mb-4 text-sm font-medium uppercase tracking-[0.15em]">Perguntas frequentes</h2>
          {PERGUNTAS.map(({ pergunta, resposta }, i) => (
            <details key={pergunta} open={i === 0} className="border-b py-4">
              <summary className="cursor-pointer">{pergunta}</summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{resposta}</p>
            </details>
          ))}
        </section>

        <aside className="space-y-8">
          <div className="space-y-4 bg-superficie p-6">
            <h2 className="text-sm font-medium uppercase tracking-[0.15em]">Fale com a gente</h2>
            <p className="text-sm text-muted-foreground">
              Pelo chat, a conversa fica salva na sua conta e qualquer atendente vê o histórico.
            </p>
            <Link to="/loja/chamados/novo" className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full uppercase tracking-[0.12em]')}>
              Abrir chat
            </Link>
            <p className="border-t pt-3 text-xs text-muted-foreground">Seg. a sáb., 9h às 21h · Dom. e feriados, 10h às 16h</p>
          </div>
          {ehCliente && <MeusChamadosResumo />}
        </aside>
      </div>
    </div>
  )
}

function MeusChamadosResumo() {
  const { dados } = useCarregar(() => api('/chamados', { params: { limit: 3 } }), [])
  if (!dados || dados.items.length === 0) return null

  return (
    <section aria-labelledby="titulo-meus-chamados">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="titulo-meus-chamados" className="text-sm font-medium uppercase tracking-[0.15em]">Meus chamados</h2>
        <Link to="/loja/chamados" className="text-sm underline underline-offset-2">Ver todos</Link>
      </div>
      {dados.items.map((chamado) => (
        <Link
          key={chamado.id_chamado}
          to={`/loja/chamados/${chamado.id_chamado}`}
          className="flex justify-between gap-3 border-b py-3 text-sm hover:bg-superficie"
        >
          <span className="truncate">#{chamado.id_chamado} · {chamado.assunto}</span>
          <span className="shrink-0 text-muted-foreground">{STATUS_CHAMADO[chamado.status]}</span>
        </Link>
      ))}
    </section>
  )
}
