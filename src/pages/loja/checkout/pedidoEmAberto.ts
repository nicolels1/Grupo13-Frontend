// pedido aguardando pagamento desta aba: o checkout retoma em vez de reservar as peças de novo
// (ao recarregar a página ou ao vir de "Continuar pagamento" em Meus pedidos)
export const CHAVE_PEDIDO_EM_ABERTO = 'casa-lorenzi:pedido-em-aberto'

export function lerPedidoEmAberto() {
  try {
    return Number(sessionStorage.getItem(CHAVE_PEDIDO_EM_ABERTO)) || null
  } catch {
    return null
  }
}

export function guardarPedidoEmAberto(id: number | null) {
  try {
    if (id) sessionStorage.setItem(CHAVE_PEDIDO_EM_ABERTO, String(id))
    else sessionStorage.removeItem(CHAVE_PEDIDO_EM_ABERTO)
  } catch {
    // sem armazenamento: recarregar a página só perde a retomada
  }
}
