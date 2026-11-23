import { useState } from 'react'
import { deleteDream, markThemeUsed, renameDreamContent, saveDream, saveMakeup, saveRecap } from '../data'
import { addDays, formatDate, mondayOf, todayISO } from '../dates'
import { DREAM_SLOTS, dreamCarouselTitle, dreamMakeupTitle } from '../types'
import type { Dream, Makeup, Recap, ThemeIdea } from '../types'
import { ask } from './ConfirmDialog'

export type DreamDraft = Partial<Dream>

const QUESTIONS: Record<number, string> = {
  1: 'Vous en pensez quoi ?',
  2: 'Tu oserais le porter ?',
  3: 'Tu l’envoies à qui ?',
  4: 'Tu le porterais au boulot ?',
}

/** Semaine de tournage proposée : celle qui suit le dernier rêve, sinon lundi prochain. */
function defaultWeek(dreams: Dream[]) {
  const nextMonday = addDays(mondayOf(todayISO()), 7)
  const last = [...dreams].sort((a, b) => b.shoot_week.localeCompare(a.shoot_week))[0]
  const afterLast = last ? addDays(last.shoot_week, 7) : nextMonday
  return afterLast > nextMonday ? afterLast : nextMonday
}

/**
 * Créer un rêve (thème de la semaine) avec ses makeups 1 à 3 (ou 4) tournés la semaine N
 * et postés la semaine N+1, plus le carrousel du dimanche. Ou modifier le thème après le vote.
 */
export function DreamForm({
  initial,
  dreams,
  makeups,
  recaps,
  themes,
  onSaved,
  onCancel,
}: {
  initial: DreamDraft
  dreams: Dream[]
  makeups: Makeup[]
  recaps: Recap[]
  themes: ThemeIdea[]
  onSaved: () => void
  onCancel: () => void
}) {
  const isNew = !initial.id
  const [no, setNo] = useState(initial.no ?? Math.max(0, ...dreams.map((d) => d.no)) + 1)
  const [theme, setTheme] = useState(initial.theme ?? '')
  const [week, setWeek] = useState(initial.shoot_week ?? defaultWeek(dreams))
  const [count, setCount] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dream = { no, theme: theme.trim() || null }
  const slots = DREAM_SLOTS.slice(0, count)
  const plan = slots.map((s) => ({ ...s, shoot: addDays(week, s.day), post: addDays(week, 7 + s.day) }))
  const carouselDate = addDays(week, 13)
  const content = makeups
    .filter((m) => m.dream_no === initial.no && !m.abandoned_at)
    .sort((a, b) => (a.dream_slot ?? 9) - (b.dream_slot ?? 9))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isNew && dreams.some((d) => d.no === no)) {
      setError(`Le rêve n°${no} existe déjà.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (!isNew) {
        await saveDream({ id: initial.id, no, theme: dream.theme, shoot_week: week })
        await renameDreamContent({ no: initial.no!, theme: initial.theme ?? null }, dream, makeups, recaps)
        await markThemeUsed(themes, dream.theme)
        onSaved()
        return
      }
      await saveDream({ no, theme: dream.theme, shoot_week: week })
      const ids: string[] = []
      for (const s of plan) {
        ids.push(
          await saveMakeup({
            category: 'makeup',
            title: dreamMakeupTitle(dream, s.slot),
            date: s.shoot,
            is_collab: false,
            collab_with: null,
            notes: s.hint,
            photo_path: null,
            product_ids: [],
            dream_no: no,
            dream_slot: s.slot,
            hook: s.hook(no, dream.theme),
            question: QUESTIONS[s.slot],
            deadline: null,
            publications: [{ kind: s.kind, date: s.post, status: 'a_faire' }],
          }),
        )
      }
      await saveRecap({ title: dreamCarouselTitle(dream), date: carouselDate, status: 'a_faire', makeup_ids: ids })
      await markThemeUsed(themes, dream.theme)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  async function remove() {
    const ok = await ask({
      title: `Supprimer le rêve n°${initial.no} ?`,
      message: 'Ses makeups et son carrousel restent dans le planning, ils ne seront juste plus rattachés à un thème.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    await deleteDream(initial.id!)
    onSaved()
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="series-grid">
        <label>
          Rêve n°
          <input type="number" min={1} inputMode="numeric" value={no} disabled={!isNew} onChange={(e) => setNo(Number(e.target.value))} />
        </label>
        <label>
          Semaine de tournage
          <input type="date" value={week} disabled={!isNew} onChange={(e) => e.target.value && setWeek(mondayOf(e.target.value))} />
        </label>
      </div>
      <label>
        Thème
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="ex : Abysses (laisse vide si le vote n’est pas fini)" />
      </label>
      {themes.some((t) => !t.used_at) && (
        <div className="chips small-chips">
          {themes.filter((t) => !t.used_at).map((t) => (
            <button type="button" key={t.id} className={`chip ${theme === t.name ? 'on' : ''}`} onClick={() => setTheme(t.name)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {isNew ? (
        <>
          <div className="segmented">
            <button type="button" className={count === 3 ? 'on' : ''} onClick={() => setCount(3)}>3 makeups</button>
            <button type="button" className={count === 4 ? 'on' : ''} onClick={() => setCount(4)}>4 makeups</button>
          </div>
          <fieldset>
            <legend>Tournage semaine du {formatDate(week)}, posts la semaine suivante</legend>
            <div className="series-preview dream-preview">
              {plan.map((s) => (
                <div key={s.slot}>
                  <strong>Makeup {s.slot}</strong>
                  <span>
                    {s.label}
                    <small>Tournage {formatDate(s.shoot)} → post {formatDate(s.post)}</small>
                  </span>
                </div>
              ))}
              <div>
                <strong>Carrousel</strong>
                <span>
                  « Tu préfères lequel ? »
                  <small>Post {formatDate(carouselDate)}</small>
                </span>
              </div>
            </div>
            <p className="muted">Tout est créé « À faire » avec l’accroche et la question. Le 4e makeup (vendredi) est le bonus des semaines où tu as le temps.</p>
          </fieldset>
        </>
      ) : (
        <fieldset>
          <legend>Contenus du rêve ({content.length})</legend>
          <div className="series-preview dream-preview">
            {content.map((m) => (
              <div key={m.id}>
                <strong>{m.dream_slot ? `Makeup ${m.dream_slot}` : 'Makeup'}</strong>
                <span>
                  {m.title}
                  <small>Tournage {formatDate(m.date)}{m.publications[0]?.date ? ` → post ${formatDate(m.publications[0].date)}` : ''}</small>
                </span>
              </div>
            ))}
          </div>
          {theme.trim() !== (initial.theme ?? '') && (
            <p className="muted">Les titres des makeups et du carrousel suivront le nouveau thème.</p>
          )}
        </fieldset>
      )}

      {error && <p className="error">{error}</p>}
      <div className="actions">
        {!isNew && <button type="button" className="danger" onClick={remove}>Supprimer</button>}
        <button type="button" onClick={onCancel}>Annuler</button>
        <button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : isNew ? 'Créer le rêve' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}
