import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Bell, CalendarDays, Clapperboard, House, Layers, Lightbulb, LogOut, Palette, Plus, Search as SearchIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { isConfigured, supabase } from './supabase'
import { deleteRow, fetchAll, updatePublication } from './data'
import { enablePush, pushSupported, syncPushSubscription } from './push'
import { allPubs, CATEGORY_INFO } from './types'
import type { Category, Idea, Makeup, Product, Pub, Publication, Recap, Status } from './types'
import { Login } from './components/Login'
import { Sheet } from './components/Sheet'
import { MakeupForm, type MakeupDraft } from './components/MakeupForm'
import { Today, type Move } from './components/Today'
import { CalendarView } from './components/CalendarView'
import { Pipeline } from './components/Pipeline'
import { Search } from './components/Search'
import { Products } from './components/Products'
import { Ideas } from './components/Ideas'
import { PlanSheet } from './components/PlanSheet'
import { ConfirmHost } from './components/ConfirmDialog'
import { RecapForm, type RecapDraft } from './components/RecapForm'

const NEW_CHOICES: { category: Category; hint: string }[] = [
  { category: 'makeup', hint: 'Un look, avec ses tutos, photos et vidéos' },
  { category: 'swatch', hint: 'Une palette ou des produits swatchés en vidéo' },
  { category: 'unboxing', hint: 'Un colis, un calendrier de l’avent…' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

type Tab = 'today' | 'calendar' | 'pipeline' | 'search' | 'products' | 'ideas'

const TABS: { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'today', icon: House, label: 'Accueil' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendrier' },
  { id: 'pipeline', icon: Clapperboard, label: 'Pipeline' },
  { id: 'search', icon: SearchIcon, label: 'Recherche' },
  { id: 'products', icon: Palette, label: 'Produits' },
  { id: 'ideas', icon: Lightbulb, label: 'Idées' },
]

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('today')
  const [makeups, setMakeups] = useState<Makeup[]>([])
  const [recaps, setRecaps] = useState<Recap[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<(MakeupDraft & { fromIdea?: string }) | null>(null)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [recapDraft, setRecapDraft] = useState<RecapDraft | null>(null)
  const [choosing, setChoosing] = useState<{ date?: string } | null>(null)
  const [notifPermission, setNotifPermission] = useState(
    pushSupported() ? Notification.permission : 'denied',
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
      setRecaps(data.recaps)
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
    reload()
    // Réenregistre ce téléphone pour les notifications (si déjà autorisé)
    syncPushSubscription().catch((err) => console.warn('Notifications :', err))
  }, [session, reload])

  async function patchPub(pub: Pub, patch: Partial<Pick<Publication, 'status' | 'date'>>) {
    // Mise à jour immédiate à l'écran, puis enregistrement
    if (pub.kind === 'recap') {
      setRecaps((list) => list.map((r) => (r.id === pub.id ? { ...r, ...patch } : r)))
    } else {
      setMakeups((list) =>
        list.map((m) =>
          m.id === pub.makeup_id
            ? { ...m, publications: m.publications.map((p) => (p.id === pub.id ? { ...p, ...patch } : p)) }
            : m,
        ),
      )
    }
    try {
      await updatePublication(pub.id, patch)
    } catch (err) {
      setError((err as Error).message)
      reload()
    }
  }

  const advance = (pub: Pub, status: Status) => patchPub(pub, { status })
  const moveAll = (moves: Move[]) => Promise.all(moves.map((m) => patchPub(m.pub, { date: m.date })))

  async function enableNotifications() {
    try {
      setNotifPermission(await enablePush())
    } catch (err) {
      setError(`Notifications : ${(err as Error).message}`)
    }
  }

  if (!isConfigured) {
    return (
      <div className="login">
        <h1>Makeup Planner</h1>
        <p>Supabase n’est pas encore configuré. Suis les étapes du README (fichier <code>.env.local</code>).</p>
      </div>
    )
  }
  if (session === undefined) return <p className="empty">Chargement…</p>
  if (!session) return <Login />

  const open = (m: Makeup) => setDraft(m)
  const openPub = (p: Pub) => {
    if (p.kind === 'recap') setRecapDraft(recaps.find((r) => r.id === p.id) ?? null)
    else if (p.makeups[0]) open(p.makeups[0])
  }
  const pubs = allPubs(makeups, recaps)

  return (
    <div className="app">
      <header className="topbar">
        <div>
          {tab === 'today' ? (
            <>
              <p className="topbar-sub">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1>{greeting()}</h1>
            </>
          ) : (
            <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
          )}
        </div>
        <div className="topbar-actions">
          {notifPermission === 'default' && (
            <button className="round-btn" onClick={enableNotifications} aria-label="Activer les notifications">
              <Bell size={20} />
            </button>
          )}
          <button className="round-btn" onClick={() => supabase.auth.signOut()} aria-label="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main>
        {error && <p className="error">{error}</p>}
        {tab === 'today' && (
          <Today pubs={pubs} onOpen={openPub} onAdvance={advance} onPlan={setPlanDate} onMove={moveAll} />
        )}
        {tab === 'calendar' && <CalendarView pubs={pubs} onOpen={openPub} onAdvance={advance} onPlan={setPlanDate} />}
        {tab === 'pipeline' && (
          <Pipeline
            pubs={pubs}
            onOpen={openPub}
            onAdvance={advance}
            abandoned={{ makeups: makeups.filter((m) => m.abandoned_at), recaps: recaps.filter((r) => r.abandoned_at) }}
            onOpenMakeup={open}
            onOpenRecap={setRecapDraft}
          />
        )}
        {tab === 'search' && <Search makeups={makeups} products={products} onOpen={open} />}
        {tab === 'products' && <Products products={products} onChanged={async () => void (await reload())} />}
        {tab === 'ideas' && (
          <Ideas
            ideas={ideas}
            onChanged={async () => void (await reload())}
            onConvert={(idea) =>
              setDraft({ title: idea.title, notes: idea.description, fromIdea: idea.id })
            }
          />
        )}
      </main>

      {tab !== 'products' && tab !== 'ideas' && (
        <button className="fab" onClick={() => setChoosing({})} aria-label="Ajouter">
          <Plus size={28} strokeWidth={2.2} />
        </button>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-label={t.label}>
            <t.icon size={20} strokeWidth={tab === t.id ? 2.2 : 1.8} />
            {tab === t.id && <small>{t.label}</small>}
          </button>
        ))}
      </nav>

      {planDate && (
        <PlanSheet
          date={planDate}
          pubs={pubs}
          onClose={() => setPlanDate(null)}
          onPick={(pub) => {
            patchPub(pub, { date: planDate })
            setPlanDate(null)
          }}
          onNewMakeup={() => {
            setChoosing({ date: planDate })
            setPlanDate(null)
          }}
        />
      )}

      {choosing && (
        <Sheet title="Ajouter" onClose={() => setChoosing(null)}>
          <div className="chooser">
            {NEW_CHOICES.map(({ category, hint }) => (
              <button
                key={category}
                onClick={() => {
                  const kind = category === 'makeup' ? 'tuto' : 'video'
                  setDraft({
                    category,
                    ...(choosing.date && { publications: [{ kind, date: choosing.date, status: 'realise' }] }),
                  })
                  setChoosing(null)
                }}
              >
                <span>{(() => { const Icon = CATEGORY_INFO[category].icon; return <Icon size={22} strokeWidth={1.8} /> })()}</span>
                <span>{CATEGORY_INFO[category].newTitle}<small>{hint}</small></span>
              </button>
            ))}
            <button
              onClick={() => {
                setRecapDraft(choosing.date ? { date: choosing.date } : {})
                setChoosing(null)
              }}
            >
              <span><Layers size={22} strokeWidth={1.8} /></span>
              <span>Nouveau récap<small>Une vidéo qui regroupe plusieurs contenus</small></span>
            </button>
          </div>
        </Sheet>
      )}

      {recapDraft && (
        <Sheet title={recapDraft.id ? 'Modifier le récap' : 'Nouveau récap'} onClose={() => setRecapDraft(null)}>
          <RecapForm
            initial={recapDraft}
            makeups={makeups}
            onCancel={() => setRecapDraft(null)}
            onSaved={async () => {
              setRecapDraft(null)
              await reload()
            }}
          />
        </Sheet>
      )}

      {draft && (
        <Sheet title={draft.id ? 'Modifier' : CATEGORY_INFO[draft.category ?? 'makeup'].newTitle} onClose={() => setDraft(null)}>
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
      <ConfirmHost />
    </div>
  )
}
