import { Clapperboard, Camera } from 'lucide-react'
import { dayTasks, weekDreams } from '../agenda'
import { addDays, relativeDay, todayISO, weekdayLong } from '../dates'
import { dreamLabel } from '../types'
import type { Dream, Makeup, Pub, ThemeIdea } from '../types'
import { TaskList } from './TaskList'

/**
 * Récap de la semaine (lundi → dimanche) : rêve posté, rêve tourné, objectifs,
 * puis le programme de chaque jour restant.
 */
export function WeekPlan({
  pubs,
  makeups,
  dreams,
  themes,
  onOpenPub,
  onOpenMakeup,
  onOpenDream,
  onNewDream,
  onPlan,
}: {
  pubs: Pub[]
  makeups: Makeup[]
  dreams: Dream[]
  themes: ThemeIdea[]
  onOpenPub: (p: Pub) => void
  onOpenMakeup: (m: Makeup) => void
  onOpenDream: (d: Dream) => void
  onNewDream: () => void
  onPlan: (iso: string) => void
}) {
  const today = todayISO()
  const { monday, posting, shooting } = weekDreams(today, dreams)
  const sunday = addDays(monday, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((iso) => iso >= today)
  const nextWeek = weekDreams(addDays(monday, 7), dreams)

  const thisWeek = pubs.filter((p) => p.date && p.date >= monday && p.date <= sunday)
  // Progression : les posts du rêve de la semaine, sinon tous les posts de la semaine
  const tracked = posting ? thisWeek.filter((p) => p.makeups.some((m) => m.dream_no === posting.no)) : thisWeek
  const published = tracked.filter((p) => p.status === 'publie').length

  return (
    <section className="week-plan">
      <h2>Ta semaine</h2>

      <div className="dream-cards">
        <DreamCard role="Tu postes" icon={<Clapperboard size={16} />} dream={posting} onOpen={onOpenDream} />
        <DreamCard role="Tu tournes" icon={<Camera size={16} />} dream={shooting} onOpen={onOpenDream} onCreate={posting ? onNewDream : undefined} />
      </div>
      {!posting && !shooting && (
        <button className="link" onClick={onNewDream}>+ Planifier un rêve</button>
      )}

      {tracked.length > 0 && (
        <p className={`week-progress ${published === tracked.length ? 'done' : ''}`}>
          {posting ? `Rêve n°${posting.no}` : 'Cette semaine'} : {published}/{tracked.length} posté{published > 1 ? 's' : ''}
          {published === tracked.length && ' ✦'}
        </p>
      )}

      <div className="week-days">
        {days.map((iso) => {
          const tasks = dayTasks(iso, pubs, makeups, dreams, themes)
          return (
            <div key={iso} className={`week-day ${iso === today ? 'today' : ''}`}>
              <div className="week-day-head">
                <strong>{weekdayLong(iso)}</strong>
                <small>{relativeDay(iso)}</small>
              </div>
              <TaskList tasks={tasks} onOpenPub={onOpenPub} onOpenMakeup={onOpenMakeup} onOpenDream={onOpenDream} onNewDream={onNewDream} />
              {!tasks.some((t) => t.type === 'post') && (
                <button className="agenda-empty" onClick={() => onPlan(iso)}>+ Aucun post, planifier</button>
              )}
            </div>
          )
        })}
      </div>

      <p className="muted next-week">
        Semaine prochaine :{' '}
        {nextWeek.posting || nextWeek.shooting ? (
          <>
            {nextWeek.posting && <>tu postes <strong>{dreamLabel(nextWeek.posting)}</strong></>}
            {nextWeek.posting && nextWeek.shooting && ', '}
            {nextWeek.shooting && <>tu tournes <strong>{dreamLabel(nextWeek.shooting)}</strong></>}
            {!nextWeek.shooting && nextWeek.posting && (
              <> · <button className="link" onClick={onNewDream}>planifier le rêve suivant</button></>
            )}
          </>
        ) : (
          <>aucun rêve prévu · <button className="link" onClick={onNewDream}>en planifier un</button></>
        )}
      </p>
    </section>
  )
}

function DreamCard({
  role,
  icon,
  dream,
  onOpen,
  onCreate,
}: {
  role: string
  icon: React.ReactNode
  dream: Dream | null
  onOpen: (d: Dream) => void
  onCreate?: () => void
}) {
  if (!dream && onCreate) {
    return (
      <button className="dream-card empty" onClick={onCreate}>
        <small>{icon} {role}</small>
        <strong>À planifier</strong>
        <span>+ Créer le rêve</span>
      </button>
    )
  }
  if (!dream) {
    return (
      <div className="dream-card empty">
        <small>{icon} {role}</small>
        <strong>Pas de rêve</strong>
      </div>
    )
  }
  return (
    <button className="dream-card" onClick={() => onOpen(dream)}>
      <small>{icon} {role}</small>
      <strong>Rêve n°{dream.no}</strong>
      <span>{dream.theme ?? 'Thème à voter'}</span>
    </button>
  )
}
