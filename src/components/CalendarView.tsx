import { useState } from 'react'
import { daysUntil, toISO, todayISO } from '../dates'
import { PUB_KINDS, STATUSES, STATUS_ORDER } from '../types'
import type { Pub, Status } from '../types'
import { PubCard } from './PubCard'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const KIND_ICONS = { tuto: '🎬', photo: '📸', video: '🎥' } as const
const VIEW_KEY = 'calendar-view'

type View = 'week' | 'month'

function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week'
  } catch {
    return 'week'
  }
}

/** Lundi de la semaine contenant `d`. */
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const isLate = (p: Pub) => p.status !== 'publie' && p.date !== null && daysUntil(p.date) < 0

export function CalendarView({
  pubs,
  onOpen,
  onAdvance,
  onPlan,
}: {
  pubs: Pub[]
  onOpen: (p: Pub) => void
  onAdvance: (p: Pub, s: Status) => void
  onPlan: (iso: string) => void
}) {
  const [view, setView] = useState<View>(loadView)
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(todayISO())

  const byDate = new Map<string, Pub[]>()
  for (const p of pubs) if (p.date) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p])
  const dayPubs = (iso: string) =>
    (byDate.get(iso) ?? []).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  function changeView(v: View) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  const today = todayISO()

  // ---------- Semaine ----------
  if (view === 'week') {
    const monday = mondayOf(anchor)
    const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)))
    const sunday = addDays(monday, 6)
    const range = `${monday.getDate()} ${monday.getMonth() !== sunday.getMonth() ? monday.toLocaleDateString('fr-FR', { month: 'short' }) : ''} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`

    return (
      <div>
        <ViewSwitch view={view} onChange={changeView} />
        <div className="cal-header">
          <button onClick={() => setAnchor(addDays(monday, -7))} aria-label="Semaine précédente">‹</button>
          <button className="link" onClick={() => setAnchor(new Date())}><strong>{range}</strong></button>
          <button onClick={() => setAnchor(addDays(monday, 7))} aria-label="Semaine suivante">›</button>
        </div>

        <div className="agenda">
          {days.map((iso) => {
            const list = dayPubs(iso)
            const d = new Date(iso + 'T00:00')
            return (
              <div key={iso} className={`agenda-day ${iso === today ? 'today' : ''} ${iso < today ? 'past' : ''}`}>
                <div className="agenda-date">
                  <small>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</small>
                  <strong>{d.getDate()}</strong>
                </div>
                <div className="agenda-items">
                  {list.map((p) => <PubLine key={p.id} pub={p} onOpen={() => onOpen(p)} />)}
                  {!list.length && (
                    <button className="agenda-empty" onClick={() => onPlan(iso)}>
                      {iso < today ? 'Rien' : '+ Jour vide — planifier'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Legend />
      </div>
    )
  }

  // ---------- Mois ----------
  const month = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(month.getFullYear(), month.getMonth(), d)))
  const selectedList = dayPubs(selected)

  return (
    <div>
      <ViewSwitch view={view} onChange={changeView} />
      <div className="cal-header">
        <button onClick={() => setAnchor(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mois précédent">‹</button>
        <button className="link" onClick={() => setAnchor(new Date())}>
          <strong>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
        </button>
        <button onClick={() => setAnchor(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mois suivant">›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w, i) => <div key={i} className="cal-weekday">{w}</div>)}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />
          const list = dayPubs(iso)
          const late = list.some(isLate)
          return (
            <button
              key={iso}
              className={`cal-day ${iso === today ? 'today' : ''} ${iso === selected ? 'selected' : ''} ${late ? 'late' : ''} ${iso < today ? 'past' : ''}`}
              onClick={() => setSelected(iso)}
            >
              <span className="cal-num">{Number(iso.slice(8))}</span>
              <span className="cal-thumbs">
                {list.slice(0, list.length > 2 ? 1 : 2).map((p) => <MiniThumb key={p.id} pub={p} />)}
                {list.length > 2 && <span className="cal-more">+{list.length - 1}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <Legend />
      <section>
        <h2>{new Date(selected + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {selectedList.map((p) => (
          <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
        ))}
        {!selectedList.length && <p className="muted">Rien de prévu ce jour-là.</p>}
        <button className="link" onClick={() => onPlan(selected)}>+ Planifier ce jour-là</button>
      </section>
    </div>
  )
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="segmented">
      <button className={view === 'week' ? 'on' : ''} onClick={() => onChange('week')}>Semaine</button>
      <button className={view === 'month' ? 'on' : ''} onClick={() => onChange('month')}>Mois</button>
    </div>
  )
}

/** Une publication sur une ligne : photo, type, titre, étape. */
function PubLine({ pub, onOpen }: { pub: Pub; onOpen: () => void }) {
  return (
    <button className={`pub-line status-border-${pub.status} ${isLate(pub) ? 'late' : ''}`} onClick={onOpen}>
      <MiniThumb pub={pub} />
      <span className="pub-line-text">
        <strong>{pub.makeup.title}</strong>
        <small>
          {PUB_KINDS[pub.kind]}
          {isLate(pub) && ' · en retard'}
        </small>
      </span>
      <span className={`badge status-${pub.status}`}>{STATUSES[pub.status]}</span>
    </button>
  )
}

/** Miniature ronde : photo du makeup (ou icône du type), cerclée de la couleur de l'étape. */
function MiniThumb({ pub }: { pub: Pub }) {
  return (
    <span className={`mini-thumb ring-${pub.status}`} title={`${PUB_KINDS[pub.kind]} · ${pub.makeup.title}`}>
      {pub.makeup.photo_url ? <img src={pub.makeup.photo_url} alt="" loading="lazy" /> : <span>{KIND_ICONS[pub.kind]}</span>}
    </span>
  )
}

function Legend() {
  return (
    <div className="legend">
      {STATUS_ORDER.map((s) => (
        <span key={s}><i className={`dot status-${s}`} /> {STATUSES[s]}</span>
      ))}
    </div>
  )
}

