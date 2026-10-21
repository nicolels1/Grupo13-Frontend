import type { Esquema } from '@/lib/api'

// só para os testes: registros da Vulto como a API devolve depois da migração, para as telas de peça,
// cliente, venda e atendimento. Os casos imitam os do tratamento (o código de cada decisão está no
// registro de decisões do backend), mas nomes, CPFs, e-mails e telefones são inventados

const MIGRADO_EM = '2026-10-01T03:00:00Z'
const CATALOGO = 'catalogo_vulto_2026_REVISADO_final.xlsx'

// ---------- peça ----------

export function varianteVultoDeTeste(dados: Partial<Esquema<'VarianteSaida'>> = {}): Esquema<'VarianteSaida'> {
  return {
    id_variante: 901,
    id_produto: 90,
    sku: 'VLT-MOL-001-MRR-G',
    ean: '7891234567895',
    cor: 'Marrom',
    tamanho: 'G',
    preco: '349.90',
    ativo: true,
    disponivel: true,
    ...dados,
  }
}

// Moletom Canguru Logo: a peça nova do código reaproveitado VLT-MOL-001 (C2), com uma variante
// descontinuada sem estoque, que entra fora de venda (C3)
export function produtoVultoDeTeste(dados: Partial<Esquema<'ProdutoSaida'>> = {}): Esquema<'ProdutoSaida'> {
  return {
    id_produto: 90,
    id_categoria: 12,
    nome: 'Moletom Canguru Logo',
    descricao_tecnica: 'Moletom Canguru Logo',
    descricao_cliente: 'Moletom Canguru Logo',
    marca: 'vulto',
    ativo: true,
    variantes: [
      varianteVultoDeTeste(),
      varianteVultoDeTeste({ id_variante: 902, sku: 'VLT-MOL-001-MRR-GG', ean: '2000000009022', tamanho: 'GG',
        ativo: false, disponivel: false }),
    ],
    imagens: [],
    ...dados,
  }
}

// de onde veio a variante: o código curto da Verão 26 (J2), a cor escrita (C7), o preço da coleção
// mais antiga (C1), o EAN cortado pelo Excel (C12) e a marcação de descontinuada (C3)
export const ORIGEM_VARIANTE_DE_TESTE: Esquema<'OrigemSaida'>[] = [
  { fonte: CATALOGO, linha_origem: 'Verão 26!402', campo: null, valor_original: null, decisao: 'C13' },
  { fonte: CATALOGO, linha_origem: 'Verão 26!402', campo: 'sku', valor_original: 'MOL001MG', decisao: 'J2' },
  { fonte: CATALOGO, linha_origem: 'Verão 26!402', campo: 'cor', valor_original: 'MARROM', decisao: 'C7' },
  { fonte: CATALOGO, linha_origem: 'Atemporais!88', campo: null, valor_original: null, decisao: 'C13' },
  { fonte: CATALOGO, linha_origem: 'Atemporais!88', campo: 'preco', valor_original: '319.90', decisao: 'C1' },
  { fonte: CATALOGO, linha_origem: 'Atemporais!88', campo: 'ean', valor_original: '7891234000000', decisao: 'C12' },
  { fonte: CATALOGO, linha_origem: 'Atemporais!88', campo: 'descontinuado', valor_original: 'só o SKU em vermelho',
    decisao: 'C3' },
]

// ---------- cliente ----------

export function clienteVultoDeTeste(
  dados: Partial<Esquema<'ClienteSemContaSaida'>> = {},
): Esquema<'ClienteSemContaSaida'> {
  return {
    id_cliente_sem_conta: 301,
    nome: 'Bruna Teixeira',
    cpf: '48120376544',
    email: 'bruna.teixeira@exemplo.com',
    telefone: '11987654321',
    aceita_mensagem: null,
    origem: 'migracao_vulto',
    id_usuario: null,
    criado_em: MIGRADO_EM,
    ...dados,
  }
}

