import { useMemo, useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { deleteRecap, saveRecap } from '../data'
import { formatDate, toISO } from '../dates'
import { CATEGORY_INFO, STATUSES, STATUS_ORDER } from '../types'
import type { Makeup, Recap, Status } from '../types'
import { Thumb } from './Thumb'

export type RecapDraft = Partial<Recap>

/** Mois par défaut : celui d'il y a 10 jours (fin septembre ou début octobre → septembre). */
function defaultMonth() {
  const d = new Date()
  d.setDate(d.getDate() - 10)
  return toISO(d).slice(0, 7)
}

const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00`).toLocaleDateString('fr-FR', { month: 'long' })

/** Makeups réalisés ou publiés pendant le mois `ym` (YYYY-MM). */
function inMonth(m: Makeup, ym: string) {
  return m.date.startsWith(ym) || m.publications.some((p) => p.date?.startsWith(ym))
}

export function RecapForm({
  initial,
  makeups,
  onSaved,
  onCancel,
}: {
  initial: RecapDraft
  makeups: Makeup[]
  onSaved: () => void
  onCancel: () => void
}) {
  const isNew = !initial.id
  const [month, setMonth] = useState(defaultMonth)
  const [title, setTitle] = useState(initial.title ?? `Récap ${monthName(month)}`)
  const [date, setDate] = useState(initial.date ?? '')
  const [status, setStatus] = useState<Status>(initial.status ?? 'realise')
  const [selected, setSelected] = useState<string[]>(
    initial.makeup_ids ?? makeups.filter((m) => inMonth(m, month)).map((m) => m.id),
  )
  const [showAll, setShowAll] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const list = useMemo(() => {
    const shown = showAll ? makeups : makeups.filter((m) => inMonth(m, month) || selected.includes(m.id))
    return [...shown].sort((a, b) => b.date.localeCompare(a.date))
  }, [makeups, month, showAll, selected])

  function changeMonth(ym: string) {
    if (!ym) return
    // Nouveau récap : on suit le mois choisi (titre + makeups du mois)
    if (isNew) {
      if (title === `Récap ${monthName(month)}`) setTitle(`Récap ${monthName(ym)}`)
      setSelected(makeups.filter((m) => inMonth(m, ym)).map((m) => m.id))
    }
    setMonth(ym)
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveRecap({ id: initial.id, title: title.trim(), date: date || null, status, makeup_ids: selected })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial.id || !confirm('Supprimer ce récap ? (les contenus sont conservés)')) return
    await deleteRecap(initial.id)
    onSaved()
  }

  const selectedPhotos = makeups.filter((m) => selected.includes(m.id)).map((m) => m.photo_url)

  return (
    <form className="form" onSubmit={submit}>
      {selectedPhotos.some(Boolean) && <Thumb urls={selectedPhotos} className="recap-preview" icon={Layers} />}

      <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>

      <div className="pub-row recap-row">
        <label>Date de publication<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>
          Étape
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
          </select>
        </label>
      </div>
      <p className="muted">Laisse la date vide pour garder le récap en réserve.</p>

      <fieldset>
        <legend>Contenus dans le récap ({selected.length})</legend>
        <div className="row recap-filter">
          <label>Mois<input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} disabled={showAll} /></label>
          <label className="check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Tout afficher</label>
        </div>
        <div className="recap-picker">
          {list.map((m) => (
            <label key={m.id} className={`recap-item ${selected.includes(m.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} hidden />
              <Thumb urls={[m.photo_url]} icon={CATEGORY_INFO[m.category].icon} />
              <span>
                <strong>{m.title}</strong>
                <small>{formatDate(m.date)}</small>
              </span>
              <span className="recap-check">{selected.includes(m.id) && <Check size={14} strokeWidth={3} />}</span>
            </label>
          ))}
          {!list.length && <p className="muted">Rien ce mois-ci.</p>}
        </div>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        {initial.id && <button type="button" className="danger" onClick={remove}>Supprimer</button>}
        <button type="button" onClick={onCancel}>Annuler</button>
        <button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
