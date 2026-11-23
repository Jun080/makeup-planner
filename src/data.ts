import { todayISO } from './dates'
import { supabase } from './supabase'
import { dreamCarouselTitle, dreamMakeupTitle } from './types'
import type { Dream, Idea, Makeup, Product, Publication, PubStats, Recap, ThemeIdea } from './types'

type MakeupRow = Omit<Makeup, 'product_ids' | 'photo_url'> & { makeup_products: { product_id: string }[] }

const PHOTO_BUCKET = 'makeup-photos'

export type PublicationDraft = Omit<Publication, 'id' | 'makeup_id' | 'title'> & { id?: string }
export type RecapInput = Pick<Recap, 'title' | 'date' | 'status' | 'makeup_ids'> & { id?: string }
export type MakeupInput = Omit<Makeup, 'id' | 'publications' | 'photo_url' | 'abandoned_at'> & { id?: string; publications: PublicationDraft[] }

export async function fetchAll() {
  const [m, p, i, r, d, t] = await Promise.all([
    supabase.from('makeups').select('*, makeup_products(product_id), publications!publications_makeup_id_fkey(*)').order('date'),
    supabase.from('products').select('*').order('brand'),
    supabase.from('ideas').select('*').order('created_at', { ascending: false }),
    supabase.from('publications').select('*, publication_makeups(makeup_id)').eq('kind', 'recap'),
    supabase.from('dreams').select('id, no, theme, shoot_week').order('no'),
    supabase.from('theme_ideas').select('id, name, used_at, created_at').order('created_at'),
  ])
  const error = m.error ?? p.error ?? i.error ?? r.error
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
  const recaps: Recap[] = (r.data as (Recap & { publication_makeups: { makeup_id: string }[] })[]).map(
    ({ publication_makeups, ...row }) => ({ ...row, makeup_ids: publication_makeups.map((x) => x.makeup_id) }),
  )
  // Table des rêves absente tant que migration_009 n'est pas passée : l'appli marche sans
  if (d.error) console.warn('Rêves :', d.error.message)
  const dreams = (d.error ? [] : d.data) as Dream[]
  if (t.error) console.warn('Thèmes :', t.error.message)
  const themes = (t.error ? [] : t.data) as ThemeIdea[]
  return { makeups, recaps, products: p.data as Product[], ideas: i.data as Idea[], dreams, themes }
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
  return makeupId
}

export async function saveRecap({ id, makeup_ids, ...fields }: RecapInput) {
  const payload = { ...fields, kind: 'recap', makeup_id: null }
  const res = id
    ? await supabase.from('publications').update(payload).eq('id', id).select('id').single()
    : await supabase.from('publications').insert(payload).select('id').single()
  if (res.error) throw res.error
  const recapId = res.data.id as string

  const del = await supabase.from('publication_makeups').delete().eq('publication_id', recapId)
  if (del.error) throw del.error
  if (makeup_ids.length) {
    const ins = await supabase
      .from('publication_makeups')
      .insert(makeup_ids.map((makeup_id) => ({ publication_id: recapId, makeup_id })))
    if (ins.error) throw ins.error
  }
}

/** Abandonner (ou reprendre) un contenu ou un récap, sans rien supprimer. */
export async function setAbandoned(table: 'makeups' | 'publications', id: string, abandoned: boolean) {
  const { error } = await supabase
    .from(table)
    .update({ abandoned_at: abandoned ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteRecap(id: string) {
  const { error } = await supabase.from('publications').delete().eq('id', id)
  if (error) throw error
}

export type PubPatch = Partial<Pick<Publication, 'status' | 'date'> & PubStats>

export async function updatePublication(id: string, patch: PubPatch) {
  const { error } = await supabase.from('publications').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRow(table: 'makeups' | 'products' | 'ideas' | 'theme_ideas', id: string) {
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

export type DreamInput = Omit<Dream, 'id'> & { id?: string }

export async function saveDream({ id, ...fields }: DreamInput) {
  const res = id
    ? await supabase.from('dreams').update(fields).eq('id', id).select('id').single()
    : await supabase.from('dreams').insert(fields).select('id').single()
  if (res.error) throw res.error
  return res.data.id as string
}

export async function deleteDream(id: string) {
  const { error } = await supabase.from('dreams').delete().eq('id', id)
  if (error) throw error
}

/**
 * Après un changement de thème (résultat du vote) : renomme les makeups du rêve et son carrousel,
 * seulement ceux qui portent encore le titre automatique.
 */
export async function renameDreamContent(
  before: Pick<Dream, 'no' | 'theme'>,
  after: Pick<Dream, 'no' | 'theme'>,
  makeups: Makeup[],
  recaps: Recap[],
) {
  for (const m of makeups) {
    if (m.dream_no !== before.no || !m.dream_slot) continue
    if (m.title !== dreamMakeupTitle(before, m.dream_slot)) continue
    const { error } = await supabase
      .from('makeups')
      .update({ title: dreamMakeupTitle(after, m.dream_slot), dream_no: after.no })
      .eq('id', m.id)
    if (error) throw error
  }
  for (const r of recaps) {
    if (r.title !== dreamCarouselTitle(before)) continue
    const { error } = await supabase.from('publications').update({ title: dreamCarouselTitle(after) }).eq('id', r.id)
    if (error) throw error
  }
}

export async function saveThemeIdea(name: string) {
  const { error } = await supabase.from('theme_ideas').insert({ name })
  if (error) throw error
}

/** Le thème est devenu un rêve : il sort des propositions du vendredi. */
export async function markThemeUsed(themes: ThemeIdea[], name: string | null) {
  const key = name?.trim().toLowerCase()
  const t = key && themes.find((x) => !x.used_at && x.name.trim().toLowerCase() === key)
  if (!t) return
  const { error } = await supabase.from('theme_ideas').update({ used_at: todayISO() }).eq('id', t.id)
  if (error) console.warn('Thèmes :', error.message)
}
