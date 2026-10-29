import type { ReactNode } from 'react'
import { Link } from 'react-router'

// política de privacidade em linguagem simples: o que a Casa Lorenzi guarda, por quanto tempo e para quê.
// Os prazos seguem o que o sistema faz de fato (texto da conversa com o assistente apagado em 90 dias,
// resumo sem identificação para sempre); mudou uma regra no backend, muda aqui também
const SECOES: { id: string; titulo: string; conteudo: ReactNode }[] = [
  {
    id: 'o-que-guardamos',
    titulo: 'O que guardamos',
    conteudo: (
      <ul className="list-disc space-y-2 pl-5">
        <li><strong className="font-medium text-foreground">Conta:</strong> nome, e-mail, CPF e senha (a senha fica cifrada; nem a equipe consegue ver).</li>
        <li><strong className="font-medium text-foreground">Compras:</strong> pedidos, endereços de entrega e a forma de pagamento. Não guardamos o número do cartão.</li>
        <li><strong className="font-medium text-foreground">Pontos:</strong> o saldo e o extrato da Casa Lorenzi e da Vulto, inclusive o histórico de antes de você criar a conta.</li>
        <li><strong className="font-medium text-foreground">Atendimento:</strong> as mensagens dos chamados e as avaliações que você escreve, com as fotos que enviar.</li>
      </ul>
    ),
  },
  {
    id: 'assistente',
    titulo: 'Conversas com o assistente virtual',
    conteudo: (
      <>
        <p>
          O assistente virtual responde por mensagem no celular sobre peças, estoque, lojas, pontos e pedidos. Para mostrar pontos e
          pedidos, ele pede o seu CPF e manda um código para o e-mail da sua conta. O CPF serve só para achar a conta
          e não fica guardado na conversa; o CPF e o código aparecem escondidos no texto que guardamos.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="text-left text-xs">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">O que</th>
                <th className="py-2 pr-4 font-medium">Por quanto tempo</th>
                <th className="py-2 font-medium">Para quê</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b align-top">
                <td className="py-3 pr-4">Texto completo da conversa</td>
                <td className="py-3 pr-4">90 dias, depois é apagado</td>
                <td className="py-3">Rever onde o assistente errou e melhorar as respostas</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-3 pr-4">Conversa que virou chamado</td>
                <td className="py-3 pr-4">Junto do chamado</td>
                <td className="py-3">A pessoa do atendimento lê o que você já contou, sem você repetir</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-3 pr-4">Pontos e pedidos que o assistente informou</td>
                <td className="py-3 pr-4">Sem prazo</td>
                <td className="py-3">Provar o que foi dito, se houver dúvida sobre um saldo</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-3 pr-4">Resumo sem identificação (assunto, se ajudou)</td>
                <td className="py-3 pr-4">Sem prazo</td>
                <td className="py-3">Contar quantas conversas o assistente resolveu; não dá para saber quem conversou</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          As respostas são escritas por um serviço de inteligência artificial, que recebe as suas mensagens e os dados
          que o nosso sistema consultou (nunca o CPF nem o código). Os números de pontos e pedidos vêm sempre do nosso
          sistema, não da inteligência artificial.
        </p>
      </>
    ),
  },
  {
    id: 'emails',
    titulo: 'E-mails que enviamos',
    conteudo: (
      <ul className="list-disc space-y-2 pl-5">
        <li>O código de confirmação, quando você pede pontos ou pedidos ao assistente.</li>
        <li>
          O lembrete de pontos vencendo, duas semanas antes, só se você aceitar (no cadastro, em{' '}
          <Link to="/loja/pontos" className="underline underline-offset-2">Meus pontos</Link> ou pelo assistente).
          Todo lembrete traz o link para parar de receber.
        </li>
      </ul>
    ),
  },
  {
    id: 'com-quem',
    titulo: 'Com quem compartilhamos',
    conteudo: (
      <>
        <p>Não vendemos seus dados. Usamos serviços que guardam ou processam dados em nosso nome:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>banco de dados e login da conta;</li>
          <li>servidores do site e do sistema;</li>
          <li>envio de e-mails;</li>
          <li>o assistente virtual e o serviço de inteligência artificial que escreve as respostas.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'no-seu-navegador',
    titulo: 'No seu navegador',
    conteudo: (
      <p>
        O navegador guarda o seu login, o carrinho e a loja que você escolheu (Casa Lorenzi ou Vulto), para não pedir de
        novo a cada visita. Não usamos cookies de propaganda.
      </p>
    ),
  },
  {
    id: 'seus-direitos',
    titulo: 'Seus direitos',
    conteudo: (
      <p>
        Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir para ver, corrigir ou apagar os seus dados, e
        desistir de um aceite que deu. Peça pelo{' '}
        <Link to="/loja/chamados/novo" className="underline underline-offset-2">Fale com a gente</Link>. Os dados
        de compras podem continuar guardados pelo tempo que a lei exige para notas e pagamentos.
      </p>
    ),
  },
]

export function Privacidade() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Caminho" className="mb-5 text-sm text-muted-foreground">
        <Link to="/loja" className="hover:text-foreground">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground" aria-current="page">Política de privacidade</span>
      </nav>
      <h1 className="mb-2 font-titulo text-4xl">Política de privacidade</h1>
      <p className="mb-10 text-sm text-muted-foreground">Atualizada em 29/10/2026. Vale para a Casa Lorenzi e a Vulto.</p>

      <div className="max-w-3xl space-y-10">
        {SECOES.map(({ id, titulo, conteudo }) => (
          <section key={id} id={id} aria-labelledby={`titulo-${id}`} className="scroll-mt-6">
            <h2 id={`titulo-${id}`} className="mb-3 border-l-4 border-aco pl-4 font-titulo text-2xl">{titulo}</h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">{conteudo}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
