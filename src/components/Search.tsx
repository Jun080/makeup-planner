import { useMemo, useState } from 'react'
import { CATEGORIES, FORMATS } from '../types'
import type { Makeup, Product } from '../types'
import { MakeupCard } from './MakeupCard'

const unique = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => Boolean(v && v.trim())).map((v) => v.trim()))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  )

export function Search({
  makeups,
  products,
  onOpen,
}: {
  makeups: Makeup[]
  products: Product[]
  onOpen: (m: Makeup) => void
}) {
  const [q, setQ] = useState('')
  const [color, setColor] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('')
  const [collab, setCollab] = useState('')

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const colors = unique(products.map((p) => p.color))
  const brands = unique(products.map((p) => p.brand))
  const collabs = unique(makeups.map((m) => m.collab_with))

  const results = makeups
    .filter((m) => {
      const used = m.product_ids.map((id) => productById.get(id)).filter((p): p is Product => Boolean(p))
      if (q && !`${m.title} ${m.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
      if (color && !used.some((p) => p.color?.trim() === color)) return false
      if (brand && !used.some((p) => p.brand.trim() === brand)) return false
      if (type) {
        const [kind, value] = type.split(':')
        if (kind === 'cat' && m.category !== value) return false
        if (kind === 'fmt' && !m.formats.includes(value as Makeup['formats'][number])) return false
        if (kind === 'tuto' && !m.is_tuto) return false
      }
      if (collab === 'oui' && !m.is_collab) return false
      if (collab === 'non' && m.is_collab) return false
      if (collab.startsWith('@') && m.collab_with?.trim() !== collab.slice(1)) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <input className="search" placeholder="🔍 Rechercher un makeup…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <select value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">Couleur</option>
          {colors.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Marque</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Type</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={`cat:${k}`}>{v}</option>)}
          {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={`fmt:${k}`}>{v}</option>)}
          <option value="tuto:1">Tuto</option>
        </select>
        <select value={collab} onChange={(e) => setCollab(e.target.value)}>
          <option value="">Collab</option>
          <option value="oui">Avec collab</option>
          <option value="non">Sans collab</option>
          {collabs.map((c) => <option key={c} value={`@${c}`}>{c}</option>)}
        </select>
      </div>
      <p className="muted">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
      {results.map((m) => <MakeupCard key={m.id} makeup={m} onOpen={() => onOpen(m)} />)}
    </div>
  )
}
