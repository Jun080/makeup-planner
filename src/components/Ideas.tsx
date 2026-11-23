import { useState } from 'react'
import { deleteRow, saveIdea, saveThemeIdea } from '../data'
import type { Idea, ThemeIdea } from '../types'
import { ask } from './ConfirmDialog'

export function Ideas({
  ideas,
  themes,
  onChanged,
  onConvert,
}: {
  ideas: Idea[]
  themes: ThemeIdea[]
  onChanged: () => Promise<void>
  onConvert: (idea: Idea) => void
}) {
  const [view, setView] = useState<'themes' | 'looks'>('themes')
  return (
    <div>
      <div className="segmented">
        <button className={view === 'themes' ? 'on' : ''} onClick={() => setView('themes')}>Thèmes de rêves</button>
        <button className={view === 'looks' ? 'on' : ''} onClick={() => setView('looks')}>Looks</button>
      </div>
      {view === 'themes' ? <Themes themes={themes} onChanged={onChanged} /> : <Looks ideas={ideas} onChanged={onChanged} onConvert={onConvert} />}
    </div>
  )
}

/** Banque de thèmes : 2 sont proposés au sondage de chaque vendredi. */
function Themes({ themes, onChanged }: { themes: ThemeIdea[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const free = themes.filter((t) => !t.used_at)
  const used = themes.filter((t) => t.used_at).sort((a, b) => b.used_at!.localeCompare(a.used_at!))

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await saveThemeIdea(name.trim())
      setName('')
      setError(null)
      await onChanged()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function remove(t: ThemeIdea) {
    if (!(await ask({ title: `Retirer « ${t.name} » ?`, confirmLabel: 'Retirer', danger: true }))) return
    await deleteRow('theme_ideas', t.id)
    await onChanged()
  }

  return (
    <>
      <form className="form idea-form" onSubmit={add}>
        <input placeholder="Un thème de rêve : Abysses, Forêt enchantée…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary">Ajouter le thème</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="muted">Chaque vendredi, l’appli t’en propose 2 pour le sondage. Celui qui gagne sort de la liste quand tu crées le rêve.</p>
      <div className="chips">
        {free.map((t) => (
          <button key={t.id} className="chip" onClick={() => remove(t)} title="Supprimer">{t.name} ×</button>
        ))}
      </div>
      {!free.length && <p className="empty">Pas encore de thème en réserve. Note-les ici dès qu’ils te viennent !</p>}
      {used.length > 0 && (
        <p className="muted">Déjà rêvés : {used.map((t) => t.name).join(', ')}</p>
      )}
    </>
  )
}

function Looks({ ideas, onChanged, onConvert }: { ideas: Idea[]; onChanged: () => Promise<void>; onConvert: (idea: Idea) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await saveIdea({ title: title.trim(), description: description.trim() || null })
    setTitle('')
    setDescription('')
    await onChanged()
  }

  async function remove(idea: Idea) {
    if (!(await ask({ title: 'Supprimer cette idée ?', confirmLabel: 'Supprimer', danger: true }))) return
    await deleteRow('ideas', idea.id)
    await onChanged()
  }

  return (
    <>
      <form className="form idea-form" onSubmit={add}>
        <input placeholder="Nouvelle idée de look…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Détails, inspi, produits…" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="primary">Ajouter l’idée</button>
      </form>
      {ideas.map((idea) => (
        <article key={idea.id} className="card">
          <strong>{idea.title}</strong>
          {idea.description && <p className="idea-desc">{idea.description}</p>}
          <div className="actions">
            <button className="danger" onClick={() => remove(idea)}>Supprimer</button>
            <button className="primary" onClick={() => onConvert(idea)}>→ Planifier</button>
          </div>
        </article>
      ))}
      {!ideas.length && <p className="empty">Pas encore d’idées. Note-les ici dès qu’elles te viennent !</p>}
    </>
  )
}