// quem só aparece nos pontos: CPF e saldo, sem nome nem e-mail (K8)
export const CLIENTE_SO_NOS_PONTOS_DE_TESTE = clienteVultoDeTeste({
  id_cliente_sem_conta: 302, nome: null, cpf: '73091824640', email: null, telefone: null,
})

// dois cadastros do mesmo CPF juntos (K1), o DDD que veio de outra fonte (K9a) e o consentimento
// em branco, que fica "não informado" (K9b)
export const ORIGEM_CLIENTE_DE_TESTE: Esquema<'OrigemSaida'>[] = [
  { fonte: 'clientes_fidelidade_FINAL_v3 (1).xlsx', linha_origem: 'Clientes!215', campo: null, valor_original: null,
    decisao: 'P2' },
  { fonte: 'clientes_fidelidade_FINAL_v3 (1).xlsx', linha_origem: 'Clientes!1873', campo: null, valor_original: null,
    decisao: 'K1' },
  { fonte: 'clientes_fidelidade_FINAL_v3 (1).xlsx', linha_origem: 'Clientes!1873', campo: 'telefone',
    valor_original: '987654321', decisao: 'K9a' },
  { fonte: 'clientes_fidelidade_FINAL_v3 (1).xlsx', linha_origem: 'Clientes!215', campo: 'aceita_mensagem',
    valor_original: '', decisao: 'K9b' },
]

export const PONTOS_DE_TESTE: Esquema<'PontosDoCliente'> = {
  saldos: [{
    marca: 'vulto',
    saldo: 4820,
    valor_em_reais: '295.10',
    categoria: 'prata',
    categoria_desde: '2025-06-14',
    ganhos_no_ano: 2310,
    proximo_vencimento: '2027-10-01',
    pontos_no_proximo_vencimento: 1180,
  }],
}

function movimentoDeTeste(dados: Partial<Esquema<'MovimentoPontosSaida'>>): Esquema<'MovimentoPontosSaida'> {
  return {
    id_movimento: 1,
    marca: 'vulto',
    tipo: 'credito',
    pontos: 0,
    origem: 'migracao',
    id_pedido: null,
    codigo_venda: null,
    id_movimento_original: null,
    motivo: null,
    criado_em: MIGRADO_EM,
    ganho_em: null,
    restante: null,
    vence_em: null,
    ...dados,
  }
}

// extrato do mais novo para o mais antigo: o estorno de um crédito de venda cancelada (K6), o dobro do
// online que o sistema não deu (K4b), um crédito de 2025 que vale R$ 0,10 por ponto (K3) e o saldo da
// planilha em 01/01/2025 (K5a)
export const EXTRATO_DE_TESTE: Esquema<'MovimentoPontosSaida'>[] = [
  movimentoDeTeste({ id_movimento: 4, tipo: 'estorno', pontos: -260, id_movimento_original: 3,
    motivo: 'crédito de venda cancelada (K6)', criado_em: '2026-05-03T18:20:00Z', ganho_em: '2026-04-28' }),
  movimentoDeTeste({ id_movimento: 3, pontos: 520, id_pedido: 5012, codigo_venda: 'APP-104233',
    motivo: 'dobro do online (K4b)', criado_em: '2026-04-28T15:02:00Z', ganho_em: '2026-04-28', restante: 260,
    vence_em: '2027-10-01' }),
  movimentoDeTeste({ id_movimento: 2, pontos: 1180, id_pedido: 812, codigo_venda: 'S100988',
    criado_em: '2025-02-11T13:40:00Z', ganho_em: '2025-02-11', restante: 1180, vence_em: '2027-10-01' }),
  movimentoDeTeste({ id_movimento: 1, tipo: 'saldo_inicial', pontos: 3380, motivo: 'saldo da planilha em 01/01/2025 (K5a)',
    criado_em: '2025-01-01T03:00:00Z', ganho_em: '2025-01-01', restante: 3380, vence_em: '2027-10-01' }),
]

// ---------- venda ----------

