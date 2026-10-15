import { useEffect, useRef, useState } from 'react'

// abre a impressão assim que a tela aparece; `imprimiu` libera o próximo atendimento
export function useImprimirAoAbrir() {
  const [imprimiu, setImprimiu] = useState(false)
  const abriu = useRef(false)

  function imprimir() {
    window.print()
    setImprimiu(true)
  }

  useEffect(() => {
    // o StrictMode roda o efeito duas vezes no desenvolvimento: abre a impressão uma vez só
    if (abriu.current) return undefined
    abriu.current = true
    const espera = setTimeout(imprimir, 0)
    return () => clearTimeout(espera)
  }, [])

  return { imprimiu, imprimir }
}
