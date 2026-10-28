import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { useCarrinho } from './carrinho/contexto'
import { variantePronta } from './carrinho/pecaDoLink'

type Produto = Esquema<'ProdutoSaida'>

function lerId(valor: string | null) {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

// link que o atendimento por mensagem manda (/loja/carrinho/adicionar?produto=5&variante=50): põe a peça
// no carrinho e abre o carrinho, sem a pessoa procurar a peça de novo. Entre o link e o clique a peça pode
// ter esgotado: aí mostra o aviso e o caminho para o produto
export function AdicionarAoCarrinho() {
  const [parametros] = useSearchParams()
  const idProduto = lerId(parametros.get('produto'))
  const idVariante = lerId(parametros.get('variante'))
  const carrinho = useCarrinho()
  const navegar = useNavigate()
  const [indisponivel, setIndisponivel] = useState(!idProduto || !idVariante)
  // o efeito roda duas vezes no modo de desenvolvimento do React: a peça entra uma vez só
  const jaAdicionou = useRef(false)

  useEffect(() => {
    if (!idProduto || !idVariante || jaAdicionou.current) return
    jaAdicionou.current = true
    api<Produto>(`/produtos/${idProduto}`)
      .then((produto) => {
        if (!variantePronta(produto, idVariante)) {
          setIndisponivel(true)
          return
        }
        carrinho.adicionar({ id_variante: idVariante, id_produto: idProduto })
        // a tela do carrinho já mostra a peça: a gaveta, que é a confirmação de "adicionado", fica fechada
        carrinho.fecharGaveta()
        navegar('/loja/carrinho', { replace: true })
      })
      .catch(() => setIndisponivel(true))
  }, [idProduto, idVariante, carrinho, navegar])

  if (!indisponivel) return <Carregando />
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16">
      <Aviso
        titulo="Peça indisponível"
        mensagem="Esta peça não está mais disponível para o site nessa cor e tamanho. Veja as outras opções."
      />
      <Link
        to={idProduto ? `/loja/produtos/${idProduto}` : '/loja/produtos'}
        className={buttonVariants({ variant: 'outline' })}
      >
        {idProduto ? 'Ver o produto' : 'Ver produtos'}
      </Link>
    </div>
  )
}
