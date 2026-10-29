import { useState } from 'react'

import { api, type Esquema } from '@/lib/api'
import { useCarregar } from '@/lib/useCarregar'

// e-mail antes de os pontos vencerem (2 semanas antes, um por lote): o cliente liga e desliga em Meus pontos e
// em Seus dados, na visão geral. O mesmo aceite vale para o cadastro, o assistente e o link "parar de receber"
export function useLembreteDePontos() {
  const lembrete = useCarregar(() => api<Esquema<'LembretePontos'>>('/fidelidade/meus-pontos/lembrete'), [])
  const [salvando, setSalvando] = useState(false)
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null)

  async function mudar(aceita: boolean) {
    setErroAoSalvar(null)
    setSalvando(true)
    try {
      await api('/fidelidade/meus-pontos/lembrete', { metodo: 'PUT', corpo: { aceita } })
      lembrete.recarregar()
    } catch (falha) {
      setErroAoSalvar(falha instanceof Error ? falha.message : 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return {
    aceita: lembrete.dados?.aceita,
    ocupado: salvando || lembrete.carregando,
    erro: lembrete.erro ?? erroAoSalvar,
    mudar,
  }
}
