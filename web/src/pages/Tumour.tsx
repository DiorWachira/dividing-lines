import { Link, useParams } from 'react-router-dom'
import { LineUp } from '../components/LineUp'
import { Nucleus } from '../components/Nucleus'
import { Empty } from '../components/States'
import { Figure } from '../components/charts'
import { useData } from '../data/DataContext'
import { fmt, pct, subtypeName } from '../lib/util'

export function Tumour() {
  const { id = '' } = useParams()
  const d = useData()
  const order = [...d.samples].sort((a, b) => a.prolif - b.prolif)
  const k = order.findIndex((s) => s.id === id)
  if (k < 0) {
    return (
      <div className="page">
        <Empty title="No tumour with that accession">
          <span className="mono">{id}</span> is not one of the 59 luminal tumours in this study. GEO sample IDs look like <span className="mono">GSM1116180</span>.
        </Empty>
      </div>
    )
  }
  const s = order[k]
  const i = d.samples.findIndex((x) => x.id === s.id)
  const ext = [order[0].prolif, order[order.length - 1].prolif]
  const stain = (s.prolif - ext[0]) / (ext[1] - ext[0])
  const side = s.prolif >= d.summary.bestCut.threshold ? 'LumB' : 'LumA'
  const prev = order[k - 1]
  const next = order[k + 1]
  const topGenes = d.genes.slice(0, 10)

  return (
    <div className="page page-tumour">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Plate I · Line-up</Link> <span aria-hidden="true">/</span> <span>tumour {k + 1} of 59 by proliferation</span>
      </nav>
      <header className="tumour-head">
        <Nucleus seed={s.id} stain={stain} ring={s.subtype} size={132} className="tumour-nuc" title={`Nucleus drawing for ${s.id}, stained to its proliferation score`} />
        <div>
          <p className="label">
            {s.id} · {s.title} · batch {s.batch}
          </p>
          <h1 className="display page-title">
            <span className={s.subtype === 'LumA' ? 't-lumA' : 't-lumB'}>{subtypeName(s.subtype)}</span>
          </h1>
          <p className="page-dek">
            Proliferation score <b className="mono">{fmt(s.prolif)}</b>, which ranks {k + 1} of 59 from slowest to fastest. At the best line it falls on the <b>{subtypeName(side)}</b> side
            {side === s.subtype ? ', matching its label.' : ', the opposite side from its label. This is one of the tumours that makes the line fuzzy.'}
            {s.flagged && ' Quality control flagged this sample as unusual; see the Method plate.'}
          </p>
        </div>
      </header>

      <Figure n="9" title="Where it sits in the line-up" caption="The ringed nucleus is this tumour. The rest of the cohort is drawn smaller for context.">
        <LineUp samples={d.samples} bestCut={d.summary.bestCut.threshold} compact highlight={s.id} interactive={false} />
      </Figure>

      <section className="tumour-grid">
        <div className="panel">
          <h2 className="label">What each model predicted (out of fold)</h2>
          <p className="muted panel-note">Probability of Luminal B, averaged over repeats, from models that never saw this tumour.</p>
          <ul className="probs">
            {d.classifier.models
              .filter((m) => m.key !== 'dummy')
              .map((m) => {
                const p = s.oof[m.key]
                return (
                  <li key={m.key} className={m.key === 'prolif' ? 'is-prolif' : ''}>
                    <span className="probs-label">{m.short}</span>
                    <span className="probs-track" aria-hidden="true">
                      <span className="probs-mid" />
                      <span className="probs-dot" style={{ left: `${(p ?? 0.5) * 100}%` }} />
                    </span>
                    <span className="mono probs-val">{p == null ? '—' : pct(p)}</span>
                  </li>
                )
              })}
          </ul>
          <p className="probs-scale muted mono" aria-hidden="true">
            <span>0% · surely A</span>
            <span>100% · surely B</span>
          </p>
        </div>
        <div className="panel">
          <h2 className="label">Top-ranked genes in this tumour</h2>
          <table className="mini">
            <thead>
              <tr>
                <th scope="col">Gene</th>
                <th scope="col" className="num">
                  This tumour
                </th>
                <th scope="col" className="num">
                  Lum A mean
                </th>
                <th scope="col" className="num">
                  Lum B mean
                </th>
              </tr>
            </thead>
            <tbody>
              {topGenes.map((g) => {
                const v = g.values[i]
                const closer = Math.abs(v - g.meanA) < Math.abs(v - g.meanB) ? 'LumA' : 'LumB'
                return (
                  <tr key={g.probe}>
                    <td>
                      <Link to={`/genes/${encodeURIComponent(g.symbol)}`} className="gene">
                        {g.symbol}
                      </Link>
                    </td>
                    <td className={`num mono ${closer === 'LumA' ? 't-lumA-ink' : 't-lumB-ink'}`}>{fmt(v)}</td>
                    <td className="num mono muted">{fmt(g.meanA)}</td>
                    <td className="num mono muted">{fmt(g.meanB)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="muted panel-note">Values are log₂ intensities. The tumour’s value is coloured by the group mean it sits closer to.</p>
        </div>
      </section>

      <nav className="pager" aria-label="Neighbouring tumours">
        {prev ? <Link to={`/tumours/${prev.id}`}>← slower: {prev.id}</Link> : <span />}
        {next && <Link to={`/tumours/${next.id}`}>faster: {next.id} →</Link>}
      </nav>
    </div>
  )
}
