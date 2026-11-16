import { Link, useParams } from 'react-router-dom'
import { Figure, MirrorPlot, ScatterXY, pearson } from '../components/charts'
import { Empty } from '../components/States'
import { useData } from '../data/DataContext'
import { fmt, fmtP, foldWords } from '../lib/util'

export function Gene() {
  const { symbol = '' } = useParams()
  const d = useData()
  const sym = decodeURIComponent(symbol)
  const idx = d.genes.findIndex((g) => g.symbol.toLowerCase() === sym.toLowerCase())
  if (idx < 0) {
    return (
      <div className="page">
        <Empty title={`${sym} is not among the ranked genes`} to="/genes" cta="Back to the gene list">
          The site keeps per-tumour values for the top {d.genes.length} probes by p-value. <i className="gene">{sym}</i> is either outside that list or not on the chip. The full table of every probe is in the notebook.
        </Empty>
      </div>
    )
  }
  const g = d.genes[idx]
  const prev = d.genes[idx - 1]
  const next = d.genes[idx + 1]
  const r = pearson(g.values, d.samples.map((s) => s.prolif))
  const tracks = Math.abs(r) >= 0.7 ? 'closely tracks' : Math.abs(r) >= 0.4 ? 'partly tracks' : 'barely tracks'

  return (
    <div className="page page-gene">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/genes">Plate II · Genes</Link> <span aria-hidden="true">/</span> <span>rank {g.rank}</span>
      </nav>
      <header className="gene-head">
        <div>
          <p className="label">
            Probe <span className="id">{g.probe}</span> · {g.chrom || 'chromosome n/a'}
          </p>
          <h1 className="display gene-title">
            <i>{g.symbol}</i>
          </h1>
          <p className="gene-desc">{g.title}</p>
          <div className="gene-badges">
            {g.pam50 && <span className="badge badge-signal">PAM50 proliferation set</span>}
            {g.cellCycle && <span className="badge badge-signal-soft">GO cell cycle / division</span>}
            {g.amplicon && <span className="badge badge-ink">17q12 HER2 amplicon</span>}
            {!g.pam50 && !g.cellCycle && !g.amplicon && <span className="badge">not annotated as cell-cycle</span>}
          </div>
        </div>
        <dl className="gene-stats">
          <div>
            <dt className="label">Difference</dt>
            <dd>{foldWords(g.log2fc)}</dd>
            <dd className="mono muted">log₂FC {fmt(g.log2fc)}</dd>
          </div>
          <div>
            <dt className="label">Welch p</dt>
            <dd className="mono">{fmtP(g.p)}</dd>
          </div>
          <div>
            <dt className="label">FDR q (BH)</dt>
            <dd className="mono">{fmtP(g.q)}</dd>
            <dd className="muted">{g.q < 0.05 ? 'passes FDR 5%' : 'does not pass FDR 5%'}</dd>
          </div>
          <div>
            <dt className="label">Mann–Whitney q</dt>
            <dd className="mono">{fmtP(g.mwQ)}</dd>
            <dd className="muted">{g.mwQ < 0.05 === g.q < 0.05 ? 'same conclusion' : 'conclusion changes'}</dd>
          </div>
        </dl>
      </header>

      <div className="gene-figs">
        <Figure
          n="4"
          title="Luminal A ← the plate → Luminal B"
          tour="mirror"
          caption={
            <>
              Each dot is one tumour; the horizontal rules are the group means ({fmt(g.meanA)} vs {fmt(g.meanB)} on the log₂ scale). A gap of 1 log₂ unit means twice as much message. Wherever the two clouds overlap, this gene on its own
              cannot tell those tumours apart, even when the average difference is real.
            </>
          }
        >
          <MirrorPlot values={g.values} samples={d.samples} />
        </Figure>
        <Figure
          n="5"
          title="Is this just proliferation?"
          caption={
            <>
              The same tumours, with this gene against the proliferation score. Pearson r = <b className="mono">{fmt(r)}</b>, so <i className="gene">{g.symbol}</i> {tracks} division speed.{' '}
              {Math.abs(r) >= 0.7 ? 'Most of its subtype difference is probably the proliferation signal seen through another gene.' : 'Some of its subtype difference is not explained by division speed alone.'}
            </>
          }
        >
          <ScatterXY xs={d.samples.map((s) => s.prolif)} ys={g.values} samples={d.samples} xLabel="proliferation score" yLabel={`${g.symbol} (log₂)`} />
        </Figure>
      </div>

      <nav className="pager" aria-label="Neighbouring genes">
        {prev ? (
          <Link to={`/genes/${encodeURIComponent(prev.symbol)}`}>
            ← rank {prev.rank} <i className="gene">{prev.symbol}</i>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/genes/${encodeURIComponent(next.symbol)}`}>
            rank {next.rank} <i className="gene">{next.symbol}</i> →
          </Link>
        )}
      </nav>
    </div>
  )
}
