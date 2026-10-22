import { Select } from '@/components/ui/input'
import { MARCAS } from '@/lib/formato'
import type { FiltroDeMarca } from './useFiltroDeMarca'

// seletor do filtro de marca das listas (useFiltroDeMarca decide se aparece)
export function SeletorDeMarca({ filtro, className }: { filtro: FiltroDeMarca; className?: string }) {
  if (!filtro.mostra) return null
  return (
    <Select aria-label="Marca" value={filtro.valor} onChange={(e) => filtro.mudar(e.target.value)} className={className}>
      <option value="">As duas marcas</option>
      {Object.entries(MARCAS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
    </Select>
  )
}
