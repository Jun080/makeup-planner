import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { daysUntil, formatDate, toISO, todayISO } from '../dates'
import { isFiller, pubIcon, PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
import type { Pub, Status } from '../types'
import { isLate, MiniThumb, PubLine } from './PubBits'
import { PubCard } from './PubCard'
import { Thumb } from './Thumb'

export type Move = { pub: Pub; date: string }
type ReserveTab = 'photo' | 'video' | 'a_faire'

const nextStatus = (s: Status) => STATUS_ORDER[STATUS_ORDER.indexOf(s) + 1] as Status | undefined
const byDate = (a: Pub, b: Pub) => (a.date ?? '9999').localeCompare(b.date ?? '9999')

function isoIn(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** "aujourd'hui", "demain", "ven.", "en réserve", "3 j de retard" */
function when(p: Pub) {
  if (!p.date) return 'en réserve'
  const d = daysUntil(p.date)
  if (d === 0) return 'aujourd’hui'
  if (d === 1) return 'demain'
  if (d < 0) return `${-d} j de retard`
  return formatDate(p.date)
}

export function Today({
  pubs,
  onOpen,
  onAdvance,
  onPlan,
  onMove,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
  onPlan: (date: string) => void
  onMove: (moves: Move[]) => void
}) {
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [showLate, setShowLate] = useState(false)
  const [reserveTab, setReserveTab] = useState<ReserveTab | null>(null)

  const today = todayISO()
  const pending = pubs.filter((p) => p.status !== 'publie')
  const reserve = pending.filter((p) => !p.date)

  // 1 · Aujourd'hui
  const todayPubs = pubs.filter((p) => p.date === today)
  const suggestion =
    reserve.filter((p) => isFiller(p) && p.status === 'pret')[0] ?? reserve.filter((p) => p.status === 'pret')[0]

  // 2 · Dans le train : à monter (tout sauf les photos et le post du jour), du plus urgent au moins urgent
  const toEdit = pending
    .filter((p) => p.date !== today && p.kind !== 'photo' && (p.status === 'realise' || p.status === 'montage'))
    .sort(byDate)
    .slice(0, 4)

  // 3 · Les 7 prochains jours
  const days = Array.from({ length: 7 }, (_, i) => isoIn(i))
  const onDay = (iso: string) => pubs.filter((p) => p.date === iso)

  // 4 · À rattraper
  const late = pubs.filter(isLate).sort(byDate)

  function spreadLate() {
    const busy = new Set(pubs.filter((p) => !isLate(p)).map((p) => p.date))
    const free: string[] = []
    for (let i = 0; free.length < late.length && i < 120; i++) if (!busy.has(isoIn(i))) free.push(isoIn(i))
    const moves = late.slice(0, free.length).map((pub, i) => ({ pub, date: free[i] }))
    if (!moves.length) return
    const msg = `Replacer ${moves.length} post${moves.length > 1 ? 's' : ''} en retard sur les jours vides, du ${formatDate(moves[0].date)} au ${formatDate(moves[moves.length - 1].date)} ?`
    if (confirm(msg)) {
      onMove(moves)
      setShowLate(false)
    }
  }

  // 5 · Réserve
  const reserveLists: Record<ReserveTab, Pub[]> = {
    photo: reserve.filter((p) => p.kind === 'photo' && p.status === 'pret'),
    video: reserve.filter((p) => (p.kind === 'video' || p.kind === 'recap') && p.status === 'pret'),
    a_faire: pending.filter((p) => p.status === 'a_faire').sort(byDate),
  }
  const reserveLabels: Record<ReserveTab, string> = { photo: 'photos prêtes', video: 'vidéos prêtes', a_faire: 'à faire' }

  if (!pubs.length) {
    return <p className="empty">Bienvenue<br />Ajoute ton premier makeup avec le bouton +</p>
  }

  return (
    <div className="home">
      {/* 1 · À poster aujourd'hui */}
      <section>
        <h2>À poster aujourd’hui</h2>
        {todayPubs.map((p) => {
          const next = nextStatus(p.status)
          return (
            <article key={p.id} className={`hero ${p.status === 'publie' ? 'done' : ''}`} onClick={() => onOpen(p)}>
              <Thumb urls={p.photos} icon={pubIcon(p)} className="hero-thumb" />
              <div className="hero-body">
                <strong>{p.displayTitle}</strong>
                <small>{PUB_KINDS[p.kind]}</small>
                <span className={`badge status-${p.status}`}>{STATUSES[p.status]}</span>
              </div>
              {next && (
                <button
                  className="primary hero-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdvance(p, next)
                  }}
                >
                  {next === 'publie' ? 'Marquer publié' : `→ ${STATUSES[next]}`}
                </button>
              )}
            </article>
          )
        })}
        {!todayPubs.length && (
          <div className="hero empty-hero">
            <p>Rien de prévu aujourd’hui.</p>
            {suggestion ? (
              <>
                <PubLine pub={suggestion} onOpen={() => onOpen(suggestion)} detail="prête, en réserve" />
                <button className="primary hero-action" onClick={() => onMove([{ pub: suggestion, date: today }])}>
                  Poster ça aujourd’hui
                </button>
              </>
            ) : (
              <button className="hero-action" onClick={() => onPlan(today)}>Planifier aujourd’hui</button>
            )}
          </div>
        )}
      </section>

      {/* 2 · Dans le train */}
      <section className="block-train">
        <h2>Dans le train</h2>
        {toEdit.map((p) => {
          const next = nextStatus(p.status)
          return (
            <div key={p.id} className="train-row">
              <PubLine pub={p} onOpen={() => onOpen(p)} detail={when(p)} compact />
              {next && (
                <button className="advance-mini" onClick={() => onAdvance(p, next)} aria-label={`Passer à ${STATUSES[next]}`}>
                  → {STATUSES[next]}
                </button>
              )}
            </div>
          )
        })}
        {!toEdit.length && <p className="muted">Rien à monter, profite du trajet.</p>}
      </section>

      {/* 3 · Les 7 prochains jours */}
      <section>
        <h2>Les 7 prochains jours</h2>
        <div className="strip">
          {days.map((iso, i) => {
            const list = onDay(iso)
            const notReady = i > 0 && i <= 2 && list.some((p) => p.status !== 'pret' && p.status !== 'publie')
            const d = new Date(iso + 'T00:00')
            return (
              <button
                key={iso}
                className={`strip-day ${i === 0 ? 'today' : ''} ${notReady ? 'alert' : ''} ${openDay === iso ? 'selected' : ''} ${list.length ? '' : 'free'}`}
                onClick={() => (list.length ? setOpenDay(openDay === iso ? null : iso) : onPlan(iso))}
              >
                <small>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</small>
                <strong>{d.getDate()}</strong>
                {list.length ? (
                  <span className="strip-thumbs">
                    {list.map((p) => <MiniThumb key={p.id} pub={p} />)}
                  </span>
                ) : (
                  <span className="strip-plus">+</span>
                )}
              </button>
            )
          })}
        </div>
        {openDay && (
          <div className="strip-detail">
            {onDay(openDay).map((p) => (
              <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
            ))}
          </div>
        )}
      </section>

      {/* 4 · À rattraper */}
      {late.length > 0 && (
        <section>
          <button className="late-banner" onClick={() => setShowLate(!showLate)}>
            <span>{late.length} post{late.length > 1 ? 's' : ''} à rattraper</span>
            <ChevronDown size={20} className={showLate ? 'flip' : ''} />
          </button>
          {showLate && (
            <div className="late-list">
              {late.map((p) => <PubLine key={p.id} pub={p} onOpen={() => onOpen(p)} detail={when(p)} />)}
              <button className="primary" onClick={spreadLate}>Répartir sur les jours vides</button>
            </div>
          )}
        </section>
      )}

      {/* 5 · Réserve */}
      <section>
        <h2>Ta réserve</h2>
        <div className="tiles">
          {(Object.keys(reserveLists) as ReserveTab[]).map((k) => (
            <button key={k} className={`tile ${reserveTab === k ? 'on' : ''}`} onClick={() => setReserveTab(reserveTab === k ? null : k)}>
              <strong>{reserveLists[k].length}</strong>
              <small>{reserveLabels[k]}</small>
            </button>
          ))}
        </div>
        {reserveTab && (
          <div className="late-list">
            {reserveLists[reserveTab].map((p) => <PubLine key={p.id} pub={p} onOpen={() => onOpen(p)} detail={when(p)} />)}
            {!reserveLists[reserveTab].length && <p className="muted">Rien ici pour l’instant.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
