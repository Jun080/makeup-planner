import { useState } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import { STATUSES, STATUS_ORDER } from '../types'
import type { Makeup, Pub, Recap, Status } from '../types'
import { MakeupCard } from './MakeupCard'
import { PubCard } from './PubCard'
import { Thumb } from './Thumb'

export function Pipeline({
  pubs,
  onOpen,
  onAdvance,
  abandoned,
  onOpenMakeup,
  onOpenRecap,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
  abandoned: { makeups: Makeup[]; recaps: Recap[] }
  onOpenMakeup: (m: Makeup) => void
  onOpenRecap: (r: Recap) => void
}) {
  const [showAbandoned, setShowAbandoned] = useState(false)
  const abandonedCount = abandoned.makeups.length + abandoned.recaps.length
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
      {abandonedCount > 0 && (
        <section className="abandoned-list">
          <button className="late-banner neutral" onClick={() => setShowAbandoned(!showAbandoned)}>
            <span>Abandonnés ({abandonedCount})</span>
            <ChevronDown size={20} className={showAbandoned ? 'flip' : ''} />
          </button>
          {showAbandoned && (
            <div className="late-list">
              {abandoned.makeups.map((m) => <MakeupCard key={m.id} makeup={m} onOpen={() => onOpenMakeup(m)} />)}
              {abandoned.recaps.map((r) => (
                <article key={r.id} className="card with-thumb abandoned" onClick={() => onOpenRecap(r)}>
                  <Thumb urls={[]} icon={Layers} />
                  <div className="card-body">
                    <div className="card-top">
                      <strong>{r.title || 'Récap'}</strong>
                      <span className="badge">Abandonné</span>
                    </div>
                    <div className="card-meta"><span>Récap · {r.makeup_ids.length} contenus</span></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
