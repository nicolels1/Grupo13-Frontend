import { useState, type ReactNode, type SubmitEvent } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from 'cn'

import { useAuth } from '@/auth/contexto'
import { Carregando } from '@/components/Estados'
import { Logo } from '@/components/Logo'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api, ErroApi, type Esquema } from '@/lib/api'
import { mascaraCpf, soDigitos } from '@/lib/formato'
import { supabase } from '@/lib/supabaseClient'

// o design pede uma mensagem só para credencial errada: não diz se o e-mail ou o CPF existe
const LOGIN_INCORRETO = 'E-mail, CPF ou senha incorretos.'
const SENHA_MINIMA = 6

type Destino = { voltarPara?: string } | null

// moldura das telas de conta: fundo marinho-escuro de ponta a ponta e o cartão branco no meio.
// As telas de senha têm pouco conteúdo: o cartão largo e mais alto não deixa a tela vazia
function MolduraConta({ children, larga = false }: { children: ReactNode; larga?: boolean }) {
  return (
    <main className={cn('flex min-h-svh flex-col items-center bg-marinho-escuro px-4 py-10 text-foreground', larga && 'sm:justify-center')}>
      <Logo para="/loja" className="mb-10 text-2xl text-white" />
      <div
        className={cn(
          'w-full border-t-4 border-terracota bg-background',
          larga ? 'max-w-2xl p-8 sm:px-16 sm:py-16 [&_h1]:sm:text-4xl [&_p]:sm:text-base' : 'max-w-md p-8 sm:p-10',
        )}
      >
        {children}
      </div>
      <Link to="/loja" className="mt-6 text-sm text-white/85 underline underline-offset-4 hover:text-white">
        Voltar para a loja
      </Link>
    </main>
  )
}

