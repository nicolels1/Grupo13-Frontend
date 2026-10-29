import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Aviso, Carregando } from '@/components/Estados'
import { buttonVariants } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { useCarrinho } from './carrinho/contexto'
import { variantePronta } from './carrinho/pecaDoLink'

type Produto = Esquema<'ProdutoSaida'>
type Peca = { idProduto: number; idVariante: number }
type Resultado = { estado: 'carregando' } | { estado: 'nenhuma' } | { estado: 'algumas'; fora: string[] }

function lerId(valor: string | null) {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0 ? numero : null
}

// um par produto + variante por peça, na ordem do link; par faltando ou id inválido quebra o link inteiro
function lerPecas(parametros: URLSearchParams): Peca[] {
  const produtos = parametros.getAll('produto').map(lerId)
  const variantes = parametros.getAll('variante').map(lerId)
  if (produtos.length !== variantes.length) return []
  const pecas = produtos.map((idProduto, i) => ({ idProduto, idVariante: variantes[i] }))
  return pecas.every((p) => p.idProduto && p.idVariante) ? (pecas as Peca[]) : []
}

function nomeDaPeca(produto: Produto | undefined, idVariante: number) {
  const variante = produto?.variantes.find((v) => v.id_variante === idVariante)
  return produto && variante ? `${produto.nome} (${variante.cor}, ${variante.tamanho})` : 'Uma peça do link'
}

// link que o atendimento por mensagem manda (/loja/carrinho/adicionar?produto=5&variante=50&produto=7&variante=71):
// põe no carrinho as peças que o cliente escolheu na conversa e abre o carrinho, sem a pessoa procurar cada peça de
// novo. Entre o link e o clique uma peça pode ter esgotado: as outras entram e a tela diz qual ficou de fora
export function AdicionarAoCarrinho() {
  const [parametros] = useSearchParams()
  const [pecas] = useState(() => lerPecas(parametros))
  const carrinho = useCarrinho()
  const navegar = useNavigate()
  const [resultado, setResultado] = useState<Resultado>(
    pecas.length ? { estado: 'carregando' } : { estado: 'nenhuma' },
  )
  // o efeito roda duas vezes no modo de desenvolvimento do React: as peças entram uma vez só
  const jaAdicionou = useRef(false)

  useEffect(() => {
    if (!pecas.length || jaAdicionou.current) return
    jaAdicionou.current = true
    const ids = [...new Set(pecas.map((p) => p.idProduto))]
    // produto que não abriu conta como esgotado: as peças dele ficam de fora
    Promise.all(ids.map((id) => api<Produto>(`/produtos/${id}`).catch(() => undefined))).then((lidos) => {
      const produtos = new Map(ids.map((id, i) => [id, lidos[i]]))
      const prontas = pecas.filter((p) => {
        const produto = produtos.get(p.idProduto)
        return produto && variantePronta(produto, p.idVariante)
      })
      const fora = pecas.filter((p) => !prontas.includes(p))
      for (const p of prontas) carrinho.adicionar({ id_variante: p.idVariante, id_produto: p.idProduto })
      // a tela do carrinho já mostra as peças: a gaveta, que é a confirmação de "adicionado", fica fechada
      carrinho.fecharGaveta()
      if (!prontas.length) setResultado({ estado: 'nenhuma' })
      else if (fora.length) {
        setResultado({ estado: 'algumas', fora: fora.map((p) => nomeDaPeca(produtos.get(p.idProduto), p.idVariante)) })
      } else navegar('/loja/carrinho', { replace: true })
    })
  }, [pecas, carrinho, navegar])

  if (resultado.estado === 'carregando') return <Carregando />
  if (resultado.estado === 'algumas') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16">
        <Aviso
          titulo="Algumas peças ficaram de fora"
          mensagem={`As outras peças já estão no carrinho. Não está mais disponível para o site: ${resultado.fora.join(', ')}.`}
        />
        <Link to="/loja/carrinho" className={buttonVariants()}>
          Ir para o carrinho
        </Link>
      </div>
    )
  }
  const umProduto = pecas.length === 1 ? (pecas[0]?.idProduto ?? null) : null
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16">
      <Aviso
        titulo={pecas.length > 1 ? 'Peças indisponíveis' : 'Peça indisponível'}
        mensagem={
          pecas.length > 1
            ? 'Estas peças não estão mais disponíveis para o site nessa cor e tamanho. Veja as outras opções.'
            : 'Esta peça não está mais disponível para o site nessa cor e tamanho. Veja as outras opções.'
        }
      />
      <Link
        to={umProduto ? `/loja/produtos/${umProduto}` : '/loja/produtos'}
        className={buttonVariants({ variant: 'outline' })}
      >
        {umProduto ? 'Ver o produto' : 'Ver produtos'}
      </Link>
    </div>
  )
}
