import { STATUSES, STATUS_ORDER } from '../types'
import type { Makeup, Status } from '../types'
import { MakeupCard } from './MakeupCard'

export function Pipeline({
  makeups,
  onOpen,
  onAdvance,
}: {
  makeups: Makeup[]
  onOpen: (m: Makeup) => void
  onAdvance: (m: Makeup, s: Status) => void
}) {
  return (
    <div className="pipeline">
      {STATUS_ORDER.map((status) => {
        let list = makeups.filter((m) => m.status === status)
        // Les publiés : seulement les 10 plus récents
        if (status === 'publie') list = list.slice(-10).reverse()
        return (
          <section key={status} className="column">
            <h2><span className={`dot status-${status}`} /> {STATUSES[status]} <span className="count">{list.length}</span></h2>
            {list.map((m) => (
              <MakeupCard key={m.id} makeup={m} onOpen={() => onOpen(m)} onAdvance={(s) => onAdvance(m, s)} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
