import { useState } from 'react'
import { addDays, formatDate, todayISO } from '../dates'
import { missingNetwork, needsStats, NETS, pubFormat, stat } from '../types'
import type { Dream, Net, Pub } from '../types'
import { PubLine } from './PubBits'

type Period = 30 | 90 | 0

const fmt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)} k` : n.toLocaleString('fr-FR'))
/** Abonnés gagnés pour 1 000 vues : ce qui transforme les vues en abonnés. */
const conv = (follows: number, views: number) => (views ? ((follows / views) * 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '–')

type Row = { key: string; n: number; views: number; follows: number; saves: number; shares: number }

function group(pubs: Pub[], net: Net | 'all', keyOf: (p: Pub) => string | null): Row[] {
  const rows = new Map<string, Row>()
  for (const p of pubs) {
    const key = keyOf(p)
    if (!key) continue
    const r = rows.get(key) ?? { key, n: 0, views: 0, follows: 0, saves: 0, shares: 0 }
    r.n++
    r.views += stat(p, 'views', net) ?? 0
    r.follows += stat(p, 'follows', net) ?? 0
    r.saves += stat(p, 'saves', net) ?? 0
    r.shares += stat(p, 'shares', net) ?? 0
    rows.set(key, r)
  }
  return [...rows.values()].sort((a, b) => b.follows / (b.views || 1) - a.follows / (a.views || 1))
}

/** Ce qui marche : quels formats et quels rêves t'apportent des abonnés. */
export function StatsView({ pubs, dreams, onEdit }: { pubs: Pub[]; dreams: Dream[]; onEdit: (p: Pub) => void }) {
  const [period, setPeriod] = useState<Period>(30)
  const [net, setNet] = useState<Net | 'all'>('all')
  const today = todayISO()
  const from = period ? addDays(today, -period) : ''
  const withStats = pubs.filter((p) => stat(p, 'views', net) != null && p.date && p.date >= from)
  const views = (p: Pub) => stat(p, 'views', net)
  const follows = (p: Pub) => stat(p, 'follows', net) ?? 0
  const todo = pubs.filter((p) => needsStats(p, today) || missingNetwork(p))
  const recent = pubs
    .filter((p) => p.status === 'publie' && p.date && p.date >= addDays(today, -21) && !todo.includes(p))
    .sort((a, b) => b.date!.localeCompare(a.date!))

  if (pubs.length && pubs.every((p) => p.on_insta === undefined)) {
    return <p className="empty">Lance d’abord <code>migration_010_stats.sql</code> dans Supabase (voir le README).</p>
  }

  const total = group(withStats, net, () => 'total')[0]
  const formats = group(withStats, net, pubFormat)
  const themeOf = new Map(dreams.map((d) => [d.no, d.theme]))
  const byDream = group(withStats, net, (p) => {
    const no = p.makeups.find((m) => m.dream_no)?.dream_no
    return no ? `Rêve n°${no}${themeOf.get(no) ? ` · ${themeOf.get(no)}` : ''}` : null
  })
  const top = [...withStats].sort((a, b) => follows(b) - follows(a)).slice(0, 5)
  const both = NETS.map((n) => {
    const r = group(withStats.filter((p) => stat(p, 'views', n.id) != null), n.id, () => n.label)[0]
    return r && r.views ? { ...n, r } : null
  }).filter(Boolean) as { id: Net; label: string; r: Row }[]

  return (
    <div className="stats">
      {todo.length > 0 && (
        <section>
          <h2>À noter</h2>
          <div className="late-list">
            {todo.map((p) => (
              <PubLine key={p.id} pub={p} onOpen={() => onEdit(p)} detail={missingNetwork(p) ? `pas encore sur ${missingNetwork(p)}` : 'stats à noter'} />
            ))}
          </div>
        </section>
      )}

      <div className="segmented">
        {([30, 90, 0] as Period[]).map((p) => (
          <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>
            {p ? `${p} jours` : 'Tout'}
          </button>
        ))}
      </div>
      <div className="segmented">
        {[{ id: 'all' as const, label: 'Les deux' }, ...NETS].map((n) => (
          <button key={n.id} className={net === n.id ? 'on' : ''} onClick={() => setNet(n.id)}>
            {n.label}
          </button>
        ))}
      </div>

      {!total ? (
        <p className="empty">Pas encore de stats sur cette période.<br />Note-les 2 jours après chaque post : l’accueil te le rappelle.</p>
      ) : (
        <>
          <section>
            <div className="tiles">
              <div className="tile"><strong>{fmt(total.views)}</strong><small>vues</small></div>
              <div className="tile"><strong>{fmt(total.follows)}</strong><small>abonnés gagnés</small></div>
              <div className="tile"><strong>{conv(total.follows, total.views)}</strong><small>abonnés / 1 000 vues</small></div>
            </div>
            <p className="muted">{total.n} post{total.n > 1 ? 's' : ''} · {fmt(total.saves)} enregistrements · {fmt(total.shares)} partages</p>
          </section>

          {net === 'all' && both.length === 2 && (
            <StatsTable title="Par réseau" rows={both.map((b) => b.r)} />
          )}
          <StatsTable title="Par format" rows={formats} />
          {byDream.length > 0 && <StatsTable title="Par rêve" rows={byDream} />}

          <section>
            <h2>Les posts qui ont ramené le plus d’abonnés</h2>
            <div className="late-list">
              {top.map((p) => (
                <PubLine key={p.id} pub={p} onOpen={() => onEdit(p)} detail={`${fmt(follows(p))} abonnés · ${fmt(views(p) ?? 0)} vues`} />
              ))}
            </div>
          </section>
        </>
      )}

      {recent.length > 0 && (
        <section>
          <h2>Posts récents</h2>
          <div className="late-list">
            {recent.map((p) => (
              <PubLine
                key={p.id}
                pub={p}
                onOpen={() => onEdit(p)}
                detail={views(p) != null ? `${fmt(views(p)!)} vues · ${fmt(follows(p))} abonnés` : `${formatDate(p.date!)} · pas de stats`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatsTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="muted">Classé par abonnés gagnés pour 1 000 vues.</p>
      <div className="stats-table">
        <div className="stats-row head">
          <span />
          <span>Vues moy.</span>
          <span>Abo. / 1 000 vues</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="stats-row">
            <span>
              <strong>{r.key}</strong>
              <small>{r.n} post{r.n > 1 ? 's' : ''} · {fmt(r.follows)} abonnés · {fmt(r.saves)} enreg.</small>
            </span>
            <span>{fmt(Math.round(r.views / r.n))}</span>
            <span><strong>{conv(r.follows, r.views)}</strong></span>
          </div>
        ))}
      </div>
    </section>
  )
}
