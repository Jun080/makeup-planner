import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { daysUntil, formatDate, toISO, todayISO } from '../dates'
import { deadlineIssue, fitsDeadline, isFiller, missingNetwork, needsStats, pubIcon, PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
import type { Dream, Makeup, Pub, Status, ThemeIdea } from '../types'
import { isLate, PubLine } from './PubBits'
import { WeekPlan } from './WeekPlan'
import { Thumb } from './Thumb'
import { ask } from './ConfirmDialog'

export type Move = { pub: Pub; date: string }
export type Network = 'insta' | 'tiktok'
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
  makeups,
  dreams,
  themes,
  onOpen,
  onStats,
  onPosted,
  onOpenMakeup,
  onOpenDream,
  onNewDream,
  onAdvance,
  onPlan,
  onMove,
}: {
  pubs: Pub[]
  makeups: Makeup[]
  dreams: Dream[]
  themes: ThemeIdea[]
  onOpen: (p: Pub) => void
  onStats: (p: Pub) => void
  onPosted: (p: Pub, network: Network) => void
  onOpenMakeup: (m: Makeup) => void
  onOpenDream: (d: Dream) => void
  onNewDream: () => void
  onAdvance: (p: Pub, s: Status) => void
  onPlan: (date: string) => void
  onMove: (moves: Move[]) => void
}) {
  const [showLate, setShowLate] = useState(false)
  const [reserveTab, setReserveTab] = useState<ReserveTab | null>(null)

  const today = todayISO()
  const pending = pubs.filter((p) => p.status !== 'publie')
  const reserve = pending.filter((p) => !p.date && fitsDeadline(p, today))

  // 1 · Aujourd'hui
  const todayPubs = pubs.filter((p) => p.date === today)
  const suggestion =
    reserve.filter((p) => isFiller(p) && p.status === 'pret')[0] ?? reserve.filter((p) => p.status === 'pret')[0]

  // 2 · Dans le train : à monter (tout sauf les photos et le post du jour), du plus urgent au moins urgent
  const toEdit = pending
    .filter((p) => p.date !== today && p.kind !== 'photo' && (p.status === 'realise' || p.status === 'montage'))
    .sort(byDate)
    .slice(0, 4)

  // Dates limites : trop tard, mal planifié, ou ça devient juste
  const deadlines = pending
    .flatMap((p) => {
      const issue = deadlineIssue(p)
      return issue ? [{ pub: p, issue }] : []
    })
    .sort((a, b) => Number(b.issue.level === 'late') - Number(a.issue.level === 'late'))

  // À noter : posté sur un seul réseau (cette semaine), stats à 48 h
  const toNote = pubs
    .filter((p) => (missingNetwork(p) && p.date && daysUntil(p.date) >= -7 && p.date !== today) || needsStats(p, today))
    .sort(byDate)

  // 4 · À rattraper
  const late = pubs.filter(isLate).sort(byDate)

  async function spreadLate() {
    const busy = new Set(pubs.filter((p) => !isLate(p)).map((p) => p.date))
    const moves: Move[] = []
    // Chaque post va sur le 1er jour vide, sans dépasser sa date limite (sinon il reste où il est)
    for (const pub of late) {
      for (let i = 0; i < 120; i++) {
        const iso = isoIn(i)
        if (!fitsDeadline(pub, iso)) break
        if (busy.has(iso)) continue
        busy.add(iso)
        moves.push({ pub, date: iso })
        break
      }
    }
    moves.sort((a, b) => a.date.localeCompare(b.date))
    if (!moves.length) return
    const plural = moves.length > 1 ? 's' : ''
    const ok = await ask({
      title: `Replacer ${moves.length} post${plural} en retard ?`,
      message: `Ils seront répartis sur les jours vides, du ${formatDate(moves[0].date)} au ${formatDate(moves[moves.length - 1].date)}.`,
      confirmLabel: 'Répartir',
    })
    if (ok) {
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
          // Prêt ou publié sur un seul réseau : un bouton par réseau
          const networks =
            p.on_insta !== undefined && (p.status === 'pret' || (p.status === 'publie' && !(p.on_insta && p.on_tiktok)))
          const done = p.status === 'publie' && (p.on_insta === undefined || (p.on_insta && p.on_tiktok))
          return (
            <article key={p.id} className={`hero ${done ? 'done' : ''}`} onClick={() => onOpen(p)}>
              <Thumb urls={p.photos} icon={pubIcon(p)} className="hero-thumb" />
              <div className="hero-body">
                <strong>{p.displayTitle}</strong>
                <small>{PUB_KINDS[p.kind]}</small>
                <span className={`badge status-${p.status}`}>{STATUSES[p.status]}</span>
              </div>
              {networks ? (
                <div className="hero-networks">
                  {(['insta', 'tiktok'] as Network[]).map((n) => {
                    const on = n === 'insta' ? p.on_insta : p.on_tiktok
                    const name = n === 'insta' ? 'Insta' : 'TikTok'
                    return (
                      <button
                        key={n}
                        className={`hero-action ${on ? '' : 'primary'}`}
                        disabled={on}
                        onClick={(e) => {
                          e.stopPropagation()
                          onPosted(p, n)
                        }}
                      >
                        {on ? `${name} ✓` : p.status === 'publie' ? `Aussi sur ${name}` : `Publié sur ${name}`}
                      </button>
                    )
                  })}
                </div>
              ) : (
                next && (
                  <button
                    className="primary hero-action"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAdvance(p, next)
                    }}
                  >
                    {next === 'publie' ? 'Marquer publié' : `→ ${STATUSES[next]}`}
                  </button>
                )
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

      {/* Dates limites */}
      {deadlines.length > 0 && (
        <section>
          <h2>Plus le temps ?</h2>
          <div className="late-list deadline-list">
            {deadlines.map(({ pub, issue }) => (
              <PubLine key={pub.id} pub={pub} onOpen={() => onOpen(pub)} detail={issue.text} />
            ))}
          </div>
          <p className="muted">Touche un contenu pour le replanifier, retirer sa date limite ou l’abandonner.</p>
        </section>
      )}

      {/* À noter : autre réseau, stats */}
      {toNote.length > 0 && (
        <section>
          <h2>À noter</h2>
          <div className="late-list">
            {toNote.map((p) => {
              const missing = missingNetwork(p)
              return (
                <PubLine
                  key={p.id}
                  pub={p}
                  onOpen={() => onStats(p)}
                  detail={missing && p.date !== today ? `pas encore sur ${missing}` : 'note ses stats (48 h)'}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Ta semaine : rêves, programme jour par jour */}
      <WeekPlan
        pubs={pubs}
        makeups={makeups}
        dreams={dreams}
        themes={themes}
        onOpenPub={onOpen}
        onOpenMakeup={onOpenMakeup}
        onOpenDream={onOpenDream}
        onNewDream={onNewDream}
        onPlan={onPlan}
      />

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
