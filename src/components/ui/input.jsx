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
