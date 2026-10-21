// os 3 números da Entrega 3 como a migração calculou (migracao_vulto/numeros.md, no backend, gerado pelo
// numeros.py a partir dos dados da Vulto) e o que o sistema da Vulto dizia. A aba "Os 3 números da Vulto"
// mostra estes números ao lado do que a plataforma soma depois da carga: os dois têm que bater (Etapa 9).
// Se o numeros.md mudar, estes valores mudam junto

export const DATA_BASE = '2026-10-01'
// o período do faturamento
export const INICIO_FATURAMENTO = '2025-01-01'
// fim de 30/09: a posição em 01/10/2026, no horário de Brasília
export const FIM_DE_30_09 = '2026-09-30'

export type Passo = { decisao: string | null; texto: string; valor: number }

export const FATURAMENTO = {
  periodo: 'jan/2025 a set/2026',
  nosso: 6438443.35,
  frete: 55248.7,
  porLoja: [
    // chave: o nome da unidade na loja física; no online, o canal da venda (site e app saem do CD Cajamar)
    { chave: 'Vulto Pinheiros', nome: 'Vulto Pinheiros', canal: 'Loja física', valor: 1200055.12 },
    { chave: 'Vulto Shopping Eldorado', nome: 'Vulto Shopping Eldorado', canal: 'Loja física', valor: 1091226.9 },
    { chave: 'Vulto Savassi', nome: 'Vulto Savassi', canal: 'Loja física', valor: 840306.71 },
    { chave: 'Vulto Batel', nome: 'Vulto Batel', canal: 'Loja física', valor: 759693.78 },
    { chave: 'site', nome: 'Site (CD Cajamar)', canal: 'Online', valor: 1557280.78 },
    { chave: 'app', nome: 'App (CD Cajamar)', canal: 'Online', valor: 989880.06 },
  ],
  // do relatório do sistema da Vulto (/relatorio/faturamento) ao nosso número, cada passo com a decisão
  ponte: [
    { decisao: null, texto: 'Relatório do sistema da Vulto', valor: 94580496.26 },
    { decisao: 'V1', texto: 'Pedidos do app gravados em centavos (desde ago/2025)', valor: -87510767.85 },
    { decisao: 'V19', texto: 'Vendas canceladas, que o relatório soma', valor: -221016.61 },
    { decisao: 'V3', texto: 'Pedidos aguardando pagamento que nunca foram pagos', valor: -109445.94 },
    { decisao: 'V8', texto: 'Vendas de teste (inclui um pedido de R$ 99.999,00)', valor: -104134.01 },
    { decisao: 'V6', texto: 'Trocas lançadas como venda nova', valor: -74447.2 },
    { decisao: 'V7', texto: 'Frete, que fica à parte', valor: -55248.7 },
    { decisao: 'V4', texto: 'Estornos e chargebacks', valor: -55247.6 },
    { decisao: 'V5', texto: 'Pedidos gravados duas vezes pelo app', valor: -29084.27 },
    { decisao: 'V9', texto: 'Batel: planilha manual no lugar dos relançamentos', valor: 16809.57 },
    { decisao: 'V16', texto: 'Vendas de 30/09 à noite, que o relatório põe em outubro', valor: 529.7 },
  ] satisfies Passo[],
  margem: [
    { decisao: 'V3', texto: '11 pedidos aguardando cujo cliente diz no atendimento que pagou', valor: 'R$ 2.942,53' },
    { decisao: 'V6', texto: 'Trocas que podem ter tido diferença de preço', valor: 'menos de R$ 1 mil' },
    { decisao: 'V7', texto: 'O frete fica fora; se for receita, soma-se a ele', valor: 'R$ 55.248,70' },
  ],
}

export const ESTOQUE = {
  nosso: 15233,
  emTransito: 33,
  porUnidade: [
    { nome: 'CD Cajamar', pecas: 6552, base: 'WMS de 28/09 (E1, E8), menos as saídas de 29 e 30/09' },
    { nome: 'Vulto Pinheiros', pecas: 2387, base: 'contagem de 20/09; 87 no online, pelo ship from store (E7)' },
    { nome: 'Vulto Shopping Eldorado', pecas: 2282, base: 'contagem sem data, considerada de 20/09 (E5)' },
    { nome: 'Vulto Savassi', pecas: 2119, base: 'contagem por modelo, distribuída pelas variantes (E6)' },
    { nome: 'Vulto Batel', pecas: 1860, base: 'contagem sem data, considerada de 20/09 (E5)' },
  ],
  sistemaDaVulto: 'O sistema da Vulto dizia 28.136 peças só no CD (o WMS tem 6.601) e tinha 1.156 saldos negativos. Ele não entra: as lojas valem pela contagem, o CD pelo WMS (E1), e o estoque espelhado do site e do app não é estoque (E3).',
  margem: [
    { decisao: 'E11', texto: 'Batel: 82 linhas da contagem marcadas "faltou contar provador" ou "recontar"', valor: '222 peças' },
    { decisao: 'E12', texto: 'Eldorado: 29 SKUs com saldo no sistema que não aparecem na contagem', valor: '53 peças' },
    { decisao: 'E5', texto: 'Data da contagem (Eldorado, Batel, Savassi)', valor: '−39 a +53 peças' },
    { decisao: null, texto: 'Peças vendidas depois da contagem que a contagem não viu', valor: '25 peças' },
  ],
}

export const PASSIVO = {
  nosso: { pontos: 9436136, reais: 652718.1, clientes: 2710 },
  // o sistema da Vulto vale todo ponto a R$ 0,10 (K3)
  sistemaDaVulto: 943613.6,
  porValor: [
    { texto: 'Ganhos até fev/2025', pontos: 3618226, valorPonto: 0.1, reais: 361822.6 },
    { texto: 'Ganhos desde mar/2025', pontos: 5817910, valorPonto: 0.05, reais: 290895.5 },
  ],
  margem: [
    { decisao: 'K2', texto: 'Pontos sem dono que podem ser dívida', valor: '+165 pts (+R$ 16,50)' },
    { decisao: 'K7a', texto: 'Resgates da planilha sem cliente identificado', valor: '−1.500 pts (−R$ 75,00)' },
    { decisao: 'K5b', texto: 'Saldos abreviados ("2,7k") da planilha', valor: '±4.800 pts (±R$ 480,00)' },
  ],
}
