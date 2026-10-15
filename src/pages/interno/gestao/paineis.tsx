import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// painéis da Gestão: o bloco com título e o painel lateral que entra pela direita

export function Painel({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return (
    <aside className="h-fit space-y-5 bg-superficie p-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-medium">{titulo}</h2>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar" onClick={aoFechar}><X /></Button>
      </div>
      {children}
    </aside>
  )
}

// painel lateral para criar (convidar pessoa, nova unidade), como Registrar movimentação no Estoque.
// Ver e editar o que já existe continua no Painel ao lado da lista
export function PainelLateral({ aberto, titulo, descricao, aoFechar, children }: {
  aberto: boolean
  titulo: string
  descricao: string
  aoFechar: () => void
  children: ReactNode
}) {
  return (
    <Sheet open={aberto} onOpenChange={(abrir) => { if (!abrir) aoFechar() }}>
      <SheetContent className="overflow-y-auto sm:max-w-md!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="text-lg">{titulo}</SheetTitle>
          <SheetDescription>{descricao}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
