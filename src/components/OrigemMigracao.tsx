import { cn } from 'cn'

import { Aviso, Carregando } from '@/components/Estados'
import { api, type Esquema } from '@/lib/api'
import { agruparOrigem, nomeDaFonte, nomeDoCampo } from '@/lib/origemMigracao'
import { useCarregar } from '@/lib/useCarregar'

// código de uma decisão do registro de decisões da migração (J2, C1, V13...)
function Decisao({ codigo }: { codigo: string | null }) {
  if (!codigo) return null
  return (
    <span title={`Decisão ${codigo} do registro de decisões da migração`} className="bg-superficie px-1.5 py-0.5 text-xs font-medium tabular-nums">
      {codigo}
    </span>
  )
}

// de onde veio um registro migrado da Vulto e o que a migração mudou nele (P4). Peça, pedido, cliente e
// chamado usam o mesmo quadro; o registro que não veio da migração mostra só uma frase. Com `titulo`, o
// quadro se apresenta sozinho e some quando o registro não veio da migração (ex.: no pedido, que pode
// ser da Lorenzi ou da Vulto). `semDecisoes` esconde os códigos das decisões (J2, C1...) onde quem lê é a
// equipe do dia a dia, e não quem confere a migração (ex.: no atendimento)
export function OrigemMigracao({ tabela, idRegistro, titulo, semDecisoes = false }: {
  tabela: string
  idRegistro: string | number
  titulo?: string
  semDecisoes?: boolean
}) {
  const { dados, erro, carregando } = useCarregar(
    () => api<Esquema<'Lista_OrigemSaida_'>>('/migracao/origem', { params: { tabela, id_registro: String(idRegistro) } }),
    [tabela, idRegistro],
  )
  if (carregando && !dados) return titulo ? null : <Carregando />
  if (erro) return <Aviso mensagem={erro} />
  const linhas = agruparOrigem(dados?.items ?? [])
  if (linhas.length === 0) return titulo ? null : <p className="text-sm text-muted-foreground">Não veio da migração da Vulto.</p>

  return (
    <div className="space-y-3 text-sm">
      {titulo && <h3 className="text-base font-medium">{titulo}</h3>}
      <p className="text-muted-foreground">
        Veio da Vulto. Embaixo de cada origem, o campo como estava lá{semDecisoes ? '.' : ' e a decisão que o mudou.'}
      </p>
      <ul className="space-y-3">
        {linhas.map((l) => (
          <li key={`${l.fonte}-${l.linha}`} className="space-y-1.5">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium" title={l.fonte}>{nomeDaFonte(l.fonte)}</span>
              <span className="text-muted-foreground">{l.linha}</span>
              {!semDecisoes && <Decisao codigo={l.decisao} />}
            </p>
            {l.mudancas.length > 0 && (
              // o que a migração mudou: o campo, como estava na Vulto e a decisão
              <dl aria-label="Como estava na Vulto" className={cn('grid gap-x-4 gap-y-1 pl-4', semDecisoes ? 'grid-cols-[auto_1fr]' : 'grid-cols-[auto_1fr_auto]')}>
                {l.mudancas.map((m) => (
                  <div key={m.campo} className="contents">
                    <dt className="text-muted-foreground">{nomeDoCampo(m.campo)}</dt>
                    <dd className="font-medium">{m.valor}</dd>
                    {!semDecisoes && <dd><Decisao codigo={m.decisao} /></dd>}
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
