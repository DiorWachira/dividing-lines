import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { clamp, prefersReducedMotion, store } from '../lib/util'
import { GLOSSARY, STEPS, resolveBody, resolveRoute, type Step } from './steps'

/**
 * First-run guide · the IRIS tour.
 * The spotlight is a microscope's field diaphragm: the veil closes down to an
 * iris around one thing on the page. A pathologist's marker ring circles it,
 * and the explanation is written on a frosted slide label. The tour is opt-in
 * (NN/g found pushed tutorials can lower task success), spans routes, and the
 * highlighted target stays clickable.
 */

const SEEN = 'dl.guide.seen'
const INVITED = 'dl.guide.invited'

interface GuideApi {
  start: (opts?: { route?: string }) => void
  openHelp: () => void
  closeHelp: () => void
  helpOpen: boolean
  touring: boolean
}

const Ctx = createContext<GuideApi>({ start: () => {}, openHelp: () => {}, closeHelp: () => {}, helpOpen: false, touring: false })
export const useGuide = () => useContext(Ctx)

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const data = useData()
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [index, setIndex] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [invite, setInvite] = useState(false)
  const location = useLocation()

  const start = useCallback(
    (opts?: { route?: string }) => {
      const list = opts?.route ? STEPS.filter((s) => resolveRoute(s, data) === opts.route) : STEPS
      setHelpOpen(false)
      setInvite(false)
      store.set(INVITED, '1')
      setSteps(list.length ? list : STEPS)
      setIndex(0)
    },
    [data],
  )

  const finish = useCallback(() => {
    setSteps(null)
    store.set(SEEN, '1')
  }, [])

  // First-visit invitation, shown once.
  useEffect(() => {
    if (store.get(SEEN) || store.get(INVITED)) return
    const t = window.setTimeout(() => setInvite(true), 900)
    return () => window.clearTimeout(t)
  }, [])

  // "?" opens the help drawer from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const api = useMemo<GuideApi>(
    () => ({ start, openHelp: () => setHelpOpen(true), closeHelp: () => setHelpOpen(false), helpOpen, touring: !!steps }),
    [start, helpOpen, steps],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      {invite && !steps && (
        <Invite
          onStart={() => start()}
          onDismiss={() => {
            setInvite(false)
            store.set(INVITED, '1')
          }}
        />
      )}
      {steps && <Tour steps={steps} index={index} setIndex={setIndex} onClose={finish} />}
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} onTour={(route) => start(route ? { route } : undefined)} pathname={location.pathname} />
    </Ctx.Provider>
  )
}

