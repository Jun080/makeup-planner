import { useState } from 'react'
import { formatDate, todayISO } from '../dates'
import type { PubPatch } from '../data'
import { NETS, pubFormat } from '../types'
import type { Metric, Net, Pub, StatKey } from '../types'

const METRICS: { key: Metric; label: string }[] = [
  { key: 'views', label: 'Vues' },
  { key: 'follows', label: 'Nouveaux abonnés' },
  { key: 'saves', label: 'Enregistrements' },
  { key: 'shares', label: 'Partages' },
]
const KEYS = NETS.flatMap((n) => METRICS.map((m) => `${n.id}_${m.key}` as StatKey))
const toNum = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/\s/g, '').replace(',', '.')))) || 0)

/** Où le post est en ligne, et ses stats ~48 h après, réseau par réseau. */
export function StatsForm({ pub, onSave, onCancel }: { pub: Pub; onSave: (patch: PubPatch) => void; onCancel: () => void }) {
  const [online, setOnline] = useState<Record<Net, boolean>>({ ig: pub.on_insta ?? false, tt: pub.on_tiktok ?? false })
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(KEYS.map((k) => [k, pub[k] != null ? String(pub[k]) : ''])),
  )
  // Les stats des réseaux où le post est en ligne (les deux si rien n'est coché)
  const shown = NETS.filter((n) => online[n.id] || (!online.ig && !online.tt))
  const filled = KEYS.some((k) => values[k].trim() !== '')

  function save(skip = false) {
    const stats = Object.fromEntries(KEYS.map((k) => [k, skip ? null : toNum(values[k])]))
    onSave({ on_insta: online.ig, on_tiktok: online.tt, ...stats, stats_at: skip || filled ? todayISO() : null })
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <p className="muted">
        {pubFormat(pub)}
        {pub.date && ` · posté le ${formatDate(pub.date)}`}
      </p>
      <fieldset>
        <legend>En ligne sur</legend>
        <div className="segmented networks">
          {NETS.map((n) => (
            <button key={n.id} type="button" className={online[n.id] ? 'on' : ''} onClick={() => setOnline({ ...online, [n.id]: !online[n.id] })}>
              {n.label} {online[n.id] && '✓'}
            </button>
          ))}
        </div>
      </fieldset>
      {shown.map((n) => (
        <fieldset key={n.id}>
          <legend>Stats {n.label} après 48 h</legend>
          <div className="series-grid">
            {METRICS.map((m) => {
              const k = `${n.id}_${m.key}`
              return (
                <label key={k}>
                  {m.label}
                  <input inputMode="numeric" value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} placeholder="0" />
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
      <div className="actions">
        <button type="button" onClick={onCancel}>Annuler</button>
        {!filled && pub.stats_at == null && (
          <button type="button" onClick={() => save(true)}>Pas de stats</button>
        )}
        <button className="primary">Enregistrer</button>
      </div>
    </form>
  )
}
