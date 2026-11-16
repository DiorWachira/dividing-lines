// Small shared helpers: formatting, seeded randomness, safe storage, motion preference.

export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '—'
  if (p === 0) return '< 1e-300'
  if (p >= 0.001) return p.toFixed(3)
  const e = Math.floor(Math.log10(p))
  const m = p / 10 ** e
  return `${m.toFixed(1)}×10${superscript(e)}`
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
function superscript(n: number) {
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('')
}

export const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—')
export const pct = (x: number, d = 0) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—')
export const signed = (x: number, d = 2) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(d)

/** Fold change in plain words: log2 FC → "2.3× higher in Luminal B". */
export function foldWords(log2fc: number): string {
  const f = 2 ** Math.abs(log2fc)
  const where = log2fc >= 0 ? 'Luminal B' : 'Luminal A'
  return `${f.toFixed(f < 10 ? 1 : 0)}× higher in ${where}`
}

/** Deterministic PRNG (mulberry32) seeded from a string, so a tumour's nucleus always looks the same. */
export function seeded(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* private mode or blocked storage: the site still works, it just forgets */
    }
  },
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export const subtypeName = (s: string) => (s === 'LumA' ? 'Luminal A' : 'Luminal B')

export function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}
