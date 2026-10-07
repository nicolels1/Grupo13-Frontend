import { useCallback, useEffect, useState, type DependencyList } from 'react'

import { ErroApi } from './api'

type EstadoCarga<T> = { dados: T | null; erro: string | null; carregando: boolean }

/**
 * Carrega dados da API e acompanha o estado da chamada.
 *   const { dados, erro, carregando, recarregar } = useCarregar(() => api('/unidades'), [])
 * Refaz a chamada quando as dependências mudam; ignora a resposta de uma chamada antiga.
 * `buscar` pode devolver null para não carregar nada (ex.: falta um filtro obrigatório).
 */
export function useCarregar<T>(buscar: () => Promise<T> | null, dependencias: DependencyList) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ dados: null, erro: null, carregando: true })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    const promessa = buscar()
    if (!promessa) {
      setEstado({ dados: null, erro: null, carregando: false })
      return undefined
    }
    setEstado((anterior) => ({ ...anterior, erro: null, carregando: true }))
    promessa
      .then((dados) => {
        if (ativo) setEstado({ dados, erro: null, carregando: false })
      })
      .catch((erro: unknown) => {
        const mensagem = erro instanceof ErroApi ? erro.message : 'Não foi possível carregar os dados'
        if (ativo) setEstado({ dados: null, erro: mensagem, carregando: false })
      })
    return () => {
      ativo = false
    }
    // as dependências vêm de quem chama, como no useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { ...estado, recarregar }
}

/**
 * Envia uma alteração e guarda o erro para mostrar no formulário.
 *   const { enviar, enviando, erro } = useEnviar()
 *   await enviar(() => api('/x', { metodo: 'POST', corpo }))  // devolve o resultado ou undefined se falhou
 */
export function useEnviar() {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const enviar = useCallback(async <T>(acao: () => Promise<T>): Promise<T | undefined> => {
    setEnviando(true)
    setErro(null)
    try {
      return await acao()
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível concluir a operação.')
      return undefined
    } finally {
      setEnviando(false)
    }
  }, [])

  return { enviar, enviando, erro, limparErro: () => setErro(null) }
}

/**
 * Devolve o valor só depois de `ms` sem mudança (ex.: a busca espera a pessoa parar de digitar).
 *   const buscaAplicada = useAdiado(busca, 300)
 */
export function useAdiado<T>(valor: T, ms = 300) {
  const [adiado, setAdiado] = useState(valor)
  useEffect(() => {
    const espera = setTimeout(() => setAdiado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])
  return adiado
}