function pagamentoDeTeste(dados: Partial<Esquema<'PagamentoSaida'>>): Esquema<'PagamentoSaida'> {
  return {
    id_pagamento: 1,
    tipo: 'pagamento',
    id_pagamento_original: null,
    id_chamado: null,
    origem: 'migracao',
    id_registrado_por: null,
    id_unidade: null,
    metodo: 'nao_informado',
    id_transacao_gateway: null,
    valor: '0.00',
    status: 'aprovado',
    criado_em: MIGRADO_EM,
    ...dados,
  }
}

function itemDeTeste(dados: Partial<Esquema<'ItemPedidoSaida'>>): Esquema<'ItemPedidoSaida'> {
  return {
    id_item: 1,
    id_variante: 901,
    sku: 'VLT-MOL-001-MRR-G',
    produto: 'Moletom Canguru Logo',
    cor: 'Marrom',
    tamanho: 'G',
    quantidade: 1,
    preco_unitario: '349.90',
    id_avaliacao: null,
    foto_url: null,
    ...dados,
  }
}

export function pedidoVultoDeTeste(dados: Partial<Esquema<'PedidoSaida'>> = {}): Esquema<'PedidoSaida'> {
  return {
    id_pedido: 5012,
    codigo_venda: 'APP-104233',
    id_cliente: null,
    id_cliente_sem_conta: 301,
    cliente: 'Bruna Teixeira',
    id_unidade: 5,
    unidade: 'CD Cajamar',
    id_registrado_por: null,
    cpf_nota: null,
    canal: 'online',
    canal_venda: 'app',
    modalidade: 'entrega',
    status: 'entregue',
    motivo_cancelamento: null,
    id_cancelado_por: null,
    justificativa_cancelamento: null,
    devolucao: 'nenhuma',
    valor_itens: '349.90',
    valor_frete: '0.00',
    valor_desconto: '35.00',
    valor_total: '314.90',
    valor_pago: '314.90',
    reserva_expira_em: null,
    pago_em: '2026-04-28T15:01:00Z',
    enviado_em: null,
    pronto_retirada_em: null,
    entregue_em: null,
    cancelado_em: null,
    criado_em: '2026-04-28T15:00:00Z',
    itens: [itemDeTeste({})],
    pagamentos: [pagamentoDeTeste({ valor: '314.90', criado_em: '2026-04-28T15:01:00Z' })],
    endereco_entrega: null,
    ...dados,
  }
}

// venda da planilha da Batel no PDV fora do ar: código novo (V23), loja física, método da planilha (V9)
export const PEDIDO_BATEL_DE_TESTE = pedidoVultoDeTeste({
  id_pedido: 6101,
  codigo_venda: 'VLT-BATEL-27',
  id_cliente_sem_conta: null,
  cliente: null,
  id_unidade: 4,
  unidade: 'Vulto Batel',
  id_registrado_por: 'b5d1c0de-0000-4000-8000-000000000015',
  canal: 'loja_fisica',
  canal_venda: 'loja',
  modalidade: null,
  valor_itens: '539.80',
  valor_desconto: '0.00',
  valor_total: '539.80',
  valor_pago: '539.80',
  pago_em: '2026-03-12T21:10:00Z',
  entregue_em: '2026-03-12T21:10:00Z',
  criado_em: '2026-03-12T21:10:00Z',
  itens: [itemDeTeste({ quantidade: 2, preco_unitario: '269.90' })],
  pagamentos: [pagamentoDeTeste({ metodo: 'cartao_credito', valor: '539.80', id_unidade: 4,
    criado_em: '2026-03-12T21:10:00Z' })],
})

// o pedido do app gravado em centavos (V1), o código de venda da Vulto (V15), o status escrito (V13) e
// o pagamento que a Vulto não guardava, sem método (P7)
export const ORIGEM_PEDIDO_DE_TESTE: Esquema<'OrigemSaida'>[] = [
  { fonte: 'vulto.db', linha_origem: 'vendas#15120', campo: null, valor_original: null, decisao: 'V13' },
  { fonte: 'vulto.db', linha_origem: 'vendas#15120', campo: 'valor_total', valor_original: '31490.00', decisao: 'V1' },
  { fonte: 'vulto.db', linha_origem: 'vendas#15120', campo: 'status', valor_original: 'Aprovado', decisao: 'V13' },
  { fonte: 'vulto.db', linha_origem: 'vendas#15120', campo: 'canal', valor_original: 'APP', decisao: 'P3' },
]

