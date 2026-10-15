import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from 'cn'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { limparListas } from '@/lib/listas'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { PainelLateral, Painel } from './paineis'

type Unidade = Esquema<'UnidadeSaida'>

// aba Unidades da Gestão: lojas e centros de distribuição

type FormUnidade = {
  nome: string; tipo: string; despacha_online: boolean; cep: string; rua: string; numero: string
  complemento: string; bairro: string; cidade: string; uf: string
}

const UNIDADE_VAZIA: FormUnidade = {
  nome: '', tipo: 'loja', despacha_online: false, cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
}

export function Unidades() {
  const unidades = useCarregar(() => api<Esquema<'Lista_UnidadeSaida_'>>('/unidades'), [])
  // id da unidade aberta, 'nova' ou null
  const [aberta, setAberta] = useState<number | 'nova' | null>(null)

  function aposSalvar(unidade: Unidade) {
    limparListas('unidades')
    unidades.recarregar()
    setAberta(unidade.id_unidade)
  }

  const escolhida = unidades.dados?.items.find((u) => u.id_unidade === aberta)

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_26rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Lojas atendem o público e têm estoque de loja física e online. O CD só despacha pedidos online.</p>
          <Button size="lg" className="h-10 px-4" onClick={() => setAberta('nova')}>
            <Plus aria-hidden="true" /> Nova unidade
          </Button>
        </div>
        {unidades.erro && <Aviso mensagem={unidades.erro} />}
        {unidades.carregando && !unidades.dados && <Carregando />}
        {unidades.dados && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pl-2 font-medium">Unidade</th>
                  <th className="font-medium">Tipo</th>
                  <th className="font-medium">Cidade</th>
                  <th className="font-medium">Despacha online</th>
                  <th className="font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {unidades.dados.items.map((u) => (
                  <tr
                    key={u.id_unidade}
                    onClick={() => setAberta(u.id_unidade)}
                    className={cn('cursor-pointer border-b hover:bg-superficie', aberta === u.id_unidade && 'bg-superficie', !u.ativo && 'text-muted-foreground')}
                  >
                    <td className="py-3 pl-2"><button type="button" className="font-medium hover:underline">{u.nome}</button></td>
                    <td>{u.tipo === 'cd' ? 'Centro de distribuição' : 'Loja'}</td>
                    <td>{u.cidade}, {u.uf}</td>
                    <td>{u.tipo === 'cd' ? 'sempre' : u.despacha_online ? 'sim' : 'não'}</td>
                    <td>{u.ativo ? 'ativa' : 'desativada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PainelLateral
        aberto={aberta === 'nova'}
        titulo="Nova unidade"
        descricao="Loja ou centro de distribuição. O tipo não muda depois de criada."
        aoFechar={() => setAberta(null)}
      >
        <FormularioUnidade key="nova" aoFechar={() => setAberta(null)} aoSalvar={aposSalvar} />
      </PainelLateral>
      {escolhida && <FormularioUnidade key={escolhida.id_unidade} unidade={escolhida} aoFechar={() => setAberta(null)} aoSalvar={aposSalvar} />}
    </div>
  )
}

function FormularioUnidade({ unidade, aoFechar, aoSalvar }: { unidade?: Unidade; aoFechar: () => void; aoSalvar: (unidade: Unidade) => void }) {
  const inicial: FormUnidade = unidade ? { ...UNIDADE_VAZIA, ...unidade, complemento: unidade.complemento ?? '' } : UNIDADE_VAZIA
  const [form, setForm] = useState(inicial)
  const [salvo, setSalvo] = useState(false)
  const { enviar, enviando, erro } = useEnviar()
  const mudar = (campo: keyof FormUnidade) => (e: ChangeEvent<HTMLInputElement>) => {
    setSalvo(false)
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  }
  const cd = form.tipo === 'cd'
  // editar fica no Painel ao lado da lista; criar já vem dentro do painel lateral
  const Moldura = unidade ? Painel : SemMoldura

  async function salvar(evento: FormEvent | null, extra: Record<string, unknown> = {}) {
    evento?.preventDefault()
    setSalvo(false)
    const campos: (keyof FormUnidade)[] = ['nome', 'despacha_online', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf']
    let corpo: Record<string, unknown>
    if (unidade) {
      corpo = Object.fromEntries(campos.filter((c) => form[c] !== inicial[c]).map((c) => [c, c === 'complemento' ? form[c] || null : form[c]]))
      Object.assign(corpo, extra)
    } else {
      corpo = { ...Object.fromEntries(campos.map((c) => [c, form[c]])), tipo: form.tipo, complemento: form.complemento || null }
    }
    if (unidade && Object.keys(corpo).length === 0) return
    const salva = await enviar(() => api<Unidade>(unidade ? `/unidades/${unidade.id_unidade}` : '/unidades', { metodo: unidade ? 'PATCH' : 'POST', corpo }))
    if (salva) {
      setSalvo(true)
      aoSalvar(salva)
    }
  }

  return (
    <Moldura titulo={unidade?.nome ?? ''} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <Campo id="un-nome" rotulo="Nome">
          <Input id="un-nome" value={form.nome} onChange={mudar('nome')} minLength={2} maxLength={100} className="bg-background" required />
        </Campo>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Tipo</legend>
          <div className="flex gap-5 text-sm">
            {[['loja', 'Loja'], ['cd', 'Centro de distribuição']].map(([valor, rotulo]) => (
              <label key={valor} className={cn('flex items-center gap-2', unidade && 'text-muted-foreground')}>
                <input type="radio" name="un-tipo" value={valor} checked={form.tipo === valor} onChange={mudar('tipo')} disabled={Boolean(unidade)} />
                {rotulo}
              </label>
            ))}
          </div>
          {unidade && <p className="mt-1 text-xs text-muted-foreground">O tipo não muda depois de criada.</p>}
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cd || form.despacha_online} onChange={mudar('despacha_online')} disabled={cd} />
          Despacha pedidos de entrega em casa
        </label>
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <Campo id="un-cep" rotulo="CEP">
            <Input id="un-cep" value={form.cep} onChange={mudar('cep')} inputMode="numeric" className="bg-background" required />
          </Campo>
          <Campo id="un-rua" rotulo="Rua">
            <Input id="un-rua" value={form.rua} onChange={mudar('rua')} maxLength={200} className="bg-background" required />
          </Campo>
          <Campo id="un-numero" rotulo="Número">
            <Input id="un-numero" value={form.numero} onChange={mudar('numero')} maxLength={20} className="bg-background" required />
          </Campo>
          <Campo id="un-complemento" rotulo="Complemento" opcional>
            <Input id="un-complemento" value={form.complemento} onChange={mudar('complemento')} maxLength={100} className="bg-background" />
          </Campo>
          <Campo id="un-uf" rotulo="UF">
            <Input id="un-uf" value={form.uf} onChange={mudar('uf')} maxLength={2} className="bg-background uppercase" required />
          </Campo>
          <Campo id="un-bairro" rotulo="Bairro">
            <Input id="un-bairro" value={form.bairro} onChange={mudar('bairro')} maxLength={100} className="bg-background" required />
          </Campo>
          <Campo id="un-cidade" rotulo="Cidade" className="col-span-2">
            <Input id="un-cidade" value={form.cidade} onChange={mudar('cidade')} maxLength={100} className="bg-background" required />
          </Campo>
        </div>
        {erro && <Aviso mensagem={erro} />}
        {salvo && <Sucesso>Unidade salva.</Sucesso>}
        <div className="flex items-center justify-between gap-2">
          {unidade ? (
            <Button type="button" variant="link" className="px-0" disabled={enviando} onClick={() => salvar(null, { ativo: !unidade.ativo })}>
              {unidade.ativo ? 'Desativar unidade' : 'Reativar unidade'}
            </Button>
          ) : <span />}
          <Button type="submit" size="lg" className="h-11 px-5" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar unidade'}</Button>
        </div>
      </form>
    </Moldura>
  )
}

function SemMoldura({ children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return <>{children}</>
}
