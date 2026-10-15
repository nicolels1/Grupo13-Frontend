import { CircleHelp, MessageCircle, ReceiptText, RefreshCw, Truck, type LucideIcon } from 'lucide-react'

// cada assunto tem o seu ícone: aparece na lista, no cabeçalho da conversa e na escolha do chamado novo
const ICONE_DA_CATEGORIA: Record<string, LucideIcon> = {
  entrega: Truck,
  troca_devolucao: RefreshCw,
  estorno: ReceiptText,
  duvida: CircleHelp,
  outros: MessageCircle,
}

export function IconeDaCategoria({ categoria, className }: { categoria: string; className?: string }) {
  const Icone = ICONE_DA_CATEGORIA[categoria] ?? MessageCircle
  return <Icone className={className} aria-hidden="true" />
}
