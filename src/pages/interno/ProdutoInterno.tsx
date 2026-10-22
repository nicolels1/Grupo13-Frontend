import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ChevronLeft, ExternalLink, Plus } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { cn } from 'cn'

import { marcasVistas, type Marca } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Cabecalho } from '@/components/Navegacao'
import { OrigemMigracao } from '@/components/OrigemMigracao'
import { Button, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { coresDoProduto } from '@/lib/cores'
import { MARCAS, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { EditorVariante, NovaVariante, TabelaVariantes } from './produto/Variantes'
import { novaLinha, varianteParaApi } from './produto/regrasVariante'
import { enviarFotoDoProduto } from './produto/regrasFoto'
import { FotosNovas, FotosDoProduto } from './produto/Fotos'

type Produto = Esquema<'ProdutoSaida'>
type Canal = Esquema<'EstoqueItem'>['canal']
type DadosProduto = { nome: string; id_categoria: string; descricao_cliente: string; descricao_tecnica: string; ativo: boolean }
// estoque inicial de uma variação nova: onde e quanto, como digitado
type EstoqueInicial = { id_unidade: string; canal: Canal; quantidade: string }
type VarianteNova = { cor: string; tamanho: string; sku: string; preco: string; estoque_inicial: EstoqueInicial[] }
// foto escolhida no formulário de produto novo: sobe depois que o produto existe
type FotoNova = { chave: string; arquivo: File; previa: string; cor: string }

const DADOS_VAZIOS: DadosProduto = { nome: '', id_categoria: '', descricao_cliente: '', descricao_tecnica: '', ativo: true }

function SecaoTitulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
      <h2 className="text-lg font-medium">{children}</h2>
      {extra}
    </div>
  )
}

export function ProdutoInterno() {
  const { idProduto } = useParams()
  const novo = idProduto === 'novo'
  const produto = useCarregar(() => (novo ? null : api<Produto>(`/produtos/${idProduto}`)), [novo, idProduto])

  if (!novo && produto.carregando && !produto.dados) return <Carregando />
  if (produto.erro) return <Aviso mensagem={produto.erro} />
  return <FormularioProduto key={idProduto} produto={novo ? null : produto.dados} recarregar={produto.recarregar} />
}

