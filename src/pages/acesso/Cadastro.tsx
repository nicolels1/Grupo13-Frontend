import { useState, type SubmitEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { mascaraCpf, soDigitos } from '@/lib/formato'
import { CampoSenha, ErroDoCampo, RegraDaSenha } from './componentes/CamposDaConta'
import { MolduraConta } from './componentes/MolduraConta'
import type { Destino } from './Entrar'
import { SENHA_MINIMA, validarCampo, type CamposCadastro } from './validacao'

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
