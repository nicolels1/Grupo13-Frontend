import type { ReactNode } from 'react'
import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  )
}

// mensagem de erro ou aviso; `children` pode trazer uma ação (ex.: botão de tentar de novo)
export function Aviso({ titulo, mensagem, children }: { titulo?: string; mensagem?: string | null; children?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <div className="space-y-2">
        {titulo && <p className="font-medium">{titulo}</p>}
        {mensagem && <p className="text-muted-foreground">{mensagem}</p>}
        {children}
      </div>
    </div>
  )
}

// lista sem itens
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="border-y py-10 text-center text-sm text-muted-foreground">{children}</p>
}

// lista que a API devolveu cortada (pediu um limite e há mais): diz quantas faltam, em vez de sumir com elas
export function ListaCortada({ mostrados, total, dica = 'Use a busca ou os filtros para achar o resto.' }: {
  mostrados: number
  total: number
  dica?: string
}) {
  if (total <= mostrados) return null
  return (
    <p className="py-2 text-xs text-muted-foreground">
      Mostrando {mostrados.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}. {dica}
    </p>
  )
}

// confirmação curta depois de salvar
export function Sucesso({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg bg-aco/10 px-3 py-2 text-sm text-marinho">
      <CircleCheck className="size-4 shrink-0 text-aco" aria-hidden="true" />
      {children}
    </p>
  )
}
