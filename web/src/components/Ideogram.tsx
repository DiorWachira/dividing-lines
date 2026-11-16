import { scaleLinear } from 'd3-scale'
import { useState } from 'react'
import type { ModelResult } from '../data/types'
import { useWidth } from '../lib/useSize'
import { fmt } from '../lib/util'

/**
 * Signature component · THE IDEOGRAM LADDER.
 * Each classifier is drawn like a chromosome ideogram. The body spans the
 * middle 95% of its cross-validated scores, the centromere pinch sits at the
 * mean, and every outer test fold is a dark G-band at its own score. A short,
 * tight chromosome means a stable estimate; a long one means it depended on
 * which tumours happened to land in the test fold.
 */

interface Props {
  models: ModelResult[]
  metric?: 'auc' | 'acc'
  selected?: string
  onSelect?: (key: string) => void
  compact?: boolean
  zoom?: boolean
}

export function Ideogram({ models, metric = 'auc', selected, onSelect, compact = false, zoom = false }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(800)
  const [hover, setHover] = useState<{ key: string; i: number } | null>(null)
  const narrow = width < 600
  const labelW = compact ? (narrow ? 0 : 200) : narrow ? 0 : 280
  const rowH = compact ? 34 : narrow ? 64 : 52
  const m = { top: 8, right: 56, bottom: 34, left: labelW + 8 }
  const height = m.top + rowH * models.length + m.bottom
  const lo0 = zoom ? 0.8 : 0.3
  const xs = scaleLinear().domain([lo0, 1]).range([m.left, width - m.right])
  const x = (v: number) => xs(Math.max(lo0, Math.min(1, v)))
  const ticks = zoom ? [0.8, 0.85, 0.9, 0.95, 1] : [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
  const body = compact ? 9 : 12

  return (
    <div className="ideogram" ref={ref} data-tour="ladder">
      <svg width={width} height={height} role="img" aria-label={`Cross-validated ${metric === 'auc' ? 'ROC-AUC' : 'accuracy'} for ${models.length} models`}>
        {ticks.map((t) => (
          <g key={t} transform={`translate(${x(t)} 0)`} aria-hidden="true">
            <line y1={m.top} y2={height - m.bottom} className={t === 0.5 ? 'ideo-chance' : 'ideo-grid'} />
            <text y={height - m.bottom + 18} textAnchor="middle" className="ideo-tick">
              {zoom ? t.toFixed(2) : t.toFixed(1)}
            </text>
          </g>
        ))}
        {!zoom && (
          <text x={x(0.5)} y={height - 4} textAnchor="middle" className="ideo-tick ideo-chance-label" aria-hidden="true">
            coin flip
          </text>
        )}
        {zoom && (
          <text x={m.left} y={height - 4} className="ideo-tick ideo-chance-label" aria-hidden="true">
            zoomed: 0.80–1.00 (scores below are drawn at the left edge)
          </text>
        )}
        <text x={width - m.right} y={height - 4} textAnchor="end" className="ideo-tick" aria-hidden="true">
          {metric === 'auc' ? 'ROC-AUC →' : 'accuracy →'}
        </text>

        {models.map((mod, row) => {
          const st = mod[metric]
          const cy = m.top + row * rowH + (narrow && !compact ? rowH * 0.62 : rowH / 2)
          const offScale = zoom && st.mean < lo0
          const lo = x(st.lo)
          const hi = x(st.hi)
          const mid = x(st.mean)
          const isProlif = mod.key === 'prolif'
          const isSel = selected === mod.key
          const h = body
          const pinch = h * 0.28
          // Chromosome outline: two arms meeting at a centromere pinch.
          const w1 = Math.max(mid - lo, h * 0.5)
          const w2 = Math.max(hi - mid, h * 0.5)
          const path = `M ${mid} ${cy - pinch}
            C ${mid - 3} ${cy - h / 2}, ${mid - 6} ${cy - h / 2}, ${mid - Math.min(8, w1)} ${cy - h / 2}
            L ${mid - w1 + h / 2} ${cy - h / 2}
            A ${h / 2} ${h / 2} 0 0 0 ${mid - w1 + h / 2} ${cy + h / 2}
            L ${mid - Math.min(8, w1)} ${cy + h / 2}
            C ${mid - 6} ${cy + h / 2}, ${mid - 3} ${cy + h / 2}, ${mid} ${cy + pinch}
            C ${mid + 3} ${cy + h / 2}, ${mid + 6} ${cy + h / 2}, ${mid + Math.min(8, w2)} ${cy + h / 2}
            L ${mid + w2 - h / 2} ${cy + h / 2}
            A ${h / 2} ${h / 2} 0 0 0 ${mid + w2 - h / 2} ${cy - h / 2}
            L ${mid + Math.min(8, w2)} ${cy - h / 2}
            C ${mid + 6} ${cy - h / 2}, ${mid + 3} ${cy - h / 2}, ${mid} ${cy - pinch} Z`
          const clipId = `clip-${mod.key}`
          return (
            <g
              key={mod.key}
              className={`ideo-row ${mod.exploratory ? 'is-exploratory' : ''} ${isProlif ? 'is-prolif' : ''} ${isSel ? 'is-selected' : ''} ${onSelect ? 'is-clickable' : ''}`}
              onClick={() => onSelect?.(mod.key)}
              onKeyDown={(e) => {
                if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onSelect(mod.key)
                }
              }}
              tabIndex={onSelect ? 0 : -1}
              role={onSelect ? 'button' : undefined}
              aria-pressed={onSelect ? isSel : undefined}
              aria-label={`${mod.label}: mean ${metric.toUpperCase()} ${fmt(st.mean)}, plus or minus ${fmt(st.sd)}`}
              data-tour={`rung-${mod.key}`}
              data-testid={`rung-${mod.key}`}
            >
              <rect x={0} y={m.top + row * rowH} width={width} height={rowH} className="ideo-rowbg" />
              {narrow || labelW === 0 ? (
                <text x={4} y={m.top + row * rowH + 16} className="ideo-label">
                  {mod.short}
                  {mod.exploratory ? ' *' : ''}
                </text>
              ) : (
                <>
                  <text x={4} y={cy - (compact ? -4 : 2)} className="ideo-label">
                    {mod.short}
                    {mod.exploratory ? ' *' : ''}
                  </text>
                  {!compact && (
                    <text x={4} y={cy + 14} className="ideo-sub">
                      {mod.features}
                    </text>
                  )}
                </>
              )}
              <defs>
                <clipPath id={clipId}>
                  <path d={path} />
                </clipPath>
              </defs>
              <path d={path} className="ideo-body" />
              <g clipPath={`url(#${clipId})`}>
                {mod.folds.map((f, i) => (
                  <rect
                    key={i}
                    x={x(f[metric]) - 1}
                    y={cy - h / 2}
                    width={2}
                    height={h}
                    className={`ideo-band ${hover?.key === mod.key && hover.i === i ? 'is-hover' : ''}`}
                  />
                ))}
              </g>
              <path d={path} className="ideo-outline" />
              {/* fold hit targets for the readout */}
              {!compact &&
                mod.folds.map((f, i) => (
                  <rect
                    key={`h${i}`}
                    x={x(f[metric]) - 3}
                    y={cy - h}
                    width={6}
                    height={h * 2}
                    fill="transparent"
                    onPointerEnter={() => setHover({ key: mod.key, i })}
                    onPointerLeave={() => setHover(null)}
                  />
                ))}
              <text x={Math.min(hi + 8, width - m.right + 6)} y={cy + 4} className="ideo-value">
                {offScale ? `◂ ${fmt(st.mean)} (off scale)` : fmt(st.mean)}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <p className="ideo-readout mono" role="status">
          {models.find((mm) => mm.key === hover.key)?.short} · outer fold {hover.i + 1}: AUC{' '}
          {fmt(models.find((mm) => mm.key === hover.key)!.folds[hover.i].auc)} · accuracy{' '}
          {fmt(models.find((mm) => mm.key === hover.key)!.folds[hover.i].acc)}
        </p>
      )}
    </div>
  )
}
