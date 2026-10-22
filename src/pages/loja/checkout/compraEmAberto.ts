// compra aguardando pagamento desta aba: o checkout retoma em vez de reservar as peças de novo
// (ao recarregar a página ou ao vir de "Continuar pagamento" em Meus pedidos). Chave própria: o valor
// guardado antes da compra (ADR 0017 do backend) era o número de um pedido, não de uma compra
export const CHAVE_COMPRA_EM_ABERTO = 'casa-lorenzi:compra-em-aberto'

export function lerCompraEmAberto(): number | null {
  try {
    const id = Number(sessionStorage.getItem(CHAVE_COMPRA_EM_ABERTO))
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function guardarCompraEmAberto(id: number | null) {
  try {
    if (id) sessionStorage.setItem(CHAVE_COMPRA_EM_ABERTO, String(id))
    else sessionStorage.removeItem(CHAVE_COMPRA_EM_ABERTO)
  } catch {
    // sem armazenamento: recarregar a página só perde a retomada
  }
}
