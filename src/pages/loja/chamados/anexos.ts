// regra do backend (arquivos.ANEXO_CHAMADO): conferida antes de enviar para avisar na hora
export const TIPOS_DO_ANEXO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const TAMANHO_DO_ANEXO = 10 * 1024 * 1024

export function ehImagem(nome: string | null | undefined) {
  return /\.(jpe?g|png|webp)$/i.test(nome ?? '')
}

// devolve o motivo de recusa do arquivo, ou null se ele pode ser enviado
export function problemaDoArquivo(arquivo: File) {
  if (!TIPOS_DO_ANEXO.includes(arquivo.type)) return `${arquivo.name} não serve: envie JPG, PNG, WEBP ou PDF.`
  if (arquivo.size > TAMANHO_DO_ANEXO) return `${arquivo.name} passa de 10 MB.`
  return null
}
