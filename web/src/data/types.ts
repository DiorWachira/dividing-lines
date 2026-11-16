// Data contract between the notebook (dividing_lines.ipynb, final export cell)
// and the companion site. Every number shown on the site comes from these files.

export type Subtype = 'LumA' | 'LumB'

export interface Stat {
  mean: number
  sd: number
  lo: number // 2.5th percentile across outer folds
  hi: number // 97.5th percentile across outer folds
}

export interface Summary {
  generated: string
  dataset: {
    accession: string
    platform: string
    platformTitle: string
    institute: string
    country: string
    title: string
    pmid: string
    citation: string
    url: string
    matrixUrl: string
    processing: string
    seriesSamples: number
    seriesProbes: number
  }
  counts: {
    lumA: number
    lumB: number
    probesInMatrix: number
    probesAfterMissing: number
    probesAfterVariance: number
    varianceCutoff: number
    flagged: string[]
  }
  logDecision: { min: number; max: number; median: number; transformed: boolean; reason: string }
  annotation: { matchRate: number; source: string }
  de: {
    tested: number
    fdr05: number
    fdr05UpInB: number
    fdr05UpInA: number
    genesFdr05: number
    expectedFalseAtP05: number
    rawP05: number
    mannWhitneyAgree: number
  }
  prolif: {
    set: string[]
    probesFound: number
    genesFound: string[]
    top50: { pam50: number; cellCycle: number }
    top100: { pam50: number; cellCycle: number }
    cellCycleShareSig: number
    cellCycleShareBackground: number
    enrichmentOR: number
    enrichmentP: number
    scoreAuc: number
    mki67Probe: string
    mki67P: number
    mki67Fc: number
  }
  bestCut: { threshold: number; accuracy: number; errA: number; errB: number }
  pca: { var1: number; var2: number; nProbes: number; overlap: number }
  her2: {
    genes: string[]
    probes: string[]
    band: string
    scoreAuc: number
    bestCut: number
    accuracy: number
    lumBAboveMaxA: number
    corrWithProlif: number
    slowLumB: number
    slowLumBHer2High: number
    orRuleAccuracy: number
    erbb2Probe: string
    erbb2Fc: number
  }
  adjusted: { survivors: number; upInB: number; upInA: number; top: { symbol: string; probe: string; effect: number; q: number }[] }
  headline: string
}

export interface Sample {
  id: string // GSM accession
  title: string
  subtype: Subtype
  batch: string
  prolif: number // proliferation score: mean z-score of PAM50 proliferation genes
  her2: number // HER2-amplicon score: mean z-score of 5 genes on 17q12 (exploratory)
  erbb2: number // log2 expression of the main ERBB2 probe
  mki67: number // log2 expression of the main MKI67 probe
  pc1: number
  pc2: number
  q1: number
  median: number
  q3: number
  whiskLo: number
  whiskHi: number
  meanCorr: number
  flagged: boolean
  oof: Record<string, number> // out-of-fold P(Luminal B), averaged over repeats, per model key
}

export interface GeneRow {
  probe: string
  symbol: string
  title: string
  chrom: string
  log2fc: number // mean(LumB) − mean(LumA), log2 units
  p: number
  q: number
  mwQ: number
  meanA: number
  meanB: number
  pam50: boolean
  cellCycle: boolean
  amplicon: boolean
  rank: number
  values: number[] // one per sample, same order as samples.json
}

export interface Volcano {
  x: number[] // log2 fold change
  y: number[] // −log10 p
  sig: number[] // 1 if FDR < 0.05
  pam50: number[] // 1 if probe maps to the PAM50 proliferation set
  cc: number[] // 1 if probe maps to GO cell cycle / cell division
  sym: string[] // gene symbol per probe ('' if unannotated)
  probe: string[] // probe ID per point
  labels: { i: number; symbol: string; probe: string }[]
  qLine: number // −log10 p at which FDR crosses 0.05
}

export interface Fold {
  auc: number
  acc: number
  errA: number
  errB: number
}

export interface ModelResult {
  key: string
  label: string
  short: string
  question: string
  features: string
  exploratory: boolean
  folds: Fold[]
  auc: Stat
  acc: Stat
  errA: Stat
  errB: Stat
  roc: { fpr: number[]; tpr: number[] }
  confusion: { aa: number; ab: number; ba: number; bb: number } // row = truth, col = predicted
  topFeatures: { symbol: string; probe: string; freq: number }[]
}

export interface Classifier {
  outer: string
  inner: string
  repeats: number
  folds: number
  grid: string
  models: ModelResult[]
  verdict: string
}

export interface Term {
  term: string
  source: string
  q: number
  overlap: string
  genes: string[]
}

export interface Enrichment {
  method: string
  upInB: Term[]
  upInA: Term[]
  network: { nodes: { id: string; pam50: boolean; cellCycle: boolean; fc: number }[]; edges: { s: string; t: string; r: number }[] }
}

export interface SiteData {
  summary: Summary
  samples: Sample[]
  genes: GeneRow[]
  volcano: Volcano
  classifier: Classifier
  enrichment: Enrichment
}
