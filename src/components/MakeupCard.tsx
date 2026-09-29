import { formatDate } from '../dates'
import { CATEGORIES, PUB_KINDS, STATUSES } from '../types'
import { Thumb } from './Thumb'
import type { Makeup } from '../types'

export function MakeupCard({ makeup, onOpen }: { makeup: Makeup; onOpen: () => void }) {
  return (
    <article className="card with-thumb" onClick={onOpen}>
      <Thumb url={makeup.photo_url} />
      <div className="card-body">
        <div className="card-top">
          <strong>{makeup.title}</strong>
          {makeup.category !== 'makeup' && <span className="badge">{CATEGORIES[makeup.category]}</span>}
        </div>
        <div className="card-meta">
          <span>Réalisé le {formatDate(makeup.date)}</span>
          {makeup.is_collab && <span>Collab{makeup.collab_with ? ` ${makeup.collab_with}` : ''}</span>}
        </div>
        {makeup.publications.length > 0 && (
          <div className="card-meta">
            {makeup.publications.map((p) => (
              <span key={p.id}>
                {PUB_KINDS[p.kind]} · {STATUSES[p.status]}
                {p.date ? ` · ${formatDate(p.date)}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
