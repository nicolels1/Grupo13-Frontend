import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Carregando } from '@/components/Estados'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/input'
import { CampoSenha, ErroDoCampo, RegraDaSenha } from './componentes/CamposDaConta'
import { MolduraConta } from './componentes/MolduraConta'
import { SENHA_MINIMA } from './validacao'

// aberta pelo link do e-mail: o cliente do Supabase lê o link e já entra na conta. Sem sessão,
// o link venceu ou já foi usado
export function RedefinirSenha() {
  const { sessao, trocarSenha } = useAuth()
  const navegar = useNavigate()
  // ?convite=1 vem do link do convite da equipe (ver auth/linkDeSenha): a pessoa ainda não tem senha
  const [params] = useSearchParams()
  const convite = params.get('convite') === '1'
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (sessao === undefined) {
    return (
      <MolduraConta larga>
        <Carregando texto="Abrindo o link..." />
      </MolduraConta>
    )
  }

  if (!sessao) {
    return (
      <MolduraConta larga>
        <div className="space-y-5">
          <h1 className="font-titulo text-3xl">Link vencido</h1>
          <p className="text-sm">
            Este link já foi usado ou passou das 24 horas. Peça um novo para criar a sua senha. Se for um convite da equipe, também dá para pedir ao Admin que reenvie.
          </p>
          <Link to="/esqueci-senha" className={cn(buttonVariants({ size: 'loja' }), 'w-full sm:w-full')}>
            Pedir outro link
          </Link>
        </div>
      </MolduraConta>
    )
  }

  async function enviar(evento: SubmitEvent) {
    evento.preventDefault()
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`)
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      await trocarSenha(senha)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a senha. Tente de novo.')
      setEnviando(false)
      return
    }
    // "/" leva cada tipo de conta à sua plataforma
    navegar('/', { replace: true })
  }

  return (
    <MolduraConta larga>
      <form onSubmit={(e) => void enviar(e)} className="space-y-6" noValidate>
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">{convite ? 'Crie sua senha' : 'Criar nova senha'}</h1>
          <p className="text-sm text-muted-foreground">
            {convite
              ? `Boas-vindas à equipe da Casa Lorenzi. Crie uma senha para entrar na plataforma interna com ${sessao.user.email}.`
              : `Para a conta ${sessao.user.email}.`}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha-nova">{convite ? 'Senha' : 'Nova senha'}</Label>
          <CampoSenha
            id="senha-nova"
            valor={senha}
            aoMudar={setSenha}
            autoComplete="new-password"
            descricao="regra-senha-nova"
            invalido={Boolean(erro)}
          />
          <RegraDaSenha id="regra-senha-nova" cumprida={senha.length >= SENHA_MINIMA} />
          <ErroDoCampo id="erro-senha-nova" texto={erro} />
        </div>
        <Button type="submit" size="loja" className="w-full sm:w-full" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar senha e entrar'}
        </Button>
      </form>
    </MolduraConta>
  )
}
