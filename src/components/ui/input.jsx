import { cn } from 'cn'

// campo de texto no mesmo estilo do Button (tokens do tema do shadcn)
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }) {
  return <label className={cn('text-sm font-medium', className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

// select nativo no mesmo estilo do Input (bom no celular e acessível sem esforço)
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

// rótulo + campo + dica, com o id ligando o rótulo ao campo
export function Campo({ id, rotulo, dica, opcional, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {rotulo}
        {opcional && <span className="ml-1 font-normal text-muted-foreground">opcional</span>}
      </Label>
      {children}
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  )
}
