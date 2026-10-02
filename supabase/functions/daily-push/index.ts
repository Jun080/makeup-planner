// Edge Function Supabase : envoie le résumé du matin (8h) et le rappel du soir (20h), heure de Paris.
// Appelée toutes les heures par pg_cron ; elle ne fait rien en dehors de ces deux créneaux.
// Test manuel : ajouter ?mode=morning ou ?mode=evening à l'URL.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'Europe/Paris'
const MORNING_HOUR = 8
const EVENING_HOUR = 20
const APP_URL = 'https://jun080.github.io/makeup-planner/'

const KINDS: Record<string, string> = { tuto: 'Tuto', photo: 'Photo', video: 'Vidéo', recap: '' }
const STATUSES: Record<string, string> = {
  a_faire: 'À faire',
  realise: 'Réalisé',
  montage: 'Montage',
  pret: 'Prêt',
  publie: 'Publié',
}

type Pub = {
  kind: string
  date: string | null
  status: string
  title: string | null
  abandoned_at: string | null
  makeups: { title: string; abandoned_at: string | null } | null
}
type Message = { title: string; body: string; tag: string; url: string }

webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

/** Date YYYY-MM-DD à Paris, décalée de `offset` jours. */
function parisDate(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + offset * 86_400_000))
}

function parisHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
}

function daysFromToday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = parisDate().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

const label = (p: Pub) => `${KINDS[p.kind] ?? p.kind} ${p.title ?? p.makeups?.title ?? ''}`.trim()
const isFiller = (p: Pub) => p.kind === 'photo' || p.kind === 'video'
const weekday = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' })

function morning(pubs: Pub[]): Message | null {
  const pending = pubs.filter((p) => p.status !== 'publie')
  const dated = pending.filter((p) => p.date) as (Pub & { date: string })[]
  const lines: string[] = []

  const today = dated.filter((p) => daysFromToday(p.date) === 0)
  if (today.length) {
    lines.push(
      'Aujourd’hui : ' +
        today.map((p) => `${label(p)} (${p.status === 'pret' ? 'prêt' : `pas prêt : ${STATUSES[p.status]}`})`).join(', '),
    )
  }

  // À monter sur CapCut : tutos / vidéos / récaps pas encore prêts, du plus urgent au moins urgent
  const toEdit = pending
    .filter((p) => p.kind !== 'photo' && (p.status === 'realise' || p.status === 'montage'))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .slice(0, 3)
  if (toEdit.length) {
    lines.push('À monter : ' + toEdit.map((p) => `${label(p)}${p.date ? ` (${weekday(p.date)})` : ''}`).join(', '))
  }

  const late = dated.filter((p) => daysFromToday(p.date) < 0).length
  if (late) lines.push(`${late} en retard`)

  const busy = new Set(pubs.map((p) => p.date))
  let empty = 0
  for (let i = 0; i < 7; i++) if (!busy.has(parisDate(i))) empty++
  const fillers = pending.filter((p) => !p.date && isFiller(p) && p.status === 'pret').length
  const extra = [empty && `${empty} jour${empty > 1 ? 's' : ''} vide${empty > 1 ? 's' : ''} cette semaine`, fillers && `${fillers} en réserve`]
    .filter(Boolean)
    .join(' · ')
  if (extra) lines.push(extra)

  if (!lines.length) return null
  return { title: 'Ta journée', body: lines.join('\n'), tag: 'morning', url: APP_URL }
}

function evening(pubs: Pub[]): Message | null {
  const pending = pubs.filter((p) => p.status !== 'publie')
  const tomorrow = pending.filter((p) => p.date && daysFromToday(p.date) === 1)
  if (tomorrow.length) {
    const body = tomorrow
      .map((p) => `${label(p)} : ${p.status === 'pret' ? 'prêt' : `pas prêt (${STATUSES[p.status]})`}`)
      .join('\n')
    return { title: 'Demain', body, tag: 'evening', url: APP_URL }
  }
  const fillers = pending.filter((p) => !p.date && isFiller(p) && p.status === 'pret').length
  const body = fillers
    ? `Rien de prévu demain. Tu as ${fillers} photo${fillers > 1 ? 's' : ''} / vidéo${fillers > 1 ? 's' : ''} prête${fillers > 1 ? 's' : ''} à caser.`
    : 'Rien de prévu demain.'
  return { title: 'Demain', body, tag: 'evening', url: APP_URL }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  let mode = new URL(req.url).searchParams.get('mode')
  if (!mode) {
    const h = parisHour()
    mode = h === MORNING_HOUR ? 'morning' : h === EVENING_HOUR ? 'evening' : null
  }
  if (mode !== 'morning' && mode !== 'evening') return Response.json({ skipped: true })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: subs, error } = await db.from('push_subscriptions').select('*')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results: string[] = []
  for (const userId of new Set(subs.map((s) => s.user_id))) {
    const { data: pubs } = await db
      .from('publications')
      .select('kind, date, status, title, abandoned_at, makeups!publications_makeup_id_fkey(title, abandoned_at)')
      .eq('user_id', userId)
    // Les contenus et récaps abandonnés sont ignorés
    const active = ((pubs ?? []) as Pub[]).filter((p) => !p.abandoned_at && !p.makeups?.abandoned_at)
    const msg = (mode === 'morning' ? morning : evening)(active)
    if (!msg) continue

    for (const s of subs.filter((x) => x.user_id === userId)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg))
        results.push('envoyé')
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        // Téléphone désabonné ou appli désinstallée : on oublie cet abonnement
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
        results.push(`erreur ${code ?? (err as Error).message}`)
      }
    }
  }
  return Response.json({ mode, results })
})
