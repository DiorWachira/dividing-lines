import { Link } from 'react-router-dom'
import { Ideogram } from '../components/Ideogram'
import { LineUp, cutStats } from '../components/LineUp'
import { TwoLines } from '../components/TwoLines'
import { Figure, Legend } from '../components/charts'
import { useData } from '../data/DataContext'
import { COLAB_URL, REPO_URL } from '../lib/links'
import { fmt, pct } from '../lib/util'

export function Overview() {
  const d = useData()
  const s = d.summary
  const best = cutStats(d.samples, s.bestCut.threshold)
  const m = (k: string) => d.classifier.models.find((x) => x.key === k)
  const prolif = m('prolif')
  const her2 = m('her2')
  const full = m('full')
  const none = m('mask_both')
  const overlapA = best.aRight
  const overlapB = best.bLeft

  return (
    <div className="page page-overview">
      <section className="hero">
        <p className="label hero-kicker">
          Plate I · Metaphase · {s.dataset.accession} · {s.counts.lumA + s.counts.lumB} tumours
        </p>
        <h1 className="display hero-title" data-tour="hero-title">
          What separates <span className="t-lumA">Luminal&nbsp;A</span> from <span className="t-lumB">Luminal&nbsp;B</span>?
        </h1>
        <p className="hero-dek">{s.headline}</p>
        <div className="hero-actions">
          <a className="btn btn-ink" href={COLAB_URL} target="_blank" rel="noreferrer">
            Open the notebook in Colab ↗
          </a>
          <Link className="btn btn-quiet" to="/method">
            How we did it
          </Link>
        </div>
      </section>

      <Figure
        n="1"
        title="The line-up: every tumour on one plate"
        tour="fig-lineup"
        caption={
          <>
            Each nucleus is one tumour, placed left to right by its <b>proliferation score</b> (the average activity of 21 cell-division genes we declared in advance) and stained darker the faster it divides. The labels come from the
            submitters. At the best line, chosen with hindsight on all 59 so it flatters, {best.correct}/59 ({pct(best.accuracy)}) agree with their label and {overlapA + overlapB} sit on the other side ({overlapA} Luminal A, {overlapB}{' '}
            Luminal B). There is no empty gap: the tumours form one continuum and the labels change along it, like a line drawn on a Ki-67 scale. Ringed nuclei are on the other side of the current line. Switch the axis to the
            HER2 amplicon to see a second line pick up the slow Luminal B tumours. Click any nucleus to open it.
          </>
        }
      >
        <LineUp samples={d.samples} bestCut={s.bestCut.threshold} her2Cut={s.her2.bestCut} />
      </Figure>

      <section className="tiles tiles-4" aria-label="Key numbers">
        <article className="tile">
          <p className="label">Objective 2 · differential expression</p>
          <p className="tile-num mono">{s.de.fdr05.toLocaleString()}</p>
          <p className="tile-text">
            of {s.de.tested.toLocaleString()} probes differ at a 5% false discovery rate ({s.de.genesFdr05.toLocaleString()} genes). Chance alone would give about {s.de.expectedFalseAtP05.toLocaleString()} at p&nbsp;&lt;&nbsp;0.05.
          </p>
          <Link to="/genes" className="tile-link">
            See the genes →
          </Link>
        </article>
        <article className="tile tile-signal">
          <p className="label">Objective 3 · what they do</p>
          <p className="tile-num mono">
            {s.prolif.top50.cellCycle}
            <span className="tile-of">/50</span>
          </p>
          <p className="tile-text">
            of the strongest probes are cell-cycle genes, against {pct(s.prolif.cellCycleShareBackground, 0)} of the chip. Cell division is the biggest single theme.
          </p>
          <Link to="/genes" className="tile-link">
            The proliferation share →
          </Link>
        </article>
        <article className="tile">
          <p className="label">Beyond proliferation</p>
          <p className="tile-num mono">{s.adjusted.survivors}</p>
          <p className="tile-text">
            probes still differ once proliferation is accounted for. The strongest are the 17q12 <i className="gene">ERBB2</i> amplicon. {s.her2.lumBAboveMaxA} of 30 Luminal B tumours have more <i className="gene">ERBB2</i> than any Luminal A tumour.
          </p>
          <Link to="/genes" className="tile-link">
            The second line →
          </Link>
        </article>
        <article className="tile">
          <p className="label">Objective 4 · classification</p>
          <p className="tile-num mono">
            {prolif ? fmt(prolif.auc.mean) : '—'}
            <span className="tile-of"> / {full ? fmt(full.auc.mean) : '—'}</span>
          </p>
          <p className="tile-text">ROC-AUC with only 21 proliferation genes, against all probes, nested cross-validated so the test tumours were never seen in training.</p>
          <Link to="/classifier" className="tile-link">
            Climb the ladder →
          </Link>
        </article>
      </section>

      <Figure
        n="2"
        title="Two dividing lines (exploratory)"
        caption={
          <>
            The same 59 nuclei, now placed by proliferation (left to right) and by the HER2-amplicon score (bottom to top), five genes that sit together on chromosome 17 and are copied many times over in HER2-positive tumours.
            Luminal B tumours fill an L-shaped zone: they divide fast, are HER2-amplified, or both. The two scores correlate only moderately (r = {fmt(s.her2.corrWithProlif)}). Of the {s.her2.slowLumB} Luminal B tumours on the slow side of
            the proliferation line, {s.her2.slowLumBHer2High} are HER2-high. This fits the 2011 St Gallen definition, where an ER-positive, HER2-positive tumour is “Luminal B” whatever its Ki-67. We found this after looking at the
            results, so it is a hypothesis, not a pre-planned test.
          </>
        }
      >
        <Legend
          items={[
            { swatch: 'lumA', label: 'ring: Luminal A' },
            { swatch: 'lumB', label: 'ring: Luminal B' },
            { swatch: 'signal', label: 'fill and vertical line: proliferation' },
            { swatch: 'dash', label: 'HER2-amplicon line' },
          ]}
        />
        <TwoLines samples={d.samples} prolifCut={s.bestCut.threshold} her2Cut={s.her2.bestCut} />
      </Figure>

      <section className="honesty" aria-labelledby="honesty-title">
        <div className="honesty-rule" aria-hidden="true" />
        <div className="honesty-col">
          <p className="label">The honesty problem</p>
          <h2 id="honesty-title" className="display section-title">
            The answer was built into the question.
          </h2>
        </div>
        <div className="honesty-col">
          <p>
            Luminal A and Luminal B were first <em>defined</em> from gene expression, and in the clinic by a proliferation stain (Ki-67) and HER2 status. So “can gene expression tell them apart?” is guaranteed a yes. A naive project
            would rediscover its own labels and report a high accuracy.
          </p>
          <p>
            We say so openly and then <b>measure</b> it. How much of the separation do cell-division genes carry alone? What is left when we remove them? The answer turned out to be: almost everything, and then a second
            built-in line, HER2. With both removed, a model still scores AUC {none ? fmt(none.auc.mean) : '—'}, against {her2 ? fmt(her2.auc.mean) : '—'} for the five amplicon genes alone.
          </p>
        </div>
      </section>

      <Figure
        n="3"
        title="The ladder of baselines (summary)"
        caption={
          <>
            Cross-validated ROC-AUC for each model, zoomed to 0.80–1.00 (the dummy sits at 0.50, off the left edge). The pinch is the mean, the body spans the middle 95% of outer test folds, and each dark band is one fold. Dashed outlines are exploratory rungs. {d.classifier.verdict}{' '}
            <Link to="/classifier">Open Plate III</Link> for errors by class, ROC curves and confusion matrices.
          </>
        }
      >
        <Ideogram models={d.classifier.models} compact zoom />
      </Figure>

      <section className="plates" aria-label="Other plates">
        <Link to="/genes" className="plate-card">
          <span className="label">Plate II · Anaphase</span>
          <span className="display plate-card-title">Genes pulled apart</span>
          <span className="muted">Volcano plot, the ranked genes, and what survives proliferation.</span>
        </Link>
        <Link to="/classifier" className="plate-card">
          <span className="label">Plate III · Cytokinesis</span>
          <span className="display plate-card-title">The actual split</span>
          <span className="muted">Nested cross-validation and the baseline ladder.</span>
        </Link>
        <Link to="/method" className="plate-card">
          <span className="label">Plate IV · Interphase</span>
          <span className="display plate-card-title">Preparing the slide</span>
          <span className="muted">The data, quality control and the limits of what this shows.</span>
        </Link>
      </section>

      <p className="fine muted">
        Research and coursework only. Not a clinical test. Source code and notebook on <a href={REPO_URL}>GitHub</a>.
      </p>
    </div>
  )
}
