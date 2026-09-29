import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './supabase'
import { deleteRow, fetchAll, updateMakeupStatus } from './data'
import { notifyIfNeeded } from './reminders'
import type { Idea, Makeup, Product, Status } from './types'
import { Login } from './components/Login'
import { Sheet } from './components/Sheet'
import { MakeupForm, type MakeupDraft } from './components/MakeupForm'
import { Today } from './components/Today'
import { CalendarView } from './components/CalendarView'
import { Pipeline } from './components/Pipeline'
import { Search } from './components/Search'
import { Products } from './components/Products'
import { Ideas } from './components/Ideas'

type Tab = 'today' | 'calendar' | 'pipeline' | 'search' | 'products' | 'ideas'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '🏠', label: 'Accueil' },
  { id: 'calendar', icon: '📅', label: 'Calendrier' },
  { id: 'pipeline', icon: '🎬', label: 'Pipeline' },
  { id: 'search', icon: '🔍', label: 'Recherche' },
  { id: 'products', icon: '💄', label: 'Produits' },
  { id: 'ideas', icon: '💡', label: 'Idées' },
]

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('today')
  const [makeups, setMakeups] = useState<Makeup[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<(MakeupDraft & { fromIdea?: string }) | null>(null)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied',
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    try {
      const data = await fetchAll()
      setMakeups(data.makeups)
      setProducts(data.products)
      setIdeas(data.ideas)
      setError(null)
      return data
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    reload().then((data) => data && notifyIfNeeded(data.makeups))
  }, [session, reload])

  async function advance(m: Makeup, status: Status) {
    setMakeups((list) => list.map((x) => (x.id === m.id ? { ...x, status } : x)))
    try {
      await updateMakeupStatus(m.id, status)
    } catch (err) {
      setError((err as Error).message)
      reload()
    }
  }

  async function enableNotifications() {
    const p = await Notification.requestPermission()
    setNotifPermission(p)
    if (p === 'granted') notifyIfNeeded(makeups)
  }

  if (!isConfigured) {
    return (
      <div className="login">
        <h1>💄 Makeup Planner</h1>
        <p>Supabase n’est pas encore configuré. Suis les étapes du README (fichier <code>.env.local</code>).</p>
      </div>
    )
  }
  if (session === undefined) return <p className="empty">Chargement…</p>
  if (!session) return <Login />

  const open = (m: Makeup) => setDraft(m)

  return (
    <div className="app">
      <header className="topbar">
        <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
        <div>
          {notifPermission === 'default' && (
            <button className="icon-btn" onClick={enableNotifications} title="Activer les rappels">🔔</button>
          )}
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} title="Se déconnecter">⎋</button>
        </div>
      </header>

      <main>
        {error && <p className="error">{error}</p>}
        {tab === 'today' && <Today makeups={makeups} onOpen={open} onAdvance={advance} />}
        {tab === 'calendar' && (
          <CalendarView makeups={makeups} onOpen={open} onAdvance={advance} onAddOnDate={(date) => setDraft({ date })} />
        )}
        {tab === 'pipeline' && <Pipeline makeups={makeups} onOpen={open} onAdvance={advance} />}
        {tab === 'search' && <Search makeups={makeups} products={products} onOpen={open} />}
        {tab === 'products' && <Products products={products} onChanged={async () => void (await reload())} />}
        {tab === 'ideas' && (
          <Ideas
            ideas={ideas}
            onChanged={async () => void (await reload())}
            onConvert={(idea) =>
              setDraft({ title: idea.title, notes: idea.description, status: 'a_faire', fromIdea: idea.id })
            }
          />
        )}
      </main>

      {tab !== 'products' && tab !== 'ideas' && (
        <button className="fab" onClick={() => setDraft({})} aria-label="Ajouter un makeup">+</button>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            <small>{t.label}</small>
          </button>
        ))}
      </nav>

      {draft && (
        <Sheet title={draft.id ? 'Modifier' : 'Nouveau makeup'} onClose={() => setDraft(null)}>
          <MakeupForm
            initial={draft}
            products={products}
            onCancel={() => setDraft(null)}
            onProductsChanged={async () => void (await reload())}
            onSaved={async () => {
              if (draft.fromIdea) await deleteRow('ideas', draft.fromIdea)
              setDraft(null)
              await reload()
            }}
          />
        </Sheet>
      )}
    </div>
  )
}
