import { daysUntil } from '../dates'
import type { Makeup, Status } from '../types'
import { MakeupCard } from './MakeupCard'

export function Today({
  makeups,
  onOpen,
  onAdvance,
}: {
  makeups: Makeup[]
  onOpen: (m: Makeup) => void
  onAdvance: (m: Makeup, s: Status) => void
}) {
  const pending = makeups.filter((m) => m.status !== 'publie')
  const late = pending.filter((m) => daysUntil(m.date) < 0)
  const today = pending.filter((m) => daysUntil(m.date) === 0)
  const urgent = pending.filter((m) => [1, 2].includes(daysUntil(m.date)))
  const week = pending.filter((m) => {
    const d = daysUntil(m.date)
    return d >= 3 && d <= 7
  })

  const section = (title: string, list: Makeup[], className = '') =>
    list.length > 0 && (
      <section className={className}>
        <h2>{title} <span className="count">{list.length}</span></h2>
        {list.map((m) => (
          <MakeupCard key={m.id} makeup={m} onOpen={() => onOpen(m)} onAdvance={(s) => onAdvance(m, s)} />
        ))}
      </section>
    )

  const nothing = !late.length && !today.length && !urgent.length && !week.length

  return (
    <div>
      {section('🚨 Urgent — J-1 / J-2', urgent, 'alert')}
      {section('📅 Aujourd’hui', today)}
      {section('⏰ En retard', late, 'alert')}
      {section('Cette semaine', week)}
      {nothing && <p className="empty">Rien de prévu cette semaine ✨<br />Ajoute un makeup avec le bouton +</p>}
    </div>
  )
}
