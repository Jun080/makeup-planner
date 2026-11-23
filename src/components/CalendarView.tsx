import { useState } from 'react'
import { dayTasks, weekDreams } from '../agenda'
import { toISO, todayISO } from '../dates'
import { dreamLabel, STATUSES, STATUS_ORDER } from '../types'
import type { Dream, Makeup, Pub, Status, ThemeIdea } from '../types'
import { PubCard } from './PubCard'
import { isLate, MiniThumb } from './PubBits'
import { TaskList } from './TaskList'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
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

export function CalendarView({
  pubs,
  makeups,
  dreams,
  themes,
  onOpen,
  onOpenMakeup,
  onOpenDream,
  onNewDream,
  onAdvance,
  onPlan,
}: {
  pubs: Pub[]
  makeups: Makeup[]
  dreams: Dream[]
  themes: ThemeIdea[]
  onOpen: (p: Pub) => void
  onOpenMakeup: (m: Makeup) => void
  onOpenDream: (d: Dream) => void
  onNewDream: () => void
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
  // Posts triés par étape, puis tournages et rendez-vous stories du jour
  const tasksOf = (iso: string) => {
    const order = new Map(dayPubs(iso).map((p, i) => [p.id, i]))
    return dayTasks(iso, pubs, makeups, dreams, themes).sort((a, b) =>
      a.type === 'post' && b.type === 'post' ? order.get(a.pub.id)! - order.get(b.pub.id)! : Number(a.type !== 'post') - Number(b.type !== 'post'),
    )
  }
  const taskProps = { onOpenPub: onOpen, onOpenMakeup, onOpenDream, onNewDream }

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

        <WeekDreams iso={days[0]} dreams={dreams} onOpenDream={onOpenDream} />

        <div className="agenda">
          {days.map((iso) => {
            const list = dayPubs(iso)
            const tasks = tasksOf(iso)
            const d = new Date(iso + 'T00:00')
            return (
              <div key={iso} className={`agenda-day ${iso === today ? 'today' : ''} ${iso < today ? 'past' : ''}`}>
                <div className="agenda-date">
                  <small>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</small>
                  <strong>{d.getDate()}</strong>
                </div>
                <div className="agenda-items">
                  <TaskList tasks={tasks} {...taskProps} />
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
  const selectedOther = tasksOf(selected).filter((t) => t.type !== 'post')

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
      <WeekDreams iso={selected} dreams={dreams} onOpenDream={onOpenDream} />
      <section>
        <h2>{new Date(selected + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {selectedList.map((p) => (
          <PubCard key={p.id} pub={p} onOpen={() => onOpen(p)} onAdvance={(s) => onAdvance(p, s)} />
        ))}
        {selectedOther.length > 0 && (
          <div className="late-list">
            <TaskList tasks={selectedOther} {...taskProps} />
          </div>
        )}
        {!selectedList.length && <p className="muted">Aucun post prévu ce jour-là.</p>}
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

export function Legend() {
  return (
    <div className="legend">
      {STATUS_ORDER.map((s) => (
        <span key={s}><i className={`dot status-${s}`} /> {STATUSES[s]}</span>
      ))}
    </div>
  )
}


/** Bandeau des rêves de la semaine : celui qu'on poste et celui qu'on tourne. */
function WeekDreams({ iso, dreams, onOpenDream }: { iso: string; dreams: Dream[]; onOpenDream: (d: Dream) => void }) {
  const { posting, shooting } = weekDreams(iso, dreams)
  if (!posting && !shooting) return null
  return (
    <div className="week-dreams">
      {posting && (
        <button onClick={() => onOpenDream(posting)}>
          <small>On poste</small> {dreamLabel(posting)}
        </button>
      )}
      {shooting && (
        <button onClick={() => onOpenDream(shooting)}>
          <small>On tourne</small> {dreamLabel(shooting)}
        </button>
      )}
    </div>
  )
}
