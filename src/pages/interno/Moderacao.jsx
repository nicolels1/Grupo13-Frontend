import { useState } from 'react'
import { Check, EyeOff, ThumbsUp } from 'lucide-react'

import { Aviso, Carregando, Sucesso, Vazio } from '@/components/Estados'
import { Abas, Cabecalho, Paginacao } from '@/components/Navegacao'
import { Button } from '@/components/ui/button'
import { Campo, Textarea } from '@/components/ui/input'
import { api, todasAsPaginas } from '@/lib/api'
import { dataCurta, dataHora, haQuanto, plural } from '@/lib/formato'
import { useCarregar, useEnviar } from '@/lib/useCarregar'
import { Estrelas } from '@/pages/loja/componentes/Estrelas'

const POR_PAGINA = 20

// moderação de avaliações (design, seção Moderação): fila das avaliações denunciadas, cada uma
// inteira e com os motivos das denúncias, para "Manter publicada" ou "Ocultar" (com motivo);
// e a aba "Ocultadas". A decisão analisa todas as denúncias pendentes da avaliação de uma vez.
export function Moderacao() {
  const [aba, setAba] = useState('denunciadas')
  const [offset, setOffset] = useState(0)
  const [feito, setFeito] = useState(null)
  const denunciadas = aba === 'denunciadas'

  const avaliacoes = useCarregar(
    () => api('/moderacao/avaliacoes', {
      params: denunciadas
        ? { status: 'publicada', com_denuncia_pendente: true, limit: POR_PAGINA, offset }
        : { status: 'oculta', limit: POR_PAGINA, offset },
    }),
    [aba, offset],
  )
  // os motivos vêm das denúncias pendentes (mais antigas primeiro), agrupadas pela avaliação
  const denuncias = useCarregar(() => (denunciadas ? todasAsPaginas('/moderacao/denuncias', { status: 'pendente' }) : null), [aba])
  const contagem = useCarregar(
    () => api('/moderacao/avaliacoes', { params: { status: 'publicada', com_denuncia_pendente: true, limit: 1 } }).then((r) => r.total),
    [],
  )
  const porAvaliacao = {}
  for (const d of denuncias.dados ?? []) (porAvaliacao[d.id_avaliacao] ??= []).push(d)
  const itens = avaliacoes.dados?.items ?? []

  function aposDecidir(mensagem) {
    setFeito(mensagem)
    avaliacoes.recarregar()
    denuncias.recarregar()
    contagem.recarregar()
  }

  return (
    <>
      <Cabecalho titulo="Avaliações" subtitulo="Avaliações denunciadas pelos clientes: mantenha publicada ou oculte, dizendo o motivo." />
      <Abas
        rotulo="Moderação"
        valor={aba}
        aoMudar={(v) => { setAba(v); setOffset(0); setFeito(null) }}
        abas={[
          { valor: 'denunciadas', rotulo: 'Denunciadas', contagem: contagem.dados },
          { valor: 'ocultadas', rotulo: 'Ocultadas' },
        ]}
        className="mb-6"
      />

      {feito && <div className="mb-6"><Sucesso>{feito}</Sucesso></div>}
      {(avaliacoes.erro || denuncias.erro) && <Aviso mensagem={avaliacoes.erro || denuncias.erro} />}
      {avaliacoes.carregando && !avaliacoes.dados && <Carregando />}
      {avaliacoes.dados && itens.length === 0 && (
        <Vazio>{denunciadas ? 'Nenhuma avaliação denunciada esperando análise.' : 'Nenhuma avaliação ocultada.'}</Vazio>
      )}

      <ul className="max-w-3xl space-y-6">
        {itens.map((a) => (
          <li key={a.id_avaliacao}>
            <CartaoAvaliacao avaliacao={a}>
              {denunciadas ? (
                <Decisao avaliacao={a} denuncias={porAvaliacao[a.id_avaliacao] ?? []} carregandoDenuncias={denuncias.carregando} aoDecidir={aposDecidir} />
              ) : (
                <p className="bg-superficie p-3 text-sm">
                  Ocultada em {dataHora(a.ocultada_em)}{a.motivo_ocultacao ? `: ${a.motivo_ocultacao}` : '.'}
                </p>
              )}
            </CartaoAvaliacao>
          </li>
        ))}
      </ul>
      <Paginacao pagina={avaliacoes.dados} aoMudar={setOffset} rotulo="avaliações" />
    </>
  )
}

