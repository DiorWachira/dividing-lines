import { HashRouter, Route, Routes } from 'react-router-dom'
import { Cleavage } from './components/Cleavage'
import { Header } from './components/Header'
import { Fault, Staining } from './components/States'
import { TissueBackground } from './components/TissueBackground'
import { DataProvider, useData, useDataState } from './data/DataContext'
import { GuideProvider } from './guide/Guide'
import { REPO_URL } from './lib/links'
import { Classifier } from './pages/Classifier'
import { Gene } from './pages/Gene'
import { Genes } from './pages/Genes'
import { Method } from './pages/Method'
import { NotFound } from './pages/NotFound'
import { Overview } from './pages/Overview'
import { Tumour } from './pages/Tumour'

function Shell() {
  const d = useData()
  const stainedShare = d.samples.filter((s) => s.prolif >= d.summary.bestCut.threshold).length / d.samples.length
  return (
    <GuideProvider>
      <TissueBackground stainedShare={stainedShare} />
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/genes" element={<Genes />} />
          <Route path="/genes/:symbol" element={<Gene />} />
          <Route path="/classifier" element={<Classifier />} />
          <Route path="/tumours/:id" element={<Tumour />} />
          <Route path="/method" element={<Method />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <p className="display footer-title">
            Dividing <em>Lines</em>
          </p>
          <p className="muted">
            Computing for Bioinformatics group project. Data: GEO {d.summary.dataset.accession} ({d.summary.dataset.institute}). Generated {d.summary.generated}.
          </p>
          <p className="muted">
            Research use only. <a href={REPO_URL}>Source and notebook</a>
          </p>
        </div>
      </footer>
      <Cleavage />
    </GuideProvider>
  )
}

function Gate() {
  const s = useDataState()
  if (s.status === 'loading') return <Staining />
  if (s.status === 'error') return <Fault message={s.message} />
  return <Shell />
}

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <Gate />
      </DataProvider>
    </HashRouter>
  )
}
