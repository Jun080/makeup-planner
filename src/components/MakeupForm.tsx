import { useEffect, useMemo, useState } from 'react'
import { Camera, Check, Copy, X } from 'lucide-react'
import { saveMakeup, deleteRow, deletePhoto, setAbandoned, uploadPhoto, type PublicationDraft } from '../data'
import { daysUntil, formatDate, todayISO } from '../dates'
import { buildCaption, CATEGORIES, CATEGORY_INFO, DA_REMINDER, DREAM_SLOTS, dreamLabel, EVENTS, HOOK_IDEAS, nextOccurrence, PUB_KINDS, QUESTION_IDEAS, STATUSES, STATUS_ORDER, productLabel } from '../types'
import type { Category, Dream, Makeup, MakeupPubKind, Product, Status } from '../types'
import { ProductForm } from './ProductForm'
import { Sheet } from './Sheet'
import { ask } from './ConfirmDialog'

const MAKEUP_KINDS: MakeupPubKind[] = ['tuto', 'photo', 'video']

export type MakeupDraft = Partial<Omit<Makeup, 'publications'>> & { publications?: PublicationDraft[] }

/** Photo : inchangée (null), nouvelle (File) ou retirée ('removed'). */
type PhotoChange = null | File | 'removed'

export function MakeupForm({
  initial,
  products,
  dreams,
  onSaved,
  onCancel,
  onProductsChanged,
}: {
  initial: MakeupDraft
  products: Product[]
  dreams: Dream[]
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
  const [dreamNo, setDreamNo] = useState<number | null>(initial.dream_no ?? null)
  const [dreamSlot, setDreamSlot] = useState<number | null>(initial.dream_slot ?? null)
  const [hook, setHook] = useState(initial.hook ?? '')
  const [question, setQuestion] = useState(initial.question ?? '')
  const [deadline, setDeadline] = useState(initial.deadline ?? '')
  const [copied, setCopied] = useState(false)
  const info = CATEGORY_INFO[category]
  const defaultPubs = (c: Category): PublicationDraft[] =>
    CATEGORY_INFO[c].defaultKinds.map((kind) => ({ kind, date: null, status: 'realise' }))
  const [pubs, setPubs] = useState<PublicationDraft[]>(() =>
    initial.publications
      ? initial.publications.map(({ id, kind, date, status }) => ({ id, kind, date, status }))
      : initial.id
        ? []
        : defaultPubs(initial.category ?? 'makeup'),
  )
  // Tant que les publications n'ont pas été modifiées, changer de type remet celles par défaut
  const [pubsTouched, setPubsTouched] = useState(Boolean(initial.id || initial.publications))
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
    // Contenu pas encore tourné (date future) → "À faire", sinon "Réalisé"
    const status: Status = daysUntil(date) > 0 ? 'a_faire' : 'realise'
    setPubs([...pubs, { kind, date: null, status }])
    setPubsTouched(true)
  }

  function updatePub(i: number, patch: Partial<PublicationDraft>) {
    setPubs(pubs.map((p, j) => (j === i ? { ...p, ...patch } : p)))
    setPubsTouched(true)
  }

  function changeCategory(c: Category) {
    setCategory(c)
    if (!pubsTouched) setPubs(defaultPubs(c))
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
        dream_no: dreamNo,
        dream_slot: dreamNo ? dreamSlot : null,
        hook: hook.trim() || null,
        question: question.trim() || null,
        deadline: deadline || null,
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

  const caption = buildCaption(
    { title: title.trim() || 'Sans titre', dream_no: dreamNo, question },
    products.filter((p) => productIds.includes(p.id)),
    dreams.find((d) => d.no === dreamNo)?.theme,
  )

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Copie impossible : sélectionne le texte à la main')
    }
  }

  async function toggleAbandon() {
    if (!initial.id) return
    const abandon = !initial.abandoned_at
    if (
      abandon &&
      !(await ask({
        title: 'Abandonner ce contenu ?',
        message: 'Il disparaîtra du planning. Tu pourras le reprendre depuis la recherche ou le pipeline.',
        confirmLabel: 'Abandonner',
      }))
    )
      return
    await setAbandoned('makeups', initial.id, abandon)
    onSaved()
  }

  async function remove() {
    if (!initial.id) return
    const ok = await ask({
      title: 'Supprimer ce contenu ?',
      message: 'Ses publications et sa photo seront supprimées définitivement.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    await deleteRow('makeups', initial.id)
    if (initial.photo_path) await deletePhoto(initial.photo_path)
    onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      {initial.abandoned_at && (
        <div className="abandoned-banner">
          <span>Abandonné le {formatDate(initial.abandoned_at.slice(0, 10))}</span>
          <button type="button" className="primary" onClick={toggleAbandon}>Reprendre</button>
        </div>
      )}
      <div className="chips">
        {(Object.keys(CATEGORIES) as Category[]).map((c) => (
          <button type="button" key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => changeCategory(c)}>
            {CATEGORIES[c]}
          </button>
        ))}
      </div>

      <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={info.placeholder} /></label>

      <fieldset>
        <legend>Photo</legend>
        {preview && <img className="photo-preview" src={preview} alt="" />}
        <div className="chips">
          <label className="chip file-chip">
            <Camera size={16} /> {preview ? 'Changer la photo' : 'Ajouter une photo'}
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

      <label>Date de tournage<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>

      <fieldset>
        <label>
          À poster avant le (facultatif)
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <div className="chips small-chips">
          {EVENTS.map((ev) => {
            const iso = nextOccurrence(ev.md)
            return (
              <button type="button" key={ev.md} className={`chip ${deadline === iso ? 'on' : ''}`} onClick={() => setDeadline(iso)}>
                {ev.label}
              </button>
            )
          })}
          {deadline && <button type="button" className="chip" onClick={() => setDeadline('')}>Pas de date limite</button>}
        </div>
        {deadline && daysUntil(deadline) < 0 && (
          <p className="deadline-warn">La date limite est passée : ce contenu n’a sans doute plus de sens.</p>
        )}
        {deadline && pubs.some((p) => p.date && p.date > deadline) && (
          <p className="deadline-warn">Une publication est prévue après le {formatDate(deadline)}.</p>
        )}
      </fieldset>

      <label className="check"><input type="checkbox" checked={isCollab} onChange={(e) => setIsCollab(e.target.checked)} /> Collab</label>
      {isCollab && (
        <label>Avec qui ?<input value={collabWith} onChange={(e) => setCollabWith(e.target.value)} placeholder="@compte" /></label>
      )}

      <fieldset>
        <legend>Publications ({pubs.length})</legend>
        {pubs.map((p, i) => (
          <div key={p.id ?? `new-${i}`} className="pub-row">
            <select className="pub-kind" value={p.kind} onChange={(e) => updatePub(i, { kind: e.target.value as MakeupPubKind })}>
              {MAKEUP_KINDS.map((k) => <option key={k} value={k}>{PUB_KINDS[k]}</option>)}
            </select>
            <input
              type="date"
              className="pub-date"
              value={p.date ?? ''}
              onChange={(e) => updatePub(i, { date: e.target.value || null })}
              aria-label="Date de publication"
            />
            <select className="pub-status" value={p.status} onChange={(e) => updatePub(i, { status: e.target.value as Status })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
            </select>
            <button type="button" className="icon-btn pub-remove" onClick={() => { setPubs(pubs.filter((_, j) => j !== i)); setPubsTouched(true) }} aria-label="Retirer"><X size={18} /></button>
          </div>
        ))}
        <p className="muted">Laisse la date vide pour garder la publication en réserve.</p>
        <div className="chips">
          {info.withTuto && <button type="button" className="chip" onClick={() => addPub('tuto')}>+ {PUB_KINDS.tuto}</button>}
          <button type="button" className="chip" onClick={() => addPub('photo')}>+ {PUB_KINDS.photo}</button>
          <button type="button" className="chip" onClick={() => addPub('video')}>+ {PUB_KINDS.video}</button>
        </div>
      </fieldset>

      <fieldset className="da">
        <legend>Direction artistique</legend>
        <ul className="da-reminder">
          {DA_REMINDER.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <div className="series-grid">
          <label>
            Rêve
            <select value={dreamNo ?? ''} onChange={(e) => setDreamNo(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Aucun</option>
              {/* Un ancien numéro sans rêve enregistré reste sélectionnable */}
              {dreamNo !== null && !dreams.some((d) => d.no === dreamNo) && <option value={dreamNo}>Rêve n°{dreamNo}</option>}
              {dreams.map((d) => <option key={d.id} value={d.no}>{dreamLabel(d)}</option>)}
            </select>
          </label>
          {dreamNo !== null && (
            <label>
              Place dans la semaine
              <select value={dreamSlot ?? ''} onChange={(e) => setDreamSlot(e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {DREAM_SLOTS.map((s) => <option key={s.slot} value={s.slot}>Makeup {s.slot} · {s.label}</option>)}
              </select>
            </label>
          )}
        </div>
        <label>
          Accroche à l’écran
          <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Le texte visible dès la 1re seconde" />
        </label>
        {!hook && (
          <div className="chips small-chips">
            {HOOK_IDEAS.map((h) => <button type="button" key={h} className="chip" onClick={() => setHook(h)}>{h}</button>)}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>{info.products} ({productIds.length})</legend>
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

      <fieldset>
        <legend>Description</legend>
        <label>
          Question pour les commentaires
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Vous en pensez quoi ?" />
        </label>
        {!question && (
          <div className="chips small-chips">
            {QUESTION_IDEAS.map((q) => <button type="button" key={q} className="chip" onClick={() => setQuestion(q)}>{q}</button>)}
          </div>
        )}
        <pre className="caption">{caption}</pre>
        <button type="button" className="chip copy-btn" onClick={copyCaption}>
          {copied ? <><Check size={16} /> Copiée</> : <><Copy size={16} /> Copier la description</>}
        </button>
      </fieldset>

      <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></label>

      {error && <p className="error">{error}</p>}
      {initial.id && !initial.abandoned_at && (
        <button type="button" className="abandon-btn" onClick={toggleAbandon}>Abandonner ce contenu</button>
      )}
      <div className="actions">
        {initial.id && <button type="button" className="danger" onClick={remove}>Supprimer</button>}
        <button type="button" onClick={onCancel}>Annuler</button>
        <button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
