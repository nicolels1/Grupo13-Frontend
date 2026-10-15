import { vi } from 'vitest'

import type { Esquema } from '@/lib/api'
import type { ValorAuth } from './contexto'

// só para os testes: o valor do useAuth() sem Supabase nem API, com as ações trocadas por vi.fn()

export function authDeTeste(dados: Partial<ValorAuth> = {}): ValorAuth {
  return {
    sessao: null,
    perfil: null,
    erroPerfil: null,
    carregando: false,
    entrarComEmail: vi.fn().mockResolvedValue(undefined),
    entrarComCpf: vi.fn().mockResolvedValue(undefined),
    sair: vi.fn().mockResolvedValue(undefined),
    pedirLinkDeSenha: vi.fn().mockResolvedValue(undefined),
    trocarSenha: vi.fn().mockResolvedValue(undefined),
    recarregarPerfil: vi.fn(),
    ...dados,
  }
}

// sessão de mentira: as telas só conferem se ela existe
export const SESSAO_DE_TESTE = { user: { id: '1', email: 'ana@casalorenzi.example' } } as ValorAuth['sessao']

export function perfilDeTeste(dados: Partial<Esquema<'Perfil'>> = {}): Esquema<'Perfil'> {
  return {
    id_usuario: '1',
    nome: 'Ana',
    email: 'ana@casalorenzi.example',
    tipo_conta: 'cliente',
    status_conta: 'ativa',
    id_unidade: null,
    modelo_acesso: null,
    permissoes: [],
    ...dados,
  }
}
