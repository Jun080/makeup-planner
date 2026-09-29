import { useState } from 'react'
import { toISO, todayISO } from '../dates'
import type { Pub, Status } from '../types'
import { PubCard } from './PubCard'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function CalendarView({
  pubs,
  onOpen,
  onAdvance,
  onPlan,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
  onPlan: (iso: string) => void
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(todayISO())

  const byDate = new Map<string, Pub[]>()
  for (const p of pubs) if (p.date) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p])

  // Grille commençant le lundi
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(month.getFullYear(), month.getMonth(), d)))

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const today = todayISO()
  const dayList = byDate.get(selected) ?? []

  return (
    <div>
      <div className="cal-header">
        <button onClick={() => shift(-1)}>‹</button>
        <strong>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
        <button onClick={() => shift(1)}>›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => <div key={i} className="cal-weekday">{w}</div>)}
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              className={`cal-day ${iso === today ? 'today' : ''} ${iso === selected ? 'selected' : ''}`}
              onClick={() => setSelected(iso)}
            >
              {Number(iso.slice(8))}
              <span className="dots">
                {(byDate.get(iso) ?? []).slice(0, 4).map((p) => (
                  <i key={p.id} className={`dot status-${p.status} ${p.kind === 'tuto' ? 'tuto' : ''}`} />
                ))}
              </span>
            </button>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
      <p className="muted">■ carré = tuto · ● rond = photo / vidéo · couleur = étape</p>
      <section>
        <h2>
          {new Date(selected + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        {dayList.map((p) => (
          <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
        ))}
        <button className="link" onClick={() => onPlan(selected)}>+ Planifier ce jour-là</button>
      </section>
    </div>
  )
}
