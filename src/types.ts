import { Brush, Camera, Clapperboard, Layers, Package, Palette, Shapes, Video } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { daysUntil, formatDate, todayISO } from './dates'

export type Category = 'makeup' | 'unboxing' | 'swatch' | 'autre'
export type Status = 'a_faire' | 'realise' | 'montage' | 'pret' | 'publie'
export type PubKind = 'tuto' | 'photo' | 'video' | 'recap'
/** Types de publication rattachés à un seul makeup. */
export type MakeupPubKind = Exclude<PubKind, 'recap'>

export interface Product {
  id: string
  brand: string
  product: string
  color: string | null
  name: string | null
  is_pr: boolean
}

export interface Publication {
  id: string
  makeup_id: string | null // vide pour un récap
  title: string | null // titre d'un récap
  abandoned_at?: string | null // récap abandonné
  kind: PubKind
  date: string | null // YYYY-MM-DD, null = en réserve
  status: Status
  // Absents tant que migration_010 n'est pas passée
  on_insta?: boolean // en ligne sur Instagram
  on_tiktok?: boolean // en ligne sur TikTok
  // Stats ~48 h après, par réseau (ig = Instagram, tt = TikTok) ; follows = nouveaux abonnés
  ig_views?: number | null
  ig_saves?: number | null
  ig_shares?: number | null
  ig_follows?: number | null
  tt_views?: number | null
  tt_saves?: number | null
  tt_shares?: number | null
  tt_follows?: number | null
  stats_at?: string | null // rempli = stats notées (ou passées)
}

export type Net = 'ig' | 'tt'
export type Metric = 'views' | 'saves' | 'shares' | 'follows'
export type StatKey = `${Net}_${Metric}`
export type PubStats = Partial<Record<StatKey, number | null>> & Pick<Publication, 'on_insta' | 'on_tiktok' | 'stats_at'>

export const NETS: { id: Net; label: string }[] = [
  { id: 'ig', label: 'Insta' },
  { id: 'tt', label: 'TikTok' },
]

