import { supabase } from './supabase'
import type { Idea, Makeup, Product } from './types'

type MakeupRow = Omit<Makeup, 'product_ids'> & { makeup_products: { product_id: string }[] }

export async function fetchAll() {
  const [m, p, i] = await Promise.all([
    supabase.from('makeups').select('*, makeup_products(product_id)').order('date'),
    supabase.from('products').select('*').order('brand'),
    supabase.from('ideas').select('*').order('created_at', { ascending: false }),
  ])
  const error = m.error ?? p.error ?? i.error
  if (error) throw error
  const makeups: Makeup[] = (m.data as MakeupRow[]).map(({ makeup_products, ...row }) => ({
    ...row,
    product_ids: makeup_products.map((mp) => mp.product_id),
  }))
  return { makeups, products: p.data as Product[], ideas: i.data as Idea[] }
}

export async function saveMakeup(m: Omit<Makeup, 'id'> & { id?: string }) {
  const { product_ids, id, ...fields } = m
  const payload = { ...fields, collab_with: fields.is_collab ? fields.collab_with : null }
  const res = id
    ? await supabase.from('makeups').update(payload).eq('id', id).select('id').single()
    : await supabase.from('makeups').insert(payload).select('id').single()
  if (res.error) throw res.error
  const makeupId = res.data.id as string

  const del = await supabase.from('makeup_products').delete().eq('makeup_id', makeupId)
  if (del.error) throw del.error
  if (product_ids.length) {
    const ins = await supabase
      .from('makeup_products')
      .insert(product_ids.map((product_id) => ({ makeup_id: makeupId, product_id })))
    if (ins.error) throw ins.error
  }
}

export async function updateMakeupStatus(id: string, status: Makeup['status']) {
  const { error } = await supabase.from('makeups').update({ status }).eq('id', id)
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
