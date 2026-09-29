export type Format = 'photo' | 'video' | 'transition'
export type Category = 'makeup' | 'unboxing' | 'swatch' | 'autre'
export type Status = 'a_faire' | 'realise' | 'montage' | 'pret' | 'publie'

export interface Product {
  id: string
  brand: string
  product: string
  color: string | null
  name: string | null
  is_pr: boolean
}

export interface Makeup {
  id: string
  title: string
  category: Category
  formats: Format[]
  is_tuto: boolean
  date: string // YYYY-MM-DD
  is_collab: boolean
  collab_with: string | null
  status: Status
  notes: string | null
  product_ids: string[]
}

export interface Idea {
  id: string
  title: string
  description: string | null
  created_at: string
}

export const FORMATS: Record<Format, string> = {
  photo: 'Photos',
  video: 'Vidéos',
  transition: 'Transitions',
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
