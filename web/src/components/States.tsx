import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Nucleus } from './Nucleus'

/** Loading as a themed warm-up: nuclei taking up stain one after another. */
export function Staining() {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <div className="staining-row" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="staining-cell" style={{ ['--i' as string]: i }}>
            <Nucleus seed={`warm-${i}`} stain={i / 6} ring="none" size={34} />
          </span>
        ))}
      </div>
      <p className="label">Staining the slide</p>
      <p className="muted">Loading the 59 tumours and their results.</p>
    </div>
  )
}

export function Fault({ message }: { message: string }) {
  return (
    <div className="state state-error" role="alert">
      <p className="label">Slide could not be mounted</p>
      <h1 className="display state-title">The data did not load.</h1>
      <p className="muted">
        The site reads its numbers from files the notebook exports. One of them failed: <span className="mono">{message}</span>
      </p>
      <p>
        <button type="button" className="btn btn-ink" onClick={() => window.location.reload()}>
          Try again
        </button>
      </p>
    </div>
  )
}

export function Empty({ title, children, to = '/', cta = 'Back to the line-up' }: { title: string; children: ReactNode; to?: string; cta?: string }) {
  return (
    <div className="state state-empty">
      <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true" className="empty-slide">
        <rect x="2" y="14" width="116" height="52" rx="2" className="empty-glass" />
        <rect x="2" y="14" width="30" height="52" className="empty-frost" />
        <ellipse cx="78" cy="40" rx="20" ry="14" className="empty-circle" />
      </svg>
      <h2 className="display state-title">{title}</h2>
      <div className="muted state-copy">{children}</div>
      <Link to={to} className="btn btn-ink">
        {cta}
      </Link>
    </div>
  )
}
