import { daysUntil, todayISO } from './dates'
import type { Makeup } from './types'

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

  const pending = makeups.filter((m) => m.status !== 'publie')
  const urgent = pending.filter((m) => [1, 2].includes(daysUntil(m.date)))
  const today = pending.filter((m) => daysUntil(m.date) === 0)
  const late = pending.filter((m) => daysUntil(m.date) < 0)
  if (!urgent.length && !today.length && !late.length) return

  const lines = [
    today.length && `Aujourd’hui : ${today.map((m) => m.title).join(', ')}`,
    urgent.length && `🚨 J-1/J-2 : ${urgent.map((m) => m.title).join(', ')}`,
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