/** Une stat d'un post sur un réseau, ou les deux additionnés (null = pas notée). */
export function stat(p: Publication, m: Metric, net: Net | 'all'): number | null {
  const nets: Net[] = net === 'all' ? ['ig', 'tt'] : [net]
  const vals = nets.map((n) => p[`${n}_${m}`]).filter((v): v is number => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}

/** Thème de rêve en réserve, proposé au sondage du vendredi. */
export interface ThemeIdea {
  id: string
  name: string
  used_at: string | null
  created_at: string
}

export interface Makeup {
  id: string
  title: string
  category: Category
  date: string // date de réalisation
  is_collab: boolean
  collab_with: string | null
  notes: string | null
  photo_path: string | null // chemin dans Supabase Storage
  photo_url: string | null // lien temporaire pour l'afficher (calculé, pas stocké)
  abandoned_at: string | null // rempli = abandonné
  dream_no: number | null // Rêve n°X auquel appartient ce makeup
  dream_slot: number | null // makeup 1 à 4 de la semaine du rêve
  hook: string | null // accroche écrite à l'écran
  question: string | null // question en tête de description
  deadline: string | null // à poster avant cette date (YYYY-MM-DD), sinon plus de sens
  product_ids: string[]
  publications: Publication[]
}

/** Récap : une publication qui regroupe plusieurs makeups. */
export type Recap = Publication & { kind: 'recap'; makeup_ids: string[] }

/** Publication prête à afficher : titre, makeups concernés et leurs photos. */
export type Pub = Publication & { displayTitle: string; makeups: Makeup[]; photos: string[] }

/** 1 rêve = 1 thème = 1 semaine : tournage la semaine `shoot_week`, posts la semaine suivante. */
export interface Dream {
  id: string
  no: number
  theme: string | null // vide = pas encore voté
  shoot_week: string // lundi de la semaine de tournage (YYYY-MM-DD)
}

export interface Idea {
  id: string
  title: string
  description: string | null
  created_at: string
}

export const PUB_KINDS: Record<PubKind, string> = {
  tuto: 'Tuto',
  photo: 'Photo',
  video: 'Vidéo',
  recap: 'Récap',
}

export const CATEGORIES: Record<Category, string> = {
  makeup: 'Makeup',
  swatch: 'Swatch',
  unboxing: 'Unboxing',
  autre: 'Autre',
}

/** Ce qui change selon le type de contenu : un swatch ou un unboxing n'est pas un makeup. */
export const CATEGORY_INFO: Record<
  Category,
  { icon: LucideIcon; newTitle: string; placeholder: string; products: string; withTuto: boolean; defaultKinds: MakeupPubKind[] }
> = {
  makeup: {
    icon: Brush,
    newTitle: 'Nouveau makeup',
    placeholder: 'ex : Look Halloween squelette',
    products: 'Produits utilisés',
    withTuto: true,
    defaultKinds: [],
  },
  swatch: {
    icon: Palette,
    newTitle: 'Nouveau swatch',
    placeholder: 'ex : Swatch palette Emerald Obsessions',
    products: 'Produits swatchés',
    withTuto: false,
    defaultKinds: ['video'],
  },
  unboxing: {
    icon: Package,
    newTitle: 'Nouvel unboxing',
    placeholder: 'ex : Calendrier de l’avent Huda, colis Glisten…',
    products: 'Produits reçus',
    withTuto: false,
    defaultKinds: ['video'],
  },
  autre: {
    icon: Shapes,
    newTitle: 'Nouveau contenu',
    placeholder: 'ex : Get ready with me',
    products: 'Produits',
    withTuto: true,
    defaultKinds: [],
  },
}

export const STATUSES: Record<Status, string> = {
  a_faire: 'À faire',
  realise: 'Réalisé',
  montage: 'Montage',
  pret: 'Prêt',
  publie: 'Publié',
}

export const STATUS_ORDER: Status[] = ['a_faire', 'realise', 'montage', 'pret', 'publie']

export function productLabel(p: Product) {
  return [p.brand, p.product, p.name, p.color].filter(Boolean).join(' · ')
}

export const KIND_ICONS: Record<PubKind, LucideIcon> = { tuto: Clapperboard, photo: Camera, video: Video, recap: Layers }

/** Icône à afficher quand il n'y a pas de photo : le type de contenu (swatch, unboxing), sinon le type de publication. */
export function pubIcon(p: Pub) {
  const c = p.kind !== 'recap' ? p.makeups[0]?.category : undefined
  return c && c !== 'makeup' ? CATEGORY_INFO[c].icon : KIND_ICONS[p.kind]
}

/** Photo ou vidéo : les "jokers" qui comblent les jours vides. */
export const isFiller = (p: Publication) => p.kind === 'photo' || p.kind === 'video'

const photosOf = (list: Makeup[]) => list.flatMap((m) => (m.photo_url ? [m.photo_url] : []))

export function allPubs(makeups: Makeup[], recaps: Recap[]): Pub[] {
  // Les contenus abandonnés sortent du planning (accueil, calendrier, pipeline, retards)
  const byId = new Map(makeups.map((m) => [m.id, m]))
  const fromMakeups = makeups.filter((m) => !m.abandoned_at).flatMap((m) =>
    m.publications.map((p) => ({ ...p, displayTitle: m.title, makeups: [m], photos: photosOf([m]) })),
  )
  const fromRecaps = recaps.filter((r) => !r.abandoned_at).map((r) => {
    const list = r.makeup_ids.flatMap((id) => byId.get(id) ?? [])
    return { ...r, displayTitle: r.title || 'Récap', makeups: list, photos: photosOf(list) }
  })
  return [...fromMakeups, ...fromRecaps]
}

/* ============ DA « Dream journal » ============ */

/** Rappel de la DA, affiché (pas à cocher) dans chaque contenu. */
export const DA_REMINDER = [
  'Lumière froide, fond uni bleu nuit ou gris',
  'Visage de face et tête droite d’abord, gros plan de l’œil à la fin',
  'Accroche écrite à l’écran dès la 1re seconde, on voit le geste',
  'Fin : « abonne-toi pour le prochain rêve » · couverture « Rêve n°XX »',
]

export const HOOK_IDEAS = [
  'Ce look en 5 min',
  'Freestyle total, verdict ?',
  'Look de bureau mais pas chiant',
  'Envoie ça à ta pote qui rate son liner',
  'Le liner graphique pour débutantes',
]

export const QUESTION_IDEAS = ['Tu préfères lequel ?', 'Tu le porterais ?', 'Je refais lequel en tuto ?', 'Vous en pensez quoi ?']


/** Description prête à coller : question, rêve, appel à s'abonner, puis produits par marque. */
export function buildCaption(m: Pick<Makeup, 'title' | 'dream_no' | 'question'>, products: Product[], theme?: string | null) {
  const byBrand = new Map<string, string[]>()
  for (const p of products) {
    const item = [p.product, p.name, p.color].filter(Boolean).join(' ')
    byBrand.set(p.brand, [...(byBrand.get(p.brand) ?? []), item])
  }
  const lines = [
    m.question?.trim() || 'Vous en pensez quoi ?',
    '',
    m.dream_no ? `✦ Rêve n°${m.dream_no}${theme ? ` · ${theme}` : ''}` : `✦ ${m.title}`,
    'Abonne-toi pour ne pas rater le prochain rêve ✦',
  ]
  if (byBrand.size) lines.push('', '*:･ﾟ✧', ...[...byBrand].map(([brand, items]) => `@${brand} : ${items.join(', ')}`))
  return lines.join('\n')
}

/* ============ Dates limites ============ */

/** Fêtes qui rendent un look « périmé » une fois passées (mois-jour). */
export const EVENTS: { label: string; md: string }[] = [
  { label: 'Saint-Valentin', md: '02-14' },
  { label: 'Halloween', md: '10-31' },
  { label: 'Noël', md: '12-25' },
  { label: 'Nouvel An', md: '12-31' },
]

/** Prochaine occurrence (aujourd'hui compris) d'une fête « MM-JJ ». */
export function nextOccurrence(md: string) {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  const iso = `${year}-${md}`
  return iso >= today ? iso : `${year + 1}-${md}`
}

export const deadlineOf = (p: Pub) => (p.kind === 'recap' ? null : (p.makeups[0]?.deadline ?? null))

/** Le contenu peut-il encore sortir ce jour-là ? */
export const fitsDeadline = (p: Pub, iso: string) => {
  const dl = deadlineOf(p)
  return !dl || iso <= dl
}

/**
 * Problème de date limite d'une publication pas encore publiée :
 * `late` = trop tard ou mal planifiée, `soon` = ça devient juste.
 */
export function deadlineIssue(p: Pub): { level: 'late' | 'soon'; text: string } | null {
  const dl = deadlineOf(p)
  if (!dl || p.status === 'publie') return null
  const d = daysUntil(dl)
  if (d < 0) return { level: 'late', text: `date limite passée (${formatDate(dl)})` }
  if (p.date && p.date > dl) return { level: 'late', text: `prévu après la date limite (${formatDate(dl)})` }
  const left = d === 0 ? 'dernier jour' : `plus que ${d} j`
  if (d <= 3 && p.status !== 'pret') return { level: 'soon', text: `${left} et pas prêt` }
  if (!p.date && d <= 7) return { level: 'soon', text: `${left}, pas encore planifié` }
  return null
}

/* ============ Rêves : la semaine type ============ */

/** Les makeups d'un rêve : jour de tournage (0 = lundi) et format du post, la semaine suivante le même jour. */
export const DREAM_SLOTS: {
  slot: number
  day: number
  kind: MakeupPubKind
  label: string
  hint: string
  hook: (no: number, theme: string | null) => string
  optional?: boolean
}[] = [
  {
    slot: 1, day: 0, kind: 'tuto', label: 'Tuto principal',
    hint: 'Tuto pas à pas · Toute la paupière en couleurs : fards fondus, dégradés, pas de trait net',
    hook: (no, theme) => `Rêve n°${no}${theme ? ` : ${theme}` : ''}`,
  },
  {
    slot: 2, day: 2, kind: 'tuto', label: 'Version graphique',
    hint: 'Tuto accéléré (liner en action, texte à l’écran) · Que des traits sur peau nue, aucun fard',
    hook: (no) => `Rêve n°${no}, version graphique`,
  },
  {
    slot: 3, day: 3, kind: 'video', label: 'Visage entier',
    hint: 'Assemblage du résultat · Tout le visage (personnage, occasion) : lèvres et teint changent aussi',
    hook: (_no, theme) => `Envoie ça à ta pote qui adore ${theme ? theme.toLowerCase() : 'les looks de dingue'}`,
  },
  {
    slot: 4, day: 4, kind: 'tuto', label: 'Version 5 min',
    hint: 'Tuto court (30 s) · 1 ou 2 produits max : les gens doivent pouvoir le refaire',
    hook: (no) => `Le rêve n°${no}, version 5 min`, optional: true,
  },
]

export const dreamLabel = (d: Pick<Dream, 'no' | 'theme'>) => `Rêve n°${d.no}${d.theme ? ` · ${d.theme}` : ''}`

/** Titre d'un makeup de rêve, ex. « Rêve n°4 · Abysses · Tuto principal ». */
export function dreamMakeupTitle(d: Pick<Dream, 'no' | 'theme'>, slot: number) {
  return `${dreamLabel(d)} · ${DREAM_SLOTS.find((s) => s.slot === slot)?.label ?? `makeup ${slot}`}`
}

export const dreamCarouselTitle = (d: Pick<Dream, 'no' | 'theme'>) => `${dreamLabel(d)} · tu préfères quel look du dream ?`

/* ============ Réseaux & stats ============ */

/** Publié sur un seul des deux réseaux (les anciens posts, sans info, ne comptent pas). */
export function missingNetwork(p: Publication): 'Insta' | 'TikTok' | null {
  if (p.status !== 'publie' || p.on_insta === undefined || p.on_insta === p.on_tiktok) return null
  return p.on_insta ? 'TikTok' : 'Insta'
}

/** Posts publiés il y a 2 à 14 jours dont les stats ne sont pas encore notées. */
export function needsStats(p: Publication, today: string) {
  if (p.status !== 'publie' || p.stats_at !== null || !p.date) return false
  const age = Math.round((Date.parse(today) - Date.parse(p.date)) / 86_400_000)
  return age >= 2 && age <= 14
}

/** Format d'un post pour comparer les stats : place dans le rêve, sinon type de publication. */
export function pubFormat(p: Pub) {
  if (p.kind === 'recap') return 'Carrousel / récap'
  const m = p.makeups[0]
  const slot = DREAM_SLOTS.find((s) => s.slot === m?.dream_slot)
  if (slot) return slot.label
  if (m && m.category !== 'makeup') return CATEGORIES[m.category]
  return `${PUB_KINDS[p.kind]} hors rêve`
}
