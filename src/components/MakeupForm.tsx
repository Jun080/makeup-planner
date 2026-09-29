import { useEffect, useMemo, useState } from 'react'
import { saveMakeup, deleteRow, deletePhoto, uploadPhoto, type PublicationDraft } from '../data'
import { daysUntil, todayISO } from '../dates'
import { CATEGORIES, PUB_KINDS, STATUSES, STATUS_ORDER, productLabel } from '../types'
import type { Category, Makeup, MakeupPubKind, Product, Status } from '../types'
import { ProductForm } from './ProductForm'
import { Sheet } from './Sheet'

const MAKEUP_KINDS: MakeupPubKind[] = ['tuto', 'photo', 'video']

export type MakeupDraft = Partial<Omit<Makeup, 'publications'>> & { publications?: PublicationDraft[] }

/** Photo : inchangée (null), nouvelle (File) ou retirée ('removed'). */
type PhotoChange = null | File | 'removed'

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
  const [date, setDate] = useState(initial.date ?? todayISO())
  const [isCollab, setIsCollab] = useState(initial.is_collab ?? false)
  const [collabWith, setCollabWith] = useState(initial.collab_with ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [pubs, setPubs] = useState<PublicationDraft[]>(
    (initial.publications ?? []).map(({ id, kind, date, status }) => ({ id, kind, date, status })),
  )
  const [productIds, setProductIds] = useState<string[]>(initial.product_ids ?? [])
  const [productQuery, setProductQuery] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [photoChange, setPhotoChange] = useState<PhotoChange>(null)
  const [preview, setPreview] = useState<string | null>(initial.photo_url ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Aperçu local de la nouvelle photo
  useEffect(() => {
    if (!(photoChange instanceof File)) return
    const url = URL.createObjectURL(photoChange)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoChange])

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    const list = q ? products.filter((p) => productLabel(p).toLowerCase().includes(q)) : products
    // Produits sélectionnés en premier
    return [...list].sort((a, b) => Number(productIds.includes(b.id)) - Number(productIds.includes(a.id)))
  }, [products, productQuery, productIds])

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  function addPub(kind: MakeupPubKind) {
    // Makeup pas encore réalisé (date future) → "À faire", sinon "Réalisé"
    const status: Status = daysUntil(date) > 0 ? 'a_faire' : 'realise'
    setPubs([...pubs, { kind, date: null, status }])
  }

  function updatePub(i: number, patch: Partial<PublicationDraft>) {
    setPubs(pubs.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const oldPath = initial.photo_path ?? null
      let photoPath = oldPath
      if (photoChange instanceof File) photoPath = await uploadPhoto(photoChange)
      if (photoChange === 'removed') photoPath = null

      await saveMakeup({
        id: initial.id,
        title: title.trim(),
        category,
        date,
        is_collab: isCollab,
        collab_with: collabWith.trim() || null,
        notes: notes.trim() || null,
        photo_path: photoPath,
        product_ids: productIds,
        publications: pubs,
      })
      if (oldPath && oldPath !== photoPath) await deletePhoto(oldPath)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial.id || !confirm('Supprimer ce makeup et ses publications ?')) return
    await deleteRow('makeups', initial.id)
    if (initial.photo_path) await deletePhoto(initial.photo_path)
    onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="ex : Look Halloween squelette" /></label>

      <fieldset>
        <legend>Photo du makeup</legend>
        {preview && <img className="photo-preview" src={preview} alt="" />}
        <div className="chips">
          <label className="chip file-chip">
            📷 {preview ? 'Changer la photo' : 'Ajouter une photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setPhotoChange(file)
                e.target.value = ''
              }}
            />
          </label>
          {preview && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setPhotoChange('removed')
                setPreview(null)
              }}
            >
              Retirer
            </button>
          )}
        </div>
      </fieldset>

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

      <label>Date de réalisation<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>

      <label className="check"><input type="checkbox" checked={isCollab} onChange={(e) => setIsCollab(e.target.checked)} /> Collab</label>
      {isCollab && (
        <label>Avec qui ?<input value={collabWith} onChange={(e) => setCollabWith(e.target.value)} placeholder="@compte" /></label>
      )}

      <fieldset>
        <legend>Publications ({pubs.length})</legend>
        {pubs.map((p, i) => (
          <div key={p.id ?? `new-${i}`} className="pub-row">
            <select value={p.kind} onChange={(e) => updatePub(i, { kind: e.target.value as MakeupPubKind })}>
              {MAKEUP_KINDS.map((k) => <option key={k} value={k}>{PUB_KINDS[k]}</option>)}
            </select>
            <input
              type="date"
              value={p.date ?? ''}
              onChange={(e) => updatePub(i, { date: e.target.value || null })}
              aria-label="Date de publication"
            />
            <select value={p.status} onChange={(e) => updatePub(i, { status: e.target.value as Status })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
            </select>
            <button type="button" className="icon-btn" onClick={() => setPubs(pubs.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
          </div>
        ))}
        <p className="muted">Laisse la date vide pour garder la publication en réserve.</p>
        <div className="chips">
          <button type="button" className="chip" onClick={() => addPub('tuto')}>+ {PUB_KINDS.tuto}</button>
          <button type="button" className="chip" onClick={() => addPub('photo')}>+ {PUB_KINDS.photo}</button>
          <button type="button" className="chip" onClick={() => addPub('video')}>+ {PUB_KINDS.video}</button>
        </div>
      </fieldset>

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
        <button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
