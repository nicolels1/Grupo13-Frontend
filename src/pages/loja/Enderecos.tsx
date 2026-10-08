import { useState } from 'react'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'

import { Aviso, Carregando, Sucesso } from '@/components/Estados'
import { Button } from '@/components/ui/button'
import { api, type Esquema } from '@/lib/api'
import { plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { mascaraCep } from './checkout/cep'
import { FormEndereco } from './checkout/FormEndereco'

type Endereco = Esquema<'EnderecoSaida'>

// endereços salvos para a entrega, dentro da área "Minha conta": adicionar (com o CEP preenchendo o
// resto), alterar e apagar. São os mesmos que aparecem no checkout
export function Enderecos() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => api<Esquema<'Lista_EnderecoSaida_'>>('/enderecos'), [])
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const enderecos = dados?.items ?? []

  function salvo(texto: string) {
    setEditando(null)
    setAviso(texto)
    recarregar()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="font-titulo text-3xl">Endereços</h1>
          {dados && <span className="text-sm text-muted-foreground">{plural(enderecos.length, 'salvo', 'salvos')}</span>}
        </div>
        {editando !== 'novo' && (
          <Button onClick={() => { setEditando('novo'); setAviso(null) }} size="loja" className="rounded-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            Adicionar endereço
          </Button>
        )}
      </div>

      {aviso && <Sucesso>{aviso}</Sucesso>}
      {erro && <Aviso mensagem={erro} />}
      {!dados && carregando && <Carregando />}

      {editando === 'novo' && (
        <section aria-labelledby="titulo-novo" className="rounded-xl border bg-background p-6 shadow-xs">
          <h2 id="titulo-novo" className="mb-5 font-titulo text-2xl">Novo endereço</h2>
          <FormEndereco aoSalvar={() => salvo('Endereço salvo.')} aoCancelar={() => setEditando(null)} />
        </section>
      )}

      {dados && enderecos.length === 0 && editando !== 'novo' && (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-background p-10 text-center shadow-xs">
          <span className="flex size-14 items-center justify-center rounded-xl bg-ardosia text-white">
            <MapPin className="size-7" aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">
            Você ainda não salvou nenhum endereço. Salve um aqui ou na hora de finalizar a compra.
          </p>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {enderecos.map((endereco) => (
          <li key={endereco.id_endereco} className={editando === endereco.id_endereco ? 'md:col-span-2' : undefined}>
            {editando === endereco.id_endereco ? (
              <section aria-label="Alterar endereço" className="rounded-xl border bg-background p-6 shadow-xs">
                <FormEndereco
                  inicial={endereco}
                  aoSalvar={() => salvo('Endereço atualizado.')}
                  aoCancelar={() => setEditando(null)}
                />
              </section>
            ) : (
              <CartaoEndereco
                endereco={endereco}
                aoEditar={() => { setEditando(endereco.id_endereco); setAviso(null) }}
                aoApagar={() => salvo('Endereço apagado.')}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// apagar pede confirmação ali mesmo (sem janela do navegador): não dá para desfazer
function CartaoEndereco({ endereco, aoEditar, aoApagar }: { endereco: Endereco; aoEditar: () => void; aoApagar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const { enviar, enviando, erro } = useEnviar()

  async function apagar() {
    const feito = await enviar(() => api<null>(`/enderecos/${endereco.id_endereco}`, { metodo: 'DELETE' }))
    if (feito !== undefined) aoApagar()
  }

  return (
    <article className="flex h-full flex-col rounded-xl border bg-background shadow-xs">
      <div className="flex flex-1 gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ardosia-clara text-ardosia">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <address className="space-y-0.5 text-sm not-italic">
          <span className="block font-medium">
            {endereco.rua}, {endereco.numero}
            {endereco.complemento ? `, ${endereco.complemento}` : ''}
          </span>
          <span className="block text-muted-foreground">{endereco.bairro}</span>
          <span className="block text-muted-foreground">
            {endereco.cidade} ({endereco.uf}), CEP {mascaraCep(endereco.cep)}
          </span>
        </address>
      </div>

      <div className="border-t p-3">
        {confirmando ? (
          <div role="group" aria-label="Confirmar exclusão" className="flex flex-wrap items-center gap-2 rounded-lg bg-ferrugem-fundo p-2 pl-3 text-sm">
            <span className="mr-auto">Apagar este endereço?</span>
            <Button variant="destructive" size="sm" onClick={() => void apagar()} disabled={enviando}>Sim, apagar</Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>Voltar</Button>
          </div>
        ) : (
          // apagar em ferrugem clarinho: é a única ação destrutiva da área
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={aoEditar} className="h-10">
              <Pencil aria-hidden="true" /> Alterar
            </Button>
            <Button onClick={() => setConfirmando(true)} className="h-10 bg-ferrugem-fundo text-ferrugem hover:bg-ferrugem/15">
              <Trash2 aria-hidden="true" /> Apagar
            </Button>
          </div>
        )}
        {erro && <p role="alert" className="px-1 pt-2 text-sm text-ferrugem">{erro}</p>}
      </div>
    </article>
  )
}