// campo de senha com mostrar/ocultar (substitui o "confirmar senha")
function CampoSenha({
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
function RegraDaSenha({ id, cumprida }: { id: string; cumprida: boolean }) {
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

function ErroDoCampo({ id, texto }: { id: string; texto?: string | null }) {
  if (!texto) return null
  return <p id={id} role="alert" className="text-sm text-ferrugem">{texto}</p>
}

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

// ---------- cadastro ----------

// dígitos verificadores do CPF: o backend confere de novo, aqui é só para avisar antes de enviar
function cpfValido(texto: string) {
  const d = soDigitos(texto)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (ate: number) => {
    const soma = [...d.slice(0, ate)].reduce((total, n, i) => total + Number(n) * (ate + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

type CamposCadastro = { nome: string; email: string; cpf: string; senha: string }

function validarCampo(campo: keyof CamposCadastro, valor: string): string | null {
  if (campo === 'nome' && valor.trim().length < 2) return 'Escreva seu nome completo.'
  if (campo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor.trim())) return 'Confira o e-mail: falta o @ ou o domínio (ex.: nome@email.com).'
  if (campo === 'cpf' && !cpfValido(valor)) return 'Confira o CPF: os números não formam um CPF válido.'
  if (campo === 'senha' && valor.length < SENHA_MINIMA) return `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`
  return null
}

// cadastro de cliente: o backend cria o login e a conta (POST /clientes) e liga as compras feitas em
// lojas com este CPF na nota; depois entra direto. Com compras ligadas, abre Meus pedidos com o aviso
export function Cadastro() {
  const { sessao, entrarComEmail } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = local.state as Destino
  const [form, setForm] = useState<CamposCadastro>({ nome: '', email: '', cpf: '', senha: '' })
  const [erros, setErros] = useState<Partial<Record<keyof CamposCadastro, string | null>>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const voltarPara = destino?.voltarPara ?? '/loja'

  if (sessao && !enviando) return <Navigate to={voltarPara} replace />

  function mudar(campo: keyof CamposCadastro, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    // o erro some assim que a pessoa corrige; não aparece enquanto ainda digita pela primeira vez
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: validarCampo(campo, valor) }))
  }

  function aoSair(campo: keyof CamposCadastro) {
    if (form[campo]) setErros((atuais) => ({ ...atuais, [campo]: validarCampo(campo, form[campo]) }))
  }

  async function enviar(evento: SubmitEvent) {
    evento.preventDefault()
    const encontrados = Object.fromEntries(
      (Object.keys(form) as (keyof CamposCadastro)[]).map((c) => [c, validarCampo(c, form[c])]),
    ) as typeof erros
    setErros(encontrados)
    if (Object.values(encontrados).some(Boolean)) return

    setErro(null)
    setEnviando(true)
    try {
      const criado = await api<Esquema<'CadastroSaida'>>('/clientes', {
        metodo: 'POST',
        corpo: { ...form, nome: form.nome.trim(), email: form.email.trim(), cpf: soDigitos(form.cpf) },
        autenticado: false,
      })
      await entrarComEmail(form.email.trim(), form.senha)
      if (criado.compras_ligadas > 0) {
        navegar('/loja/pedidos', { replace: true, state: { comprasLigadas: criado.compras_ligadas } })
      } else {
        navegar(voltarPara, { replace: true })
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível criar a conta. Tente de novo.')
      setEnviando(false)
    }
  }

  const senhaOk = form.senha.length >= SENHA_MINIMA

  return (
    <MolduraConta>
      <form onSubmit={(e) => void enviar(e)} className="space-y-5" noValidate>
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Com a conta, você acompanha seus pedidos e chamados. Compras feitas nas lojas com o seu CPF aparecem aqui.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            autoComplete="name"
            value={form.nome}
            onChange={(e) => mudar('nome', e.target.value)}
            onBlur={() => aoSair('nome')}
            maxLength={150}
            className="h-11"
            aria-invalid={Boolean(erros.nome) || undefined}
            aria-describedby={erros.nome ? 'erro-nome' : undefined}
            required
          />
          <ErroDoCampo id="erro-nome" texto={erros.nome} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => mudar('cpf', mascaraCpf(e.target.value))}
            onBlur={() => aoSair('cpf')}
            className="h-11"
            aria-invalid={Boolean(erros.cpf) || undefined}
            aria-describedby={erros.cpf ? 'erro-cpf' : undefined}
            required
          />
          <ErroDoCampo id="erro-cpf" texto={erros.cpf} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => mudar('email', e.target.value)}
            onBlur={() => aoSair('email')}
            maxLength={255}
            className="h-11"
            aria-invalid={Boolean(erros.email) || undefined}
            aria-describedby={erros.email ? 'erro-email' : undefined}
            required
          />
          <ErroDoCampo id="erro-email" texto={erros.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nova-senha">Senha</Label>
          <CampoSenha
            id="nova-senha"
            valor={form.senha}
            aoMudar={(v) => mudar('senha', v)}
            autoComplete="new-password"
            descricao="regra-senha"
            invalido={Boolean(erros.senha)}
          />
          <RegraDaSenha id="regra-senha" cumprida={senhaOk} />
          <ErroDoCampo id="erro-senha" texto={erros.senha} />
        </div>

        {erro && <p role="alert" className="border-l-4 border-ferrugem bg-ferrugem-fundo p-3 text-sm text-ferrugem">{erro}</p>}

        <Button type="submit" size="loja" className="w-full sm:w-full" disabled={enviando}>
          {enviando ? 'Criando a conta...' : 'Criar conta'}
        </Button>
        <p className="text-center text-sm">
          Já tem conta? <Link to="/entrar" state={local.state} className="underline underline-offset-2">Entrar</Link>
        </p>
      </form>
    </MolduraConta>
  )
}

// ---------- recuperar senha ----------

// a recuperação é do Supabase Auth (case, seção 5): ele manda o e-mail com um link de 24h que
// abre /redefinir-senha já com a sessão. Vale para cliente e para a equipe (o convite também)
export function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)

  async function pedirLink(destino: string) {
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(destino, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setEnviando(false)
    if (error) {
      setErro(error.status === 429 ? 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.' : 'Não foi possível enviar o link. Tente de novo.')
      return
    }
    setEnviadoPara(destino)
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

// aberta pelo link do e-mail: o cliente do Supabase lê o link e já entra na conta. Sem sessão,
// o link venceu ou já foi usado
export function RedefinirSenha() {
  const { sessao } = useAuth()
  const navegar = useNavigate()
  // ?convite=1 vem do link do convite da equipe (ver supabaseClient): a pessoa ainda não tem senha
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
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) {
      setErro(error.code === 'same_password' ? 'A nova senha precisa ser diferente da anterior.' : 'Não foi possível salvar a senha. Tente de novo.')
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
