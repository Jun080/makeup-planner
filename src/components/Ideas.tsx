import { useState } from 'react'
import { deleteRow, saveIdea } from '../data'
import type { Idea } from '../types'

export function Ideas({
  ideas,
  onChanged,
  onConvert,
}: {
  ideas: Idea[]
  onChanged: () => Promise<void>
  onConvert: (idea: Idea) => void
}) {
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
    if (!confirm('Supprimer cette idée ?')) return
    await deleteRow('ideas', idea.id)
    await onChanged()
  }

  return (
    <div>
      <form className="form idea-form" onSubmit={add}>
        <input placeholder="Nouvelle idée de look…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Détails, inspi, produits…" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="primary">Ajouter l’idée</button>
      </form>
      {ideas.map((idea) => (
        <article key={idea.id} className="card">
          <strong>💡 {idea.title}</strong>
          {idea.description && <p className="idea-desc">{idea.description}</p>}
          <div className="actions">
            <button className="danger" onClick={() => remove(idea)}>Supprimer</button>
            <button className="primary" onClick={() => onConvert(idea)}>→ Planifier</button>
          </div>
        </article>
      ))}
      {!ideas.length && <p className="empty">Pas encore d’idées. Note-les ici dès qu’elles te viennent !</p>}
    </div>
  )
}
