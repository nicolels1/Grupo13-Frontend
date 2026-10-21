import type { Esquema } from '@/lib/api'
import type { Loja } from '@/lib/lojaEscolhida'

type Passivo = Esquema<'PassivoSaida'>

// o que cada marca deve em pontos (GET /fidelidade/passivo): os pontos em aberto dos clientes, em reais
// pelo valor do ponto na época em que foi ganho (K3: R$ 0,10 até fev/2025 na Vulto, R$ 0,05 depois)

const LOJAS: Loja[] = ['lorenzi', 'vulto']

// as duas marcas na ordem das lojas, mesmo a que ainda não deve ponto nenhum (null)
export function passivoPorLoja(passivo: Passivo[]): { loja: Loja; passivo: Passivo | null }[] {
  return LOJAS.map((loja) => ({ loja, passivo: passivo.find((p) => p.marca === loja) ?? null }))
}

// a quebra pelo valor do ponto, do mais caro para o mais barato, sem as faixas zeradas
export function faixasDoPassivo(passivo: Passivo) {
  return [...passivo.por_valor].filter((f) => f.pontos > 0).sort((a, b) => Number(b.valor_ponto) - Number(a.valor_ponto))
}
