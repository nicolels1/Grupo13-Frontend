import { api, type Esquema } from '@/lib/api'

type Imagem = Esquema<'ImagemSaida'>

// regras das fotos do produto: tipo, tamanho e o envio de cada arquivo

// mesmas regras do backend para a foto de produto
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const FOTO_MAXIMA = 5 * 1024 * 1024

// confere a foto antes de enviar; devolve o motivo da recusa ou null
export function problemaDaFoto(arquivo: File) {
  if (!TIPOS_FOTO.includes(arquivo.type)) return `${arquivo.name}: envie JPG, PNG ou WEBP.`
  if (arquivo.size > FOTO_MAXIMA) return `${arquivo.name}: passa de 5 MB. Envie uma menor.`
  return null
}

// sobe uma foto do produto; cor vazia = vale para todas as cores
export function enviarFotoDoProduto(idProduto: number, arquivo: File, cor: string) {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  if (cor) formulario.append('cor', cor)
  return api<Imagem>(`/produtos/${idProduto}/imagens`, { metodo: 'POST', corpo: formulario })
}
