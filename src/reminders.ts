import { daysUntil, todayISO } from './dates'
import { allPubs, PUB_KINDS } from './types'
import type { Makeup, Pub } from './types'

const KEY = 'last-reminder-day'

/**
 * Notification locale affichée à l'ouverture de l'appli (une fois par jour max).
 * Les vraies notifications push quand l'appli est fermée demanderaient un serveur.
 */
export async function notifyIfNeeded(makeups: Makeup[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    if (localStorage.getItem(KEY) === todayISO()) return
  } catch {
    /* stockage indisponible : on notifie quand même */
  }

  const pending = allPubs(makeups).filter((p): p is Pub & { date: string } => p.status !== 'publie' && p.date !== null)
  const urgent = pending.filter((p) => [1, 2].includes(daysUntil(p.date)))
  const today = pending.filter((p) => daysUntil(p.date) === 0)
  const late = pending.filter((p) => daysUntil(p.date) < 0)
  if (!urgent.length && !today.length && !late.length) return

  const label = (list: Pub[]) => list.map((p) => `${PUB_KINDS[p.kind]} ${p.makeup.title}`).join(', ')
  const lines = [
    today.length && `Aujourd’hui : ${label(today)}`,
    urgent.length && `🚨 J-1/J-2 : ${label(urgent)}`,
    late.length && `${late.length} en retard`,
  ].filter(Boolean)

  const reg = await navigator.serviceWorker?.getRegistration()
  const title = '💄 Makeup Planner'
  const options = { body: lines.join('\n'), icon: 'icon-192.png', tag: 'daily' }
  if (reg) await reg.showNotification(title, options)
  else new Notification(title, options)

  try {
    localStorage.setItem(KEY, todayISO())
  } catch {
    /* ignore */
  }
}
