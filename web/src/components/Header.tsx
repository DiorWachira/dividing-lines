import { NavLink } from 'react-router-dom'
import { useGuide } from '../guide/Guide'
import { useMode, type Mode } from '../lib/theme'
import { PhaseGlyph, type Phase } from './PhaseGlyph'

const NAV: { to: string; label: string; phase: Phase; plate: string }[] = [
  { to: '/', label: 'Line-up', phase: 'metaphase', plate: 'I' },
  { to: '/genes', label: 'Genes', phase: 'anaphase', plate: 'II' },
  { to: '/classifier', label: 'Classifier', phase: 'cytokinesis', plate: 'III' },
  { to: '/method', label: 'Method', phase: 'interphase', plate: 'IV' },
]

export function Header() {
  const { openHelp } = useGuide()
  const [mode, setMode] = useMode()
  const modes: { m: Mode; label: string; hint: string }[] = [
    { m: 'light', label: 'Brightfield', hint: 'light: a stained slide under white light' },
    { m: 'auto', label: 'Auto', hint: 'follow your system setting' },
    { m: 'dark', label: 'Fluorescence', hint: 'dark: the same slide under fluorescence' },
  ]
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink to="/" className="brand" aria-label="Dividing Lines, home">
          <svg className="brand-mark" viewBox="0 0 40 28" aria-hidden="true">
            <path d="M20 6.4C17.6 2.6 13 1.2 9 2.6 4 4.4 1.5 9 1.5 14s2.5 9.6 7.5 11.4c4 1.4 8.6 0 11-3.8 2.4 3.8 7 5.2 11 3.8 5-1.8 7.5-6.4 7.5-11.4S36 4.4 31 2.6C27 1.2 22.4 2.6 20 6.4z" className="brand-cell" />
            <ellipse cx="11" cy="14" rx="4.2" ry="3.6" className="brand-nuc-a" />
            <ellipse cx="29" cy="14" rx="4.2" ry="3.6" className="brand-nuc-b" />
            <line x1="20" y1="0" x2="20" y2="28" className="brand-line" />
          </svg>
          <span className="brand-word display">
            Dividing <em>Lines</em>
          </span>
        </NavLink>

        <nav className="nav" aria-label="Plates">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`} data-tour={`nav-${n.label.toLowerCase()}`}>
              <PhaseGlyph phase={n.phase} />
              <span className="nav-text">
                <span className="nav-plate label">Plate {n.plate}</span>
                <span className="nav-label">{n.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="header-tools">
          <div className="mode-switch" role="radiogroup" aria-label="Imaging mode">
            {modes.map((x) => (
              <button
                key={x.m}
                type="button"
                role="radio"
                aria-checked={mode === x.m}
                className={`mode-btn ${mode === x.m ? 'is-on' : ''}`}
                onClick={() => setMode(x.m)}
                title={x.hint}
              >
                <span className={`mode-dot mode-${x.m}`} aria-hidden="true" />
                <span className="mode-label">{x.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="guide-key" onClick={openHelp} data-tour="guide-key" aria-keyshortcuts="?">
            <span>Guide</span>
            <kbd>?</kbd>
          </button>
        </div>
      </div>
    </header>
  )
}
