import { Delaunay } from 'd3-delaunay'
import { useEffect, useRef } from 'react'
import { seeded } from '../lib/util'

/**
 * Background · a generated tissue section.
 * A Voronoi tessellation reads as cell membranes; each cell gets a nucleus.
 * The share of nuclei that take up the proliferation stain is the real
 * cohort figure passed in (fraction of tumours on the Luminal B side of the
 * best line), so even the wallpaper is a data figure. Very low contrast.
 */
export function TissueBackground({ stainedShare }: { stainedShare: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let raf = 0
    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const css = getComputedStyle(document.documentElement)
      const cell = css.getPropertyValue('--tissue-cell').trim()
      const nuc = css.getPropertyValue('--tissue-nuc').trim()
      const dab = css.getPropertyValue('--tissue-dab').trim()
      const rand = seeded('GSE45827')
      const spacing = w < 600 ? 34 : 44
      const pts: [number, number][] = []
      for (let y = -spacing; y < h + spacing; y += spacing * 0.86) {
        for (let x = -spacing; x < w + spacing; x += spacing) {
          pts.push([x + (rand() - 0.5) * spacing * 0.9, y + (rand() - 0.5) * spacing * 0.9])
        }
      }
      const vor = Delaunay.from(pts).voronoi([-spacing, -spacing, w + spacing, h + spacing])
      ctx.strokeStyle = cell
      ctx.lineWidth = 1
      ctx.beginPath()
      vor.render(ctx)
      ctx.stroke()
      for (const [px, py] of pts) {
        const rx = spacing * (0.13 + rand() * 0.06)
        const ry = rx * (0.7 + rand() * 0.25)
        ctx.beginPath()
        ctx.ellipse(px, py, rx, ry, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fillStyle = rand() < stainedShare ? dab : nuc
        ctx.fill()
      }
    }
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }
    draw()
    let t: number | undefined
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(schedule, 150)
    }
    window.addEventListener('resize', onResize)
    const mo = new MutationObserver(schedule)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', schedule)
    return () => {
      window.removeEventListener('resize', onResize)
      mo.disconnect()
      mq.removeEventListener('change', schedule)
      cancelAnimationFrame(raf)
    }
  }, [stainedShare])

  return <canvas ref={ref} className="tissue-bg" aria-hidden="true" />
}
