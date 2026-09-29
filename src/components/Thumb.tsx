export function Thumb({ url }: { url: string | null }) {
  return url ? <img className="thumb" src={url} alt="" loading="lazy" /> : <div className="thumb empty-thumb">💄</div>
}