/* ------------------------------------------------------------------ */
function Invite({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <aside className="invite" role="dialog" aria-labelledby="invite-title" data-testid="guide-invite">
      <div className="invite-frost" aria-hidden="true">
        <span>DL</span>
        <span>00</span>
      </div>
      <div className="invite-body">
        <p className="label">First time at the microscope?</p>
        <h2 id="invite-title" className="display invite-title">
          Take the 12-stop tour
        </h2>
        <p className="muted">Two minutes on how to read this slide: the line-up, the genes, and the honest test at the end.</p>
        <div className="invite-actions">
          <button ref={ref} type="button" className="btn btn-ink" onClick={onStart}>
            Start the tour
          </button>
          <button type="button" className="btn btn-quiet" onClick={onDismiss}>
            Not now
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
interface Box {
  cx: number
  cy: number
  a: number
  b: number
}

function superellipse({ cx, cy, a, b }: Box, n = 4, k = 56) {
  let d = ''
  for (let i = 0; i <= k; i++) {
    const t = (i / k) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + 'Z'
}

function Tour({ steps, index, setIndex, onClose }: { steps: Step[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const data = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const step = steps[index]
  const route = resolveRoute(step, data)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [missing, setMissing] = useState(false)
  const [vw, setVw] = useState(window.innerWidth)
  const [vh, setVh] = useState(window.innerHeight)
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<Box | null>(null)
  const last = index === steps.length - 1

  const go = useCallback((i: number) => setIndex(clamp(i, 0, steps.length - 1)), [setIndex, steps.length])

  // 1. navigate to the step's route
  useEffect(() => {
    if (location.pathname !== route) navigate(route)
  }, [route, location.pathname, navigate])

  // 2. wait for the target, scroll it into view below the sticky header, measure
  useEffect(() => {
    let alive = true
    let tries = 0
    setMissing(false)
    setRect(null)
    const find = () => {
      if (!alive) return
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (el && location.pathname === route) {
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 64
        const r = el.getBoundingClientRect()
        const avail = window.innerHeight - header
        const want = r.height > avail * 0.6 ? r.top - header - 16 : r.top - header - (avail - r.height) / 2.4
        if (r.top < header + 8 || r.bottom > window.innerHeight - 8 || r.height > avail * 0.6) {
          window.scrollBy({ top: want, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
        }
        window.setTimeout(() => alive && setRect(el.getBoundingClientRect()), prefersReducedMotion() ? 30 : 420)
        return
      }
      if (tries++ < 80) window.setTimeout(find, 60)
      else setMissing(true)
    }
    find()
    return () => {
      alive = false
    }
  }, [step.target, route, location.pathname])

  // 3. keep the iris on target while scrolling / resizing
  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setVw(window.innerWidth)
        setVh(window.innerHeight)
        const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
        if (el) setRect(el.getBoundingClientRect())
      })
    }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      cancelAnimationFrame(raf)
    }
  }, [step.target])

  // 4. tween the iris (field diaphragm closing onto the target)
  useEffect(() => {
    if (!rect) return
    const target: Box = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      a: (rect.width / 2) * 1.12 + 12,
      b: (rect.height / 2) * 1.12 + 12,
    }
    const from = boxRef.current ?? { cx: target.cx, cy: target.cy, a: Math.max(vw, vh) * 1.2, b: Math.max(vw, vh) * 1.2 }
    if (prefersReducedMotion()) {
      boxRef.current = target
      setBox(target)
      return
    }
    const t0 = performance.now()
    const dur = boxRef.current ? 260 : 520
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = 1 - (1 - p) ** 3
      const b: Box = {
        cx: from.cx + (target.cx - from.cx) * e,
        cy: from.cy + (target.cy - from.cy) * e,
        a: from.a + (target.a - from.a) * e,
        b: from.b + (target.b - from.b) * e,
      }
      boxRef.current = b
      setBox(b)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rect, vw, vh])

  // 5. focus into the card on each step; keys ← → Esc; focus trap
  useLayoutEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight' && cardRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        last ? onClose() : go(index + 1)
      } else if (e.key === 'ArrowLeft' && cardRef.current?.contains(document.activeElement)) {
        e.preventDefault()
        go(index - 1)
      } else if (e.key === 'Tab' && cardRef.current) {
        const f = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
        if (!f.length) return
        const first = f[0]
        const lastEl = f[f.length - 1]
        if (!cardRef.current.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index, last, onClose])

  // card placement
  const mobile = vw < 640
  const cardW = Math.min(380, vw - 32)
  let style: CSSProperties = {}
  let dock = ''
  if (box && rect) {
    if (mobile) {
      dock = rect.top + rect.height / 2 > vh / 2 ? 'top' : 'bottom'
    } else {
      const below = box.cy + box.b + 18
      const above = box.cy - box.b - 18
      const cardH = 260
      const left = clamp(box.cx - cardW / 2, 16, vw - cardW - 16)
      if (below + cardH < vh) style = { left, top: below }
      else if (above - cardH > 70) style = { left, top: above - cardH }
      else {
        // big target: pin to the side with more room
        style = rect.left > vw - rect.right ? { left: 16, bottom: 16 } : { right: 16, bottom: 16 }
      }
    }
  } else if (missing) {
    dock = mobile ? 'bottom' : ''
    style = mobile ? {} : { left: vw / 2 - cardW / 2, top: vh / 2 - 120 }
  }

  const holePath = box ? superellipse(box) : ''
  const ring = box ? superellipse({ ...box, a: box.a + 7, b: box.b + 6 }) : ''

  return (
    <div className="tour" data-testid="tour">
      <svg className="tour-veil" width={vw} height={vh} aria-hidden="true">
        <path d={`M0 0H${vw}V${vh}H0Z ${holePath}`} fillRule="evenodd" className="tour-veil-fill" />
        {box && <path d={ring} className="tour-ring" />}
      </svg>
      <div
        ref={cardRef}
        className={`tour-card ${dock ? `is-docked dock-${dock}` : ''}`}
        style={dock ? undefined : { ...style, width: cardW }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        data-testid="tour-card"
      >
        <div className="tour-frost" aria-hidden="true">
          <span className="tour-frost-id">DL·{String(index + 1).padStart(2, '0')}</span>
          <span className="tour-frost-n">
            {index + 1} / {steps.length}
          </span>
        </div>
        <div className="tour-content">
          <button type="button" className="tour-close" onClick={onClose} aria-label="Close the tour">
            ×
          </button>
          <p className="label">
            Stop {index + 1} of {steps.length}
          </p>
          <h2 id="tour-title" className="display tour-title">
            {step.title}
          </h2>
          <p id="tour-body" className="tour-body">
            {missing ? 'This part of the page is not available right now. Skip ahead with Next.' : resolveBody(step, data)}
          </p>
          <div className="tour-progress" aria-hidden="true">
            <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="tour-actions">
            <button type="button" className="btn btn-quiet" onClick={() => go(index - 1)} disabled={index === 0}>
              Back
            </button>
            <span className="tour-keys muted">← → · Esc</span>
            <button ref={nextRef} type="button" className="btn btn-ink" onClick={() => (last ? onClose() : go(index + 1))} data-testid="tour-next">
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {steps.length}: {step.title}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function HelpDrawer({ open, onClose, onTour, pathname }: { open: boolean; onClose: () => void; onTour: (route?: string) => void; pathname: string }) {
  const ref = useRef<HTMLElement>(null)
  const data = useData()
  const screenRoute = STEPS.some((s) => resolveRoute(s, data) === pathname) ? pathname : undefined

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]'))
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-testid="help-drawer">
        <header className="drawer-head">
          <div>
            <p className="label">Lab notes</p>
            <h2 id="drawer-title" className="display drawer-title">
              How to read this slide
            </h2>
          </div>
          <button type="button" className="tour-close" onClick={onClose} aria-label="Close lab notes">
            ×
          </button>
        </header>

        <section className="drawer-sec">
          <div className="drawer-actions">
            <button type="button" className="btn btn-ink" onClick={() => onTour()}>
              Take the full tour
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => onTour(screenRoute)} disabled={!screenRoute}>
              Tour this screen
            </button>
          </div>
        </section>

        <section className="drawer-sec">
          <h3 className="label">How it works</h3>
          <ol className="pipeline">
            <li>
              <b>Download</b> the Institut Curie microarray data (GEO GSE45827) and keep the 29 Luminal A and 30 Luminal B tumours.
            </li>
            <li>
              <b>Check quality.</b> We look at the value range, drop flat probes and look for odd samples.
            </li>
            <li>
              <b>Compare</b> every probe between the two groups and correct for running thousands of tests (Benjamini–Hochberg).
            </li>
            <li>
              <b>Interpret.</b> What do the top genes do? How many of them are cell-division genes that we named in advance?
            </li>
            <li>
              <b>Classify honestly.</b> We use nested cross-validation against a ladder of baselines, with and without proliferation genes.
            </li>
          </ol>
        </section>

        <section className="drawer-sec">
          <h3 className="label">Keyboard</h3>
          <dl className="keys">
            <div>
              <dt><kbd>?</kbd></dt>
              <dd>Open or close these notes</dd>
            </div>
            <div>
              <dt><kbd>←</kbd> <kbd>→</kbd></dt>
              <dd>Tour: back or next. Dividing line: move it. Line-up: step through tumours</dd>
            </div>
            <div>
              <dt><kbd>Shift</kbd> + <kbd>←</kbd></dt>
              <dd>Move the dividing line in bigger steps</dd>
            </div>
            <div>
              <dt><kbd>B</kbd> / <kbd>Enter</kbd></dt>
              <dd>Snap the dividing line to the best cut</dd>
            </div>
            <div>
              <dt><kbd>Esc</kbd></dt>
              <dd>Close the tour or these notes</dd>
            </div>
          </dl>
        </section>

        <section className="drawer-sec">
          <h3 className="label">Glossary</h3>
          <dl className="glossary">
            {GLOSSARY.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </>
  )
}
