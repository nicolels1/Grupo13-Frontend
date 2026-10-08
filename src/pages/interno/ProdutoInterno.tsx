import { Fragment, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ExternalLink, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Cabecalho } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { Button, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { useUnidadeEscolhida } from '@/layouts/unidadeEscolhida'
import { api, type Esquema } from '@/lib/api'
import { corDaPeca, coresDoProduto, ordenarTamanhos } from '@/lib/cores'
import { CANAIS, dataLonga, moeda, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'

type Produto = Esquema<'ProdutoSaida'>
type Canal = Esquema<'EstoqueItem'>['canal']
type DadosProduto = { nome: string; id_categoria: string; descricao_cliente: string; descricao_tecnica: string; ativo: boolean }
// estoque inicial de uma variação nova: onde e quanto, como digitado
type EstoqueInicial = { id_unidade: string; canal: Canal; quantidade: string }
type VarianteNova = { cor: string; tamanho: string; sku: string; preco: string; estoque_inicial: EstoqueInicial[] }
type VarianteEditada = { id_variante: number; sku: string; preco: string; ativo: boolean }
type Imagem = Esquema<'ImagemSaida'>
// foto escolhida no formulário de produto novo: sobe depois que o produto existe
type FotoNova = { chave: string; arquivo: File; previa: string; cor: string }

const DADOS_VAZIOS: DadosProduto = { nome: '', id_categoria: '', descricao_cliente: '', descricao_tecnica: '', ativo: true }
const VARIANTE_VAZIA: VarianteNova = { cor: '', tamanho: '', sku: '', preco: '', estoque_inicial: [] }
// mesmas regras do backend para a foto de produto
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const FOTO_MAXIMA = 5 * 1024 * 1024

// confere a foto antes de enviar; devolve o motivo da recusa ou null
function problemaDaFoto(arquivo: File) {
  if (!TIPOS_FOTO.includes(arquivo.type)) return `${arquivo.name}: envie JPG, PNG ou WEBP.`
  if (arquivo.size > FOTO_MAXIMA) return `${arquivo.name}: passa de 5 MB. Envie uma menor.`
  return null
}

// sobe uma foto do produto; cor vazia = vale para todas as cores
function enviarFotoDoProduto(idProduto: number, arquivo: File, cor: string) {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  if (cor) formulario.append('cor', cor)
  return api<Imagem>(`/produtos/${idProduto}/imagens`, { metodo: 'POST', corpo: formulario })
}

function SecaoTitulo({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
      <h2 className="text-lg font-medium">{children}</h2>
      {extra}
    </div>
  )
}

// a API recebe a variante nova com o estoque inicial já em números
function varianteParaApi(v: VarianteNova) {
  return {
    cor: v.cor.trim() || 'Única',
    tamanho: v.tamanho.trim() || 'U',
    sku: v.sku,
    preco: v.preco,
    estoque_inicial: v.estoque_inicial
      .filter((e) => e.id_unidade && Number(e.quantidade) > 0)
      .map((e) => ({ id_unidade: Number(e.id_unidade), canal: e.canal, quantidade: Number(e.quantidade) })),
  }
}

export function ProdutoInterno() {
  const { idProduto } = useParams()
  const novo = idProduto === 'novo'
  const produto = useCarregar(() => (novo ? null : api<Produto>(`/produtos/${idProduto}`)), [idProduto])

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
  const [variantesNovas, setVariantesNovas] = useState<VarianteNova[]>(produto ? [] : [{ ...VARIANTE_VAZIA }])
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

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvo(false)
    if (!produto) {
      const criado = await enviar(() => api<Produto>('/produtos', {
        metodo: 'POST',
        corpo: {
          ...dados,
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
        subtitulo={produto ? `${plural(produto.variantes.length, 'variação', 'variações')}, ${produto.ativo ? 'à venda' : 'fora de venda'}.` : undefined}
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
                <Button type="button" variant="outline" onClick={() => setVariantesNovas([...variantesNovas, { ...VARIANTE_VAZIA }])}>
                  <Plus aria-hidden="true" /> Mais uma variação
                </Button>
              }
            >
              Variações
            </SecaoTitulo>
            <div className="space-y-4">
              {variantesNovas.map((v, i) => (
                <EditorVariante
                  key={i}
                  indice={i}
                  valor={v}
                  aoMudar={(novo) => setVariantesNovas(variantesNovas.map((x, j) => (j === i ? novo : x)))}
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
          <section className="mt-14">
            <SecaoTitulo extra={<span className="text-sm text-muted-foreground">{plural(produto.imagens?.length ?? 0, 'foto')}</span>}>
              Fotos
            </SecaoTitulo>
            {avisoFotos && <div className="mb-4"><Aviso mensagem={avisoFotos} /></div>}
            <FotosDoProduto produto={produto} aoMudar={recarregar} />
          </section>
          <section className="mt-14">
            <SecaoTitulo>Nova variação</SecaoTitulo>
            <NovaVariante idProduto={produto.id_produto} aoCriar={recarregar} />
          </section>
        </>
      )}
    </>
  )
}

// produto novo: as fotos ficam escolhidas aqui (com prévia e cor) e sobem quando o produto é criado
function FotosNovas({ fotos, aoMudar, cores }: { fotos: FotoNova[]; aoMudar: (fotos: FotoNova[]) => void; cores: string[] }) {
  const seletor = useRef<HTMLInputElement>(null)
  const [recusadas, setRecusadas] = useState<string[]>([])
  // as prévias são links locais do navegador: saem da memória quando a tela fecha
  const previas = useRef<string[]>([])
  useEffect(() => {
    previas.current = fotos.map((f) => f.previa)
  }, [fotos])
  useEffect(() => () => previas.current.forEach((url) => URL.revokeObjectURL(url)), [])

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    setRecusadas(arquivos.map(problemaDaFoto).filter((p): p is string => Boolean(p)))
    const aceitas = arquivos.filter((a) => !problemaDaFoto(a))
    aoMudar([...fotos, ...aceitas.map((arquivo) => ({ chave: crypto.randomUUID(), arquivo, previa: URL.createObjectURL(arquivo), cor: '' }))])
  }

  function tirar(foto: FotoNova) {
    URL.revokeObjectURL(foto.previa)
    aoMudar(fotos.filter((f) => f.chave !== foto.chave))
  }

  return (
    <div className="space-y-4">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotos.map((foto, i) => (
            <li key={foto.chave} className="space-y-2">
              <img src={foto.previa} alt={`Foto ${i + 1} escolhida`} className="aspect-[3/4] w-full object-cover" />
              <div className="flex items-center gap-1">
                <Select aria-label={`Cor da foto ${i + 1}`} value={foto.cor} onChange={(e) => aoMudar(fotos.map((f) => (f.chave === foto.chave ? { ...f, cor: e.target.value } : f)))} className="h-8">
                  <option value="">Todas as cores</option>
                  {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Button type="button" variant="ghost" size="icon" aria-label={`Tirar a foto ${i + 1}`} onClick={() => tirar(foto)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={seletor} type="file" accept={TIPOS_FOTO.join(',')} multiple onChange={escolher} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <Button type="button" variant="outline" onClick={() => seletor.current?.click()}>
        <ImagePlus aria-hidden="true" /> Escolher fotos
      </Button>
      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WEBP de até 5 MB. As fotos aparecem na loja nesta ordem; a cor escolhida faz a foto aparecer só para aquela cor.
      </p>
      {recusadas.length > 0 && <Aviso titulo="Algumas fotos não entraram" mensagem={recusadas.join(' ')} />}
    </div>
  )
}

// produto que já existe: as fotos na ordem da loja, com a cor de cada uma e setas para mudar a ordem.
// A API não apaga foto: para trocar, envie outra e passe a antiga para o fim
function FotosDoProduto({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const fotos = [...(produto.imagens ?? [])].sort((a, b) => a.ordem - b.ordem)
  const cores = coresDoProduto(produto)
  const seletor = useRef<HTMLInputElement>(null)
  const [corNovas, setCorNovas] = useState('')
  const [recusadas, setRecusadas] = useState<string[]>([])
  const [feito, setFeito] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function enviarNovas(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    setFeito(null)
    setRecusadas(arquivos.map(problemaDaFoto).filter((p): p is string => Boolean(p)))
    const aceitas = arquivos.filter((a) => !problemaDaFoto(a))
    if (aceitas.length === 0) return
    const ok = await enviar(async () => {
      for (const arquivo of aceitas) await enviarFotoDoProduto(produto.id_produto, arquivo, corNovas)
      return true
    })
    if (ok) setFeito(`${plural(aceitas.length, 'foto enviada', 'fotos enviadas')}.`)
    aoMudar()
  }

  // troca a foto de lugar com a vizinha (a ordem não precisa ser única no banco)
  async function mover(indice: number, passo: -1 | 1) {
    const foto = fotos[indice]
    const vizinha = fotos[indice + passo]
    if (!foto || !vizinha) return
    setFeito(null)
    const ok = await enviar(async () => {
      await api<Imagem>(`/imagens/${foto.id_imagem}`, { metodo: 'PATCH', corpo: { ordem: vizinha.ordem } })
      return api<Imagem>(`/imagens/${vizinha.id_imagem}`, { metodo: 'PATCH', corpo: { ordem: foto.ordem } })
    })
    if (ok) aoMudar()
  }

  async function mudarCor(foto: Imagem, cor: string) {
    setFeito(null)
    const ok = await enviar(() => api<Imagem>(`/imagens/${foto.id_imagem}`, { metodo: 'PATCH', corpo: { cor: cor || null } }))
    if (ok) aoMudar()
  }

  return (
    <div className="space-y-4">
      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem fotos ainda. Na loja, o produto aparece com o bloco da cor.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotos.map((foto, i) => (
            <li key={foto.id_imagem} className="space-y-2">
              <div className="relative">
                <img src={foto.url} alt={`Foto ${i + 1}${foto.cor ? `, cor ${foto.cor}` : ''}`} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute top-2 left-2 bg-marinho-escuro/80 px-1.5 py-0.5 text-xs text-white">{i + 1}ª</span>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={`Passar a foto ${i + 1} para antes`} disabled={enviando || i === 0} onClick={() => mover(i, -1)}>
                  <ArrowLeft />
                </Button>
                <Select aria-label={`Cor da foto ${i + 1}`} value={foto.cor ?? ''} onChange={(e) => mudarCor(foto, e.target.value)} disabled={enviando} className="h-8">
                  <option value="">Todas as cores</option>
                  {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Button type="button" variant="ghost" size="icon" aria-label={`Passar a foto ${i + 1} para depois`} disabled={enviando || i === fotos.length - 1} onClick={() => mover(i, 1)}>
                  <ArrowRight />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Campo id="fotos-cor" rotulo="Cor das fotos novas" className="w-48">
          <Select id="fotos-cor" value={corNovas} onChange={(e) => setCorNovas(e.target.value)}>
            <option value="">Todas as cores</option>
            {cores.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Campo>
        <input ref={seletor} type="file" accept={TIPOS_FOTO.join(',')} multiple onChange={enviarNovas} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <Button type="button" variant="outline" className="h-9" disabled={enviando} onClick={() => seletor.current?.click()}>
          <ImagePlus aria-hidden="true" /> {enviando ? 'Enviando...' : 'Enviar fotos'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WEBP de até 5 MB. As fotos novas entram no fim. Foto não é apagada: para trocar, envie outra e passe a antiga
        para o fim.
      </p>
      {recusadas.length > 0 && <Aviso titulo="Algumas fotos não entraram" mensagem={recusadas.join(' ')} />}
      {erro && <Aviso mensagem={erro} />}
      {feito && <Sucesso>{feito}</Sucesso>}
    </div>
  )
}

function EditorVariante({ indice, valor, aoMudar, aoTirar }: {
  indice: number | string
  valor: VarianteNova
  aoMudar: (valor: VarianteNova) => void
  aoTirar?: () => void
}) {
  const { unidades } = useUnidadeEscolhida()
  const campo = (nome: 'cor' | 'tamanho' | 'sku' | 'preco') => (e: ChangeEvent<HTMLInputElement>) => aoMudar({ ...valor, [nome]: e.target.value })
  const id = (nome: string) => `var-${indice}-${nome}`

  function mudarEstoque(j: number, nome: keyof EstoqueInicial, novo: string) {
    aoMudar({ ...valor, estoque_inicial: valor.estoque_inicial.map((e, k): EstoqueInicial => (k === j ? { ...e, [nome]: novo } : e)) })
  }

  return (
    <div className="space-y-4 bg-superficie p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_7rem_1fr_9rem_auto] md:items-end">
        <Campo id={id('cor')} rotulo="Cor">
          <Input id={id('cor')} value={valor.cor} onChange={campo('cor')} placeholder="Única" maxLength={50} className="bg-background" />
        </Campo>
        <Campo id={id('tamanho')} rotulo="Tamanho">
          <Input id={id('tamanho')} value={valor.tamanho} onChange={campo('tamanho')} placeholder="U" maxLength={20} className="bg-background" />
        </Campo>
        <Campo id={id('sku')} rotulo="Etiqueta (SKU)">
          <Input id={id('sku')} value={valor.sku} onChange={campo('sku')} maxLength={50} className="bg-background uppercase" required />
        </Campo>
        <Campo id={id('preco')} rotulo="Preço (R$)">
          <Input id={id('preco')} type="number" min={0} step="0.01" value={valor.preco} onChange={campo('preco')} className="bg-background" required />
        </Campo>
        {aoTirar && (
          <Button type="button" variant="ghost" size="icon" aria-label="Tirar variação" onClick={aoTirar} className="mb-0.5">
            <Trash2 />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Estoque inicial <span className="font-normal text-muted-foreground">opcional</span></p>
        {valor.estoque_inicial.map((e, j) => (
          <div key={j} className="flex flex-wrap items-center gap-2">
            <Select aria-label="Unidade" value={e.id_unidade} onChange={(ev) => mudarEstoque(j, 'id_unidade', ev.target.value)} className="w-48 bg-background" required>
              <option value="" disabled>Unidade</option>
              {unidades.filter((u) => u.ativo).map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>)}
            </Select>
            <Select aria-label="Canal" value={e.canal} onChange={(ev) => mudarEstoque(j, 'canal', ev.target.value)} className="w-36 bg-background">
              {Object.entries(CANAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </Select>
            <Input aria-label="Quantidade" type="number" min={1} value={e.quantidade} onChange={(ev) => mudarEstoque(j, 'quantidade', ev.target.value)} className="w-24 bg-background" required />
            <Button type="button" variant="ghost" size="icon" aria-label="Tirar local" onClick={() => aoMudar({ ...valor, estoque_inicial: valor.estoque_inicial.filter((_, k) => k !== j) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="link"
          className="h-auto px-0"
          onClick={() => aoMudar({ ...valor, estoque_inicial: [...valor.estoque_inicial, { id_unidade: '', canal: 'loja_fisica', quantidade: '1' }] })}
        >
          + Adicionar local com peças
        </Button>
      </div>
    </div>
  )
}

function NovaVariante({ idProduto, aoCriar }: { idProduto: number; aoCriar: () => void }) {
  const [valor, setValor] = useState<VarianteNova>({ ...VARIANTE_VAZIA })
  const [criada, setCriada] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function criar(evento: FormEvent) {
    evento.preventDefault()
    setCriada(null)
    const nova = await enviar(() => api<Esquema<'VarianteSaida'>>(`/produtos/${idProduto}/variantes`, { metodo: 'POST', corpo: varianteParaApi(valor) }))
    if (nova) {
      setCriada(`Variação ${nova.sku} criada.`)
      setValor({ ...VARIANTE_VAZIA })
      aoCriar()
    }
  }

  return (
    <form onSubmit={criar} className="space-y-3">
      <EditorVariante indice="nova" valor={valor} aoMudar={setValor} />
      {erro && <Aviso mensagem={erro} />}
      {criada && <Sucesso>{criada}</Sucesso>}
      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>
          <Plus aria-hidden="true" /> Criar variação
        </Button>
      </div>
    </form>
  )
}

function TabelaVariantes({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const [editando, setEditando] = useState<VarianteEditada | null>(null)
  const [historico, setHistorico] = useState<number | null>(null)
  const { enviar, enviando, erro } = useEnviar()
  const ordenadas = [...produto.variantes].sort((a, b) => {
    if (a.cor !== b.cor) return a.cor.localeCompare(b.cor, 'pt-BR')
    const ordem = ordenarTamanhos([a.tamanho, b.tamanho])
    return ordem[0] === a.tamanho ? -1 : 1
  })

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (!editando) return
    const original = produto.variantes.find((v) => v.id_variante === editando.id_variante)
    if (!original) return
    const mudancas: { sku?: string; preco?: string; ativo?: boolean } = {}
    if (editando.sku !== original.sku) mudancas.sku = editando.sku
    if (Number(editando.preco) !== Number(original.preco)) mudancas.preco = editando.preco
    if (editando.ativo !== original.ativo) mudancas.ativo = editando.ativo
    if (Object.keys(mudancas).length > 0) {
      const ok = await enviar(() => api<Esquema<'VarianteSaida'>>(`/variantes/${editando.id_variante}`, { metodo: 'PATCH', corpo: mudancas }))
      if (!ok) return
      aoMudar()
    }
    setEditando(null)
  }

  return (
    <form onSubmit={salvar} className="overflow-x-auto">
      {erro && <div className="mb-3"><Aviso mensagem={erro} /></div>}
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Cor</th>
            <th className="font-medium">Tamanho</th>
            <th className="font-medium">Etiqueta</th>
            <th className="text-right font-medium">Preço</th>
            <th className="pl-6 font-medium">Situação</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((v) => {
            const emEdicao = editando?.id_variante === v.id_variante
            return (
              <Fragment key={v.id_variante}>
                <tr className="border-b">
                  <td className="py-3 pl-2">
                    <span className="flex items-center gap-2">
                      <span className="size-3" style={{ backgroundColor: corDaPeca(v.cor) }} aria-hidden="true" />
                      {v.cor}
                    </span>
                  </td>
                  <td>{v.tamanho}</td>
                  <td>
                    {emEdicao ? (
                      <Input aria-label="Etiqueta" value={editando.sku} onChange={(e) => setEditando({ ...editando, sku: e.target.value })} className="h-8 w-40 uppercase" required />
                    ) : (
                      <Etiqueta>{v.sku}</Etiqueta>
                    )}
                  </td>
                  <td className="text-right">
                    {emEdicao ? (
                      <Input aria-label="Preço" type="number" min={0} step="0.01" value={editando.preco} onChange={(e) => setEditando({ ...editando, preco: e.target.value })} className="ml-auto h-8 w-28 text-right" required />
                    ) : (
                      moeda(v.preco)
                    )}
                  </td>
                  <td className="pl-6">
                    {emEdicao ? (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editando.ativo} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} /> ativa
                      </label>
                    ) : (
                      <span className={cn(!v.ativo && 'text-muted-foreground')}>{v.ativo ? 'ativa' : 'desativada'}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap pr-2 text-right">
                    {emEdicao ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(null)}>Cancelar</Button>
                        <Button type="submit" size="sm" disabled={enviando}>Salvar</Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setHistorico(historico === v.id_variante ? null : v.id_variante)}>
                          Histórico de preço
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando({ id_variante: v.id_variante, sku: v.sku, preco: v.preco, ativo: v.ativo })}>
                          Editar
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
                {historico === v.id_variante && (
                  <tr className="border-b bg-superficie">
                    <td colSpan={6} className="px-4 py-3"><HistoricoPreco idVariante={v.id_variante} /></td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="pt-3 text-xs text-muted-foreground">Cor e tamanho não mudam depois de criados: o estoque e os pedidos ficam presos à variação.</p>
    </form>
  )
}

function HistoricoPreco({ idVariante }: { idVariante: number }) {
  const { dados, erro, carregando } = useCarregar(() => api<Esquema<'Lista_HistoricoPrecoSaida_'>>(`/variantes/${idVariante}/historico-preco`), [idVariante])
  if (carregando) return <Carregando />
  if (erro || !dados) return <Aviso mensagem={erro ?? 'Não foi possível carregar o histórico de preço.'} />
  if (dados.items.length === 0) return <p className="text-sm text-muted-foreground">Sem mudanças de preço.</p>
  return (
    <ul className="space-y-1 text-sm">
      {dados.items.map((h) => (
        <li key={h.id_historico_preco} className="flex gap-6">
          <span className="w-36 text-muted-foreground">{dataLonga(h.alterado_em)}</span>
          <span>{h.preco_anterior === null ? `criada com ${moeda(h.preco_novo)}` : `de ${moeda(h.preco_anterior)} para ${moeda(h.preco_novo)}`}</span>
        </li>
      ))}
    </ul>
  )
}
