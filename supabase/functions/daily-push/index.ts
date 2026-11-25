// Edge Function Supabase : envoie le résumé du matin (6h30) et le rappel du soir (20h15), heure de Paris.
// Appelée toutes les 15 min par pg_cron ; elle ne fait rien en dehors de ces deux créneaux de 15 min.
// Test manuel : ajouter ?mode=morning ou ?mode=evening à l'URL.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'Europe/Paris'
// Début de chaque créneau, en minutes depuis minuit (le cron passe toutes les 15 min : un seul envoi par créneau)
const MORNING = 6 * 60 + 30 // 6h30, avant de se maquiller
const EVENING = 20 * 60 + 15 // 20h15
const SLOT = 15
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
  makeups: { title: string; date: string; abandoned_at: string | null; deadline: string | null } | null
  // migration_010
  on_insta?: boolean
  on_tiktok?: boolean
  stats_at?: string | null
}
type Dream = { no: number; theme: string | null; shoot_week: string }
type Shoot = { title: string; abandoned_at: string | null; publications: { status: string }[] }
type Theme = { name: string; used_at: string | null }
type Message = { title: string; body: string; tag: string; url: string }

webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

/** Date YYYY-MM-DD à Paris, décalée de `offset` jours. */
function parisDate(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + offset * 86_400_000))
}

/** Minutes écoulées depuis minuit, heure de Paris. */
function parisMinutes() {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .format(new Date())
    .split(':')
    .map(Number)
  return h * 60 + m
}

function daysFromToday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = parisDate().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

const label = (p: Pub) => `${KINDS[p.kind] ?? p.kind} ${p.title ?? p.makeups?.title ?? ''}`.trim()
const isFiller = (p: Pub) => p.kind === 'photo' || p.kind === 'video'

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Les rendez-vous de la semaine type des rêves (même logique que src/agenda.ts). */
function rituals(today: string, dreams: Dream[], themes: Theme[]) {
  const weekdayNo = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7 // 0 = lundi
  const monday = addDays(today, -weekdayNo)
  const posting = dreams.find((d) => d.shoot_week === addDays(monday, -7))
  const shooting = dreams.find((d) => d.shoot_week === monday)
  // Le rêve tourné lundi prochain : son sondage et son annonce tombent même après une pause
  const upcoming = dreams.find((d) => d.shoot_week === addDays(monday, 7))
  if (!posting && !shooting && !upcoming) return []
  const name = (d: Pick<Dream, 'no' | 'theme'>) => `Rêve n°${d.no}${d.theme ? ` · ${d.theme}` : ''}`
  const nextNo = upcoming?.no ?? (shooting?.no ?? posting!.no + 1) + 1
  const next = upcoming ?? dreams.find((d) => d.no === nextNo)
  const lines: string[] = []

  if (weekdayNo === 0 && posting && !shooting) lines.push(`🌙 Crée le Rêve n°${posting.no + 1} : rien n’est prévu au tournage cette semaine`)
  if (weekdayNo === 4) {
    if (!next?.theme) {
      const free = themes.filter((t) => !t.used_at)
      const week = Math.floor(Date.parse(monday) / (7 * 86_400_000))
      const a = free.length ? (week * 2) % free.length : 0
      const pick = free.length >= 2 ? ` : « ${free[a].name} ou ${free[(a + 1) % free.length].name} ? »` : ''
      lines.push(`📊 Story sondage : le thème du Rêve n°${nextNo}${pick}`)
    }
  }
  if (weekdayNo === 5) lines.push(`📣 Story : annonce du thème du Rêve n°${nextNo}${next?.theme ? ` (${next.theme})` : ''}`)
  if (weekdayNo === 6 && shooting) lines.push(`✨ Fin du carrousel : « Demain : ${name(shooting)} »`)
  return lines
}

/**
 * Le matin, seulement ce qui se fait aujourd'hui (2-3 lignes) : à poster, à tourner, la story du jour,
 * une date limite vraiment urgente. Le reste (à monter, réserve, retards…) est sur l'accueil de l'appli.
 */
