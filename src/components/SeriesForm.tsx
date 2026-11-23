import { useMemo, useState } from 'react'
import { saveMakeup, saveRecap } from '../data'
import { addDays, formatDate, mondayOf, toISO, todayISO } from '../dates'

const shift = addDays

/**
 * 2 décembre prochain (ou aujourd'hui si on est déjà en décembre) : les cases 1 & 2 sortent le 2,
 * pour ne jamais montrer une case avant son jour, et le teaser la veille, le 1er.
 */
function defaultStart() {
  const now = new Date()
  if (now.getMonth() === 11) return todayISO()
  return toISO(new Date(now.getFullYear(), 11, 2))
}

function casesLabel(first: number, last: number) {
  if (first === last) return `case ${first}`
  if (last === first + 1) return `cases ${first} & ${last}`
  return `cases ${first} à ${last}`
}

type Episode = { title: string; cases: string; hook: string; date: string; shoot: string }

/**
 * Série de looks à intervalle régulier (ex : calendrier de l'avent ouvert 2 cases à la fois).
 * Crée un makeup par épisode avec son tuto daté, plus en option un teaser et un récap carrousel.
 */
export function SeriesForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState('Calendrier wet liner Glisten')
  const [total, setTotal] = useState(24)
  const [perLook, setPerLook] = useState(2)
  const [start, setStart] = useState(defaultStart)
  const [every, setEvery] = useState(2)
  const [deadline, setDeadline] = useState(() => `${defaultStart().slice(0, 4)}-12-24`)
  const [teaser, setTeaser] = useState(true)
  const [recap, setRecap] = useState(true)
  const [sundays, setSundays] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const episodes: Episode[] = useMemo(() => {
    const list: Episode[] = []
    if (total < 1 || perLook < 1 || every < 1 || !start) return list
    for (let first = 1, i = 0; first <= total; first += perLook, i++) {
      const last = Math.min(first + perLook - 1, total)
      const date = shift(start, i * every)
      const cases = casesLabel(first, last)
      list.push({
        title: `${name} · ${cases}`,
        cases,
        hook: `Calendrier de l’avent · ${cases} 🎁`,
        date,
        shoot: shift(date, -1),
      })
    }
    return list
  }, [name, total, perLook, start, every])

  const last = episodes[episodes.length - 1]
  const teaserDate = shift(start, -1)
  const recapDate = last ? shift(last.date, 4) : null

  // Dimanches de la série (sauf celui du grand carrousel) : « mes wet liners préférés de la semaine »
  const sundayDates: string[] = []
  if (last) {
    for (let d = mondayOf(episodes[0].date); d <= last.date; d = shift(d, 7)) {
      const sunday = shift(d, 6)
      if (!(recap && sunday === recapDate)) sundayDates.push(sunday)
    }
  }

  async function create() {
    setSaving(true)
    setError(null)
    try {
      const base = { category: 'makeup' as const, is_collab: false, collab_with: null, photo_path: null, product_ids: [], dream_no: null, dream_slot: null, deadline: deadline || null }
      if (teaser) {
        await saveMakeup({
          ...base,
          category: 'unboxing',
          title: `${name} · teaser`,
          date: shift(teaserDate, -1),
          hook: 'Je l’ouvre avec vous à partir de demain 🎁',
          question: 'Vous pensez qu’il y a quelles couleurs dedans ?',
          deadline: start,
          notes: `Calendrier encore fermé. Annoncer le rythme : ${perLook > 1 ? `${perLook} cases` : '1 case'} tous les ${every > 1 ? `${every} jours` : 'jours'}.`,
          publications: [{ kind: 'video', date: teaserDate, status: 'a_faire' }],
        })
      }
      const ids: string[] = []
      for (const ep of episodes) {
        ids.push(
          await saveMakeup({
            ...base,
            title: ep.title,
            date: ep.shoot,
            hook: ep.hook,
            question: 'Tu aurais fait quoi avec ces couleurs ?',
            // Le jour du tournage est un jour sans post : une story suffit
            notes: `Story le jour du tournage : « Demain : ${ep.cases}, vous pariez sur quelles couleurs ? »`,
            publications: [{ kind: 'tuto', date: ep.date, status: 'a_faire' }],
          }),
        )
      }
      if (sundays) {
        for (const sunday of sundayDates) {
          const week = episodes.flatMap((ep, i) => (ep.date >= shift(sunday, -6) && ep.date <= sunday ? [ids[i]] : []))
          if (!week.length) continue
          await saveRecap({ title: `${name} · mes préférés de la semaine`, date: sunday, status: 'a_faire', makeup_ids: week })
        }
      }
      if (recap && recapDate) {
        await saveRecap({ title: `${name} · tu préfères lequel ?`, date: recapDate, status: 'a_faire', makeup_ids: ids })
      }
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="form">
      <label>Nom de la série<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
      <div className="series-grid">
        <label>Cases au total<input type="number" min={1} inputMode="numeric" value={total} onChange={(e) => setTotal(Number(e.target.value))} /></label>
        <label>Cases par look<input type="number" min={1} inputMode="numeric" value={perLook} onChange={(e) => setPerLook(Number(e.target.value))} /></label>
        <label>Premier tuto<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>Un tuto tous les<input type="number" min={1} inputMode="numeric" value={every} onChange={(e) => setEvery(Number(e.target.value))} /></label>
      </div>
      <label>
        À poster avant le
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      {deadline && last && last.date > deadline && (
        <p className="deadline-warn">Le dernier tuto ({formatDate(last.date)}) tombe après la date limite.</p>
      )}
      <label className="check"><input type="checkbox" checked={teaser} onChange={(e) => setTeaser(e.target.checked)} /> Teaser la veille du 1er tuto ({formatDate(teaserDate)})</label>
      <label className="check">
        <input type="checkbox" checked={sundays} onChange={(e) => setSundays(e.target.checked)} /> Vidéo du dimanche « mes préférés de la semaine »
        {sundayDates.length ? ` (${sundayDates.map((d) => Number(d.slice(8))).join(', ')})` : ''}
      </label>
      <label className="check"><input type="checkbox" checked={recap} onChange={(e) => setRecap(e.target.checked)} /> Carrousel « tu préfères lequel ? » 4 jours après la fin{recapDate ? ` (${formatDate(recapDate)})` : ''}</label>

      <fieldset>
        <legend>{episodes.length} tuto{episodes.length > 1 ? 's' : ''}{last ? `, jusqu’au ${formatDate(last.date)}` : ''}</legend>
        <div className="series-preview">
          {episodes.map((ep) => (
            <div key={ep.date + ep.title}>
              <strong>{formatDate(ep.date)}</strong>
              <span>{ep.title.slice(name.length + 3)}</span>
            </div>
          ))}
        </div>
        <p className="muted">Chaque look est créé « À faire », avec un tournage prévu la veille. Tu peux tout ajuster ensuite.</p>
      </fieldset>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={onCancel}>Annuler</button>
        <button type="button" className="primary" disabled={saving || !episodes.length || !name.trim()} onClick={create}>
          {saving ? 'Création…' : `Créer la série`}
        </button>
      </div>
    </div>
  )
}
