import { supabase } from './supabase'
import type { Idea, Makeup, Product, Publication } from './types'

type MakeupRow = Omit<Makeup, 'product_ids' | 'photo_url'> & { makeup_products: { product_id: string }[] }

const PHOTO_BUCKET = 'makeup-photos'

export type PublicationDraft = Omit<Publication, 'id' | 'makeup_id'> & { id?: string }
export type MakeupInput = Omit<Makeup, 'id' | 'publications' | 'photo_url'> & { id?: string; publications: PublicationDraft[] }

export async function fetchAll() {
  const [m, p, i] = await Promise.all([
    supabase.from('makeups').select('*, makeup_products(product_id), publications(*)').order('date'),
    supabase.from('products').select('*').order('brand'),
    supabase.from('ideas').select('*').order('created_at', { ascending: false }),
  ])
  const error = m.error ?? p.error ?? i.error
  if (error) throw error
  const rows = m.data as MakeupRow[]

  // Liens temporaires (24 h) pour afficher les photos, en une seule requête
  const paths = rows.flatMap((r) => (r.photo_path ? [r.photo_path] : []))
  const urls = new Map<string, string>()
  if (paths.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 24)
    for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
  }

  const makeups: Makeup[] = rows.map(({ makeup_products, ...row }) => ({
    ...row,
    photo_url: row.photo_path ? (urls.get(row.photo_path) ?? null) : null,
    product_ids: makeup_products.map((mp) => mp.product_id),
  }))
  return { makeups, products: p.data as Product[], ideas: i.data as Idea[] }
}

export async function saveMakeup(m: MakeupInput) {
  const { product_ids, publications, id, ...fields } = m
  const payload = { ...fields, collab_with: fields.is_collab ? fields.collab_with : null }
  const res = id
    ? await supabase.from('makeups').update(payload).eq('id', id).select('id').single()
    : await supabase.from('makeups').insert(payload).select('id').single()
  if (res.error) throw res.error
  const makeupId = res.data.id as string

  // Produits utilisés
  const del = await supabase.from('makeup_products').delete().eq('makeup_id', makeupId)
  if (del.error) throw del.error
  if (product_ids.length) {
    const ins = await supabase
      .from('makeup_products')
      .insert(product_ids.map((product_id) => ({ makeup_id: makeupId, product_id })))
    if (ins.error) throw ins.error
  }

  // Publications : suppression de celles retirées, mise à jour des existantes, ajout des nouvelles
  const kept = publications.flatMap((p) => (p.id ? [p.id] : []))
  let delPubs = supabase.from('publications').delete().eq('makeup_id', makeupId)
  if (kept.length) delPubs = delPubs.not('id', 'in', `(${kept.join(',')})`)
  const dp = await delPubs
  if (dp.error) throw dp.error

  for (const { id: pubId, ...p } of publications) {
    if (!pubId) continue
    const up = await supabase.from('publications').update(p).eq('id', pubId)
    if (up.error) throw up.error
  }
  const fresh = publications.filter((p) => !p.id)
  if (fresh.length) {
    const ins = await supabase.from('publications').insert(fresh.map((p) => ({ ...p, makeup_id: makeupId })))
    if (ins.error) throw ins.error
  }
}

export async function updatePublication(id: string, patch: Partial<Pick<Publication, 'status' | 'date'>>) {
  const { error } = await supabase.from('publications').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRow(table: 'makeups' | 'products' | 'ideas', id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function saveProduct(p: Omit<Product, 'id'> & { id?: string }) {
  const { id, ...fields } = p
  const { data, error } = id
    ? await supabase.from('products').update(fields).eq('id', id).select('id').single()
    : await supabase.from('products').insert(fields).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function saveIdea(i: { id?: string; title: string; description: string | null }) {
  const { id, ...fields } = i
  const { error } = id
    ? await supabase.from('ideas').update(fields).eq('id', id)
    : await supabase.from('ideas').insert(fields)
  if (error) throw error
}

/** Réduit la photo (max 1200 px, JPEG) puis l'envoie dans Storage. Renvoie son chemin. */
export async function uploadPhoto(file: File) {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error('Session expirée : reconnecte-toi')
  const blob = await resizeImage(file, 1200)
  const path = `${uid}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function deletePhoto(path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path])
}

async function resizeImage(file: File, max: number): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', 0.8),
  )
}
