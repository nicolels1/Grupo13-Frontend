import type { Esquema } from '@/lib/api'

type Perfil = Esquema<'Perfil'>

// códigos de permissão, vindos dos tipos gerados da API: o backend publica a lista no OpenAPI e confere
// que ela é igual à das migrações. Código escrito errado nas telas não compila
export type CodigoPermissao = Perfil['permissoes'][number]

export type Marca = 'lorenzi' | 'vulto'
const MARCAS: Marca[] = ['lorenzi', 'vulto']

export type Area = {
  caminho: string
  rotulo: string
  // null = qualquer conta interna
  permissoes: CodigoPermissao[] | null
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
  // clientes da Vulto sem conta (P2): quem vê os pedidos vê o cliente deles
  {
    caminho: 'clientes',
    rotulo: 'Clientes',
    permissoes: ['registrar_venda_fisica', 'preparar_entregar_pedido', 'cancelar_pedido_equipe', 'corrigir_cadastro_cliente', 'registrar_troca_devolucao', 'atender_chamado'],
  },
  // regras do programa de pontos de cada marca; no começo, gerenciar_fidelidade é só do Admin
  { caminho: 'fidelidade', rotulo: 'Fidelidade', permissoes: ['gerenciar_fidelidade'] },
  { caminho: 'atendimento', rotulo: 'Atendimento', permissoes: ['atender_chamado'] },
  { caminho: 'avaliacoes', rotulo: 'Avaliações', permissoes: ['moderar_avaliacoes'] },
  { caminho: 'catalogo', rotulo: 'Catálogo', permissoes: ['gerenciar_catalogo'] },
  { caminho: 'gestao', rotulo: 'Gestão', permissoes: null, somenteAdmin: true },
]

export function ehAdmin(perfil: Perfil | null | undefined) {
  return Boolean(perfil?.modelo_acesso?.eh_admin)
}

export function temPermissao(perfil: Perfil | null | undefined, codigo: CodigoPermissao) {
  return ehAdmin(perfil) || Boolean(perfil?.permissoes?.includes(codigo))
}

// marcas que a pessoa da equipe vê (ver_marca_lorenzi, ver_marca_vulto; o Admin vê as duas). O backend
// recusa (403) a unidade, o pedido ou a peça de uma marca fora daqui
export function marcasVistas(perfil: Perfil | null | undefined): Set<Marca> {
  return new Set(MARCAS.filter((marca) => temPermissao(perfil, `ver_marca_${marca}`)))
}

export function veMarca(perfil: Perfil | null | undefined, marca: string | null | undefined) {
  return Boolean(marca) && marcasVistas(perfil).has(marca as Marca)
}

// a conta interna vê a área? (permissoes null = qualquer conta interna)
export function podeVerArea(perfil: Perfil | null | undefined, area: Area) {
  if (perfil?.tipo_conta !== 'interna') return false
  if (area.somenteAdmin) return ehAdmin(perfil)
  if (!area.permissoes) return true
  return area.permissoes.some((codigo) => temPermissao(perfil, codigo))
}
