import { Link } from 'react-router-dom'
import { Ideogram } from '../components/Ideogram'
import { LineUp, cutStats } from '../components/LineUp'
import { Figure } from '../components/charts'
import { useData } from '../data/DataContext'
import { COLAB_URL, REPO_URL } from '../lib/links'
import { fmt, pct } from '../lib/util'

export function Overview() {
  const d = useData()
  const s = d.summary
  const best = cutStats(d.samples, s.bestCut.threshold)
  const prolif = d.classifier.models.find((m) => m.key === 'prolif')
  const full = d.classifier.models.find((m) => m.key === 'full')
  const overlapA = d.samples.filter((x) => x.subtype === 'LumA' && x.prolif >= s.bestCut.threshold).length
  const overlapB = d.samples.filter((x) => x.subtype === 'LumB' && x.prolif < s.bestCut.threshold).length

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
            Each nucleus is one tumour, placed left to right by its <b>proliferation score</b> (the average activity of 21 cell-division genes we declared in advance) and stained darker the faster it divides. Labels come from the
            submitters. Even at the best line, chosen with hindsight on all 59 so it flatters, {overlapA} Luminal A and {overlapB} Luminal B tumours sit on the other side ({best.correct}/59, {pct(best.accuracy)} agree). The
            lanes overlap, so this looks like <b>one continuum with a line drawn through it</b>, not two separate kinds of tumour. Ringed nuclei are on the other side of the current line. Click any nucleus to open that tumour.
          </>
        }
      >
        <LineUp samples={d.samples} bestCut={s.bestCut.threshold} />
      </Figure>

      <section className="tiles" aria-label="Key numbers">
        <article className="tile">
          <p className="label">Objective 2 · differential expression</p>
          <p className="tile-num mono">{s.de.fdr05.toLocaleString()}</p>
          <p className="tile-text">
            of {s.de.tested.toLocaleString()} probes differ between the subtypes at a 5% false discovery rate. That is {s.de.genesFdr05.toLocaleString()} distinct genes.
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
            of the 50 strongest probes belong to cell-cycle or cell-division genes (Gene Ontology). {s.prolif.top50.pam50} are in our declared 21-gene PAM50 proliferation set.
          </p>
          <Link to="/genes" className="tile-link">
            See the proliferation share →
          </Link>
        </article>
        <article className="tile">
          <p className="label">Objective 4 · classification</p>
          <p className="tile-num mono">
            {prolif ? fmt(prolif.auc.mean) : '—'}
            <span className="tile-of"> vs {full ? fmt(full.auc.mean) : '—'}</span>
          </p>
          <p className="tile-text">ROC-AUC with only the 21 proliferation genes, against all genes. Both are nested cross-validated, so the test tumours were never seen in training.</p>
          <Link to="/classifier" className="tile-link">
            Climb the ladder →
          </Link>
        </article>
      </section>

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
            Luminal A and Luminal B were first <em>defined</em> from gene expression. Luminal B is the one where proliferation genes are more active. So “can gene expression tell them apart?” is guaranteed a yes, and a naive project
            would rediscover its own labels and report a high accuracy.
          </p>
          <p>
            We say so openly and then <b>measure</b> it. How much of the separation comes from cell-division genes alone? And is anything left when we take them away? Either answer is a real result.
          </p>
        </div>
      </section>

      <Figure
        n="2"
        title="The ladder of baselines (summary)"
        caption={
          <>
            Cross-validated ROC-AUC for each model. The pinch is the mean, the body spans the middle 95% of outer test folds, and each dark band is one fold. {d.classifier.verdict}{' '}
            <Link to="/classifier">Open Plate III</Link> for errors by class, ROC curves and confusion matrices.
          </>
        }
      >
        <Ideogram models={d.classifier.models} compact />
      </Figure>

      <section className="plates" aria-label="Other plates">
        <Link to="/genes" className="plate-card">
          <span className="label">Plate II · Anaphase</span>
          <span className="display plate-card-title">Genes pulled apart</span>
          <span className="muted">Volcano plot, the ranked genes and the proliferation share.</span>
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
