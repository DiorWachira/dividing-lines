/**
 * Tiny drawings of the phases of cell division, used as navigation marks.
 * Each screen of the site is named after the phase it resembles:
 *  interphase   → Method (preparing the material)
 *  metaphase    → Overview (everything lined up on one plate)
 *  anaphase     → Genes (the two sides pulled apart)
 *  cytokinesis  → Classifier (the cell actually splits in two)
 */
export type Phase = 'interphase' | 'metaphase' | 'anaphase' | 'cytokinesis'

export function PhaseGlyph({ phase, size = 22 }: { phase: Phase; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="phase-glyph">
      {phase === 'interphase' && (
        <>
          <ellipse cx="12" cy="12" rx="10" ry="8.5" {...common} />
          <ellipse cx="12" cy="12" rx="4.6" ry="4" fill="currentColor" opacity="0.32" />
          <circle cx="13.2" cy="11" r="1.1" fill="currentColor" />
        </>
      )}
      {phase === 'metaphase' && (
        <>
          <ellipse cx="12" cy="12" rx="10" ry="8.5" {...common} />
          <path d="M3 12 L12 7 L21 12 M3 12 L12 17 L21 12" {...common} strokeWidth={0.7} opacity={0.6} />
          {[7.5, 10.5, 13.5, 16.5].map((y) => (
            <rect key={y} x="11" y={y - 1} width="2" height="2" rx="0.6" fill="currentColor" />
          ))}
          <line x1="12" y1="3" x2="12" y2="21" stroke="var(--signal)" strokeWidth="1.2" strokeDasharray="1.4 1.6" />
        </>
      )}
      {phase === 'anaphase' && (
        <>
          <ellipse cx="12" cy="12" rx="10.5" ry="8" {...common} />
          {[9, 12, 15].map((y) => (
            <g key={y}>
              <path d={`M7.2 ${y} l1.6 -0.9 v1.8 z`} fill="currentColor" />
              <path d={`M16.8 ${y} l-1.6 -0.9 v1.8 z`} fill="currentColor" />
            </g>
          ))}
          <line x1="12" y1="4" x2="12" y2="20" stroke="var(--signal)" strokeWidth="1.2" strokeDasharray="1.4 1.6" />
        </>
      )}
      {phase === 'cytokinesis' && (
        <>
          <path d="M12 6.2C10.4 4.2 7.8 3.4 5.6 4.4 3 5.6 1.8 8.6 1.8 12s1.2 6.4 3.8 7.6c2.2 1 4.8.2 6.4-1.8 1.6 2 4.2 2.8 6.4 1.8 2.6-1.2 3.8-4.2 3.8-7.6s-1.2-6.4-3.8-7.6C16.2 3.4 13.6 4.2 12 6.2z" {...common} />
          <circle cx="7" cy="12" r="2.4" fill="currentColor" opacity="0.4" />
          <circle cx="17" cy="12" r="2.4" fill="currentColor" opacity="0.4" />
          <line x1="12" y1="2" x2="12" y2="22" stroke="var(--signal)" strokeWidth="1.2" strokeDasharray="1.4 1.6" />
        </>
      )}
    </svg>
  )
}
