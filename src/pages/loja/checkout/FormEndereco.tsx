import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { api, type Esquema } from '@/lib/api'
import { useEnviar } from '@/lib/useCarregar'
import { buscarCep, mascaraCep, soDigitos } from './cep'

type Endereco = Esquema<'EnderecoSaida'>

const VAZIO = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }

// endereço novo no próprio checkout: o CEP preenche rua, bairro, cidade e UF; o resto continua editável
export function FormEndereco({ aoSalvar, aoCancelar }: { aoSalvar: (endereco: Endereco) => void; aoCancelar?: () => void }) {
  const [campos, setCampos] = useState(VAZIO)
  const [buscando, setBuscando] = useState(false)
  const [avisoCep, setAvisoCep] = useState<string | null>(null)
  const { enviar, enviando, erro } = useEnviar()

  function mudar(chave: keyof typeof VAZIO, valor: string) {
    setCampos((atuais) => ({ ...atuais, [chave]: valor }))
  }

  async function aoSairDoCep() {
    if (soDigitos(campos.cep).length !== 8) return
    setBuscando(true)
    const achado = await buscarCep(campos.cep)
    setBuscando(false)
    if (!achado) {
      setAvisoCep('Não achamos esse CEP. Confira os números ou preencha o endereço abaixo.')
      return
    }
    setAvisoCep(null)
    // só preenche o que veio; o que a pessoa já digitou e o CEP não trouxe fica como está
    setCampos((atuais) => ({
      ...atuais,
      rua: achado.rua || atuais.rua,
      bairro: achado.bairro || atuais.bairro,
      cidade: achado.cidade || atuais.cidade,
      uf: achado.uf || atuais.uf,
    }))
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    const criado = await enviar(() =>
      api<Endereco>('/enderecos', {
        metodo: 'POST',
        corpo: {
          ...campos,
          cep: soDigitos(campos.cep),
          uf: campos.uf.toUpperCase(),
          complemento: campos.complemento.trim() || null,
        },
      }),
    )
    if (criado) aoSalvar(criado)
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="grid gap-4 sm:grid-cols-6">
      <Campo id="end-cep" rotulo="CEP" className="sm:col-span-2" dica={buscando ? undefined : avisoCep}>
        <div className="relative">
          <Input
            id="end-cep"
            value={campos.cep}
            onChange={(e) => mudar('cep', mascaraCep(e.target.value))}
            onBlur={() => void aoSairDoCep()}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            required
          />
          {buscando && (
            <LoaderCircle className="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" aria-label="Buscando o CEP" />
          )}
        </div>
      </Campo>
      <Campo id="end-rua" rotulo="Rua" className="sm:col-span-4">
        <Input id="end-rua" value={campos.rua} onChange={(e) => mudar('rua', e.target.value)} autoComplete="address-line1" required />
      </Campo>
      <Campo id="end-numero" rotulo="Número" className="sm:col-span-2">
        <Input id="end-numero" value={campos.numero} onChange={(e) => mudar('numero', e.target.value)} required />
      </Campo>
      <Campo id="end-complemento" rotulo="Complemento" opcional className="sm:col-span-4">
        <Input
          id="end-complemento"
          value={campos.complemento}
          onChange={(e) => mudar('complemento', e.target.value)}
          autoComplete="address-line2"
          placeholder="Apartamento, bloco"
        />
      </Campo>
      <Campo id="end-bairro" rotulo="Bairro" className="sm:col-span-2">
        <Input id="end-bairro" value={campos.bairro} onChange={(e) => mudar('bairro', e.target.value)} required />
      </Campo>
      <Campo id="end-cidade" rotulo="Cidade" className="sm:col-span-3">
        <Input id="end-cidade" value={campos.cidade} onChange={(e) => mudar('cidade', e.target.value)} autoComplete="address-level2" required />
      </Campo>
      <Campo id="end-uf" rotulo="UF" className="sm:col-span-1">
        <Input
          id="end-uf"
          value={campos.uf}
          onChange={(e) => mudar('uf', e.target.value.slice(0, 2))}
          autoComplete="address-level1"
          className="uppercase"
          required
        />
      </Campo>

      {erro && <p role="alert" className="text-sm text-ferrugem sm:col-span-6">{erro}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-6">
        <Button type="submit" size="loja" disabled={enviando}>Salvar endereço</Button>
        {aoCancelar && (
          <Button type="button" variant="outline" size="loja" onClick={aoCancelar}>Cancelar</Button>
        )}
      </div>
    </form>
  )
}
