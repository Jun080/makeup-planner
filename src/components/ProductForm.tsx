import { useState } from 'react'
import { saveProduct, deleteRow } from '../data'
import type { Product } from '../types'
import { ask } from './ConfirmDialog'

export function ProductForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Product
  onSaved: (id: string) => void
  onCancel: () => void
}) {
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [product, setProduct] = useState(initial?.product ?? '')
  const [color, setColor] = useState(initial?.color ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [isPr, setIsPr] = useState(initial?.is_pr ?? false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSaving(true)
    try {
      const id = await saveProduct({
        id: initial?.id,
        brand: brand.trim(),
        product: product.trim(),
        color: color.trim() || null,
        name: name.trim() || null,
        is_pr: isPr,
      })
      onSaved(id)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    const ok = await ask({
      title: 'Supprimer ce produit ?',
      message: 'Il sera retiré des contenus qui l’utilisent.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    await deleteRow('products', initial.id)
    onSaved(initial.id)
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Marque<input value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="ex : Huda Beauty" /></label>
      <label>Produit<input value={product} onChange={(e) => setProduct(e.target.value)} required placeholder="ex : Palette, Rouge à lèvres" /></label>
      <label>Nom<input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : Nude Obsessions" /></label>
      <label>Couleur<input value={color} onChange={(e) => setColor(e.target.value)} placeholder="ex : Rose, Marron" /></label>
      <label className="check"><input type="checkbox" checked={isPr} onChange={(e) => setIsPr(e.target.checked)} /> PR / offert</label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        {initial && <button type="button" className="danger" onClick={remove}>Supprimer</button>}
        <button type="button" onClick={onCancel}>Annuler</button>
        <button className="primary" disabled={saving}>Enregistrer</button>
      </div>
    </form>
  )
}
