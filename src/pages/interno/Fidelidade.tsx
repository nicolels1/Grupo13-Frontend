import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from 'cn'

import { marcasVistas, type Marca } from '@/auth/areas'
import { useAuth } from '@/auth/contexto'
import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Abas, Cabecalho } from '@/components/Navegacao'
import { Etiqueta } from '@/components/Peca'
import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { dataLonga, diasAtras, hojeIso, MARCAS, moeda, numero, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { PainelLateral } from './gestao/paineis'
import {
  corpoDaRegra, decimalParaTela, erroDaRegra, formDaRegra, regraVigente, situacaoDaRegra, SITUACOES, type FormRegra,
} from './fidelidade/regrasFidelidade'

type Regra = Esquema<'RegraSaida'>

// datas sem hora (valida_desde) no meio do dia, para não pular de dia no fuso de Brasília
const dia = (data: string) => dataLonga(`${data}T12:00:00`)

// área Fidelidade: as regras do programa de pontos de cada marca (o da Vulto é o Vulto+). Quem tem
// gerenciar_fidelidade (no começo, só o Admin) vê a regra que vale hoje, o histórico e cria a próxima.
// O passivo de pontos fica na Visão Geral
export function Fidelidade() {
  const { perfil } = useAuth()
  const marcas = [...marcasVistas(perfil)]
  const [escolhida, setEscolhida] = useState<Marca | null>(null)
  const marca = escolhida ?? marcas[0] ?? null
  const [criando, setCriando] = useState(false)
  const [criada, setCriada] = useState(false)

  const regras = useCarregar(
    () => (marca ? api<Esquema<'Lista_RegraSaida_'>>('/fidelidade/regras', { params: { marca } }) : null),
    [marca],
  )
  const lista = regras.dados?.items ?? []
  const vigente = regraVigente(lista)

  function trocarMarca(nova: Marca) {
    setEscolhida(nova)
    setCriada(false)
  }

  if (!marca) return <Aviso mensagem="Sua conta não vê nenhuma marca. Peça ao Admin para liberar a Casa Lorenzi ou a Vulto." />

  return (
    <>
      <Cabecalho
        titulo="Fidelidade"
        subtitulo="As regras dos pontos de cada marca. Uma regra nova vale a partir da data escolhida e nunca muda um ponto já ganho."
        abas={marcas.length > 1 && (
          <Abas
            semLinha
            rotulo="Marca"
            valor={marca}
            aoMudar={trocarMarca}
            abas={marcas.map((m) => ({ valor: m, rotulo: MARCAS[m] ?? m }))}
          />
        )}
      />

      {regras.erro && <Aviso mensagem={regras.erro} />}
      {regras.carregando && !regras.dados && <Carregando />}
      {regras.dados && (
        <div className="space-y-10">
          <section aria-labelledby="titulo-vigente">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
              <h2 id="titulo-vigente" className="text-lg font-medium">Regra que vale hoje</h2>
              <Button size="lg" className="h-10 px-4" onClick={() => { setCriada(false); setCriando(true) }}>
                <Plus aria-hidden="true" /> Nova regra
              </Button>
            </div>
            {criada && <div className="mb-4"><Sucesso>Regra criada. Ela aparece no histórico e passa a valer na data escolhida.</Sucesso></div>}
            {vigente ? <ResumoDaRegra regra={vigente} /> : <Vazio>A {MARCAS[marca]} ainda não tem programa de pontos. Crie a primeira regra.</Vazio>}
          </section>

          <section aria-labelledby="titulo-historico">
            <h2 id="titulo-historico" className="mb-4 border-b border-foreground pb-3 text-lg font-medium">Histórico de regras</h2>
            {lista.length === 0 ? <Vazio>Nenhuma regra ainda.</Vazio> : <TabelaDeRegras regras={lista} />}
          </section>
        </div>
      )}

      <PainelLateral
        aberto={criando}
        titulo={`Nova regra da ${MARCAS[marca] ?? marca}`}
        descricao="Parte da regra que vale hoje: mude só o que for diferente. Os pontos já ganhos continuam com o valor e o vencimento da época."
        aoFechar={() => setCriando(false)}
      >
        <FormularioRegra
          key={`${marca}-${vigente?.id_regra ?? 'nenhuma'}`}
          marca={marca}
          base={vigente}
          aoSalvar={() => {
            setCriando(false)
            setCriada(true)
            regras.recarregar()
          }}
        />
      </PainelLateral>
    </>
  )
}

function validade(regra: Regra) {
  if (regra.validade_meses === null) return 'não vencem'
  return `${plural(regra.validade_meses, 'mês', 'meses')} (Ouro: ${plural(regra.validade_meses_ouro ?? 0, 'mês', 'meses')})`
}

function ResumoDaRegra({ regra }: { regra: Regra }) {
  const itens: { rotulo: string; valor: ReactNode }[] = [
    { rotulo: 'Vale desde', valor: dia(regra.valida_desde) },
    { rotulo: 'Valor do ponto', valor: moeda(regra.valor_ponto) },
    { rotulo: 'Pontos por real gasto', valor: decimalParaTela(regra.pontos_por_real) },
    { rotulo: 'Site e app', valor: `${decimalParaTela(regra.multiplicador_online)} vezes os pontos` },
    { rotulo: 'Bônus do Ouro', valor: `mais ${numero(Number(regra.bonus_ouro) * 100)}%` },
    { rotulo: 'Os pontos vencem em', valor: validade(regra) },
    { rotulo: 'Prata e Ouro', valor: `${numero(regra.limite_prata)} e ${numero(regra.limite_ouro)} pontos no ano` },
    { rotulo: 'Resgate mínimo', valor: plural(regra.resgate_minimo, 'ponto', 'pontos') },
  ]
  return (
    <dl className="grid gap-4 bg-superficie p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo}>
          <dt className="text-muted-foreground">{i.rotulo}</dt>
          <dd className="font-medium">{i.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function TabelaDeRegras({ regras }: { regras: Regra[] }) {
  const hoje = hojeIso()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pl-2 font-medium">Vale desde</th>
            <th className="text-right font-medium">Valor do ponto</th>
            <th className="text-right font-medium">Pontos por real</th>
            <th className="text-right font-medium">Site e app</th>
            <th className="pl-6 font-medium">Vencimento</th>
            <th className="text-right font-medium">Prata e Ouro</th>
            <th className="text-right font-medium">Resgate mínimo</th>
            <th className="pl-6 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {regras.map((r) => {
            const situacao = situacaoDaRegra(r, hoje)
            return (
              <tr key={r.id_regra} className={cn('border-b', situacao === 'anterior' && 'text-muted-foreground')}>
                <td className="py-3 pl-2">
                  {dia(r.valida_desde)}
                  {r.id_criado_por === null && <span className="block text-xs text-muted-foreground">Veio da migração</span>}
                </td>
                <td className="text-right tabular-nums">{moeda(r.valor_ponto)}</td>
                <td className="text-right tabular-nums">{decimalParaTela(r.pontos_por_real)}</td>
                <td className="text-right tabular-nums">{decimalParaTela(r.multiplicador_online)}×</td>
                <td className="pl-6">{validade(r)}</td>
                <td className="text-right tabular-nums">{numero(r.limite_prata)} e {numero(r.limite_ouro)}</td>
                <td className="text-right tabular-nums">{numero(r.resgate_minimo)}</td>
                <td className="pl-6"><Etiqueta alerta={situacao === 'agendada'}>{SITUACOES[situacao]}</Etiqueta></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FormularioRegra({ marca, base, aoSalvar }: { marca: Marca; base: Regra | null; aoSalvar: () => void }) {
  const amanha = diasAtras(-1)
  const [form, setForm] = useState<FormRegra>(() => formDaRegra(base, amanha))
  const [aviso, setAviso] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  const mudar = (campo: keyof FormRegra) => (e: ChangeEvent<HTMLInputElement>) => {
    setAviso(null)
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    const problema = erroDaRegra(form, hojeIso())
    if (problema) {
      setAviso(problema)
      return
    }
    const criada = await enviar(() => api<Regra>('/fidelidade/regras', { metodo: 'POST', corpo: corpoDaRegra(form, marca) }))
    if (criada) aoSalvar()
  }

  return (
    <form onSubmit={(e) => void salvar(e)} noValidate className="space-y-4 pt-4">
      <Campo id="regra-desde" rotulo="Vale a partir de" dica="Amanhã ou uma data futura.">
        <Input id="regra-desde" type="date" min={amanha} value={form.valida_desde} onChange={mudar('valida_desde')} required />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo id="regra-valor" rotulo="Valor do ponto (R$)" dica="0,05 é 5 centavos.">
          <Input id="regra-valor" inputMode="decimal" value={form.valor_ponto} onChange={mudar('valor_ponto')} required />
        </Campo>
        <Campo id="regra-por-real" rotulo="Pontos por real">
          <Input id="regra-por-real" inputMode="decimal" value={form.pontos_por_real} onChange={mudar('pontos_por_real')} required />
        </Campo>
        <Campo id="regra-online" rotulo="Site e app" dica="2 é o dobro dos pontos.">
          <Input id="regra-online" inputMode="decimal" value={form.multiplicador_online} onChange={mudar('multiplicador_online')} required />
        </Campo>
        <Campo id="regra-bonus" rotulo="Bônus do Ouro" dica="0,5 é mais 50%.">
          <Input id="regra-bonus" inputMode="decimal" value={form.bonus_ouro} onChange={mudar('bonus_ouro')} required />
        </Campo>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Vencimento dos pontos</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.vence} onChange={mudar('vence')} />
          Os pontos vencem
        </label>
        {form.vence && (
          <div className="grid grid-cols-2 gap-3">
            <Campo id="regra-meses" rotulo="Meses (Bronze e Prata)">
              <Input id="regra-meses" inputMode="numeric" value={form.validade_meses} onChange={mudar('validade_meses')} required />
            </Campo>
            <Campo id="regra-meses-ouro" rotulo="Meses (Ouro)">
              <Input id="regra-meses-ouro" inputMode="numeric" value={form.validade_meses_ouro} onChange={mudar('validade_meses_ouro')} required />
            </Campo>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="regra-prata" rotulo="Prata a partir de" dica="Pontos ganhos no ano.">
          <Input id="regra-prata" inputMode="numeric" value={form.limite_prata} onChange={mudar('limite_prata')} required />
        </Campo>
        <Campo id="regra-ouro" rotulo="Ouro a partir de" dica="Pontos ganhos no ano.">
          <Input id="regra-ouro" inputMode="numeric" value={form.limite_ouro} onChange={mudar('limite_ouro')} required />
        </Campo>
        <Campo id="regra-minimo" rotulo="Resgate mínimo" dica="Em pontos.">
          <Input id="regra-minimo" inputMode="numeric" value={form.resgate_minimo} onChange={mudar('resgate_minimo')} required />
        </Campo>
      </div>

      {(aviso || erro) && <Aviso mensagem={aviso ?? erro} />}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={enviando}>
        {enviando ? 'Criando...' : 'Criar regra'}
      </Button>
    </form>
  )
}
