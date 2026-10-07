// o banco guarda "U" para peça de tamanho único (glossário); para o cliente a loja mostra "Único"
export function rotuloTamanho(tamanho: string) {
  return tamanho === 'U' ? 'Único' : tamanho
}
