import { daysUntil, formatDate } from '../dates'
import { CATEGORIES, pubIcon, PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
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
  const late = !published && d !== null && d < 0
  // Bientôt (J-0 à J-2) et pas encore publié : petite étiquette plutôt qu'une carte colorée
  const soon = !published && d !== null && d >= 0 && d <= 2 ? (d === 0 ? 'Aujourd’hui' : d === 1 ? 'Demain' : 'Dans 2 j') : null
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(pub.status) + 1]

  let when = 'Pas de date'
  if (pub.date) {
    when = formatDate(pub.date)
    if (late) when += ` · ${-d!} j de retard`
  }

  return (
    <article className={`card with-thumb ${late ? 'late' : ''}`} onClick={onOpen}>
      <Thumb urls={pub.photos} icon={pubIcon(pub)} />
      <div className="card-body">
        <div className="card-top">
          <strong>{pub.displayTitle}</strong>
          <span className={`badge status-${pub.status}`}>{STATUSES[pub.status]}</span>
        </div>
        <div className="card-meta">
          {soon && <span className="badge soon">{soon}</span>}
          <span>{PUB_KINDS[pub.kind]}</span>
          <span>{when}</span>
          {pub.kind === 'recap' && <span>{pub.makeups.length} contenu{pub.makeups.length > 1 ? 's' : ''}</span>}
          {pub.kind !== 'recap' && pub.makeups[0] && pub.makeups[0].category !== 'makeup' && (
            <span>{CATEGORIES[pub.makeups[0].category]}</span>
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
