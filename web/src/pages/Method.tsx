import { Figure, Legend, SampleBoxes, ScatterXY } from '../components/charts'
import { useData } from '../data/DataContext'
import { COLAB_URL, GEO_URL, REPO_URL } from '../lib/links'
import { fmt, pct } from '../lib/util'

export function Method() {
  const d = useData()
  const s = d.summary
  const c = s.counts
  const steps = [
    { n: s.dataset.seriesSamples, unit: 'samples', what: 'in the full GEO series (all subtypes, normal tissue, cell lines)' },
    { n: c.lumA + c.lumB, unit: 'tumours', what: `kept: ${c.lumA} Luminal A + ${c.lumB} Luminal B (asserted in code)` },
    { n: c.probesInMatrix, unit: 'probes', what: 'in the matrix. The submitters had already dropped noise-level probes from the 54,675 on the chip' },
    { n: c.probesAfterMissing, unit: 'probes', what: 'after removing probes with any missing value' },
    { n: c.probesAfterVariance, unit: 'probes', what: `after removing near-flat probes (SD < ${c.varianceCutoff} log₂ units across the 59)` },
  ]
  return (
    <div className="page page-method">
      <header className="page-head">
        <p className="label">Plate IV · Interphase · Stages 2–4 and 8</p>
        <h1 className="display page-title">
          Preparing the <em>slide</em>
        </h1>
        <p className="page-dek">
          Before a cell divides it spends most of its life in interphase, copying and checking its material. This plate is ours: where the data came from, what we checked, and where the conclusions stop.
        </p>
        <div className="hero-actions">
          <a className="btn btn-ink" href={COLAB_URL} target="_blank" rel="noreferrer">
            Run it yourself in Colab ↗
          </a>
          <a className="btn btn-quiet" href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
        </div>
      </header>

      <figure className="plate-art">
        <div className="plate-art-frame">
          <img src={`${import.meta.env.BASE_URL}img/flemming-1882-mitosis.jpg`} alt="Walther Flemming's 1882 drawings of dividing cells: chromosomes condensing, lining up on the metaphase plate, separating, and the cell pinching in two." width={306} height={434} loading="lazy" />
        </div>
        <figcaption>
          <span className="label">Fig. 0 · the reference plate</span>
          <p>
            Walther Flemming, <i>Zellsubstanz, Kern und Zelltheilung</i> (Leipzig, 1882), the book that named <i>mitosis</i>. Figures 42–43 show chromosomes lined up on the metaphase plate, and Fig. 48 shows a cell pinching into two.
            This site borrows its grammar from these pages: tumours lined up on one plate, a dividing line, two daughter groups. Here the plate is printed in hematoxylin tones, or as a fluorescence negative in dark mode.
          </p>
          <p className="muted">Public domain, via Wikimedia Commons.</p>
        </figcaption>
      </figure>

      <section className="source" aria-labelledby="source-title">
        <h2 id="source-title" className="display section-title">
          The material
        </h2>
        <dl className="source-grid">
          <div>
            <dt className="label">Dataset</dt>
            <dd>
              <a href={GEO_URL}>{s.dataset.accession}</a>: {s.dataset.title}
            </dd>
          </div>
          <div>
            <dt className="label">Platform</dt>
            <dd>
              {s.dataset.platform}: {s.dataset.platformTitle}
            </dd>
          </div>
          <div>
            <dt className="label">Submitted by</dt>
            <dd>
              {s.dataset.institute}, {s.dataset.country}
            </dd>
          </div>
          <div>
            <dt className="label">Linked paper</dt>
            <dd>
              {s.dataset.citation} (PMID {s.dataset.pmid})
            </dd>
          </div>
          <div>
            <dt className="label">Collection</dt>
            <dd>Tumour removed at surgery, before any treatment.</dd>
          </div>
          <div>
            <dt className="label">Licence</dt>
            <dd>NCBI places no restrictions on GEO data. The submitters may hold rights; we cite them and do not redistribute the data.</dd>
          </div>
        </dl>
        <blockquote className="processing">
          <p className="label">The submitters’ processing, verbatim (theirs, not ours)</p>
          <p>{s.dataset.processing}</p>
        </blockquote>
      </section>

      <section className="pipeline-counts" aria-labelledby="qc-title">
        <h2 id="qc-title" className="display section-title">
          Counts at every step
        </h2>
        <ol className="counts">
          {steps.map((st, i) => (
            <li key={i}>
              <span className="counts-n mono">{st.n.toLocaleString()}</span>
              <span className="label">{st.unit}</span>
              <span className="counts-what">{st.what}</span>
            </li>
          ))}
        </ol>
        <div className="decision">
          <p className="label">Log-transform decision (made by inspecting the data)</p>
          <p>
            Values range from <span className="mono">{fmt(s.logDecision.min)}</span> to <span className="mono">{fmt(s.logDecision.max)}</span> with median <span className="mono">{fmt(s.logDecision.median)}</span>.{' '}
            {s.logDecision.reason} <b>{s.logDecision.transformed ? 'We applied log₂(x + 1).' : 'We did not transform again.'}</b>
          </p>
        </div>
        <div className="decision">
          <p className="label">Probe → gene mapping</p>
          <p>
            {pct(s.annotation.matchRate, 1)} of the probes we analysed map to a gene symbol using {s.annotation.source}.
          </p>
        </div>
      </section>

      <Figure
        n="10"
        title="Per-tumour expression distributions"
        caption={
          <>
            One box per tumour (middle half of its probes; whiskers to the 2.5th/97.5th percentile). The medians line up, which is what properly normalised data should look like.{' '}
            {c.flagged.length ? `${c.flagged.length} sample(s) were flagged as unusual and kept (see the notebook): ${c.flagged.join(', ')}.` : 'No sample sits far from the others, so none was removed.'}
          </>
        }
      >
        <Legend items={[{ swatch: 'lumA', label: 'Luminal A' }, { swatch: 'lumB', label: 'Luminal B' }]} />
        <SampleBoxes samples={d.samples} />
      </Figure>

      <Figure
        n="11"
        title="Principal components of the 5,000 most variable probes"
        caption={
          <>
            The first two principal components explain {pct(s.pca.var1)} and {pct(s.pca.var2)} of the variation. PC1, the largest source of variation, mostly separates the subtypes. Only {s.pca.overlap} tumours sit in the zone
            where the two groups overlap, and there is no empty gap between them. PC2 does not separate them at all. This matches the line-up in Fig. 1: one axis, with the labels changing along it.
          </>
        }
      >
        <Legend items={[{ swatch: 'lumA', label: 'Luminal A' }, { swatch: 'lumB', label: 'Luminal B' }]} />
        <ScatterXY xs={d.samples.map((x) => x.pc1)} ys={d.samples.map((x) => x.pc2)} samples={d.samples} xLabel={`PC1 (${pct(s.pca.var1)})`} yLabel={`PC2 (${pct(s.pca.var2)})`} height={340} />
      </Figure>

      <section className="limits" aria-labelledby="limits-title" data-tour="limits">
        <h2 id="limits-title" className="display section-title">
          Where this stops being true
        </h2>
        <ol className="limit-list">
          <li>
            <b>59 tumours against {c.probesAfterVariance.toLocaleString()} probes.</b> Every score here is an estimate from one small cohort, not evidence of a clinical test.
          </li>
          <li>
            <b>The labels are built from what we measure.</b> Luminal B is defined by high proliferation (and, in the clinic, often by HER2 status too). We measure how well we can reproduce a definition, not an independent
            biological fact. GEO does not record which definition the submitters used. Our HER2 finding suggests it included HER2 status, but that is an exploratory inference.
          </li>
          <li>
            <b>One French cohort, listed as Caucasian.</b> Breast cancer in African women tends to appear younger and with a larger triple-negative share. These findings should not be assumed to transfer to Kenyan patients without
            local validation.
          </li>
          <li>
            <b>The labels carry noise.</b> Different subtyping methods disagree, most often by moving some Luminal A tumours to Luminal B.
          </li>
          <li>
            <b>The values are processed intensities, not raw counts.</b> The normalisation and batch correction are the submitters’. Their batch model included the tumour type as a factor, which can overstate group differences
            (Nygaard et al., 2016). Here the subtypes are spread fairly evenly across batches, which limits that risk.
          </li>
        </ol>
        <p className="ruo">
          <span className="label">Research use only</span> This is a coursework analysis and must not inform any clinical decision. A Luminal B tumour misclassified as Luminal A could lead a clinician to withhold chemotherapy a patient
          needed.
        </p>
      </section>
    </div>
  )
}
