import { scaleLinear } from 'd3-scale'
import { line as d3line } from 'd3-shape'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ModelResult, Sample } from '../data/types'
import { useWidth } from '../lib/useSize'
import { clamp, fmt, pct, subtypeName } from '../lib/util'

/* ------------------------------------------------------------------ */
/* Figure wrapper: every chart is captioned like a figure in an atlas  */
/* ------------------------------------------------------------------ */
export function Figure({ n, title, caption, children, tour, id }: { n: string; title: string; caption: ReactNode; children: ReactNode; tour?: string; id?: string }) {
  return (
    <figure className="figure" data-tour={tour} id={id}>
      <header className="figure-head">
        <span className="figure-n label">Fig. {n}</span>
        <h3 className="figure-title">{title}</h3>
      </header>
      <div className="figure-body">{children}</div>
      <figcaption className="figure-caption">{caption}</figcaption>
    </figure>
  )
}

export function Legend({ items }: { items: { swatch: 'lumA' | 'lumB' | 'signal' | 'ink' | 'faint' | 'dash' | 'dot' | 'ring'; label: ReactNode }[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {items.map((it, i) => (
        <li key={i}>
          <span className={`sw sw-${it.swatch}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Stain strip: one gene across 59 tumours, ordered by proliferation   */
/* (a row-level miniature of the line-up)                               */
/* ------------------------------------------------------------------ */
export function StainStrip({ values, order, subtypes, width = 132, height = 18 }: { values: number[]; order: number[]; subtypes: string[]; width?: number; height?: number }) {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const w = width / order.length
  return (
    <svg width={width} height={height} className="stain-strip" aria-hidden="true">
      {order.map((idx, k) => {
        const t = (values[idx] - lo) / (hi - lo || 1)
        return (
          <g key={idx}>
            <rect x={k * w} y={0} width={Math.max(1, w - 0.4)} height={height - 4} style={{ fill: `color-mix(in oklab, var(--ink) ${Math.round(8 + t * 86)}%, var(--slide))` }} />
            <rect x={k * w} y={height - 3} width={Math.max(1, w - 0.4)} height={3} className={subtypes[idx] === 'LumA' ? 'fill-lumA' : 'fill-lumB'} />
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Mirror plot: one gene, Luminal A on the left of the plate,          */
/* Luminal B on the right, like two daughter cells.                     */
/* ------------------------------------------------------------------ */
export function MirrorPlot({ values, samples }: { values: number[]; samples: Sample[] }) {
  const [ref, width] = useWidth<HTMLDivElement>(560)
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)
  const height = 320
  const m = { top: 20, bottom: 36, left: 44, right: 12 }
  const y = scaleLinear().domain([Math.min(...values) - 0.3, Math.max(...values) + 0.3]).range([height - m.bottom, m.top]).nice()
  const mid = (m.left + width - m.right) / 2
  const r = 5
  const pts = useMemo(() => {
    const out: { i: number; x: number; y: number }[] = []
    for (const lane of ['LumA', 'LumB'] as const) {
      const idx = samples.map((s, i) => (s.subtype === lane ? i : -1)).filter((i) => i >= 0).sort((a, b) => values[a] - values[b])
      const placed: { x: number; y: number }[] = []
      const base = lane === 'LumA' ? mid - 40 : mid + 40
      const dir = lane === 'LumA' ? -1 : 1
      for (const i of idx) {
        const py = y(values[i])
        let px = base
        for (let k = 0; k < 30; k++) {
          const cx = base + dir * k * (r * 1.6)
          if (placed.every((p) => Math.hypot(p.x - cx, p.y - py) > 2 * r + 0.8)) {
            px = cx
            break
          }
        }
        placed.push({ x: px, y: py })
        out.push({ i, x: px, y: py })
      }
    }
    return out
  }, [values, samples, y, mid])
  const meanOf = (lane: string) => {
    const v = values.filter((_, i) => samples[i].subtype === lane)
    return v.reduce((a, b) => a + b, 0) / v.length
  }
  const mA = meanOf('LumA')
  const mB = meanOf('LumB')
  const hv = hover != null ? pts.find((p) => p.i === hover) : undefined

  return (
    <div className="mirror" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`Expression in Luminal A (left) and Luminal B (right). Means ${fmt(mA)} and ${fmt(mB)}.`}>
        {y.ticks(6).map((t) => (
          <g key={t} className="axis" transform={`translate(0 ${y(t)})`}>
            <line x1={m.left} x2={width - m.right} className="grid" />
            <text x={m.left - 8} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <line x1={mid} x2={mid} y1={m.top - 8} y2={height - m.bottom} className="plate-line" />
        <line x1={m.left + 4} x2={mid - 8} y1={y(mA)} y2={y(mA)} className="mean-line mean-lumA" />
        <line x1={mid + 8} x2={width - m.right - 4} y1={y(mB)} y2={y(mB)} className="mean-line mean-lumB" />
        <text x={m.left + 6} y={y(mA) - 6} className="mean-label">
          mean {fmt(mA)}
        </text>
        <text x={width - m.right - 6} y={y(mB) - 6} textAnchor="end" className="mean-label">
          mean {fmt(mB)}
        </text>
        {pts.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={hover === p.i ? r + 2 : r}
            className={samples[p.i].subtype === 'LumA' ? 'dot-lumA' : 'dot-lumB'}
            onPointerEnter={() => setHover(p.i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => navigate(`/tumours/${samples[p.i].id}`)}
            style={{ cursor: 'pointer' }}
          />
        ))}
        <text x={mid - 12} y={height - 12} textAnchor="end" className="axis-title">
          Luminal A · {samples.filter((s) => s.subtype === 'LumA').length}
        </text>
        <text x={mid + 12} y={height - 12} className="axis-title">
          Luminal B · {samples.filter((s) => s.subtype === 'LumB').length}
        </text>
        <text transform={`translate(12 ${(m.top + height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
          expression (log₂ intensity)
        </text>
      </svg>
      {hv && (
        <div className="chart-tip" style={{ left: clamp(hv.x, 90, width - 90), top: hv.y - 10 }} role="status">
          <span className="label">{samples[hv.i].id}</span>
          <strong>{subtypeName(samples[hv.i].subtype)}</strong>
          <span className="mono">{fmt(values[hv.i])} log₂</span>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scatter: gene expression against the proliferation score            */
/* ------------------------------------------------------------------ */
export function pearson(a: number[], b: number[]) {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db)
}

export function ScatterXY({
  xs, ys, samples, xLabel, yLabel, height = 300, highlight,
}: { xs: number[]; ys: number[]; samples: Sample[]; xLabel: string; yLabel: string; height?: number; highlight?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(520)
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)
  const m = { top: 14, right: 14, bottom: 44, left: 48 }
  const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.06, hi + (hi - lo) * 0.06]
  const x = scaleLinear().domain(pad(Math.min(...xs), Math.max(...xs))).range([m.left, width - m.right]).nice()
  const y = scaleLinear().domain(pad(Math.min(...ys), Math.max(...ys))).range([height - m.bottom, m.top]).nice()
  const hv = hover
  return (
    <div className="scatter" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`${yLabel} against ${xLabel}`}>
        {y.ticks(5).map((t) => (
          <g key={`y${t}`} className="axis" transform={`translate(0 ${y(t)})`}>
            <line x1={m.left} x2={width - m.right} className="grid" />
            <text x={m.left - 8} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {x.ticks(width < 420 ? 4 : 7).map((t) => (
          <g key={`x${t}`} className="axis" transform={`translate(${x(t)} 0)`}>
            <line y1={height - m.bottom} y2={height - m.bottom + 5} />
            <text y={height - m.bottom + 18} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <text x={(m.left + width - m.right) / 2} y={height - 6} textAnchor="middle" className="axis-title">
          {xLabel}
        </text>
        <text transform={`translate(12 ${(m.top + height - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
          {yLabel}
        </text>
        {xs.map((_, i) => (
          <circle
            key={samples[i].id}
            cx={x(xs[i])}
            cy={y(ys[i])}
            r={samples[i].id === highlight || hv === i ? 7.5 : 5}
            className={`${samples[i].subtype === 'LumA' ? 'dot-lumA' : 'dot-lumB'} ${samples[i].id === highlight ? 'is-highlight' : ''}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => navigate(`/tumours/${samples[i].id}`)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </svg>
      {hv != null && (
        <div className="chart-tip" style={{ left: clamp(x(xs[hv]), 90, width - 90), top: y(ys[hv]) - 10 }} role="status">
          <span className="label">{samples[hv].id}</span>
          <strong>{subtypeName(samples[hv].subtype)}</strong>
          <span className="mono">
            {fmt(xs[hv])}, {fmt(ys[hv])}
          </span>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ROC curves, direct-labelled                                          */
/* ------------------------------------------------------------------ */
export function RocChart({ models, selected }: { models: ModelResult[]; selected: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(460)
  const size = Math.min(width, 440)
  const m = { top: 12, right: 12, bottom: 44, left: 48 }
  const x = scaleLinear().domain([0, 1]).range([m.left, size - m.right])
  const y = scaleLinear().domain([0, 1]).range([size - m.bottom, m.top])
  const [hover, setHover] = useState<{ fpr: number; tpr: number } | null>(null)
  const line = d3line<[number, number]>()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]))
  const sel = models.find((mm) => mm.key === selected) ?? models[models.length - 1]
  const styleOf = (key: string) => (key === 'prolif' ? 'roc-prolif' : key === 'dummy' ? 'roc-dummy' : key === 'full' ? 'roc-full' : 'roc-other')
  return (
    <div className="roc" ref={ref}>
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`ROC curves. Selected: ${sel.label}, AUC ${fmt(sel.auc.mean)}`}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const fx = clamp(x.invert(e.clientX - rect.left), 0, 1)
          const pts = sel.roc.fpr.map((f, i) => [f, sel.roc.tpr[i]] as const)
          let best = pts[0]
          for (const p of pts) if (Math.abs(p[0] - fx) < Math.abs(best[0] - fx)) best = p
          setHover({ fpr: best[0], tpr: best[1] })
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t} className="axis">
            <line x1={m.left} x2={size - m.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
            <text x={x(t)} y={size - m.bottom + 18} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="roc-diag" />
        {models
          .filter((mm) => mm.key !== selected)
          .map((mm) => (
            <path key={mm.key} d={line(mm.roc.fpr.map((f, i) => [f, mm.roc.tpr[i]])) ?? ''} className={`roc-line ${styleOf(mm.key)} is-dim`} />
          ))}
        <path d={line(sel.roc.fpr.map((f, i) => [f, sel.roc.tpr[i]])) ?? ''} className={`roc-line ${styleOf(sel.key)} is-sel`} />
        {hover && (
          <g>
            <line x1={x(hover.fpr)} x2={x(hover.fpr)} y1={m.top} y2={size - m.bottom} className="crosshair" />
            <circle cx={x(hover.fpr)} cy={y(hover.tpr)} r={5} className="roc-dot" />
          </g>
        )}
        <text x={(m.left + size - m.right) / 2} y={size - 6} textAnchor="middle" className="axis-title">
          false-positive rate (Luminal A wrongly called B)
        </text>
        <text transform={`translate(12 ${(m.top + size - m.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="axis-title">
          true-positive rate (Luminal B found)
        </text>
        <text x={x(0.98)} y={y(0.06)} textAnchor="end" className="roc-direct">
          {sel.short} · AUC {fmt(sel.auc.mean)}
        </text>
      </svg>
      <p className="chart-readout mono" role="status">
        {hover ? `At ${pct(hover.fpr)} false positives, ${pct(hover.tpr)} of Luminal B tumours are caught.` : 'Hover the chart to read a point on the selected curve.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Confusion matrix (pooled out-of-fold predictions)                    */
/* ------------------------------------------------------------------ */
export function Confusion({ model }: { model: ModelResult }) {
  const c = model.confusion
  const total = c.aa + c.ab + c.ba + c.bb
  const cell = (n: number, rowTotal: number, kind: 'ok' | 'fp' | 'fn', label: string) => (
    <div className={`cm-cell cm-${kind}`}>
      <span className="cm-n mono">{n}</span>
      <span className="cm-p muted">{pct(n / Math.max(1, rowTotal))} of row</span>
      <span className="cm-l">{label}</span>
    </div>
  )
  return (
    <div className="cm" role="table" aria-label={`Confusion matrix for ${model.label}`}>
      <div className="cm-corner label">truth ↓ · predicted →</div>
      <div className="cm-colhead label">Luminal A</div>
      <div className="cm-colhead label">Luminal B</div>
      <div className="cm-rowhead label">Luminal A</div>
      {cell(c.aa, c.aa + c.ab, 'ok', 'correct')}
      {cell(c.ab, c.aa + c.ab, 'fp', 'over-called: extra chemo considered')}
      <div className="cm-rowhead label">Luminal B</div>
      {cell(c.ba, c.ba + c.bb, 'fn', 'missed: chemo may be withheld')}
      {cell(c.bb, c.ba + c.bb, 'ok', 'correct')}
      <p className="cm-foot muted">
        {total} out-of-fold predictions pooled over the {model.folds.length} outer test folds (each tumour predicted once per repeat by a model that never saw it).
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* QC: per-sample boxplots, coloured by subtype                         */
/* ------------------------------------------------------------------ */
export function SampleBoxes({ samples }: { samples: Sample[] }) {
  const [ref, width] = useWidth<HTMLDivElement>(900)
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)
  const height = 240
  const m = { top: 12, right: 8, bottom: 34, left: 40 }
  const order = useMemo(() => samples.map((_, i) => i).sort((a, b) => (samples[a].subtype === samples[b].subtype ? 0 : samples[a].subtype === 'LumA' ? -1 : 1)), [samples])
  const lo = Math.min(...samples.map((s) => s.whiskLo))
  const hi = Math.max(...samples.map((s) => s.whiskHi))
  const y = scaleLinear().domain([lo - 0.3, hi + 0.3]).range([height - m.bottom, m.top]).nice()
  const bw = (width - m.left - m.right) / samples.length
  const med = samples.map((s) => s.median).sort((a, b) => a - b)[Math.floor(samples.length / 2)]
  return (
    <div className="boxes" ref={ref}>
      <svg width={width} height={height} role="img" aria-label="Per-sample expression boxplots">
        {y.ticks(5).map((t) => (
          <g key={t} className="axis" transform={`translate(0 ${y(t)})`}>
            <line x1={m.left} x2={width - m.right} className="grid" />
            <text x={m.left - 6} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <line x1={m.left} x2={width - m.right} y1={y(med)} y2={y(med)} className="median-ref" />
        {order.map((idx, k) => {
          const s = samples[idx]
          const cx = m.left + k * bw + bw / 2
          const w = Math.max(2, bw * 0.62)
          const cls = s.subtype === 'LumA' ? 'box-lumA' : 'box-lumB'
          return (
            <g key={s.id} className={`box ${cls} ${s.flagged ? 'is-flagged' : ''} ${hover === idx ? 'is-hover' : ''}`} onPointerEnter={() => setHover(idx)} onPointerLeave={() => setHover(null)} onClick={() => navigate(`/tumours/${s.id}`)}>
              <rect x={cx - bw / 2} y={m.top} width={bw} height={height - m.top - m.bottom} fill="transparent" />
              <line x1={cx} x2={cx} y1={y(s.whiskLo)} y2={y(s.whiskHi)} className="whisk" />
              <rect x={cx - w / 2} y={y(s.q3)} width={w} height={Math.max(1, y(s.q1) - y(s.q3))} className="iqr" />
              <line x1={cx - w / 2} x2={cx + w / 2} y1={y(s.median)} y2={y(s.median)} className="med" />
            </g>
          )
        })}
        <text x={m.left} y={height - 8} className="axis-title">
          59 tumours: Luminal A first, then Luminal B
        </text>
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: clamp(m.left + order.indexOf(hover) * bw, 90, width - 90), top: y(samples[hover].q3) - 10 }} role="status">
          <span className="label">{samples[hover].id}</span>
          <strong>{subtypeName(samples[hover].subtype)}</strong>
          <span className="mono">
            median {fmt(samples[hover].median)} · IQR {fmt(samples[hover].q1)}–{fmt(samples[hover].q3)}
          </span>
          <span className="muted">mean correlation with others {fmt(samples[hover].meanCorr, 3)}</span>
        </div>
      )}
    </div>
  )
}
