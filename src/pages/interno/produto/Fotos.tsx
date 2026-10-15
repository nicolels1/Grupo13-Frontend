import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react'

import { Aviso, Sucesso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Campo, Select } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { coresDoProduto } from '@/lib/cores'
import { plural } from '@/lib/formato'
import { useEnviar } from '@/lib/useCarregar'
import { enviarFotoDoProduto, problemaDaFoto, TIPOS_FOTO } from './regrasFoto'

type Produto = Esquema<'ProdutoSaida'>
type Imagem = Esquema<'ImagemSaida'>
// foto escolhida no formulário de produto novo: sobe depois que o produto existe
type FotoNova = { chave: string; arquivo: File; previa: string; cor: string }

// fotos do produto: as escolhidas antes de criar e as que já estão no produto

// produto novo: as fotos ficam escolhidas aqui (com prévia e cor) e sobem quando o produto é criado
export function FotosNovas({ fotos, aoMudar, cores }: { fotos: FotoNova[]; aoMudar: (fotos: FotoNova[]) => void; cores: string[] }) {
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

// produto que já existe: as fotos na ordem da loja, com a cor de cada uma, setas para mudar a ordem
// e a lixeira (pede confirmação na própria foto antes de apagar)
export function FotosDoProduto({ produto, aoMudar }: { produto: Produto; aoMudar: () => void }) {
  const fotos = [...(produto.imagens ?? [])].sort((a, b) => a.ordem - b.ordem)
  const cores = coresDoProduto(produto)
  const seletor = useRef<HTMLInputElement>(null)
  const [corNovas, setCorNovas] = useState('')
  const [recusadas, setRecusadas] = useState<string[]>([])
  const [feito, setFeito] = useState<string | null>(null)
  const [aApagar, setAApagar] = useState<number | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  async function apagar(foto: Imagem) {
    setFeito(null)
    const ok = await enviar(() => api<null>(`/imagens/${foto.id_imagem}`, { metodo: 'DELETE' }).then(() => true))
    setAApagar(null)
    if (ok) {
      setFeito('Foto apagada.')
      aoMudar()
    }
  }

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
                {aApagar === foto.id_imagem ? (
                  <div className="absolute inset-x-0 bottom-0 space-y-2 bg-marinho-escuro/85 p-3 text-white">
                    <p className="text-sm">Apagar esta foto? Não dá para desfazer.</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="bg-ferrugem text-white hover:bg-ferrugem/90" disabled={enviando} onClick={() => apagar(foto)}>
                        {enviando ? 'Apagando...' : 'Apagar'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" disabled={enviando} onClick={() => setAApagar(null)}>
                        Manter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    aria-label={`Apagar a foto ${i + 1}`}
                    disabled={enviando}
                    onClick={() => setAApagar(foto.id_imagem)}
                    className="absolute top-2 right-2 size-8 bg-marinho-escuro/80 text-white hover:bg-ferrugem"
                  >
                    <Trash2 />
                  </Button>
                )}
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
        JPG, PNG ou WEBP de até 5 MB. As fotos novas entram no fim. Para trocar uma foto, envie a nova, coloque no lugar com as
        setas e apague a antiga.
      </p>
      {recusadas.length > 0 && <Aviso titulo="Algumas fotos não entraram" mensagem={recusadas.join(' ')} />}
      {erro && <Aviso mensagem={erro} />}
      {feito && <Sucesso>{feito}</Sucesso>}
    </div>
  )
}