// a avaliação inteira, como o cliente vê na página do produto (fotos só enquanto publicada)
function CartaoAvaliacao({ avaliacao: a, children }) {
  return (
    <article className="space-y-4 border p-5">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{a.produto}, comprou {a.cor.toLowerCase()} no {a.tamanho}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Estrelas nota={a.nota} />
          <span className="text-sm">
            {a.autor}, {dataCurta(a.criada_em)}
            {a.editada_em && <span className="text-muted-foreground">, editada em {dataCurta(a.editada_em)}</span>}
          </span>
        </div>
      </header>
      {a.texto ? <p className="whitespace-pre-line text-sm">{a.texto}</p> : <p className="text-sm text-muted-foreground">Sem texto, só a nota.</p>}
      {a.fotos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Fotos da avaliação">
          {a.fotos.map((f) => (
            <li key={f.id_foto}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer" className="block">
                  <img src={f.url} alt={`Foto ${f.ordem} enviada com a avaliação`} className="size-20 object-cover" loading="lazy" />
                </a>
              ) : (
                <span className="flex size-20 items-center justify-center bg-superficie text-center text-xs text-muted-foreground">foto indisponível</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ThumbsUp className="size-3.5" aria-hidden="true" /> {plural(a.votos_util, 'pessoa achou útil', 'pessoas acharam útil')}
      </p>
      {children}
    </article>
  )
}

// decisão sobre as denúncias pendentes da avaliação (POST /moderacao/denuncias/{id}/analisar):
// manter = todas improcedentes; ocultar = todas procedentes, a primeira levando o motivo
function Decisao({ avaliacao: a, denuncias, carregandoDenuncias, aoDecidir }) {
  const [ocultando, setOcultando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const { enviar, enviando, erro } = useEnviar()

  async function analisarTodas(procedente) {
    const ok = await enviar(async () => {
      for (const [i, d] of denuncias.entries()) {
        await api(`/moderacao/denuncias/${d.id_denuncia}/analisar`, {
          metodo: 'POST',
          corpo: { procedente, motivo_ocultacao: procedente && i === 0 ? motivo.trim() : null },
        })
      }
      return true
    })
    if (ok) {
      aoDecidir(procedente
        ? `Avaliação de ${a.autor} sobre ${a.produto} ocultada. As fotos saíram do ar.`
        : `Avaliação de ${a.autor} sobre ${a.produto} mantida publicada.`)
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          {denuncias.length ? plural(denuncias.length, 'denúncia', 'denúncias') : 'Denúncias'}
        </h3>
        {carregandoDenuncias && denuncias.length === 0 && <p className="text-sm text-muted-foreground">Carregando os motivos...</p>}
        <ul className="space-y-2">
          {denuncias.map((d) => (
            <li key={d.id_denuncia} className="border-l-4 border-terracota bg-terracota-fundo px-3 py-2 text-sm">
              <p className="whitespace-pre-line">{d.motivo}</p>
              <p className="text-xs text-muted-foreground">{d.cliente}, {haQuanto(d.criada_em)}</p>
            </li>
          ))}
        </ul>
      </section>

      {ocultando ? (
        <form onSubmit={(e) => { e.preventDefault(); analisarTodas(true) }} className="space-y-3">
          <Campo id={`ocultar-${a.id_avaliacao}`} rotulo="Por que ocultar?" dica="O motivo fica registrado na moderação. As fotos da avaliação saem do ar.">
            <Textarea id={`ocultar-${a.id_avaliacao}`} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} minLength={3} maxLength={500} required autoFocus />
          </Campo>
          {erro && <Aviso mensagem={erro} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOcultando(false)} disabled={enviando}>Voltar</Button>
            <Button type="submit" variant="destructive" disabled={motivo.trim().length < 3 || enviando}>
              <EyeOff aria-hidden="true" /> {enviando ? 'Ocultando...' : 'Ocultar avaliação'}
            </Button>
          </div>
        </form>
      ) : (
        <>
          {erro && <Aviso mensagem={erro} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={enviando || denuncias.length === 0} onClick={() => setOcultando(true)}>
              <EyeOff aria-hidden="true" /> Ocultar
            </Button>
            <Button variant="outline" disabled={enviando || denuncias.length === 0} onClick={() => analisarTodas(false)}>
              <Check aria-hidden="true" /> {enviando ? 'Salvando...' : 'Manter publicada'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