function morning(pubs: Pub[], shoots: Shoot[], dreams: Dream[], themes: Theme[]): Message | null {
  const today = parisDate()
  const pending = pubs.filter((p) => p.status !== 'publie')
  const lines: string[] = []

  const toPost = pending.filter((p) => p.date === today)
  if (toPost.length) {
    lines.push('📤 À poster : ' + toPost.map((p) => `${label(p)} (${p.status === 'pret' ? 'prêt' : `pas prêt : ${STATUSES[p.status]}`})`).join(', '))
  }

  // Makeups du jour : à tourner (une publication « À faire »), ou look du jour sans publication (story, ex. calendrier)
  const shoot = shoots
    .filter((m) => !m.abandoned_at && (!m.publications.length || m.publications.some((p) => p.status === 'a_faire')))
    .map((m) => (m.publications.length ? m.title : `${m.title} (look du jour : photo, clip, story)`))
  if (shoot.length) lines.push('🎬 À tourner : ' + shoot.join(', '))

  lines.push(...rituals(today, dreams, themes))

  // Date limite dans 3 jours ou moins, et pas prêt
  const urgent = pending.filter((p) => {
    const dl = p.makeups?.deadline
    if (!dl || p.status === 'pret') return false
    const d = daysFromToday(dl)
    return d >= 0 && d <= 3
  })
  if (urgent.length) {
    lines.push('⏳ ' + urgent.map((p) => `${label(p)} : plus que ${daysFromToday(p.makeups!.deadline!)} j`).join(', '))
  }

  // Le dimanche seulement : un rappel groupé pour les stats
  const sunday = new Date(today + 'T12:00:00Z').getUTCDay() === 0
  const stats = pubs.filter((p) => {
    if (p.status !== 'publie' || p.stats_at !== null || !p.date) return false
    const age = -daysFromToday(p.date)
    return age >= 2 && age <= 14
  }).length
  if (sunday && stats) lines.push(`📈 ${stats} post${stats > 1 ? 's' : ''} dont noter les stats`)

  if (!lines.length) return null
  return { title: 'Ta journée', body: lines.join('\n'), tag: 'morning', url: APP_URL }
}

function evening(pubs: Pub[]): Message | null {
  const lines: string[] = []

  // Posté aujourd'hui sur un seul des deux réseaux
  const half = pubs.filter((p) => p.status === 'publie' && p.on_insta !== undefined && p.on_insta !== p.on_tiktok && p.date === parisDate())
  for (const p of half) lines.push(`${label(p)} : posté sur ${p.on_insta ? 'Insta' : 'TikTok'} seulement`)

  const pending = pubs.filter((p) => p.status !== 'publie')
  const tomorrow = pending.filter((p) => p.date && daysFromToday(p.date) === 1)
  if (tomorrow.length) {
    for (const p of tomorrow) lines.push(`Demain : ${label(p)} (${p.status === 'pret' ? 'prêt' : `pas prêt : ${STATUSES[p.status]}`})`)
  } else {
    const fillers = pending.filter((p) => !p.date && isFiller(p) && p.status === 'pret').length
    lines.push(
      fillers
        ? `Rien de prévu demain. Tu as ${fillers} photo${fillers > 1 ? 's' : ''} / vidéo${fillers > 1 ? 's' : ''} prête${fillers > 1 ? 's' : ''} à caser.`
        : 'Rien de prévu demain.',
    )
  }
  return { title: half.length ? 'Ce soir' : 'Demain', body: lines.join('\n'), tag: 'evening', url: APP_URL }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  let mode = new URL(req.url).searchParams.get('mode')
  if (!mode) {
    const t = parisMinutes()
    mode = t >= MORNING && t < MORNING + SLOT ? 'morning' : t >= EVENING && t < EVENING + SLOT ? 'evening' : null
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
      .select('*, makeups!publications_makeup_id_fkey(title, date, abandoned_at, deadline)')
      .eq('user_id', userId)
    // Rêves et thèmes : ignorés si les migrations 009 / 010 ne sont pas passées
    const { data: dreams } = await db.from('dreams').select('no, theme, shoot_week').eq('user_id', userId)
    const { data: themes } = await db.from('theme_ideas').select('name, used_at').eq('user_id', userId).order('created_at')
    const { data: shoots } = await db
      .from('makeups')
      .select('title, abandoned_at, publications!publications_makeup_id_fkey(status)')
      .eq('user_id', userId)
      .eq('date', parisDate())
    // Les contenus et récaps abandonnés sont ignorés
    const active = ((pubs ?? []) as Pub[]).filter((p) => !p.abandoned_at && !p.makeups?.abandoned_at)
    const msg = mode === 'morning' ? morning(active, (shoots ?? []) as Shoot[], (dreams ?? []) as Dream[], (themes ?? []) as Theme[]) : evening(active)
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
