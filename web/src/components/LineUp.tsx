import { scaleLinear } from 'd3-scale'
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Sample } from '../data/types'
import { useWidth } from '../lib/useSize'
import { clamp, fmt, pct, subtypeName } from '../lib/util'
import { chromatin, nucleusPath, stainFill } from './Nucleus'

/**
 * Signature hero · THE LINE-UP.
 * In metaphase a cell lines its chromosomes up on one plate before it divides.
 * Here every tumour is lined up on one axis, its proliferation score, and the
 * reader drags the dividing line that would split them into "Luminal A" and
 * "Luminal B". Top lane: tumours labelled Luminal A; bottom lane: Luminal B.
 */

interface Props {
  samples: Sample[]
  bestCut: number
  compact?: boolean
  highlight?: string
  interactive?: boolean
  onCutChange?: (t: number) => void
}

interface Placed {
  s: Sample
  x: number
  y: number
  r: number
  d: string
  dots: { x: number; y: number; r: number }[]
  stain: number
  rank: number
}

export function cutStats(samples: Sample[], t: number) {
  let aLeft = 0, aRight = 0, bLeft = 0, bRight = 0
  for (const s of samples) {
    const right = s.prolif >= t
    if (s.subtype === 'LumA') right ? aRight++ : aLeft++
    else right ? bRight++ : bLeft++
  }
  const n = samples.length
  return {
    aLeft, aRight, bLeft, bRight,
    correct: aLeft + bRight,
    accuracy: (aLeft + bRight) / n,
    errA: aRight / Math.max(1, aLeft + aRight),
    errB: bLeft / Math.max(1, bLeft + bRight),
  }
}