function FormularioProduto({ produto, recarregar }: { produto: Produto | null; recarregar: () => void }) {
  const navegar = useNavigate()
  const categorias = useCarregar(() => api<Esquema<'Lista_CategoriaSaida_'>>('/categorias'), [])
  const inicial: DadosProduto = produto
    ? {
        nome: produto.nome,
        id_categoria: String(produto.id_categoria),
        descricao_cliente: produto.descricao_cliente,
        descricao_tecnica: produto.descricao_tecnica ?? '',
        ativo: produto.ativo,
      }
    : DADOS_VAZIOS
  const [dados, setDados] = useState(inicial)
  // marca do produto novo: só as que a pessoa vê (o backend recusa a outra); depois, só pela correção de marca
  const vistas = [...marcasVistas(useAuth().perfil)]
  const [marca, setMarca] = useState<Marca>(vistas[0] ?? 'lorenzi')
  const [variantesNovas, setVariantesNovas] = useState<(VarianteNova & { chave: string })[]>(produto ? [] : [novaLinha()])
  const [salvo, setSalvo] = useState(false)
  // "Salvar produto" sem nada mudado avisa em vez de não fazer nada (fotos e variações salvam na hora)
  const [nadaMudou, setNadaMudou] = useState(false)
  const [fotosNovas, setFotosNovas] = useState<FotoNova[]>([])
  const avisoFotos = (useLocation().state as { avisoFotos?: string } | null)?.avisoFotos
  const { enviar, enviando, erro } = useEnviar()
  const mudar = (campo: keyof DadosProduto) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSalvo(false)
    setNadaMudou(false)
    const alvo = e.target
    setDados({ ...dados, [campo]: alvo instanceof HTMLInputElement && alvo.type === 'checkbox' ? alvo.checked : alvo.value })
  }

  // o estoque inicial já escolhido numa unidade da outra marca volta para "Unidade"
  function mudarMarca(nova: Marca) {
    setMarca(nova)
    setVariantesNovas(variantesNovas.map((v) => ({ ...v, estoque_inicial: v.estoque_inicial.map((e) => ({ ...e, id_unidade: '' })) })))
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(false)
    if (!produto) {
      const criado = await enviar(() => api<Produto>('/produtos', {
        metodo: 'POST',
        corpo: {
          ...dados,
          marca,
          id_categoria: Number(dados.id_categoria),
          variantes: variantesNovas.filter((v) => v.sku.trim()).map(varianteParaApi),
        },
      }))
      if (criado) {
        let falharam = 0
        for (const foto of fotosNovas) {
          try {
            await enviarFotoDoProduto(criado.id_produto, foto.arquivo, foto.cor)
          } catch {
            falharam += 1
          }
        }
        const aviso = falharam
          ? `Produto criado, mas ${plural(falharam, 'foto não foi enviada', 'fotos não foram enviadas')}. Envie de novo na seção Fotos.`
          : undefined
        navegar(`/interno/catalogo/${criado.id_produto}`, { replace: true, state: aviso ? { avisoFotos: aviso } : null })
      }
      return
    }
    // só manda o que mudou
    const mudancas = Object.fromEntries(
      Object.entries(dados).filter(([campo, valor]) => valor !== inicial[campo as keyof DadosProduto]).map(([campo, valor]) => [campo, campo === 'id_categoria' ? Number(valor) : valor]),
    )
    if (Object.keys(mudancas).length === 0) {
      setNadaMudou(true)
      return
    }
    setNadaMudou(false)
    const ok = await enviar(() => api<Produto>(`/produtos/${produto.id_produto}`, { metodo: 'PATCH', corpo: mudancas }))
    if (ok) {
      setSalvo(true)
      recarregar()
    }
  }

  const ativas = (categorias.dados?.items ?? []).filter((c) => c.ativo || String(c.id_categoria) === dados.id_categoria)
  const cores = coresDoProduto(produto)
  const tamanhos = new Set(produto?.variantes.map((v) => v.tamanho))

  return (
    <>
      <Link to="/interno/catalogo" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Produtos
      </Link>
      <Cabecalho
        titulo={produto ? produto.nome : 'Novo produto'}
        subtitulo={produto ? `${MARCAS[produto.marca] ?? produto.marca}: ${plural(produto.variantes.length, 'variação', 'variações')}, ${produto.ativo ? 'à venda' : 'fora de venda'}.` : undefined}
      >
        {produto?.ativo && (
          <Link to={`/loja/produtos/${produto.id_produto}`} target="_blank" className={cn(buttonVariants({ variant: 'aco', size: 'lg' }), 'h-11 px-4')}>
            Ver na loja online <ExternalLink aria-hidden="true" />
          </Link>
        )}
      </Cabecalho>

      <form onSubmit={salvar} className="space-y-12">
        <section>
          <SecaoTitulo>Dados do produto</SecaoTitulo>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="prod-nome" rotulo="Nome">
              <Input id="prod-nome" value={dados.nome} onChange={mudar('nome')} minLength={2} maxLength={150} required />
            </Campo>
            <Campo id="prod-categoria" rotulo="Categoria">
              <Select id="prod-categoria" value={dados.id_categoria} onChange={mudar('id_categoria')} required>
                <option value="" disabled>Escolha</option>
                {ativas.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
              </Select>
            </Campo>
            {!produto && vistas.length > 1 && (
              <Campo id="prod-marca" rotulo="Marca">
                <Select id="prod-marca" value={marca} onChange={(e) => mudarMarca(e.target.value as Marca)}>
                  {vistas.map((m) => <option key={m} value={m}>{MARCAS[m]}</option>)}
                </Select>
              </Campo>
            )}
            <Campo id="prod-desc-cliente" rotulo="Descrição no site" className="md:col-span-2">
              <Textarea id="prod-desc-cliente" rows={3} value={dados.descricao_cliente} onChange={mudar('descricao_cliente')} required />
            </Campo>
            <Campo id="prod-desc-tecnica" rotulo="Descrição técnica" dica="Composição, gramatura, modelagem. Só a equipe vê." className="md:col-span-2">
              <Textarea id="prod-desc-tecnica" rows={3} value={dados.descricao_tecnica} onChange={mudar('descricao_tecnica')} required />
            </Campo>
            {produto && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dados.ativo} onChange={mudar('ativo')} /> Produto à venda
              </label>
            )}
          </div>
        </section>

        {!produto && (
          <section>
            <SecaoTitulo
              extra={
                <Button type="button" variant="outline" onClick={() => setVariantesNovas([...variantesNovas, novaLinha()])}>
                  <Plus aria-hidden="true" /> Mais uma variação
                </Button>
              }
            >
              Variações
            </SecaoTitulo>
            <div className="space-y-4">
              {variantesNovas.map((v, i) => (
                <EditorVariante
                  key={v.chave}
                  indice={i}
                  valor={v}
                  marca={marca}
                  aoMudar={(novo) => setVariantesNovas(variantesNovas.map((x, j) => (j === i ? { ...novo, chave: x.chave } : x)))}
                  aoTirar={variantesNovas.length > 1 ? () => setVariantesNovas(variantesNovas.filter((_, j) => j !== i)) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {!produto && (
          <section>
            <SecaoTitulo>Fotos</SecaoTitulo>
            <FotosNovas
              fotos={fotosNovas}
              aoMudar={setFotosNovas}
              cores={[...new Set(variantesNovas.filter((v) => v.sku.trim()).map((v) => v.cor.trim() || 'Única'))]}
            />
          </section>
        )}

        {erro && <Aviso mensagem={erro} />}
        {salvo && <Sucesso>Dados do produto salvos.</Sucesso>}
        {nadaMudou && (
          <p role="status" className="text-sm text-muted-foreground">
            Nada para salvar: nome, categoria, descrições e "à venda" não mudaram. Fotos e variações são salvas na hora, nas
            próprias seções.
          </p>
        )}
        <div className="flex justify-end gap-2">
          {produto && (
            <Button type="button" variant="outline" size="lg" className="h-11 px-5" onClick={() => setDados(inicial)} disabled={enviando}>
              Descartar
            </Button>
          )}
          <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>
            {enviando ? 'Salvando...' : produto ? 'Salvar produto' : fotosNovas.length ? 'Criar produto e enviar as fotos' : 'Criar produto'}
          </Button>
        </div>
      </form>

      {produto && (
        <>
          <section className="mt-14">
            <SecaoTitulo extra={<span className="text-sm text-muted-foreground">{plural(cores.length, 'cor', 'cores')}, {plural(tamanhos.size, 'tamanho')}</span>}>
              Variações
            </SecaoTitulo>
            <TabelaVariantes produto={produto} aoMudar={recarregar} />
          </section>
          {produto.marca === 'vulto' && (
            <section className="mt-14">
              <SecaoTitulo>Origem na Vulto</SecaoTitulo>
              <OrigemMigracao tabela="produto" idRegistro={produto.id_produto} />
            </section>
          )}
          <section className="mt-14">
            <SecaoTitulo extra={<span className="text-sm text-muted-foreground">{plural(produto.imagens?.length ?? 0, 'foto')}</span>}>
              Fotos
            </SecaoTitulo>
            {avisoFotos && <div className="mb-4"><Aviso mensagem={avisoFotos} /></div>}
            <FotosDoProduto produto={produto} aoMudar={recarregar} />
          </section>
          <section className="mt-14">
            <SecaoTitulo>Nova variação</SecaoTitulo>
            <NovaVariante idProduto={produto.id_produto} marca={produto.marca} aoCriar={recarregar} />
          </section>
        </>
      )}
    </>
  )
}
