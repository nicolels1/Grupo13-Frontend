import { describe, expect, it } from 'vitest'

import type { Esquema } from '@/lib/api'
import { AREAS, ehAdmin, podeVerArea, temPermissao, type Area } from './areas'

type Perfil = Esquema<'Perfil'>

// só os campos que as regras de área leem; o resto do perfil não importa aqui
function perfil(dados: { tipo_conta?: string; admin?: boolean; permissoes?: string[] }): Perfil {
  return {
    id_usuario: '1',
    nome: 'Teste',
    email: 'teste@casalorenzi.example',
    tipo_conta: dados.tipo_conta ?? 'interna',
    status_conta: 'ativa',
    id_unidade: null,
    modelo_acesso: dados.admin ? ({ eh_admin: true } as Perfil['modelo_acesso']) : null,
    permissoes: dados.permissoes ?? [],
  }
}

const area = (caminho: string): Area => {
  const encontrada = AREAS.find((a) => a.caminho === caminho)
  if (!encontrada) throw new Error(`área ${caminho} não existe`)
  return encontrada
}

describe('temPermissao', () => {
  it('confere a permissão da conta', () => {
    const estoquista = perfil({ permissoes: ['movimentar_estoque'] })
    expect(temPermissao(estoquista, 'movimentar_estoque')).toBe(true)
    expect(temPermissao(estoquista, 'atender_chamado')).toBe(false)
  })

  it('Admin pode tudo', () => {
    const admin = perfil({ admin: true })
    expect(ehAdmin(admin)).toBe(true)
    expect(temPermissao(admin, 'qualquer_permissao')).toBe(true)
  })

  it('sem perfil não pode nada', () => {
    expect(temPermissao(null, 'movimentar_estoque')).toBe(false)
  })
})

describe('podeVerArea', () => {
  it('a Visão Geral aparece para toda conta interna', () => {
    expect(podeVerArea(perfil({}), area(''))).toBe(true)
  })

  it('cliente não vê nenhuma área do interno', () => {
    const cliente = perfil({ tipo_conta: 'cliente', permissoes: ['movimentar_estoque'] })
    expect(AREAS.some((a) => podeVerArea(cliente, a))).toBe(false)
  })

  it('basta uma das permissões da área', () => {
    const vendedor = perfil({ permissoes: ['registrar_venda_fisica'] })
    expect(podeVerArea(vendedor, area('caixa'))).toBe(true)
    expect(podeVerArea(vendedor, area('pedidos'))).toBe(true)
    expect(podeVerArea(vendedor, area('estoque'))).toBe(false)
  })

  it('a Gestão é só do Admin, mesmo com todas as permissões', () => {
    const quaseTudo = perfil({ permissoes: ['gerenciar_contas', 'gerenciar_modelos_acesso', 'gerenciar_unidades'] })
    expect(podeVerArea(quaseTudo, area('gestao'))).toBe(false)
    expect(podeVerArea(perfil({ admin: true }), area('gestao'))).toBe(true)
  })
})
