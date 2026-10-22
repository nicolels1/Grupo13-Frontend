import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { api, ErroApi, type Esquema } from '@/lib/api'
import { limparVariantes } from '@/lib/listas'
import { supabase } from '@/lib/supabaseClient'
import { AuthContext, type ValorAuth } from './contexto'
import { erroDaTrocaDeSenha, erroDoLinkDeSenha, erroDoLogin } from './mensagens'

type Perfil = Esquema<'Perfil'>

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = ainda lendo a sessão salva; null = ninguém logado
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  // resultado do GET /me guardado com o id de quem foi buscado
  const [resultado, setResultado] = useState<{ id: string | null; perfil: Perfil | null; erro: string | null }>({
    id: null,
    perfil: null,
    erro: null,
  })
  const [versao, setVersao] = useState(0)
  const idUsuario = sessao?.user?.id ?? null

  useEffect(() => {
    // outra pessoa (ou ninguém) logada: descarta as variantes da anterior antes de as telas verem a sessão
    // nova. A renovação do token mantém a pessoa e o cache
    let idAnterior: string | null = null
    function mudarSessao(novaSessao: Session | null) {
      const id = novaSessao?.user?.id ?? null
      if (id !== idAnterior) limparVariantes()
      idAnterior = id
      setSessao(novaSessao)
    }
    supabase.auth.getSession().then(({ data }) => mudarSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => mudarSessao(novaSessao))
    return () => data.subscription.unsubscribe()
  }, [])

  // busca o perfil quando muda a pessoa logada (não a cada renovação do token) ou ao recarregar
  useEffect(() => {
    if (!idUsuario) return undefined
    let ativo = true
    api<Perfil>('/me')
      .then((perfil) => {
        if (ativo) setResultado({ id: idUsuario, perfil, erro: null })
      })
      .catch((erro: unknown) => {
        const mensagem = erro instanceof ErroApi ? erro.message : 'Não foi possível carregar sua conta'
        if (ativo) setResultado({ id: idUsuario, perfil: null, erro: mensagem })
      })
    return () => {
      ativo = false
    }
  }, [idUsuario, versao])

  // só vale o resultado de quem está logado agora
  const atual = idUsuario && resultado.id === idUsuario ? resultado : null

  const recarregarPerfil = useCallback(() => {
    setResultado((anterior) => ({ ...anterior, id: null }))
    setVersao((v) => v + 1)
  }, [])

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) throw new Error(erroDoLogin(error))
  }, [])

  // login por CPF: o backend devolve a sessão do Supabase, que é entregue ao cliente do Supabase
  const entrarComCpf = useCallback(async (cpf: string, senha: string) => {
    const sessaoCpf = await api<Esquema<'Sessao'>>('/login/cpf', { metodo: 'POST', corpo: { cpf, senha }, autenticado: false })
    const { error } = await supabase.auth.setSession({
      access_token: sessaoCpf.access_token,
      refresh_token: sessaoCpf.refresh_token,
    })
    if (error) throw new Error(erroDoLogin(error))
  }, [])

  const sair = useCallback(() => supabase.auth.signOut(), [])

  // a recuperação é do Supabase Auth (case, seção 5): ele manda o e-mail com um link de 24h que
  // abre /redefinir-senha já com a sessão. Vale para cliente e para a equipe (o convite também)
  const pedirLinkDeSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw new Error(erroDoLinkDeSenha(error))
  }, [])

  // grava a senha de quem abriu o link do e-mail (a sessão já vem do link)
  const trocarSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) throw new Error(erroDaTrocaDeSenha(error))
  }, [])

  const valor = useMemo<ValorAuth>(
    () => ({
      sessao,
      perfil: atual?.perfil ?? null,
      erroPerfil: atual?.erro ?? null,
      // carregando enquanto lê a sessão salva ou busca o perfil de quem está logado
      carregando: sessao === undefined || (Boolean(idUsuario) && !atual),
      entrarComEmail,
      entrarComCpf,
      sair,
      pedirLinkDeSenha,
      trocarSenha,
      recarregarPerfil,
    }),
    [sessao, atual, idUsuario, entrarComEmail, entrarComCpf, sair, pedirLinkDeSenha, trocarSenha, recarregarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
