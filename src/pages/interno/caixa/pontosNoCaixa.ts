// pontos como desconto na venda da loja: o cliente do CPF paga o total das peças menos o desconto dos pontos,
// e a soma dos pagamentos precisa fechar com isso (o backend confere a mesma conta)

export type PontosNoCaixa = { cpf: string; pontos: number; desconto: string; saldo: number }

// o desconto vale para o CPF em que foi calculado: trocar o CPF tira os pontos da venda
export function pontosDoCpf(aplicados: PontosNoCaixa | null, cpf: string) {
  return aplicados && aplicados.cpf === cpf ? aplicados : null
}

// em centavos, para não perder nenhum na subtração
export function valorAPagar(total: string | number | null | undefined, desconto: string | null | undefined) {
  if (total === null || total === undefined || total === '') return null
  const centavos = Math.round(Number(total) * 100) - Math.round(Number(desconto ?? 0) * 100)
  return (centavos / 100).toFixed(2)
}

// a peça não sai de graça: o desconto precisa ficar menor que o total das peças
export function descontoCabe(desconto: string, total: string | number | null | undefined) {
  return total !== null && total !== undefined && total !== '' && Number(desconto) < Number(total)
}
