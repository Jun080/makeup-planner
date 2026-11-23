import { addDays, mondayOf } from './dates'
import { DREAM_SLOTS, dreamLabel } from './types'
import type { Dream, Makeup, Pub, ThemeIdea } from './types'

/**
 * Ce qu'il y a à faire un jour donné :
 * - post : une publication prévue ce jour-là
 * - shoot : un makeup à tourner ce jour-là
 * - story / prep : les rendez-vous de la semaine type des rêves (sondage le vendredi, annonce le samedi, teaser le dimanche)
 */
export type Task =
  | { type: 'post'; pub: Pub }
  | { type: 'shoot'; makeup: Makeup; text: string; hint?: string }
  | { type: 'story' | 'prep'; text: string; hint?: string; dream?: Dream; create?: boolean } // create : rêve à créer

/** Les rêves d'une semaine : celui qu'on poste, celui qu'on tourne, et le suivant (à voter). */
export function weekDreams(iso: string, dreams: Dream[]) {
  const monday = mondayOf(iso)
  const posting = dreams.find((d) => d.shoot_week === addDays(monday, -7)) ?? null
  const shooting = dreams.find((d) => d.shoot_week === monday) ?? null
  const base = shooting?.no ?? (posting ? posting.no + 1 : null)
  const nextNo = base === null ? null : base + 1
  const next = nextNo === null ? null : (dreams.find((d) => d.no === nextNo) ?? null)
  return { monday, posting, shooting, nextNo, next }
}

/** 2 thèmes de la banque à proposer au sondage : on tourne dans la liste d'une semaine à l'autre. */
export function pollThemes(iso: string, themes: ThemeIdea[]) {
  const free = themes.filter((t) => !t.used_at)
  if (free.length < 2) return free.map((t) => t.name)
  const week = Math.floor(Date.parse(mondayOf(iso)) / (7 * 86_400_000))
  const a = (week * 2) % free.length
  return [free[a].name, free[(a + 1) % free.length].name]
}

/** Makeup encore à tourner : au moins une publication « À faire ». */
const toShoot = (m: Makeup) => !m.abandoned_at && m.publications.some((p) => p.status === 'a_faire')

export function dayTasks(iso: string, pubs: Pub[], makeups: Makeup[], dreams: Dream[], themes: ThemeIdea[] = []): Task[] {
  const tasks: Task[] = pubs.filter((p) => p.date === iso).map((pub) => ({ type: 'post' as const, pub }))

  for (const m of makeups.filter((m) => m.date === iso && toShoot(m))) {
    const slot = DREAM_SLOTS.find((s) => s.slot === m.dream_slot)
    tasks.push({
      type: 'shoot',
      makeup: m,
      text: `Tourner : ${m.title}`,
      hint: m.dream_no ? `${slot ? `${slot.hint}. ` : ''}Story coulisses : un aperçu, une palette 👀` : (m.notes ?? undefined),
    })
  }

  const { posting, shooting, nextNo, next } = weekDreams(iso, dreams)
  if (!posting && !shooting) return tasks
  const weekday = (new Date(iso + 'T00:00').getDay() + 6) % 7 // 0 = lundi

  // On poste un rêve mais le suivant (à tourner cette semaine) n'existe pas encore
  if (weekday === 0 && posting && !shooting) {
    tasks.push({
      type: 'prep',
      text: `Créer le Rêve n°${posting.no + 1}`,
      hint: 'Rien n’est prévu au tournage cette semaine : sans lui, rien à poster la semaine prochaine',
      create: true,
    })
  }
  const nextName = nextNo ? (next ? dreamLabel(next) : `Rêve n°${nextNo}`) : null

  if (weekday === 4 && nextName) {
    const pick = pollThemes(iso, themes)
    tasks.push({
      type: 'story',
      text: `Sondage Insta : le thème du ${nextName.split(' · ')[0]}`,
      hint: next?.theme
        ? `Thème déjà choisi : ${next.theme}`
        : pick.length === 2
          ? `Dans ta banque : « ${pick[0]} ou ${pick[1]} ? »`
          : 'Propose 2 thèmes, ex. « Forêt enchantée 🌲 ou Aurore boréale 🌌 ? » (ajoute tes idées dans Idées > Thèmes)',
    })
  }
  if (weekday === 5 && nextName) {
    tasks.push({
      type: 'story',
      text: 'Story : annonce du thème',
      hint: next?.theme
        ? `« Vous avez choisi ${next.theme} ! » Vérifie que tu as des produits de ces couleurs pour lundi`
        : next
          ? `Note le thème gagnant dans le ${nextName}, puis vérifie tes produits`
          : `Crée le ${nextName} avec le thème gagnant`,
      dream: next ?? undefined,
      create: !next,
    })
  }
  if (weekday === 6 && shooting) {
    tasks.push({
      type: 'story',
      text: `Fin du carrousel : « Demain : ${dreamLabel(shooting)} »`,
      hint: shooting.no > 2 ? 'Rappelle que c’est le thème qu’ils ont choisi' : undefined,
      dream: shooting,
    })
  }
  return tasks
}
