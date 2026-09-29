import { daysUntil, formatDate, toISO } from '../dates'
import { isFiller } from '../types'
import type { Pub, Status } from '../types'
import { PubCard } from './PubCard'

export function Today({
  pubs,
  onOpen,
  onAdvance,
  onPlan,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
  onPlan: (date: string) => void
}) {
  const pending = pubs.filter((p) => p.status !== 'publie')
  const dated = pending.filter((p): p is Pub & { date: string } => p.date !== null)
  const inDays = (min: number, max: number) =>
    dated.filter((p) => daysUntil(p.date) >= min && daysUntil(p.date) <= max).sort((a, b) => a.date.localeCompare(b.date))

  const late = dated.filter((p) => daysUntil(p.date) < 0).sort((a, b) => a.date.localeCompare(b.date))
  const today = inDays(0, 0)
  const urgent = inDays(1, 2)
  const week = inDays(3, 7)
  const readyFillers = pending.filter((p) => !p.date && isFiller(p) && p.status === 'pret')

  // Jours des 7 prochains jours sans aucune publication prévue
  const busy = new Set(pubs.map((p) => p.date))
  const emptyDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = toISO(d)
    if (!busy.has(iso)) emptyDays.push(iso)
  }

  const section = (title: string, list: Pub[], className = '') =>
    list.length > 0 && (
      <section className={className}>
        <h2>{title} <span className="count">{list.length}</span></h2>
        {list.map((p) => (
          <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
        ))}
      </section>
    )

  return (
    <div>
      {section('🚨 Urgent — J-1 / J-2', urgent, 'alert')}
      {section('📅 Aujourd’hui', today)}
      {section('⏰ En retard', late, 'alert')}
      {emptyDays.length > 0 && (
        <section>
          <h2>🕳️ Jours vides cette semaine <span className="count">{emptyDays.length}</span></h2>
          <div className="chips">
            {emptyDays.map((d) => (
              <button key={d} className="chip" onClick={() => onPlan(d)}>{formatDate(d)}</button>
            ))}
          </div>
        </section>
      )}
      {section('📸 Photos & vidéos prêtes à caser', readyFillers)}
      {section('Plus tard cette semaine', week)}
    </div>
  )
}
