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
  kind: PubKind
  date: string | null // YYYY-MM-DD, null = en réserve
  status: Status
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
  product_ids: string[]
  publications: Publication[]
}

/** Récap : une publication qui regroupe plusieurs makeups. */
export type Recap = Publication & { kind: 'recap'; makeup_ids: string[] }

/** Publication prête à afficher : titre, makeups concernés et leurs photos. */
export type Pub = Publication & { displayTitle: string; makeups: Makeup[]; photos: string[] }

export interface Idea {
  id: string
  title: string
  description: string | null
  created_at: string
}

export const PUB_KINDS: Record<PubKind, string> = {
  tuto: '🎬 Tuto',
  photo: '📸 Photo',
  video: '🎥 Vidéo',
  recap: '🎞️ Récap',
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
  { icon: string; newTitle: string; placeholder: string; products: string; withTuto: boolean; defaultKinds: MakeupPubKind[] }
> = {
  makeup: {
    icon: '💄',
    newTitle: 'Nouveau makeup',
    placeholder: 'ex : Look Halloween squelette',
    products: 'Produits utilisés',
    withTuto: true,
    defaultKinds: [],
  },
  swatch: {
    icon: '🎨',
    newTitle: 'Nouveau swatch',
    placeholder: 'ex : Swatch palette Emerald Obsessions',
    products: 'Produits swatchés',
    withTuto: false,
    defaultKinds: ['video'],
  },
  unboxing: {
    icon: '📦',
    newTitle: 'Nouvel unboxing',
    placeholder: 'ex : Calendrier de l’avent Huda, colis Glisten…',
    products: 'Produits reçus',
    withTuto: false,
    defaultKinds: ['video'],
  },
  autre: {
    icon: '✨',
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

export const KIND_ICONS: Record<PubKind, string> = { tuto: '🎬', photo: '📸', video: '🎥', recap: '🎞️' }

/** Icône à afficher quand il n'y a pas de photo : le type de contenu (swatch, unboxing), sinon le type de publication. */
export function pubIcon(p: Pub) {
  const c = p.kind !== 'recap' ? p.makeups[0]?.category : undefined
  return c && c !== 'makeup' ? CATEGORY_INFO[c].icon : KIND_ICONS[p.kind]
}

/** Photo ou vidéo : les "jokers" qui comblent les jours vides. */
export const isFiller = (p: Publication) => p.kind === 'photo' || p.kind === 'video'

const photosOf = (list: Makeup[]) => list.flatMap((m) => (m.photo_url ? [m.photo_url] : []))

export function allPubs(makeups: Makeup[], recaps: Recap[]): Pub[] {
  const byId = new Map(makeups.map((m) => [m.id, m]))
  const fromMakeups = makeups.flatMap((m) =>
    m.publications.map((p) => ({ ...p, displayTitle: m.title, makeups: [m], photos: photosOf([m]) })),
  )
  const fromRecaps = recaps.map((r) => {
    const list = r.makeup_ids.flatMap((id) => byId.get(id) ?? [])
    return { ...r, displayTitle: r.title || 'Récap', makeups: list, photos: photosOf(list) }
  })
  return [...fromMakeups, ...fromRecaps]
}
