import { useState } from 'react'
import { toISO, todayISO } from '../dates'
import type { Makeup, Status } from '../types'
import { MakeupCard } from './MakeupCard'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function CalendarView({
  makeups,
  onOpen,
  onAdvance,
  onAddOnDate,
}: {
  makeups: Makeup[]
  onOpen: (m: Makeup) => void
  onAdvance: (m: Makeup, s: Status) => void
  onAddOnDate: (iso: string) => void
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(todayISO())

  const byDate = new Map<string, Makeup[]>()
  for (const m of makeups) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m])

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
                {(byDate.get(iso) ?? []).slice(0, 4).map((m) => <i key={m.id} className={`dot status-${m.status}`} />)}
              </span>
            </button>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
      <section>
        <h2>
          {new Date(selected + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        {dayList.map((m) => (
          <MakeupCard key={m.id} makeup={m} onOpen={() => onOpen(m)} onAdvance={(s) => onAdvance(m, s)} />
        ))}
        <button className="link" onClick={() => onAddOnDate(selected)}>+ Ajouter ce jour-là</button>
      </section>
    </div>
  )
}
