import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Aviso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

// entrada única: o tipo de conta decide a plataforma depois do login (case, seção 5).
// Cliente entra com e-mail ou CPF; funcionário, com o e-mail corporativo.
// Base funcional: o visual final segue o Figma (cartão da tela de login).
export function Entrar() {
  const { sessao, entrarComEmail, entrarComCpf } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const [modo, setModo] = useState('email')
  const [identificacao, setIdentificacao] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const voltarPara = local.state?.voltarPara ?? '/'

  if (sessao) return <Navigate to={voltarPara} replace />

  async function enviar(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      if (modo === 'email') await entrarComEmail(identificacao, senha)
      else await entrarComCpf(identificacao, senha)
      navegar(voltarPara, { replace: true })
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  function trocarModo(novo) {
    setModo(novo)
    setIdentificacao('')
    setErro(null)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-5 rounded-xl border bg-background p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold">Casa Lorenzi</h1>
          <p className="text-sm text-muted-foreground">Entre na sua conta</p>
        </div>

        <div role="tablist" aria-label="Entrar com" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {[['email', 'E-mail'], ['cpf', 'CPF']].map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={modo === valor}
              onClick={() => trocarModo(valor)}
              className={cn(
                'rounded-md py-1.5 text-sm transition-colors',
                modo === valor ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="identificacao">{modo === 'email' ? 'E-mail' : 'CPF'}</Label>
          <Input
            id="identificacao"
            type={modo === 'email' ? 'email' : 'text'}
            inputMode={modo === 'cpf' ? 'numeric' : undefined}
            autoComplete={modo === 'email' ? 'email' : 'username'}
            placeholder={modo === 'email' ? 'voce@exemplo.com' : '000.000.000-00'}
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {erro && <Aviso mensagem={erro} />}

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
