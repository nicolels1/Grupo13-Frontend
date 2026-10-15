// o link do convite da equipe (e o de um link vencido) cai no endereço do site, não em
// /redefinir-senha: devolve o endereço de lá, onde a pessoa cria a senha (null = não é esse link).
// ?convite=1 avisa a tela de que a pessoa ainda não tem senha
export function enderecoDoLinkDeSenha(caminho: string, link: string): string | null {
  if (caminho === '/redefinir-senha') return null
  const convite = link.includes('type=invite')
  if (!convite && !link.includes('error_code=')) return null
  return `/redefinir-senha${convite ? '?convite=1' : ''}${link}`
}
