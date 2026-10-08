import { soDigitos } from '@/lib/formato'

// endereço pelo CEP no ViaCEP (serviço público e gratuito, chamado direto do navegador).
// Não passa pela api(): não é o nosso backend. Falhou ou não achou: a pessoa preenche à mão
export type EnderecoDoCep = { rua: string; bairro: string; cidade: string; uf: string }

// 01310100 → 01310-100, enquanto a pessoa digita
export function mascaraCep(texto: string) {
  const digitos = soDigitos(texto).slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}

export async function buscarCep(cep: string): Promise<EnderecoDoCep | null> {
  const digitos = soDigitos(cep)
  if (digitos.length !== 8) return null
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!resposta.ok) return null
    const dados = (await resposta.json()) as {
      erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string
    }
    if (dados.erro) return null
    return { rua: dados.logradouro ?? '', bairro: dados.bairro ?? '', cidade: dados.localidade ?? '', uf: dados.uf ?? '' }
  } catch {
    return null
  }
}