// ---------- atendimento ----------

// conversa de WhatsApp sem cliente identificado (A6): o canal e o contato ficam no chamado (P6)
export function chamadoVultoDeTeste(dados: Partial<Esquema<'ChamadoSaida'>> = {}): Esquema<'ChamadoSaida'> {
  return {
    id_chamado: 7001,
    categoria: 'troca_devolucao',
    assunto: 'Troca de tamanho',
    descricao: 'comprei na loja do batel e ficou grande, consigo trocar?',
    status: 'concluido',
    prioridade: null,
    motivo_encerramento: 'resolvido',
    id_cliente: null,
    id_cliente_sem_conta: null,
    cliente: 'Rodrigo',
    id_responsavel: 'b5d1c0de-0000-4000-8000-000000000101',
    responsavel: 'Júlia',
    id_pedido: null,
    id_item_pedido: null,
    id_variante: null,
    id_unidade: null,
    id_chamado_anterior: null,
    criado_em: '2026-06-02T14:05:00Z',
    atualizado_em: '2026-06-02T16:40:00Z',
    assumido_em: '2026-06-02T14:30:00Z',
    concluido_em: '2026-06-02T16:40:00Z',
    canal_externo: 'whatsapp',
    contato_externo: '+5541999990000',
    mensagens_nao_lidas: 0,
    ...dados,
  }
}

function mensagemDeTeste(dados: Partial<Esquema<'MensagemSaida'>>): Esquema<'MensagemSaida'> {
  return {
    id_mensagem: 1,
    id_chamado: 7001,
    id_autor: null,
    autor: 'Rodrigo',
    da_equipe: false,
    conteudo: null,
    interna: false,
    anexo_nome: null,
    anexo_tamanho: null,
    lida_em: null,
    criado_em: '2026-06-02T14:05:00Z',
    ...dados,
  }
}

// a fala do cliente sem autor, com o nome de quem escreveu (P6); a resposta automática do bot pela
// conta "Migração Vulto" e a da Júlia, que virou conta interna (P9)
export const MENSAGENS_DE_TESTE: Esquema<'MensagemSaida'>[] = [
  mensagemDeTeste({ id_mensagem: 1, conteudo: 'comprei na loja do batel e ficou grande, consigo trocar?' }),
  mensagemDeTeste({ id_mensagem: 2, id_autor: 'b5d1c0de-0000-4000-8000-000000000199', autor: 'Migração Vulto',
    da_equipe: true, conteudo: '[Bot] Recebemos sua mensagem! Em breve alguém do time responde.',
    criado_em: '2026-06-02T14:05:10Z' }),
  mensagemDeTeste({ id_mensagem: 3, id_autor: 'b5d1c0de-0000-4000-8000-000000000101', autor: 'Júlia',
    da_equipe: true, conteudo: 'Oi, Rodrigo! Consegue sim, em até 30 dias com a etiqueta. Pode levar na loja.',
    criado_em: '2026-06-02T14:31:00Z' }),
]

export const ORIGEM_CHAMADO_DE_TESTE: Esquema<'OrigemSaida'>[] = [
  { fonte: 'atendimentos_export_whatsapp_insta.csv', linha_origem: 'atendimentos#2210', campo: null,
    valor_original: null, decisao: 'A6' },
  { fonte: 'atendimentos_export_whatsapp_insta.csv', linha_origem: 'atendimentos#2210', campo: 'categoria',
    valor_original: 'troca/devol', decisao: 'A4a' },
  { fonte: 'atendimentos_export_whatsapp_insta.csv', linha_origem: 'atendimentos#2210', campo: 'responsavel',
    valor_original: 'Júlia (SAC)', decisao: 'P9' },
]
