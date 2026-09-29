export type Category = 'makeup' | 'unboxing' | 'swatch' | 'autre'
export type Status = 'a_faire' | 'realise' | 'montage' | 'pret' | 'publie'
export type PubKind = 'tuto' | 'photo' | 'video'

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
  makeup_id: string
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

/** Publication avec son makeup, pour l'affichage. */
export type Pub = Publication & { makeup: Makeup }

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
}

export const CATEGORIES: Record<Category, string> = {
  makeup: 'Makeup',
  unboxing: 'Unboxing',
  swatch: 'Swatch',
  autre: 'Autre',
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

export function allPubs(makeups: Makeup[]): Pub[] {
  return makeups.flatMap((m) => m.publications.map((p) => ({ ...p, makeup: m })))
}
