import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { cn } from 'cn'

import { Input } from '@/components/ui/input'
import { SENHA_MINIMA } from '../validacao'

// campo de senha com mostrar/ocultar (substitui o "confirmar senha")
export function CampoSenha({
  id,
  valor,
  aoMudar,
  autoComplete,
  descricao,
  invalido,
}: {
  id: string
  valor: string
  aoMudar: (valor: string) => void
  autoComplete: 'current-password' | 'new-password'
  descricao?: string
  invalido?: boolean
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={id}
        type={visivel ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        maxLength={72}
        className="h-11 pr-11"
        aria-describedby={descricao}
        aria-invalid={invalido || undefined}
        required
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}

// regra mostrada enquanto digita, não só depois do erro: círculo vazio enquanto falta,
// cheio em aço (a cor de sucesso da paleta) quando cumpre
export function RegraDaSenha({ id, cumprida }: { id: string; cumprida: boolean }) {
  return (
    <p id={id} className={cn('flex items-center gap-2 text-sm', cumprida ? 'font-medium text-foreground' : 'text-muted-foreground')}>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          cumprida ? 'border-aco bg-aco text-white' : 'border-border',
        )}
      >
        {cumprida && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      Pelo menos {SENHA_MINIMA} caracteres
      <span className="sr-only">{cumprida ? ', cumprido' : ', ainda não cumprido'}</span>
    </p>
  )
}

export function ErroDoCampo({ id, texto }: { id: string; texto?: string | null }) {
  if (!texto) return null
  return <p id={id} role="alert" className="text-sm text-ferrugem">{texto}</p>
}
