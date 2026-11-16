import { lineRadial, curveCatmullRomClosed } from 'd3-shape'
import { useMemo } from 'react'
import { seeded } from '../lib/util'

/**
 * Signature component · the stained nucleus.
 * A tumour is drawn as a cell nucleus whose outline is seeded by its GEO
 * accession (so it always looks the same) and whose DAB / Ki-67 stain level
 * comes from its real proliferation score. Brown (brightfield) or yellow
 * (fluorescence) means "dividing", as on a Ki-67 slide.
 */
export function nucleusPath(seed: string, r: number): string {
  const rand = seeded(seed)
  const n = 22
  const squash = 0.82 + rand() * 0.22
  const tilt = rand() * Math.PI
  const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28]
  const amps = [0.06 + rand() * 0.06, 0.03 + rand() * 0.05, 0.015 + rand() * 0.025]
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const wobble = 1 + amps[0] * Math.sin(2 * t + phases[0]) + amps[1] * Math.sin(3 * t + phases[1]) + amps[2] * Math.sin(5 * t + phases[2])
    // ellipse in polar form, then rotate
    const ex = Math.cos(t) * r * wobble
    const ey = Math.sin(t) * r * wobble * squash
    const x = ex * Math.cos(tilt) - ey * Math.sin(tilt)
    const y = ex * Math.sin(tilt) + ey * Math.cos(tilt)
    pts.push([Math.atan2(y, x) + Math.PI / 2, Math.hypot(x, y)])
  }
  pts.sort((a, b) => a[0] - b[0])
  return lineRadial().curve(curveCatmullRomClosed.alpha(0.5))(pts) ?? ''
}

export function chromatin(seed: string, r: number, count = 5): { x: number; y: number; r: number }[] {
  const rand = seeded(seed + ':chromatin')
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand()) * r * 0.55
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * (0.08 + rand() * 0.1) }
  })
}

/** Stain level 0..1 → a fill mixed between unstained and the signal chromogen. */
export function stainFill(level: number): string {
  const pctStain = Math.round(12 + Math.max(0, Math.min(1, level)) * 88)
  return `color-mix(in oklab, var(--signal) ${pctStain}%, var(--unstained))`
}

interface Props {
  seed: string
  stain: number // 0..1
  ring: 'LumA' | 'LumB' | 'none'
  size?: number
  title?: string
  className?: string
}

/** Standalone nucleus as its own little SVG (used in lists, the tumour page, the guide). */
export function Nucleus({ seed, stain, ring, size = 28, title, className }: Props) {
  const r = size * 0.4
  const d = useMemo(() => nucleusPath(seed, r), [seed, r])
  const dots = useMemo(() => chromatin(seed, r), [seed, r])
  const stroke = ring === 'none' ? 'var(--ink-3)' : ring === 'LumA' ? 'var(--lumA)' : 'var(--lumB)'
  return (
    <svg className={className} width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={d} fill={stainFill(stain)} stroke={stroke} strokeWidth={Math.max(1.5, size / 16)} />
      {dots.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="var(--ink)" opacity={0.22} />
      ))}
    </svg>
  )
}
