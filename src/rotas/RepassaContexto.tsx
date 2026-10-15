import { Outlet, useOutletContext } from 'react-router'

// um <Outlet> aninhado começa sem contexto: repassa o do layout de cima (ex.: a unidade escolhida do interno)
export function RepassaContexto() {
  return <Outlet context={useOutletContext()} />
}
