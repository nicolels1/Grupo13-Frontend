import { useState, type SubmitEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ErroApi } from '@/lib/api'
import { CampoSenha, ErroDoCampo } from './componentes/CamposDaConta'
import { MolduraConta } from './componentes/MolduraConta'

// o design pede uma mensagem só para credencial errada: não diz se o e-mail ou o CPF existe
const LOGIN_INCORRETO = 'E-mail, CPF ou senha incorretos.'

// página de onde a pessoa veio antes de cair no login (ver ExigeLogin)
export type Destino = { voltarPara?: string } | null

// entrada única: o tipo de conta decide a plataforma depois do login (case, seção 5).
// Um campo só: com "@" entra por e-mail; senão, pelo CPF (só contas de cliente têm CPF)
export function Entrar() {
  const { sessao, entrarComEmail, entrarComCpf } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = local.state as Destino
  const [identificacao, setIdentificacao] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const voltarPara = destino?.voltarPara ?? '/'

  if (sessao) return <Navigate to={voltarPara} replace />

  async function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault()
    // o preenchimento automático do navegador pode não avisar o React: lê o que está nos campos
    const dados = new FormData(evento.currentTarget)
    const quem = String(dados.get('identificacao') ?? identificacao).trim()
    const segredo = String(dados.get('senha') ?? senha)
    if (!quem || !segredo) {
      setErro('Preencha o e-mail ou CPF e a senha.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      if (quem.includes('@')) await entrarComEmail(quem, segredo)
      else await entrarComCpf(quem, segredo)
      navegar(voltarPara, { replace: true })
    } catch (falha) {
      setErro(mensagemDoLogin(falha))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <MolduraConta>
      <form onSubmit={(e) => void enviar(e)} className="space-y-6" noValidate>
        <h1 className="font-titulo text-3xl">Entrar</h1>
        <div className="space-y-2">
          <Label htmlFor="identificacao">E-mail ou CPF</Label>
          <Input
            id="identificacao"
            name="identificacao"
            autoComplete="username"
            value={identificacao}
            onChange={(e) => setIdentificacao(e.target.value)}
            className="h-11"
            aria-invalid={Boolean(erro) || undefined}
            aria-describedby={erro ? 'erro-login' : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="senha">Senha</Label>
            <Link to="/esqueci-senha" className="text-sm underline underline-offset-2 hover:text-aco">Esqueci minha senha</Link>
          </div>
          <CampoSenha id="senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" invalido={Boolean(erro)} />
        </div>

        <ErroDoCampo id="erro-login" texto={erro} />

        <Button type="submit" size="loja" className="w-full sm:w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="space-y-3 border-t pt-6">
          <p className="text-sm">Ainda não tem conta?</p>
          <Link to="/cadastro" state={local.state} className={cn(buttonVariants({ variant: 'outline', size: 'loja' }), 'w-full sm:w-full')}>
            Criar conta
          </Link>
        </div>
      </form>
    </MolduraConta>
  )
}

// credencial errada vira sempre a mesma frase; conta desativada, excesso de tentativas e falta de
// conexão continuam dizendo o que fazer
function mensagemDoLogin(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401 || falha.status === 404 || falha.status === 422) return LOGIN_INCORRETO
    return falha.message
  }
  const texto = falha instanceof Error ? falha.message : ''
  if (texto.includes('inválidos')) return LOGIN_INCORRETO
  return texto || 'Não foi possível entrar. Tente de novo.'
}
