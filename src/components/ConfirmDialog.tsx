import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Options = {
  title: string
  message?: string
  confirmLabel?: string
  /** Action destructrice (suppression) : bouton rouge. */
  danger?: boolean
}
type Request = Options & { resolve: (ok: boolean) => void }

let show: ((req: Request) => void) | null = null

/** Remplace `confirm()` : ouvre la fenêtre de confirmation de l'appli et attend la réponse. */
export function ask(options: Options): Promise<boolean> {
  return new Promise((resolve) => {
    if (show) show({ ...options, resolve })
    else resolve(window.confirm(options.title)) // secours si la fenêtre n'est pas montée
  })
}

/** À placer une fois dans l'appli. */
export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null)

  useEffect(() => {
    show = setReq
    return () => {
      show = null
    }
  }, [])

  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!req) return null

  function close(ok: boolean) {
    req?.resolve(ok)
    setReq(null)
  }

  return createPortal(
    <div className="confirm-backdrop" onClick={() => close(false)}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">{req.title}</h2>
        {req.message && <p>{req.message}</p>}
        <div className="confirm-actions">
          <button onClick={() => close(false)}>Annuler</button>
          <button className={req.danger ? 'primary danger-fill' : 'primary'} onClick={() => close(true)} autoFocus>
            {req.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
