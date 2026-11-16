import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GeneRow, Volcano as VolcanoData } from '../data/types'
import { useWidth } from '../lib/useSize'
import { fmt, foldWords } from '../lib/util'

/**
 * Volcano plot of every probe that survived QC (~19k points).
 * Drawn on canvas for speed; hover uses a Delaunay nearest-point search.
 * Colour has one job: brown/yellow = the declared PAM50 proliferation set.
 * Significance is shown by ink density, not by another hue.
 */

interface Props {
  data: VolcanoData
  genes: GeneRow[]
  mode: 'pam50' | 'cellcycle'
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function Volcano({ data, genes, mode }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(900)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)
  const [themeTick, setThemeTick] = useState(0)
  const height = Math.round(Math.min(560, Math.max(340, width * 0.58)))
  const m = { top: 16, right: 16, bottom: 48, left: 52 }

  const xMax = useMemo(() => Math.max(1, ...data.x.map(Math.abs)) * 1.05, [data.x])
  const yMax = useMemo(() => Math.max(...data.y) * 1.06, [data.y])
  const x = useMemo(() => scaleLinear().domain([-xMax, xMax]).range([m.left, width - m.right]).nice(), [xMax, width, m.left, m.right])
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([height - m.bottom, m.top]).nice(), [yMax, height, m.top, m.bottom])
  const highlight = mode === 'pam50' ? data.pam50 : data.cc

  const delaunay = useMemo(() => Delaunay.from(data.x.map((_, i) => [x(data.x[i]), y(data.y[i])] as [number, number])), [data, x, y])
  const byProbe = useMemo(() => new Map(genes.map((g) => [g.probe, g])), [genes])

  // repaint on theme change
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setThemeTick((t) => t + 1)
    mq.addEventListener('change', on)
    return () => {
      mo.disconnect()
      mq.removeEventListener('change', on)
    }
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = width * dpr
    cv.height = height * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
    const ink = cssVar('--ink')
    const ink3 = cssVar('--ink-3')
    const signal = cssVar('--signal')
    const surface = cssVar('--slide')
    // pass 1: non-significant, faint
    ctx.globalAlpha = 0.18
    ctx.fillStyle = ink3
    for (let i = 0; i < data.x.length; i++) {
      if (data.sig[i] || highlight[i]) continue
      ctx.fillRect(x(data.x[i]) - 1, y(data.y[i]) - 1, 2, 2)
    }
    // pass 2: significant, solid ink
    ctx.globalAlpha = 0.55
    ctx.fillStyle = ink
    for (let i = 0; i < data.x.length; i++) {
      if (!data.sig[i] || highlight[i]) continue
      ctx.beginPath()
      ctx.arc(x(data.x[i]), y(data.y[i]), 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    // pass 3: highlighted set on top, with a surface ring so overlaps separate
    ctx.globalAlpha = 1
    for (let i = 0; i < data.x.length; i++) {
      if (!highlight[i]) continue
      ctx.beginPath()
      ctx.arc(x(data.x[i]), y(data.y[i]), mode === 'pam50' ? 4.5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = signal
      ctx.strokeStyle = surface
      ctx.lineWidth = 1.5
      ctx.fill()
      ctx.stroke()
    }
  }, [data, width, height, x, y, highlight, mode, themeTick])

  const xTicks = x.ticks(width < 500 ? 5 : 9)
  const yTicks = y.ticks(6)
  const qy = y(data.qLine)
  const h = hover != null ? { i: hover, px: x(data.x[hover]), py: y(data.y[hover]) } : null
  const hoverSym = h ? data.sym[h.i] : ''
  const hoverGene = h ? byProbe.get(data.probe[h.i]) : undefined

  return (
    <div className="volcano" ref={wrapRef} data-tour="volcano">
      <canvas ref={canvasRef} style={{ width, height }} aria-hidden="true" />
      <svg
        width={width}
        height={height}
        className="volcano-overlay"
        role="img"
        aria-label={`Volcano plot of ${data.x.length.toLocaleString()} probes: fold change against significance`}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          const i = delaunay.find(px, py)
          const d = Math.hypot(x(data.x[i]) - px, y(data.y[i]) - py)
          setHover(d < 18 ? i : null)
        }}
        onPointerLeave={() => setHover(null)}
        onClick={() => {
          if (hoverGene) navigate(`/genes/${encodeURIComponent(hoverGene.symbol)}`)
        }}
        style={{ cursor: hoverGene ? 'pointer' : 'default' }}
      >
        {yTicks.map((t) => (
          <g key={t} transform={`translate(0 ${y(t)})`} className="axis">
            <line x1={m.left} x2={width - m.right} className="grid" />
            <text x={m.left - 8} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={t} transform={`translate(${x(t)} 0)`} className="axis">
            <line y1={height - m.bottom} y2={height - m.bottom + 5} />
            <text y={height - m.bottom + 18} textAnchor="middle">
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
        <line x1={x(0)} x2={x(0)} y1={m.top} y2={height - m.bottom} className="volcano-zero" />
        <line x1={m.left} x2={width - m.right} y1={qy} y2={qy} className="volcano-fdr" />
        <text x={width - m.right - 4} y={qy - 6} textAnchor="end" className="volcano-fdr-label">
          FDR 5% line
        </text>
        <text x={m.left + 4} y={height - 6} className="axis-title">
          ← higher in Luminal A
        </text>
        <text x={width - m.right - 4} y={height - 6} textAnchor="end" className="axis-title">
          higher in Luminal B →
        </text>
        <text transform={`translate(14 ${(m.top + height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
          −log₁₀ p (higher = stronger evidence)
        </text>

        {data.labels.slice(0, width < 560 ? 6 : 14).map((l) => (
          <g key={l.i} transform={`translate(${x(data.x[l.i])} ${y(data.y[l.i])})`} className="volcano-label">
            <line x1={0} y1={0} x2={data.x[l.i] > 0 ? 10 : -10} y2={-10} />
            <text x={data.x[l.i] > 0 ? 12 : -12} y={-12} textAnchor={data.x[l.i] > 0 ? 'start' : 'end'} className="gene-svg">
              {l.symbol}
            </text>
          </g>
        ))}
        {h && <circle cx={h.px} cy={h.py} r={7} className="volcano-hover" />}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(h.px, 110), width - 110), top: h.py - 12 }} role="status">
          <strong className="gene">{hoverSym || 'unannotated probe'}</strong>
          <span className="label">{data.probe[h.i]}</span>
          <span>{foldWords(data.x[h.i])}</span>
          <span className="mono">
            log₂FC {fmt(data.x[h.i])} · −log₁₀p {fmt(data.y[h.i], 1)}
          </span>
          {highlight[h.i] ? <span className="tip-signal">{mode === 'pam50' ? 'PAM50 proliferation gene' : 'GO cell cycle / division gene'}</span> : null}
          {hoverGene ? <span className="muted">click to open the gene</span> : <span className="muted">outside the top-ranked genes</span>}
        </div>
      )}
    </div>
  )
}
