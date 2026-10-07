import { api, type Esquema } from '@/lib/api'
import { useCarregar } from '@/lib/useCarregar'
import { useCarrinho } from './contexto'

export type ResumoCarrinho = Esquema<'ResumoCarrinho'>

// preços do momento, frete e lojas de retirada para o que está no carrinho (não reserva nada)
export function useResumo() {
  const { itens } = useCarrinho()
  // a chave muda só quando peça ou quantidade mudam, não a cada render
  const chave = itens.map((i) => `${i.id_variante}x${i.quantidade}`).join(',')
  return useCarregar(
    () =>
      itens.length === 0
        ? null
        : api<ResumoCarrinho>('/carrinho', {
            metodo: 'POST',
            autenticado: false,
            corpo: { itens: itens.map(({ id_variante, quantidade }) => ({ id_variante, quantidade })) },
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave resume os itens
    [chave],
  )
}