export function LineUp({ samples, bestCut, compact = false, highlight, interactive = true, onCutChange }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(900)
  const navigate = useNavigate()
  const [cut, setCutState] = useState(bestCut)
  const [hover, setHover] = useState<string | null>(null)
  const [cursor, setCursor] = useState(-1)
  const dragging = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const narrow = width < 560
  const r = compact ? (narrow ? 5 : 6.5) : narrow ? 7.5 : 11
  const laneH = compact ? 2 * r * 3.2 : narrow ? 2 * r * 4.6 : 2 * r * 4.2
  const m = { top: compact ? 14 : 40, right: 14, bottom: compact ? 26 : 52, left: 14 }
  const height = m.top + laneH * 2 + 18 + m.bottom

  const ext = useMemo(() => {
    const xs = samples.map((s) => s.prolif)
    return [Math.min(...xs), Math.max(...xs)] as const
  }, [samples])
  const x = useMemo(
    () => scaleLinear().domain([ext[0] - 0.12, ext[1] + 0.12]).range([m.left, width - m.right]).nice(),
    [ext, width, m.left, m.right],
  )
  const laneY = { LumA: m.top + laneH / 2, LumB: m.top + laneH + 18 + laneH / 2 }

  // Beeswarm within each lane: nudge nuclei vertically until they do not collide.
  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = []
    const order = [...samples].sort((a, b) => a.prolif - b.prolif)
    const rankOf = new Map(order.map((s, i) => [s.id, i]))
    for (const lane of ['LumA', 'LumB'] as const) {
      const here: { x: number; y: number }[] = []
      for (const s of order.filter((o) => o.subtype === lane)) {
        const px = x(s.prolif)
        let py = laneY[lane]
        for (let k = 0; k < 40; k++) {
          const off = Math.ceil(k / 2) * (r * 1.05) * (k % 2 ? -1 : 1)
          const cy = laneY[lane] + off
          if (here.every((p) => Math.hypot(p.x - px, p.y - cy) > 2 * r + 1.5)) {
            py = cy
            break
          }
        }
        py = clamp(py, laneY[lane] - laneH / 2 + r, laneY[lane] + laneH / 2 - r)
        here.push({ x: px, y: py })
        out.push({
          s, x: px, y: py, r,
          d: nucleusPath(s.id, r),
          dots: compact ? [] : chromatin(s.id, r, 4),
          stain: (s.prolif - ext[0]) / (ext[1] - ext[0] || 1),
          rank: rankOf.get(s.id) ?? 0,
        })
      }
    }
    return out
  }, [samples, x, laneY.LumA, laneY.LumB, r, laneH, compact, ext])

  const sorted = useMemo(() => [...placed].sort((a, b) => a.rank - b.rank), [placed])
  const stats = cutStats(samples, cut)
  const cx = x(cut)

  const setCut = useCallback(
    (t: number) => {
      const v = clamp(t, x.domain()[0], x.domain()[1])
      setCutState(v)
      onCutChange?.(v)
    },
    [x, onCutChange],
  )

  const fromPointer = (e: PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setCut(x.invert(e.clientX - rect.left))
  }

  const onHandleKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.25 : 0.05
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setCut(cut - step)
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setCut(cut + step)
    else if (e.key === 'Home') setCut(x.domain()[0])
    else if (e.key === 'End') setCut(x.domain()[1])
    else if (e.key === 'Enter' || e.key.toLowerCase() === 'b') setCut(bestCut)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const onSpecimenKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCursor((c) => Math.min(sorted.length - 1, c + 1))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1))
    else if (e.key === 'Enter' && cursor >= 0) navigate(`/tumours/${sorted[cursor].s.id}`)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const activeId = hover ?? (cursor >= 0 ? sorted[cursor]?.s.id : null) ?? highlight ?? null
  const active = placed.find((p) => p.s.id === activeId)
  const ticks = x.ticks(narrow ? 5 : 9)

  return (
    <div className={`lineup ${compact ? 'is-compact' : ''}`} ref={wrapRef} data-tour="lineup">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="lineup-svg"
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => setHover(null)}
        role="group"
        aria-label={`Line-up of ${samples.length} tumours by proliferation score`}
      >
        {/* side labels */}
        {!compact && (
          <g className="lineup-sides" aria-hidden="true">
            <text x={Math.max(cx - 10, m.left + 2)} y={16} textAnchor="end" className="lineup-side">
              ← called Luminal A
            </text>
            <text x={Math.min(cx + 10, width - m.right - 2)} y={16} textAnchor="start" className="lineup-side">
              called Luminal B →
            </text>
          </g>
        )}

        {/* lanes */}
        {(['LumA', 'LumB'] as const).map((lane) => (
          <g key={lane} aria-hidden="true">
            <rect
              x={m.left}
              y={laneY[lane] - laneH / 2}
              width={width - m.left - m.right}
              height={laneH}
              className={`lineup-lane lane-${lane}`}
            />
            {!compact && (
              <text x={m.left + 8} y={laneY[lane] - laneH / 2 + 14} className="lineup-lane-label">
                {subtypeName(lane).toUpperCase()} · {samples.filter((s) => s.subtype === lane).length}
              </text>
            )}
          </g>
        ))}

        {/* axis */}
        <g className="lineup-axis" aria-hidden="true" transform={`translate(0 ${height - m.bottom + 8})`}>
          <line x1={m.left} x2={width - m.right} y1={0} y2={0} />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${x(t)} 0)`}>
              <line y1={0} y2={5} />
              <text y={18} textAnchor="middle">
                {t > 0 ? `+${t}` : t}
              </text>
            </g>
          ))}
          {!compact && (
            <text x={(m.left + width - m.right) / 2} y={40} textAnchor="middle" className="lineup-axis-title">
              {narrow ? '← slower · proliferation score · faster →' : '← slower division      proliferation score (mean z of 21 PAM50 cell-division genes)      faster division →'}
            </text>
          )}
        </g>

        {/* nuclei */}
        <g
          className="lineup-nuclei"
          tabIndex={interactive ? 0 : -1}
          onKeyDown={interactive ? onSpecimenKey : undefined}
          onFocus={() => cursor < 0 && setCursor(0)}
          onBlur={() => setCursor(-1)}
          aria-label="Tumours. Use left and right arrows to step through them, Enter to open one."
          data-tour="nuclei"
        >
          {placed.map((p) => {
            const wrong = (p.s.subtype === 'LumA') !== p.s.prolif < cut
            const isActive = p.s.id === activeId
            return (
              <g
                key={p.s.id}
                transform={`translate(${p.x} ${p.y})`}
                className={`nuc ${isActive ? 'is-active' : ''} ${wrong ? 'is-wrong' : ''}`}
                style={{ ['--d' as string]: `${p.rank * 14}ms` }}
                onPointerEnter={() => setHover(p.s.id)}
                onPointerLeave={() => setHover((h) => (h === p.s.id ? null : h))}
                onClick={() => interactive && navigate(`/tumours/${p.s.id}`)}
                data-testid={`nuc-${p.s.id}`}
              >
                <circle r={p.r + 5} className="nuc-hit" />
                {wrong && !compact && <ellipse rx={p.r + 4} ry={p.r + 3.2} className="nuc-ring" />}
                <path d={p.d} className={`nuc-body ring-${p.s.subtype}`} style={{ fill: stainFill(p.stain) }} />
                {p.dots.map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r={c.r} className="nuc-chromatin" />
                ))}
              </g>
            )
          })}
        </g>

        {/* the dividing line */}
        <g className="lineup-cut" transform={`translate(${cx} 0)`}>
          <line y1={compact ? 4 : 24} y2={height - m.bottom + 8} className="cut-line" />
          {interactive && (
            <>
              <rect
                x={-10}
                y={compact ? 0 : 20}
                width={20}
                height={height - m.bottom - (compact ? 0 : 12)}
                className="cut-hit"
                onPointerDown={(e) => {
                  dragging.current = true
                  ;(e.target as Element).setPointerCapture?.(e.pointerId)
                  fromPointer(e)
                }}
                onPointerMove={(e) => dragging.current && fromPointer(e)}
                onPointerUp={() => (dragging.current = false)}
              />
              <g
                className="cut-handle"
                transform={`translate(0 ${compact ? 6 : 26})`}
                tabIndex={0}
                role="slider"
                aria-label="Dividing line position on the proliferation score"
                aria-valuemin={Number(x.domain()[0].toFixed(2))}
                aria-valuemax={Number(x.domain()[1].toFixed(2))}
                aria-valuenow={Number(cut.toFixed(2))}
                aria-valuetext={`Score ${fmt(cut)}: ${stats.correct} of ${samples.length} tumours on their labelled side`}
                onKeyDown={onHandleKey}
                onPointerDown={(e) => {
                  dragging.current = true
                  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
                }}
                onPointerMove={(e) => dragging.current && fromPointer(e)}
                onPointerUp={() => (dragging.current = false)}
                data-tour="cut-handle"
              >
                <rect x={-7} y={-6} width={14} height={22} rx={7} className="cut-grip" />
                <line x1={-2} x2={-2} y1={0} y2={10} className="cut-grip-mark" />
                <line x1={2} x2={2} y1={0} y2={10} className="cut-grip-mark" />
              </g>
            </>
          )}
        </g>

        {active && !compact && (
          <g transform={`translate(${active.x} ${active.y})`} pointerEvents="none" aria-hidden="true">
            <circle r={active.r + 7} className="nuc-focus" />
          </g>
        )}
      </svg>

      {active && interactive && (
        <div
          className="lineup-tip"
          style={{
            left: clamp(active.x, 90, width - 90),
            top: active.y + (active.s.subtype === 'LumA' ? active.r + 14 : -active.r - 14),
            transform: `translate(-50%, ${active.s.subtype === 'LumA' ? '0' : '-100%'})`,
          }}
          role="status"
        >
          <span className="label">{active.s.id}</span>
          <strong>{subtypeName(active.s.subtype)}</strong>
          <span>
            Proliferation score <b className="mono">{fmt(active.s.prolif)}</b>
          </span>
          <span>
            <i className="gene">MKI67</i> <b className="mono">{fmt(active.s.mki67)}</b> log₂
          </span>
          <span className="muted">{(active.s.subtype === 'LumA') !== active.s.prolif < cut ? 'On the other side of the line' : 'On its labelled side'} · click to open</span>
        </div>
      )}

      {!compact && interactive && (
        <div className="lineup-readout" data-tour="readout" aria-live="polite">
          <div className="readout-cell">
            <span className="label">Line at score</span>
            <span className="readout-big mono">{fmt(cut)}</span>
          </div>
          <div className="readout-cell">
            <span className="label">On their labelled side</span>
            <span className="readout-big mono">
              {stats.correct}/{samples.length}
            </span>
            <span className="muted">{pct(stats.accuracy)} agree with the label</span>
          </div>
          <div className="readout-cell">
            <span className="label">Luminal A called B</span>
            <span className="readout-big mono">{stats.aRight}</span>
            <span className="muted">{pct(stats.errA)} of Luminal A</span>
          </div>
          <div className="readout-cell is-critical">
            <span className="label">Luminal B called A</span>
            <span className="readout-big mono">{stats.bLeft}</span>
            <span className="muted">{pct(stats.errB)} of Luminal B, the costly mistake</span>
          </div>
          <div className="readout-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setCut(bestCut)} data-tour="snap">
              Snap to best line
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
