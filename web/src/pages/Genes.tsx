import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Figure, Legend, StainStrip } from '../components/charts'
import { Volcano } from '../components/Volcano'
import { useData } from '../data/DataContext'
import { fmtP, foldWords, pct } from '../lib/util'

export function Genes() {
  const d = useData()
  const s = d.summary
  const navigate = useNavigate()
  const [mode, setMode] = useState<'pam50' | 'cellcycle' | 'amplicon'>('pam50')
  const [query, setQuery] = useState('')
  const [onlyNonProlif, setOnlyNonProlif] = useState(false)
  const order = useMemo(() => d.samples.map((_, i) => i).sort((a, b) => d.samples[a].prolif - d.samples[b].prolif), [d.samples])
  const subtypes = d.samples.map((x) => x.subtype)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return d.genes
      .filter((g) => !q || g.symbol.toLowerCase().includes(q) || g.title.toLowerCase().includes(q) || g.probe.toLowerCase().includes(q))
      .filter((g) => !onlyNonProlif || (!g.pam50 && !g.cellCycle))
      .slice(0, 80)
  }, [d.genes, query, onlyNonProlif])

  const ampSet = new Set(s.her2.genes)
  const nHighlighted = mode === 'amplicon' ? d.volcano.sym.filter((x) => ampSet.has(x)).length : (mode === 'pam50' ? d.volcano.pam50 : d.volcano.cc).reduce((a, b) => a + b, 0)

  return (
    <div className="page page-genes">
      <header className="page-head">
        <p className="label">Plate II · Anaphase · Objectives 2 and 3</p>
        <h1 className="display page-title">
          Genes, pulled <em>apart</em>
        </h1>
        <p className="page-dek">
          We compared all {s.de.tested.toLocaleString()} probes that passed quality control between the 29 Luminal A and 30 Luminal B tumours (Welch’s t-test on log-scale values), then corrected for running that many tests. By chance alone
          you would expect about {s.de.expectedFalseAtP05.toLocaleString()} probes under p&nbsp;&lt;&nbsp;0.05 even if nothing differed. In fact {s.de.rawP05.toLocaleString()} did, and{' '}
          <b>{s.de.fdr05.toLocaleString()}</b> survive a 5% false discovery rate: {s.de.fdr05UpInB.toLocaleString()} higher in Luminal B and {s.de.fdr05UpInA.toLocaleString()} higher in Luminal A.
        </p>
      </header>

      <div className="toolbar" data-tour="prolif-toggle">
        <span className="label">Highlight</span>
        <div className="seg" role="radiogroup" aria-label="Highlighted gene set">
          <button type="button" role="radio" aria-checked={mode === 'pam50'} className={`seg-btn ${mode === 'pam50' ? 'is-on' : ''}`} onClick={() => setMode('pam50')}>
            PAM50 proliferation (21 genes, declared)
          </button>
          <button type="button" role="radio" aria-checked={mode === 'cellcycle'} className={`seg-btn ${mode === 'cellcycle' ? 'is-on' : ''}`} onClick={() => setMode('cellcycle')}>
            GO cell cycle + cell division
          </button>
          <button type="button" role="radio" aria-checked={mode === 'amplicon'} className={`seg-btn ${mode === 'amplicon' ? 'is-on' : ''}`} onClick={() => setMode('amplicon')}>
            17q12 HER2 amplicon (exploratory)
          </button>
        </div>
        <span className="muted toolbar-note">{nHighlighted.toLocaleString()} probes highlighted</span>
      </div>

      <Figure
        n="3"
        title="Volcano plot: size of difference against strength of evidence"
        caption={
          <>
            Every dot is a probe. Further right means more active in Luminal B, and higher means less likely to be chance. Above the dashed line a probe passes FDR&nbsp;5%.{' '}
            {mode === 'amplicon'
              ? 'Ringed dots are the probes of the five 17q12 amplicon genes (ERBB2, GRB7, STARD3, PGAP3, MIEN1). They sit right at the top, next to the cell-division genes: the second dividing line.'
              : `Brown/yellow marks ${mode === 'pam50' ? 'the 21 PAM50 proliferation genes we declared before looking' : 'every probe annotated to GO cell cycle (GO:0007049) or cell division (GO:0051301)'}. They crowd the upper right, so many of the strongest differences are cell-division genes that are higher in Luminal B. The rest of the top corner is the HER2 amplicon.`}{' '}
            Hover any dot; click a ranked gene to open it.
          </>
        }
      >
        <Legend
          items={[
            mode === 'amplicon' ? { swatch: 'ring', label: '17q12 amplicon gene' } : { swatch: 'signal', label: mode === 'pam50' ? 'PAM50 proliferation gene' : 'GO cell cycle / division' },
            { swatch: 'ink', label: 'other gene, FDR < 5%' },
            { swatch: 'faint', label: 'not significant' },
            { swatch: 'dash', label: 'FDR 5% threshold' },
          ]}
        />
        <Volcano data={d.volcano} genes={d.genes} mode={mode} amplicon={s.her2.genes} />
      </Figure>

      <section className="share" aria-label="Proliferation share">
        <div className="share-cell">
          <p className="label">Top 50 probes</p>
          <p className="share-num mono">{s.prolif.top50.cellCycle}/50</p>
          <p className="muted">cell cycle / division · {s.prolif.top50.pam50} PAM50</p>
        </div>
        <div className="share-cell">
          <p className="label">Top 100 probes</p>
          <p className="share-num mono">{s.prolif.top100.cellCycle}/100</p>
          <p className="muted">cell cycle / division · {s.prolif.top100.pam50} PAM50</p>
        </div>
        <div className="share-cell">
          <p className="label">All significant vs background</p>
          <p className="share-num mono">
            {pct(s.prolif.cellCycleShareSig)} <span className="muted">vs</span> {pct(s.prolif.cellCycleShareBackground)}
          </p>
          <p className="muted">
            cell-cycle share · odds ratio {s.prolif.enrichmentOR.toFixed(1)}, p {fmtP(s.prolif.enrichmentP)}
          </p>
        </div>
      </section>

      <section className="beyond" aria-labelledby="beyond-title" data-tour="beyond">
        <div className="beyond-head">
          <p className="label">What survives once proliferation is accounted for</p>
          <h2 id="beyond-title" className="display section-title">
            {s.adjusted.survivors} of {s.de.fdr05.toLocaleString()}
          </h2>
          <p className="muted">
            For every probe we fitted <span className="mono">expression = subtype + proliferation score</span>. Only {s.adjusted.survivors} probes keep a significant subtype effect (FDR 5%): {s.adjusted.upInB} higher in Luminal B, {s.adjusted.upInA}{' '}
            higher in Luminal A. The strongest are the 17q12 amplicon genes. <i className="gene">ERBB2</i> is {(2 ** s.her2.erbb2Fc).toFixed(1)}× higher in Luminal B, and {s.her2.lumBAboveMaxA} of 30 Luminal B tumours exceed the highest
            Luminal A value.
          </p>
        </div>
        <ol className="beyond-list">
          {s.adjusted.top.slice(0, 12).map((g) => (
            <li key={g.probe}>
              <Link to={`/genes/${encodeURIComponent(g.symbol)}`} className="gene">
                {g.symbol}
              </Link>
              {ampSet.has(g.symbol) && <span className="tag-explore">17q12</span>}
              <span className="mono muted">
                {g.effect > 0 ? '+' : '−'}
                {Math.abs(g.effect).toFixed(2)} log₂ · q {fmtP(g.q)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="enrich" aria-labelledby="enrich-title">
        <h2 id="enrich-title" className="display section-title">
          What the top genes do
        </h2>
        <p className="muted enrich-method">{d.enrichment.method}</p>
        <div className="enrich-cols">
          {(
            [
              ['Higher in Luminal B', d.enrichment.upInB, 'lumB'],
              ['Higher in Luminal A', d.enrichment.upInA, 'lumA'],
            ] as const
          ).map(([title, terms, cls]) => (
            <div key={title} className={`enrich-col enrich-${cls}`}>
              <h3 className="label">{title}</h3>
              {terms.length === 0 ? (
                <p className="muted">No pathway passed FDR 5% for this direction. That is itself informative: the genes higher in Luminal A do not share one dominant theme.</p>
              ) : (
                <ol className="terms">
                  {terms.slice(0, 8).map((t) => (
                    <li key={t.term + t.source}>
                      <span className="term-name">{t.term}</span>
                      <span className="term-meta mono">
                        q {fmtP(t.q)} · {t.overlap}
                      </span>
                      <span className="term-genes">
                        {t.genes.slice(0, 8).map((g) => (
                          <i key={g} className="gene">
                            {g}
                          </i>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="gene-table-wrap" aria-labelledby="table-title" data-tour="gene-table">
        <div className="table-head">
          <h2 id="table-title" className="display section-title">
            The ranked genes
          </h2>
          <div className="table-tools">
            <label className="search">
              <span className="sr-only">Filter genes</span>
              <input type="search" placeholder="Filter: MKI67, kinase, 2120…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={onlyNonProlif} onChange={(e) => setOnlyNonProlif(e.target.checked)} />
              <span>hide cell-cycle genes</span>
            </label>
          </div>
        </div>
        <p className="muted table-note">
          Top {d.genes.length} probes by p-value. The strip shows each gene across all 59 tumours, ordered left to right by proliferation score (as in Fig. 1). Darker means more expressed, and the coloured foot marks the subtype.
        </p>
        <div className="table-scroll">
          <table className="gtable">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Gene</th>
                <th scope="col" className="hide-sm">
                  Across 59 tumours
                </th>
                <th scope="col">Difference</th>
                <th scope="col" className="num">
                  FDR q
                </th>
                <th scope="col" className="hide-sm">
                  Set
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.probe} onClick={() => navigate(`/genes/${encodeURIComponent(g.symbol)}`)} className="gtable-row">
                  <td className="mono muted">{g.rank}</td>
                  <td>
                    <Link to={`/genes/${encodeURIComponent(g.symbol)}`} className="gene gtable-gene" onClick={(e) => e.stopPropagation()}>
                      {g.symbol}
                    </Link>
                    <span className="gtable-title muted">{g.title}</span>
                    <span className="label gtable-probe id">{g.probe}</span>
                  </td>
                  <td className="hide-sm">
                    <StainStrip values={g.values} order={order} subtypes={subtypes} />
                  </td>
                  <td>
                    <span className={g.log2fc > 0 ? 't-lumB-ink' : 't-lumA-ink'}>{foldWords(g.log2fc)}</span>
                  </td>
                  <td className="num mono">{fmtP(g.q)}</td>
                  <td className="hide-sm">
                    {g.pam50 ? <span className="badge badge-signal">PAM50</span> : g.cellCycle ? <span className="badge badge-signal-soft">cell cycle</span> : <span className="badge">other</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted table-empty">No gene in the top {d.genes.length} matches that filter.</p>}
        </div>
      </section>
    </div>
  )
}
