import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Sample } from '../data/types'
import { useWidth } from '../lib/useSize'
import { clamp, fmt, subtypeName } from '../lib/util'
import { nucleusPath, stainFill } from './Nucleus'

/**
 * Two dividing lines (exploratory).
 * x = proliferation score (the declared axis), y = HER2-amplicon score.
 * The vertical line is the proliferation cut (signal colour), the horizontal
 * one the HER2 cut (ink). Luminal B tumours fill an L-shape: fast, HER2-high,
 * or both. Nuclei keep their proliferation stain and subtype ring.
 */
export function TwoLines({ samples, prolifCut, her2Cut }: { samples: Sample[]; prolifCut: number; her2Cut: number }) {
  const [ref, width] = useWidth<HTMLDivElement>(720)
  const navigate = useNavigate()
  const [hover, setHover] = useState<string | null>(null)
  const height = Math.round(clamp(width * 0.62, 320, 480))
  const m = { top: 18, right: 18, bottom: 48, left: 52 }
  const xs = samples.map((s) => s.prolif)
  const ys = samples.map((s) => s.her2)
  const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.07, hi + (hi - lo) * 0.07]
  const x = scaleLinear().domain(pad(Math.min(...xs), Math.max(...xs))).range([m.left, width - m.right]).nice()
  const y = scaleLinear().domain(pad(Math.min(...ys), Math.max(...ys))).range([height - m.bottom, m.top]).nice()
  const r = width < 520 ? 6.5 : 9
  const ext = [Math.min(...xs), Math.max(...xs)]
  const paths = useMemo(() => new Map(samples.map((s) => [s.id, nucleusPath(s.id, r)])), [samples, r])

  const counts = useMemo(() => {
    const c = { fastOnly: 0, her2Only: 0, both: 0, neither: 0 }
    for (const s of samples.filter((q) => q.subtype === 'LumB')) {
      const f = s.prolif >= prolifCut
      const h = s.her2 >= her2Cut
      if (f && h) c.both++
      else if (f) c.fastOnly++
      else if (h) c.her2Only++
      else c.neither++
    }
    return c
  }, [samples, prolifCut, her2Cut])

  const hv = samples.find((s) => s.id === hover)
  const cx = x(prolifCut)
  const cy = y(her2Cut)

  return (
    <div className="twolines" ref={ref} data-tour="two-lines">
      <svg width={width} height={height} role="img" aria-label="Tumours by proliferation score and HER2-amplicon score, with both dividing lines">
        <rect x={cx} y={m.top} width={Math.max(0, width - m.right - cx)} height={height - m.bottom - m.top} className="tl-zone" />
        <rect x={m.left} y={m.top} width={Math.max(0, cx - m.left)} height={Math.max(0, cy - m.top)} className="tl-zone" />
        {y.ticks(5).map((t) => (
          <g key={`y${t}`} className="axis" transform={`translate(0 ${y(t)})`}>
            <line x1={m.left} x2={width - m.right} className="grid" />
            <text x={m.left - 8} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {x.ticks(width < 480 ? 4 : 7).map((t) => (
          <g key={`x${t}`} className="axis" transform={`translate(${x(t)} 0)`}>
            <line y1={height - m.bottom} y2={height - m.bottom + 5} />
            <text y={height - m.bottom + 18} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <line x1={cx} x2={cx} y1={m.top} y2={height - m.bottom} className="tl-prolif" />
        <line x1={m.left} x2={width - m.right} y1={cy} y2={cy} className="tl-her2" />
        <text x={cx + 6} y={height - m.bottom - 8} className="tl-label">
          {width < 560 ? 'prolif. line' : 'proliferation line'}
        </text>
        <text x={m.left + 6} y={cy + 14} className="tl-label">
          HER2 line
        </text>
        {width >= 560 && (
          <text x={width - m.right - 6} y={m.top + 12} textAnchor="end" className="tl-label tl-label-zone">
            “Luminal B” zone
          </text>
        )}
        {samples.map((s) => (
          <g
            key={s.id}
            transform={`translate(${x(s.prolif)} ${y(s.her2)})`}
            className={`nuc ${hover === s.id ? 'is-active' : ''}`}
            onPointerEnter={() => setHover(s.id)}
            onPointerLeave={() => setHover(null)}
            onClick={() => navigate(`/tumours/${s.id}`)}
          >
            <circle r={r + 4} className="nuc-hit" />
            <path d={paths.get(s.id)} className={`nuc-body ring-${s.subtype}`} style={{ fill: stainFill((s.prolif - ext[0]) / (ext[1] - ext[0])) }} />
          </g>
        ))}
        <text x={(m.left + width - m.right) / 2} y={height - 6} textAnchor="middle" className="axis-title">
          proliferation score (21 PAM50 genes, declared) →
        </text>
        <text transform={`translate(13 ${(m.top + height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
          HER2-amplicon score (5 genes on 17q12) →
        </text>
      </svg>
      {hv && (
        <div className="chart-tip" style={{ left: clamp(x(hv.prolif), 100, width - 100), top: y(hv.her2) - 12 }} role="status">
          <span className="label">{hv.id}</span>
          <strong>{subtypeName(hv.subtype)}</strong>
          <span className="mono">
            proliferation {fmt(hv.prolif)} · HER2 {fmt(hv.her2)}
          </span>
          <span className="muted">click to open</span>
        </div>
      )}
      <dl className="tl-counts">
        <div>
          <dt className="label">Luminal B: fast and HER2-high</dt>
          <dd className="mono">{counts.both}</dd>
        </div>
        <div>
          <dt className="label">fast only</dt>
          <dd className="mono">{counts.fastOnly}</dd>
        </div>
        <div>
          <dt className="label">HER2-high only</dt>
          <dd className="mono">{counts.her2Only}</dd>
        </div>
        <div>
          <dt className="label">neither</dt>
          <dd className="mono">{counts.neither}</dd>
        </div>
      </dl>
    </div>
  )
}
