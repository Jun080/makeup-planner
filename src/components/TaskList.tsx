import { Camera, Lightbulb, MessageCircle } from 'lucide-react'
import type { Task } from '../agenda'
import type { Dream, Makeup, Pub } from '../types'
import { deadlineIssue } from '../types'
import { PubLine } from './PubBits'

const ICONS = { shoot: Camera, story: MessageCircle, prep: Lightbulb }

/** Liste des choses à faire un jour : posts (avec leur étape), tournages, stories, préparation. */
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
  return (
    <>
      {tasks.map((t, i) => {
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
    </>
  )
}
