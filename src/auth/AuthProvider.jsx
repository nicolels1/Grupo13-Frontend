import { useCallback, useEffect, useMemo, useState } from 'react'

import { api, ErroApi } from '@/lib/api'
import { supabase } from '@/lib/supabaseClient'
import { AuthContext } from './contexto'

// mensagens do Supabase Auth em português
function traduzirErroLogin(erro) {
  const mensagem = erro?.message ?? ''
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha inválidos'
  if (mensagem.includes('Email not confirmed')) return 'E-mail ainda não confirmado'
  if (erro?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo'
  return 'Não foi possível entrar. Tente de novo.'
}

export function AuthProvider({ children }) {
  // undefined = ainda lendo a sessão salva; null = ninguém logado
  const [sessao, setSessao] = useState(undefined)
  // resultado do GET /me guardado com o id de quem foi buscado
  const [resultado, setResultado] = useState({ id: null, perfil: null, erro: null })
  const [versao, setVersao] = useState(0)
  const idUsuario = sessao?.user?.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao))
    return () => data.subscription.unsubscribe()
  }, [])

  // busca o perfil quando muda a pessoa logada (não a cada renovação do token) ou ao recarregar
  useEffect(() => {
    if (!idUsuario) return undefined
    let ativo = true
    api('/me')
      .then((perfil) => ativo && setResultado({ id: idUsuario, perfil, erro: null }))
      .catch((erro) => {
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

  const entrarComEmail = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) throw new Error(traduzirErroLogin(error))
  }, [])

  // login por CPF: o backend devolve a sessão do Supabase, que é entregue ao cliente do Supabase
  const entrarComCpf = useCallback(async (cpf, senha) => {
    const sessaoCpf = await api('/login/cpf', { metodo: 'POST', corpo: { cpf, senha }, autenticado: false })
    const { error } = await supabase.auth.setSession({
      access_token: sessaoCpf.access_token,
      refresh_token: sessaoCpf.refresh_token,
    })
    if (error) throw new Error(traduzirErroLogin(error))
  }, [])

  const sair = useCallback(() => supabase.auth.signOut(), [])

  const valor = useMemo(
    () => ({
      sessao,
      perfil: atual?.perfil ?? null,
      erroPerfil: atual?.erro ?? null,
      // carregando enquanto lê a sessão salva ou busca o perfil de quem está logado
      carregando: sessao === undefined || (Boolean(idUsuario) && !atual),
      entrarComEmail,
      entrarComCpf,
      sair,
      recarregarPerfil,
    }),
    [sessao, atual, idUsuario, entrarComEmail, entrarComCpf, sair, recarregarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
