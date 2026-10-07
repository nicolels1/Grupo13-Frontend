import type { Esquema } from '@/lib/api'

type Imagem = Esquema<'ImagemSaida'>

// fotos de uma cor, na ordem de exibição; foto sem cor vale para todas as cores
export function fotosDaCor(imagens: Imagem[], cor: string | null) {
  return imagens
    .filter((imagem) => imagem.cor === null || imagem.cor === cor)
    .sort((a, b) => a.ordem - b.ordem)
}
