import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ErroDoCampo } from './componentes/CamposDaConta'
import { MolduraConta } from './componentes/MolduraConta'
import { validarCampo } from './validacao'

// pede o link para criar uma senha nova (o envio é do Supabase Auth, ver pedirLinkDeSenha)
export function EsqueciSenha() {
  const { pedirLinkDeSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)

  async function pedirLink(destino: string) {
    setErro(null)
    setEnviando(true)
    try {
      await pedirLinkDeSenha(destino)
      setEnviadoPara(destino)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar o link. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function enviar(evento: SubmitEvent) {
    evento.preventDefault()
    const texto = email.trim()
    const problema = texto ? validarCampo('email', texto) : 'Escreva o e-mail da sua conta.'
    if (problema) {
      setErro(problema)
      return
    }
    void pedirLink(texto)
  }

  // a resposta é a mesma com ou sem conta, para a tela não revelar quais e-mails estão cadastrados
  if (enviadoPara) {
    return (
      <MolduraConta larga>
        <div className="space-y-5">
          <h1 className="font-titulo text-3xl">Confira seu e-mail</h1>
          <p className="text-sm">
            Se houver uma conta com <span className="font-medium">{enviadoPara}</span>, enviamos um link para criar uma nova senha. Ele vale por 24 horas.
          </p>
          <p className="text-sm text-muted-foreground">Não chegou? Olhe a caixa de spam ou peça outro link.</p>
          {erro && <p role="alert" className="text-sm text-ferrugem">{erro}</p>}
          <Button type="button" variant="outline" size="loja" className="w-full sm:w-full" disabled={enviando} onClick={() => void pedirLink(enviadoPara)}>
            {enviando ? 'Enviando...' : 'Enviar o link de novo'}
          </Button>
          <p className="text-center text-sm">
            <Link to="/entrar" className="underline underline-offset-2">Voltar para entrar</Link>
          </p>
        </div>
      </MolduraConta>
    )
  }

  return (
    <MolduraConta larga>
      <form onSubmit={(e) => void enviar(e)} className="space-y-6" noValidate>
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground">Escreva o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-recuperar">E-mail</Label>
          <Input
            id="email-recuperar"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="h-11"
            aria-invalid={Boolean(erro) || undefined}
            aria-describedby={erro ? 'erro-recuperar' : undefined}
            required
          />
          <ErroDoCampo id="erro-recuperar" texto={erro} />
        </div>
        <Button type="submit" size="loja" className="w-full sm:w-full" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar link'}
        </Button>
        <p className="text-center text-sm">
          Lembrou a senha? <Link to="/entrar" className="underline underline-offset-2">Entrar</Link>
        </p>
      </form>
    </MolduraConta>
  )
}
