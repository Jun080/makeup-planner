import { formatDate } from '../dates'
import { PUB_KINDS, STATUSES } from '../types'
import { Thumb } from './Thumb'
import type { Pub } from '../types'
import { Sheet } from './Sheet'

/** Choisir une publication en réserve (sans date) pour la planifier un jour donné. */
export function PlanSheet({
  date,
  pubs,
  onPick,
  onNewMakeup,
  onClose,
}: {
  date: string
  pubs: Pub[]
  onPick: (pub: Pub) => void
  onNewMakeup: () => void
  onClose: () => void
}) {
  const reserve = pubs
    .filter((p) => !p.date && p.status !== 'publie')
    // Photos / vidéos prêtes en premier : ce sont les "jokers"
    .sort((a, b) => score(b) - score(a))

  return (
    <Sheet title={`Planifier le ${formatDate(date)}`} onClose={onClose}>
      {reserve.length ? (
        <>
          <p className="muted">Publications en réserve :</p>
          {reserve.map((p) => (
            <article key={p.id} className="card with-thumb" onClick={() => onPick(p)}>
              <Thumb url={p.makeup.photo_url} />
              <div className="card-body">
                <div className="card-top">
                  <strong>{p.makeup.title}</strong>
                  <span className={`badge status-${p.status}`}>{STATUSES[p.status]}</span>
                </div>
                <div className="card-meta"><span>{PUB_KINDS[p.kind]}</span></div>
              </div>
            </article>
          ))}
        </>
      ) : (
        <p className="muted">Aucune publication en réserve.</p>
      )}
      <button className="link" onClick={onNewMakeup}>+ Nouveau makeup ce jour-là</button>
    </Sheet>
  )
}

function score(p: Pub) {
  return (p.kind !== 'tuto' ? 2 : 0) + (p.status === 'pret' ? 1 : 0)
}
