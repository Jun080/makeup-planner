import { useState } from 'react'
import { productLabel } from '../types'
import type { Product } from '../types'
import { ProductForm } from './ProductForm'
import { Sheet } from './Sheet'

export function Products({ products, onChanged }: { products: Product[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [q, setQ] = useState('')
  const list = products.filter((p) => productLabel(p).toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="row">
        <input className="search" placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="primary" onClick={() => setEditing('new')}>+ Produit</button>
      </div>
      {list.map((p) => (
        <article key={p.id} className="card" onClick={() => setEditing(p)}>
          <div className="card-top">
            <strong>{p.brand} — {p.name || p.product}</strong>
            {p.is_pr && <span className="badge">PR</span>}
          </div>
          <div className="card-meta">
            <span>{p.product}</span>
            {p.color && <span>{p.color}</span>}
          </div>
        </article>
      ))}
      {!products.length && <p className="empty">Aucun produit pour l’instant.</p>}
      {editing && (
        <Sheet title={editing === 'new' ? 'Nouveau produit' : 'Modifier le produit'} onClose={() => setEditing(null)}>
          <ProductForm
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              await onChanged()
              setEditing(null)
            }}
          />
        </Sheet>
      )}
    </div>
  )
}
