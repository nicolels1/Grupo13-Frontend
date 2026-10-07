import type { Esquema } from '@/lib/api'

type Perfil = Esquema<'Perfil'>

export type Area = {
  caminho: string
  rotulo: string
  // null = qualquer conta interna
  permissoes: string[] | null
  somenteAdmin?: boolean
}

// áreas da plataforma interna (barra no topo, case seção 8). Cada área aparece para quem tem
// pelo menos uma das permissões; a Gestão é exclusiva do Admin.
export const AREAS: Area[] = [
  { caminho: '', rotulo: 'Visão Geral', permissoes: null },
  {
    caminho: 'estoque',
    rotulo: 'Estoque',
    permissoes: ['movimentar_estoque', 'definir_estoque_minimo', 'solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia'],
  },
  {
    caminho: 'transferencias',
    rotulo: 'Transferências',
    permissoes: ['solicitar_transferencia', 'enviar_transferencia', 'receber_transferencia'],
  },
  // Caixa é área da barra, não tipo de conta: venda física, troca e devolução no balcão e entrega
  // de retirada (design, seção Caixa)
  {
    caminho: 'caixa',
    rotulo: 'Caixa',
    permissoes: ['registrar_venda_fisica', 'registrar_troca_devolucao', 'preparar_entregar_pedido'],
  },
  {
    caminho: 'pedidos',
    rotulo: 'Pedidos',
    permissoes: ['registrar_venda_fisica', 'preparar_entregar_pedido', 'cancelar_pedido_equipe', 'corrigir_cadastro_cliente'],
  },
  { caminho: 'atendimento', rotulo: 'Atendimento', permissoes: ['atender_chamado'] },
  { caminho: 'avaliacoes', rotulo: 'Avaliações', permissoes: ['moderar_avaliacoes'] },
  { caminho: 'catalogo', rotulo: 'Catálogo', permissoes: ['gerenciar_catalogo'] },
  { caminho: 'gestao', rotulo: 'Gestão', permissoes: null, somenteAdmin: true },
]

export function ehAdmin(perfil: Perfil | null | undefined) {
  return Boolean(perfil?.modelo_acesso?.eh_admin)
}

export function temPermissao(perfil: Perfil | null | undefined, codigo: string) {
  return ehAdmin(perfil) || Boolean(perfil?.permissoes?.includes(codigo))
}

// a conta interna vê a área? (permissoes null = qualquer conta interna)
export function podeVerArea(perfil: Perfil | null | undefined, area: Area) {
  if (perfil?.tipo_conta !== 'interna') return false
  if (area.somenteAdmin) return ehAdmin(perfil)
  if (!area.permissoes) return true
  return area.permissoes.some((codigo) => temPermissao(perfil, codigo))
}
