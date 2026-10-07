import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Aviso } from '@/components/Estados'
import { Logo } from '@/components/Logo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api } from '@/lib/api'

const ROTULO = 'text-sm font-medium'
const BOTAO = 'h-11 w-full'

// moldura das telas de conta: logo no topo e o cartão no meio
function MolduraConta({ children }) {
  return (
    <main className="flex min-h-svh flex-col items-center bg-superficie px-4 py-10">
      <Logo para="/loja" className="mb-10 text-2xl" />
      <div className="w-full max-w-md bg-background p-8 shadow-sm sm:p-10">{children}</div>
    </main>
  )
}

// entrada única: o tipo de conta decide a plataforma depois do login (case, seção 5).
// Um campo só: com "@" entra por e-mail; senão, pelo CPF (só contas de cliente têm CPF).
export function Entrar() {
  const { sessao, entrarComEmail, entrarComCpf } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
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
      if (identificacao.includes('@')) await entrarComEmail(identificacao, senha)
      else await entrarComCpf(identificacao, senha)
      navegar(voltarPara, { replace: true })
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MolduraConta>
      <form onSubmit={enviar} className="space-y-6">
        <h1 className="font-titulo text-3xl">Entrar</h1>
        <div className="space-y-2">
          <Label htmlFor="identificacao" className={ROTULO}>E-mail ou CPF</Label>
          <Input
            id="identificacao"
            autoComplete="username"
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha" className={ROTULO}>Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="h-11"
            required
          />
        </div>

        {erro && <Aviso mensagem={erro} />}

        <Button type="submit" size="lg" className={BOTAO} disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="space-y-3 border-t pt-6">
          <p className="text-sm">Ainda não tem conta?</p>
          <Link to="/cadastro" state={local.state} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), BOTAO)}>
            Criar conta
          </Link>
        </div>
      </form>
    </MolduraConta>
  )
}

// cadastro de cliente: o backend cria o login e a conta (POST /clientes); depois entra direto
export function Cadastro() {
  const { sessao, entrarComEmail } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '' })
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const voltarPara = local.state?.voltarPara ?? '/loja'

  if (sessao) return <Navigate to={voltarPara} replace />

  async function enviar(evento) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api('/clientes', { metodo: 'POST', corpo: form, autenticado: false })
      await entrarComEmail(form.email, form.senha)
      navegar(voltarPara, { replace: true })
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  return (
    <MolduraConta>
      <form onSubmit={enviar} className="space-y-5">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Com a conta, você acompanha seus chamados e compras.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nome" className={ROTULO}>Nome completo</Label>
          <Input id="nome" autoComplete="name" value={form.nome} onChange={mudar('nome')} minLength={2} maxLength={150} className="h-11" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className={ROTULO}>E-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={mudar('email')} className="h-11" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf" className={ROTULO}>CPF</Label>
          <Input
            id="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={mudar('cpf')}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nova-senha" className={ROTULO}>Senha</Label>
          <Input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            value={form.senha}
            onChange={mudar('senha')}
            minLength={6}
            maxLength={72}
            className="h-11"
            aria-describedby="dica-senha"
            required
          />
          <p id="dica-senha" className="text-xs text-muted-foreground">Pelo menos 6 caracteres.</p>
        </div>

        {erro && <Aviso mensagem={erro} />}

        <Button type="submit" size="lg" className={BOTAO} disabled={enviando}>
          {enviando ? 'Criando...' : 'Criar conta'}
        </Button>
        <p className="text-center text-sm">
          Já tem conta? <Link to="/entrar" state={local.state} className="underline underline-offset-2">Entrar</Link>
        </p>
      </form>
    </MolduraConta>
  )
}
