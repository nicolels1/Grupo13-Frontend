import type { Esquema } from '@/lib/api'
import { moeda } from '@/lib/formato'

type Origem = Esquema<'OrigemSaida'>

// de onde veio um registro migrado da Vulto (GET /migracao/origem): uma linha por linha de origem
// (a planilha ou a tabela do sistema da Vulto) e, dentro dela, o valor original de cada campo que a
// migração mudou, com a decisão do registro de decisões que mudou

export type LinhaDeOrigem = {
  fonte: string
  linha: string
  decisao: string | null
  mudancas: { campo: string; valor: string; decisao: string | null }[]
}

// os arquivos da Vulto pelo nome que a equipe conhece
const FONTES: Record<string, string> = {
  'vulto.db': 'Sistema da Vulto',
  'catalogo_vulto_2026_REVISADO_final.xlsx': 'Planilha do catálogo',
  'clientes_fidelidade_FINAL_v3 (1).xlsx': 'Planilha do Vulto+',
  'contagem_inventario_set26.xlsx': 'Contagem de set/2026',
  'atendimentos_export_whatsapp_insta.csv': 'Conversas do WhatsApp, Instagram e e-mail',
  'vendas_batel_MANUAL_marco.xlsx': 'Planilha de vendas da Batel',
  de_para: 'Tabela de tradução da migração',
}

const CAMPOS: Record<string, string> = {
  sku: 'Etiqueta (SKU)',
  ean: 'Código de barras',
  cor: 'Cor',
  preco: 'Preço',
  descontinuado: 'Descontinuada',
  nome: 'Nome',
  categoria: 'Categoria',
  codigo_venda: 'Código da venda',
  valor_total: 'Valor total',
  status: 'Situação',
  canal: 'Canal',
  cliente: 'Cliente',
  telefone: 'Telefone',
  aceita_mensagem: 'Aceita mensagem',
  loja_cadastro: 'Loja do cadastro',
  responsavel: 'Responsável',
  pedido_original: 'Pedido original',
}

const EM_REAIS = new Set(['preco', 'valor_total'])

export function nomeDaFonte(fonte: string) {
  return FONTES[fonte] ?? fonte
}

export function nomeDoCampo(campo: string) {
  return CAMPOS[campo] ?? campo.replaceAll('_', ' ')
}

// o valor como a Vulto tinha: vazio aparece escrito, e preço no formato de dinheiro
export function valorOriginal(campo: string, valor: string | null) {
  if (valor === null || valor.trim() === '') return '(vazio)'
  if (EM_REAIS.has(campo) && !Number.isNaN(Number(valor))) return moeda(valor)
  return valor
}

// agrupa por linha de origem, na ordem da API; a linha sem campo diz só de onde o registro veio
export function agruparOrigem(origem: Origem[]): LinhaDeOrigem[] {
  const linhas = new Map<string, LinhaDeOrigem>()
  for (const o of origem) {
    const chave = `${o.fonte}\u0000${o.linha_origem}`
    let linha = linhas.get(chave)
    if (!linha) {
      linha = { fonte: o.fonte, linha: o.linha_origem, decisao: null, mudancas: [] }
      linhas.set(chave, linha)
    }
    if (o.campo) linha.mudancas.push({ campo: o.campo, valor: valorOriginal(o.campo, o.valor_original), decisao: o.decisao })
    else linha.decisao ??= o.decisao
  }
  return [...linhas.values()]
}
