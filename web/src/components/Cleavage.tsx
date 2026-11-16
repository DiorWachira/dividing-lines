import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { prefersReducedMotion } from '../lib/util'

/**
 * Route transition · CYTOKINESIS.
 * When you move to another plate, a cleavage furrow (the dividing line) draws
 * down the middle of the screen and the two halves of a glass veil pull apart
 * to reveal the new page, the way a dividing cell pinches into two.
 * Skipped entirely under prefers-reduced-motion.
 */
export function Cleavage() {
  const { pathname } = useLocation()
  const first = useRef(true)
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0 })
    if (prefersReducedMotion()) return
    setRun((r) => r + 1)
  }, [pathname])

  if (!run) return null
  return (
    <div className="cleavage" key={run} aria-hidden="true" onAnimationEnd={(e) => e.target === e.currentTarget && setRun(0)}>
      <div className="cleavage-half is-left" />
      <div className="cleavage-half is-right" />
      <div className="cleavage-furrow" />
    </div>
  )
}
