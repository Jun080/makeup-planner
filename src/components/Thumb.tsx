import { Brush } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Miniature : une photo, un collage 2×2 si plusieurs (récap), sinon une icône sur fond neutre. */
export function Thumb({
  urls,
  icon: Icon = Brush,
  className = 'thumb',
}: {
  urls: (string | null)[]
  icon?: LucideIcon
  className?: string
}) {
  const photos = urls.filter((u): u is string => Boolean(u))
  if (!photos.length) {
    return (
      <span className={`${className} empty-thumb`}>
        <Icon strokeWidth={1.6} />
      </span>
    )
  }
  if (photos.length === 1) return <img className={className} src={photos[0]} alt="" loading="lazy" />
  return (
    <span className={`${className} collage`}>
      {photos.slice(0, 4).map((u, i) => <img key={i} src={u} alt="" loading="lazy" />)}
    </span>
  )
}
