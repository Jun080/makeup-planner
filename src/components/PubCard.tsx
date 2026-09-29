import { daysUntil, formatDate } from '../dates'
import { CATEGORIES, CATEGORY_INFO, pubIcon, PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
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
      <Thumb urls={pub.photos} icon={pubIcon(pub)} />
      <div className="card-body">
        <div className="card-top">
          <strong>{pub.displayTitle}</strong>
          <span className={`badge status-${pub.status}`}>{STATUSES[pub.status]}</span>
        </div>
        <div className="card-meta">
          <span>{PUB_KINDS[pub.kind]}</span>
          <span>{when}</span>
          {pub.kind === 'recap' && <span>{pub.makeups.length} contenu{pub.makeups.length > 1 ? 's' : ''}</span>}
            {pub.kind !== 'recap' && pub.makeups[0] && pub.makeups[0].category !== 'makeup' && (
              <span>{CATEGORY_INFO[pub.makeups[0].category].icon} {CATEGORIES[pub.makeups[0].category]}</span>
            )}
            {pub.kind !== 'recap' && pub.makeups[0]?.is_collab && (
              <span>Collab{pub.makeups[0].collab_with ? ` ${pub.makeups[0].collab_with}` : ''}</span>
            )}
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
