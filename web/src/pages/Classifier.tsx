import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Confusion, Figure, RocChart } from '../components/charts'
import { Ideogram } from '../components/Ideogram'
import { useData } from '../data/DataContext'
import { fmt, pct } from '../lib/util'

export function Classifier() {
  const d = useData()
  const c = d.classifier
  const [sel, setSel] = useState('prolif')
  const [metric, setMetric] = useState<'auc' | 'acc'>('auc')
  const [zoom, setZoom] = useState(true)
  const model = c.models.find((m) => m.key === sel) ?? c.models[0]

  return (
    <div className="page page-classifier">
      <header className="page-head">
        <p className="label">Plate III · Cytokinesis · Objective 4</p>
        <h1 className="display page-title">
          The actual <em>split</em>
        </h1>
        <p className="page-dek">
          We have 59 tumours and {d.summary.de.tested.toLocaleString()} probes, so it is very easy to fool yourself. Every gene choice, every scaling step and every tuning knob is fitted inside the training folds only ({c.outer}; inner loop: {c.inner}).
          Each model below was tested on tumours it had never seen.
        </p>
      </header>

      <section className="cv-diagram" aria-label="How nested cross-validation works">
        <div className="cv-row">
          <span className="label">Outer loop</span>
          <div className="cv-folds">
            {Array.from({ length: c.folds }, (_, i) => (
              <span key={i} className={`cv-fold ${i === 1 ? 'is-test' : ''}`}>
                {i === 1 ? 'test' : 'train'}
              </span>
            ))}
          </div>
          <span className="muted cv-note">gives the score · repeated {c.repeats}× with new shuffles</span>
        </div>
        <div className="cv-row cv-inner">
          <span className="label">Inner loop</span>
          <div className="cv-folds">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className={`cv-fold is-small ${i === 0 ? 'is-val' : ''}`}>
                {i === 0 ? 'check' : 'fit'}
              </span>
            ))}
          </div>
          <span className="muted cv-note">inside the outer training folds only: picks how many genes and how much regularisation ({c.grid})</span>
        </div>
      </section>

      <div className="toolbar">
        <span className="label">Score</span>
        <div className="seg" role="radiogroup" aria-label="Metric">
          <button type="button" role="radio" aria-checked={metric === 'auc'} className={`seg-btn ${metric === 'auc' ? 'is-on' : ''}`} onClick={() => setMetric('auc')}>
            ROC-AUC
          </button>
          <button type="button" role="radio" aria-checked={metric === 'acc'} className={`seg-btn ${metric === 'acc' ? 'is-on' : ''}`} onClick={() => setMetric('acc')}>
            Accuracy
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={zoom} onChange={(e) => setZoom(e.target.checked)} />
          <span>zoom to 0.80–1.00</span>
        </label>
        <span className="muted toolbar-note">Click a rung to inspect it</span>
      </div>

      <Figure
        n="6"
        title="The ladder of baselines"
        caption={
          <>
            One chromosome per model. The centromere pinch is the mean over {c.models[0]?.folds.length} outer test folds, the body spans the middle 95% of them, and every dark band is one fold. The 0.5 line is a coin flip. The
            proliferation-only rung is drawn in the proliferation stain, and dashed outlines (*) are exploratory rungs added after the HER2 finding. {c.verdict}
          </>
        }
      >
        <Ideogram models={c.models} metric={metric} selected={sel} onSelect={setSel} zoom={zoom} />
      </Figure>

      <section className="model-panel" aria-live="polite">
        <header className="model-head">
          <p className="label">Selected rung</p>
          <h2 className="display section-title">
            {model.label.replace(' (exploratory)', '')}
            {model.exploratory && <span className="tag-explore">exploratory: added after seeing Stage 6</span>}
          </h2>
          <p className="model-q">{model.question}</p>
          <p className="muted">Features: {model.features}</p>
        </header>
        <dl className="model-stats">
          <div>
            <dt className="label">ROC-AUC</dt>
            <dd className="mono">
              {fmt(model.auc.mean)} <span className="muted">± {fmt(model.auc.sd)}</span>
            </dd>
          </div>
          <div>
            <dt className="label">Accuracy</dt>
            <dd className="mono">
              {pct(model.acc.mean)} <span className="muted">± {pct(model.acc.sd)}</span>
            </dd>
          </div>
          <div>
            <dt className="label">Luminal A called B</dt>
            <dd className="mono">
              {pct(model.errA.mean)} <span className="muted">± {pct(model.errA.sd)}</span>
            </dd>
          </div>
          <div className="is-critical">
            <dt className="label">Luminal B called A</dt>
            <dd className="mono">
              {pct(model.errB.mean)} <span className="muted">± {pct(model.errB.sd)}</span>
            </dd>
          </div>
        </dl>
        <div className="model-figs">
          <Figure n="7" title="ROC curve (pooled out-of-fold)" caption="The selected model in full colour, the others faded. A curve hugging the top-left corner separates well. The diagonal is guessing.">
            <RocChart models={c.models} selected={model.key} />
          </Figure>
          <Figure
            n="8"
            title="Who gets it wrong"
            caption="Rows are the true label and columns are the prediction. The bottom-left cell is the clinically costly error: a Luminal B tumour called Luminal A, which could lead to chemotherapy being withheld."
          >
            <Confusion model={model} />
          </Figure>
        </div>
        {model.topFeatures.length > 0 && (
          <div className="features">
            <h3 className="label">Genes this model picked most often across outer folds</h3>
            <ul className="feature-list">
              {model.topFeatures.slice(0, 16).map((f) => (
                <li key={f.probe}>
                  <Link to={`/genes/${encodeURIComponent(f.symbol)}`} className="gene">
                    {f.symbol || f.probe}
                  </Link>
                  <span className="feature-bar" style={{ ['--w' as string]: `${f.freq * 100}%` }} aria-hidden="true" />
                  <span className="mono muted">{pct(f.freq)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
