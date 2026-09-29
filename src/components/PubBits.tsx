import { daysUntil } from '../dates'
import { pubIcon, PUB_KINDS, STATUSES } from '../types'
import type { Pub } from '../types'
import { Thumb } from './Thumb'

export const isLate = (p: Pub) => p.status !== 'publie' && p.date !== null && daysUntil(p.date) < 0

/** Une publication sur une ligne : photo, type, titre, étape. */
/** `compact` : l'étape passe dans la ligne de détail au lieu d'une étiquette (quand un bouton suit). */
export function PubLine({ pub, onOpen, detail, compact }: { pub: Pub; onOpen: () => void; detail?: string; compact?: boolean }) {
  return (
    <button className={`pub-line status-border-${pub.status} ${isLate(pub) ? 'late' : ''}`} onClick={onOpen}>
      <MiniThumb pub={pub} />
      <span className="pub-line-text">
        <strong>{pub.displayTitle}</strong>
        <small>
          {PUB_KINDS[pub.kind]}
          {detail ? ` · ${detail}` : isLate(pub) ? ' · en retard' : ''}
          {compact && ` · ${STATUSES[pub.status]}`}
        </small>
      </span>
      {!compact && <span className={`badge status-${pub.status}`}>{STATUSES[pub.status]}</span>}
    </button>
  )
}

/** Miniature ronde : photo du makeup (ou icône du type), cerclée de la couleur de l'étape. */
export function MiniThumb({ pub }: { pub: Pub }) {
  return (
    <span className={`mini-thumb ring-${pub.status}`} title={`${PUB_KINDS[pub.kind]} · ${pub.displayTitle}`}>
      <Thumb urls={pub.photos} icon={pubIcon(pub)} className="mini-inner" />
    </span>
  )
}
