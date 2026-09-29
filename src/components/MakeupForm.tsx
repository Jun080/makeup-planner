import { useMemo, useState } from 'react'
import { saveMakeup, deleteRow } from '../data'
import { todayISO } from '../dates'
import { CATEGORIES, FORMATS, STATUSES, STATUS_ORDER, productLabel } from '../types'
import type { Category, Format, Makeup, Product, Status } from '../types'
import { ProductForm } from './ProductForm'
import { Sheet } from './Sheet'

export type MakeupDraft = Partial<Makeup>

export function MakeupForm({
  initial,
  products,
  onSaved,
  onCancel,
  onProductsChanged,
}: {
  initial: MakeupDraft
  products: Product[]
  onSaved: () => void
  onCancel: () => void
  onProductsChanged: () => Promise<void>
}) {
  const [title, setTitle] = useState(initial.title ?? '')
  const [category, setCategory] = useState<Category>(initial.category ?? 'makeup')
  const [formats, setFormats] = useState<Format[]>(initial.formats ?? [])
  const [isTuto, setIsTuto] = useState(initial.is_tuto ?? false)
  const [date, setDate] = useState(initial.date ?? todayISO())
  const [isCollab, setIsCollab] = useState(initial.is_collab ?? false)
  const [collabWith, setCollabWith] = useState(initial.collab_with ?? '')
  const [status, setStatus] = useState<Status>(initial.status ?? 'realise')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [productIds, setProductIds] = useState<string[]>(initial.product_ids ?? [])
  const [productQuery, setProductQuery] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    const list = q ? products.filter((p) => productLabel(p).toLowerCase().includes(q)) : products
    // Produits sélectionnés en premier
    return [...list].sort((a, b) => Number(productIds.includes(b.id)) - Number(productIds.includes(a.id)))
  }, [products, productQuery, productIds])

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveMakeup({
        id: initial.id,
        title: title.trim(),
        category,
        formats,
        is_tuto: isTuto,
        date,
        is_collab: isCollab,
        collab_with: collabWith.trim() || null,
        status,
        notes: notes.trim() || null,
        product_ids: productIds,
      })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial.id || !confirm('Supprimer ce makeup ?')) return
    await deleteRow('makeups', initial.id)
    onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="ex : Look Halloween squelette" /></label>

      <fieldset>
        <legend>Type</legend>
        <div className="chips">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button type="button" key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>
              {CATEGORIES[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Contenu</legend>
        <div className="chips">
          {(Object.keys(FORMATS) as Format[]).map((f) => (
            <button type="button" key={f} className={`chip ${formats.includes(f) ? 'on' : ''}`} onClick={() => setFormats(toggle(formats, f))}>
              {FORMATS[f]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="check"><input type="checkbox" checked={isTuto} onChange={(e) => setIsTuto(e.target.checked)} /> Tuto</label>

      <label>Date de publication<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>

      <label className="check"><input type="checkbox" checked={isCollab} onChange={(e) => setIsCollab(e.target.checked)} /> Collab</label>
      {isCollab && (
        <label>Avec qui ?<input value={collabWith} onChange={(e) => setCollabWith(e.target.value)} placeholder="@compte" /></label>
      )}

      <label>
        Étape
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
        </select>
      </label>

      <fieldset>
        <legend>Produits utilisés ({productIds.length})</legend>
        <input placeholder="Rechercher un produit…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
        <div className="product-picker">
          {filteredProducts.map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={productIds.includes(p.id)} onChange={() => setProductIds(toggle(productIds, p.id))} />
              {productLabel(p)}
            </label>
          ))}
          {!filteredProducts.length && <p className="muted">Aucun produit.</p>}
        </div>
        {addingProduct && (
          <Sheet title="Nouveau produit" onClose={() => setAddingProduct(false)}>
            <ProductForm
              onCancel={() => setAddingProduct(false)}
              onSaved={async (id) => {
                await onProductsChanged()
                setProductIds((ids) => [...ids, id])
                setAddingProduct(false)
              }}
            />
          </Sheet>
        )}
        <button type="button" className="link" onClick={() => setAddingProduct(true)}>+ Nouveau produit</button>
      </fieldset>

      <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></label>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        {initial.id && <button type="button" className="danger" onClick={remove}>Supprimer</button>}
        <button type="button" onClick={onCancel}>Annuler</button>
        <button className="primary" disabled={saving}>Enregistrer</button>
      </div>
    </form>
  )
}
