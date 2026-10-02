import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function cadastrar() {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('Erro no cadastro:', error.message)
      return
    }
    console.log('Usuário criado:', data.user)
  }

  async function logar() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Erro no login:', error.message)
      return
    }
    console.log('Token de acesso:', data.session.access_token)
  }

  return (
    <div>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={cadastrar}>Cadastrar</button>
      <button onClick={logar}>Entrar</button>
    </div>
  )
}