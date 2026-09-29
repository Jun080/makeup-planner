import { STATUSES, STATUS_ORDER } from '../types'
import type { Pub, Status } from '../types'
import { PubCard } from './PubCard'

export function Pipeline({
  pubs,
  onOpen,
  onAdvance,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
}) {
  // Tri par date de publication, les "sans date" à la fin
  const sorted = [...pubs].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
  return (
    <div className="pipeline">
      {STATUS_ORDER.map((status) => {
        let list = sorted.filter((p) => p.status === status)
        // Les publiés : seulement les 10 plus récents
        if (status === 'publie') list = list.slice(-10).reverse()
        return (
          <section key={status} className="column">
            <h2><span className={`dot status-${status}`} /> {STATUSES[status]} <span className="count">{list.length}</span></h2>
            {list.map((p) => (
              <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
