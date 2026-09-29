import { daysUntil, formatDate } from '../dates'
import { CATEGORIES, FORMATS, STATUSES, STATUS_ORDER } from '../types'
import type { Makeup, Status } from '../types'

export function MakeupCard({
  makeup,
  onOpen,
  onAdvance,
}: {
  makeup: Makeup
  onOpen: () => void
  onAdvance?: (next: Status) => void
}) {
  const d = daysUntil(makeup.date)
  const published = makeup.status === 'publie'
  const urgency = published ? '' : d < 0 ? 'late' : d <= 2 ? 'urgent' : ''
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(makeup.status) + 1]

  return (
    <article className={`card ${urgency}`} onClick={onOpen}>
      <div className="card-top">
        <strong>{makeup.title}</strong>
        <span className={`badge status-${makeup.status}`}>{STATUSES[makeup.status]}</span>
      </div>
      <div className="card-meta">
        <span>{formatDate(makeup.date)}{!published && d === 0 && ' · aujourd’hui'}{!published && d === 1 && ' · demain'}{!published && d < 0 && ` · ${-d} j de retard`}</span>
        {makeup.category !== 'makeup' && <span>{CATEGORIES[makeup.category]}</span>}
        {makeup.formats.map((f) => <span key={f}>{FORMATS[f]}</span>)}
        {makeup.is_tuto && <span>Tuto</span>}
        {makeup.is_collab && <span>Collab{makeup.collab_with ? ` ${makeup.collab_with}` : ''}</span>}
      </div>
      {onAdvance && next && (
        <button
          className="advance"
          onClick={(e) => {
            e.stopPropagation()
            onAdvance(next)
          }}
        >
          → {STATUSES[next]}
        </button>
      )}
    </article>
  )
}
