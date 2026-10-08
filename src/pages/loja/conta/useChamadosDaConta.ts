import { useLocation } from 'react-router'

import { useAuth } from '@/auth/contexto'
import { api, type Esquema } from '@/lib/api'
import { useCarregar } from '@/lib/useCarregar'

// chamados do cliente: respostas da equipe ainda não lidas (somadas) e quantos seguem abertos.
// Confere de novo a cada troca de página, para o aviso sumir depois de ler a conversa
export function useChamadosDaConta() {
  const { perfil } = useAuth()
  const local = useLocation()
  const ehCliente = perfil?.tipo_conta === 'cliente'
  const { dados } = useCarregar(
    () => (ehCliente ? api<Esquema<'Pagina_ChamadoSaida_'>>('/chamados', { params: { limit: 100 } }) : null),
    [ehCliente, local.pathname],
  )
  const itens = dados?.items ?? []
  return {
    naoLidas: itens.reduce((soma, c) => soma + c.mensagens_nao_lidas, 0),
    abertos: itens.filter((c) => c.status !== 'concluido').length,
    carregado: dados !== null,
  }
}
