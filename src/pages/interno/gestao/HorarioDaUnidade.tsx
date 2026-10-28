import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { dataLonga, hojeIso } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { corpoDaSemana, DIAS, erroDaSemana, horarioDaExcecao, semanaDoFormulario, type DiaDoFormulario } from './horario'

type Horario = Esquema<'HorarioSaida'>

// horário de atendimento da loja: é o que o atendimento por mensagem responde em "que horas fecha?".
// A semana se salva inteira; feriados e horários especiais entram como exceção de uma data
export function HorarioDaUnidade({ idUnidade }: { idUnidade: number }) {
  const horario = useCarregar(() => api<Horario>(`/unidades/${idUnidade}/horario`), [idUnidade])

  if (horario.erro) return <Aviso mensagem={horario.erro} />
  if (!horario.dados) return <Carregando />
  return (
    <div className="space-y-6 border-t pt-5">
      <h3 className="font-medium">Horário de atendimento</h3>
      <Semana key={JSON.stringify(horario.dados.semana)} idUnidade={idUnidade} horario={horario.dados} aoSalvar={horario.recarregar} />
      <Excecoes idUnidade={idUnidade} excecoes={horario.dados.excecoes} aoMudar={horario.recarregar} />
    </div>
  )
}

function Semana({ idUnidade, horario, aoSalvar }: { idUnidade: number; horario: Horario; aoSalvar: () => void }) {
  const [dias, setDias] = useState(() => semanaDoFormulario(horario.semana))
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const invalido = erroDaSemana(dias)

  function mudar(dia: number, campos: Partial<DiaDoFormulario>) {
    setSalvo(false)
    setDias(dias.map((d, i) => (i === dia ? { ...d, ...campos } : d)))
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    if (invalido) return
    const resposta = await enviar(() => api<Horario>(`/unidades/${idUnidade}/horario`, { metodo: 'PUT', corpo: corpoDaSemana(dias) }))
    if (resposta) {
      setSalvo(true)
      aoSalvar()
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-2">
      <p className="text-sm text-muted-foreground">Dia desmarcado fica fechado.</p>
      {dias.map((d, i) => (
        <div key={DIAS[i]} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={d.aberta} onChange={(e) => mudar(i, { aberta: e.target.checked })} />
            {DIAS[i]}
          </label>
          <Input type="time" aria-label={`${DIAS[i]}: abre`} value={d.abre} disabled={!d.aberta}
            onChange={(e) => mudar(i, { abre: e.target.value })} className="bg-background" />
          <Input type="time" aria-label={`${DIAS[i]}: fecha`} value={d.fecha} disabled={!d.aberta}
            onChange={(e) => mudar(i, { fecha: e.target.value })} className="bg-background" />
        </div>
      ))}
      {invalido && <Aviso mensagem={invalido} />}
      {erro && <Aviso mensagem={erro} />}
      {salvo && <Sucesso>Horário salvo.</Sucesso>}
      <Button type="submit" variant="outline" disabled={enviando || Boolean(invalido)}>
        {enviando ? 'Salvando...' : 'Salvar horário da semana'}
      </Button>
    </form>
  )
}

const EXCECAO_VAZIA = { data: '', fechada: true, abre: '10:00', fecha: '18:00', motivo: '' }

function Excecoes({ idUnidade, excecoes, aoMudar }: {
  idUnidade: number; excecoes: Esquema<'ExcecaoHorarioSaida'>[]; aoMudar: () => void
}) {
  const [nova, setNova] = useState(EXCECAO_VAZIA)
  const { enviar, enviando, erro } = useEnviar()

  async function adicionar(evento: FormEvent) {
    evento.preventDefault()
    const corpo = nova.fechada ? { motivo: nova.motivo } : { motivo: nova.motivo, abre: nova.abre, fecha: nova.fecha }
    const resposta = await enviar(() => api<Horario>(`/unidades/${idUnidade}/excecoes/${nova.data}`, { metodo: 'PUT', corpo }))
    if (resposta) {
      setNova(EXCECAO_VAZIA)
      aoMudar()
    }
  }

  async function remover(data: string) {
    const removido = await enviar(() => api<null>(`/unidades/${idUnidade}/excecoes/${data}`, { metodo: 'DELETE' }).then(() => true))
    if (removido) aoMudar()
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">Feriados e horários especiais</h4>
        <p className="text-sm text-muted-foreground">Valem mais que o horário da semana nessa data.</p>
      </div>
      {excecoes.length > 0 && (
        <ul className="divide-y text-sm">
          {excecoes.map((e) => (
            <li key={e.data} className="flex items-center justify-between gap-2 py-2">
              {/* meio-dia: a data sem hora seria meia-noite UTC, o dia anterior em Brasília */}
              <span><span className="font-medium">{dataLonga(`${e.data}T12:00:00`)}</span> · {e.motivo} · {horarioDaExcecao(e)}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover ${e.motivo}`} disabled={enviando}
                onClick={() => remover(e.data)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={adicionar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo id="ex-data" rotulo="Data">
            <Input id="ex-data" type="date" min={hojeIso()} value={nova.data} required className="bg-background"
              onChange={(e) => setNova({ ...nova, data: e.target.value })} />
          </Campo>
          <Campo id="ex-motivo" rotulo="Motivo">
            <Input id="ex-motivo" value={nova.motivo} minLength={2} maxLength={100} required placeholder="Ex.: Natal"
              className="bg-background" onChange={(e) => setNova({ ...nova, motivo: e.target.value })} />
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nova.fechada} onChange={(e) => setNova({ ...nova, fechada: e.target.checked })} />
          Fechada o dia todo
        </label>
        {!nova.fechada && (
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" aria-label="Abre" value={nova.abre} required className="bg-background"
              onChange={(e) => setNova({ ...nova, abre: e.target.value })} />
            <Input type="time" aria-label="Fecha" value={nova.fecha} required className="bg-background"
              onChange={(e) => setNova({ ...nova, fecha: e.target.value })} />
          </div>
        )}
        {erro && <Aviso mensagem={erro} />}
        <Button type="submit" variant="outline" disabled={enviando}>Adicionar exceção</Button>
      </form>
    </div>
  )
}
