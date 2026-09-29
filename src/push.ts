import { supabase } from './supabase'

// Clé publique VAPID (publique par nature ; la clé privée est dans les secrets Supabase)
const VAPID_PUBLIC_KEY = 'BG4F5uVEs37tY4FuYmre8gyLw3BMmEgdtICMTp-mJdxI0_hxCxwEeRC_QttzbvMlIt9H7-rjHKcdqUGJ5riT7aQ'

/** Sur iPhone, les notifications ne marchent que dans l'appli installée sur l'écran d'accueil. */
export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission === 'granted') await syncPushSubscription()
  return permission
}

/** Abonne ce téléphone (si autorisé) et l'enregistre dans Supabase. */
export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== 'granted' || !import.meta.env.PROD) return
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }))
  const { endpoint, keys } = sub.toJSON()
  if (!endpoint || !keys) return
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

function base64UrlToBytes(s: string) {
  const b64 = (s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
