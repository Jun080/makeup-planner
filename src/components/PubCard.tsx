import { daysUntil, formatDate } from '../dates'
import { PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
import { Thumb } from './Thumb'
import type { Pub, Status } from '../types'

export function PubCard({
  pub,
  onOpen,
  onAdvance,
}: {
  pub: Pub
  onOpen: () => void
  onAdvance?: (next: Status) => void
}) {
  const published = pub.status === 'publie'
  const d = pub.date ? daysUntil(pub.date) : null
  const urgency = published || d === null ? '' : d < 0 ? 'late' : d <= 2 ? 'urgent' : ''
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(pub.status) + 1]

  let when = 'Pas de date'
  if (pub.date) {
    when = formatDate(pub.date)
    if (!published && d === 0) when += ' · aujourd’hui'
    if (!published && d === 1) when += ' · demain'
    if (!published && d !== null && d < 0) when += ` · ${-d} j de retard`
  }

  return (
    <article className={`card with-thumb ${urgency}`} onClick={onOpen}>
      <Thumb url={pub.makeup.photo_url} />
      <div className="card-body">
        <div className="card-top">
          <strong>{pub.makeup.title}</strong>
          <span className={`badge status-${pub.status}`}>{STATUSES[pub.status]}</span>
        </div>
        <div className="card-meta">
          <span>{PUB_KINDS[pub.kind]}</span>
          <span>{when}</span>
          {pub.makeup.is_collab && <span>Collab{pub.makeup.collab_with ? ` ${pub.makeup.collab_with}` : ''}</span>}
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
      </div>
    </article>
  )
}
