import { Camera, Lightbulb, MessageCircle, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Task } from '../agenda'
import type { Dream, Makeup, Pub } from '../types'
import { deadlineIssue } from '../types'
import { PubLine } from './PubBits'

const ICONS = { shoot: Camera, story: MessageCircle, prep: Lightbulb }

const GROUPS: { id: 'post' | 'shoot' | 'other'; label: string; icon: LucideIcon }[] = [
  { id: 'post', label: 'À poster', icon: Send },
  { id: 'shoot', label: 'À tourner', icon: Camera },
  { id: 'other', label: 'Stories & prépa', icon: MessageCircle },
]

/** Étiquette d'un groupe de la journée : « À poster », « À tourner », « Stories & prépa ». */
export function TaskGroupLabel({ group }: { group: (typeof GROUPS)[number]['id'] }) {
  const g = GROUPS.find((x) => x.id === group)!
  const Icon = g.icon
  return (
    <span className={`task-group-label label-${g.id}`}>
      <Icon size={12} strokeWidth={2.5} />
      {g.label}
    </span>
  )
}

/**
 * Les choses à faire un jour, rangées en groupes bien distincts :
 * les posts (avec leur étape), les makeups à tourner, puis les stories et la préparation.
 */
export function TaskList({
  tasks,
  onOpenPub,
  onOpenMakeup,
  onOpenDream,
  onNewDream,
}: {
  tasks: Task[]
  onOpenPub: (p: Pub) => void
  onOpenMakeup: (m: Makeup) => void
  onOpenDream: (d: Dream) => void
  onNewDream?: () => void
}) {
  const groupOf = (t: Task) => (t.type === 'post' ? 'post' : t.type === 'shoot' ? 'shoot' : 'other')

  return (
    <>
      {GROUPS.map((g) => {
        const list = tasks.filter((t) => groupOf(t) === g.id)
        if (!list.length) return null
        return (
          <div key={g.id} className={`task-group group-${g.id}`}>
            <TaskGroupLabel group={g.id} />
            {list.map((t, i) => {
              if (t.type === 'post') {
                const issue = deadlineIssue(t.pub)
                return <PubLine key={t.pub.id} pub={t.pub} onOpen={() => onOpenPub(t.pub)} detail={issue?.text} />
              }
              const Icon = ICONS[t.type]
              const open =
                t.type === 'shoot'
                  ? () => onOpenMakeup(t.makeup)
                  : t.dream
                    ? () => onOpenDream(t.dream!)
                    : t.create
                      ? onNewDream
                      : undefined
              return (
                <button key={`${t.type}-${i}`} className={`task-line task-${t.type}`} onClick={open} disabled={!open}>
                  <span className="task-icon"><Icon size={16} /></span>
                  <span className="task-text">
                    <strong>{t.text}</strong>
                    {t.hint && <small>{t.hint}</small>}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
