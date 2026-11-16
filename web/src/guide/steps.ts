import type { SiteData } from '../data/types'

/**
 * The guided tour: 12 stops that teach the project's one key insight.
 * Routes can be resolved at runtime from the data (e.g. the top-ranked gene).
 */
export interface Step {
  id: string
  route: string | ((d: SiteData) => string)
  target: string // value of a data-tour attribute
  title: string
  body: string | ((d: SiteData) => string)
}

const topGene = (d: SiteData) => d.genes[0]?.symbol ?? 'MKI67'

export const STEPS: Step[] = [
  {
    id: 'welcome',
    route: '/',
    target: 'hero-title',
    title: 'Welcome to the slide',
    body: 'This site goes with our Colab notebook. It asks one question: which gene-activity differences separate Luminal A from Luminal B breast tumours, and how well do they tell the two apart? The tour takes about two minutes.',
  },
  {
    id: 'lineup',
    route: '/',
    target: 'lineup',
    title: 'The line-up: 59 real tumours',
    body: 'Each nucleus is one tumour. Left to right is how strongly its cell-division genes are switched on. Darker brown means faster division, the way a Ki-67 stain shows it on a pathology slide. The top lane holds tumours labelled Luminal A and the bottom lane Luminal B.',
  },
  {
    id: 'cut',
    route: '/',
    target: 'cut-handle',
    title: 'Drag the dividing line',
    body: 'This is the line a pathologist effectively draws on a Ki-67 scale. Drag it, or focus it and use the arrow keys, and watch the counts underneath. The costly mistake is a Luminal B tumour called Luminal A, because that can mean chemotherapy is not offered. The page stays live under this card.',
  },
  {
    id: 'two-lines',
    route: '/',
    target: 'two-lines',
    title: 'A second dividing line',
    body: (d) =>
      `We did not expect this one. Five genes that sit together on chromosome 17 (the HER2 amplicon) separate the subtypes almost as well as division speed. Of the ${d.summary.her2.slowLumB} Luminal B tumours that divide slowly, ${d.summary.her2.slowLumBHer2High} are HER2-high. Because we found it after looking at the results, we label it exploratory.`,
  },
  {
    id: 'volcano',
    route: '/genes',
    target: 'volcano',
    title: 'Every probe, one dot',
    body: (d) =>
      `Each dot is one probe (one of ${d.summary.de.tested.toLocaleString()} tiny light meters on the chip). Dots further right are higher in Luminal B and dots further up have stronger evidence. Points above the dashed line pass our false-discovery correction.`,
  },
  {
    id: 'prolif-toggle',
    route: '/genes',
    target: 'prolif-toggle',
    title: 'Brown means cell division',
    body: 'We named 21 cell-division genes (the PAM50 proliferation set) before looking at any results, so we could not pick them after the fact. Brown is the only place that colour appears. Switch to the wider Gene Ontology cell-cycle set to see how much of the volcano lights up.',
  },
  {
    id: 'table',
    route: '/genes',
    target: 'gene-table',
    title: 'The ranked genes',
    body: 'Each strip shows one gene across all 59 tumours, ordered by proliferation like the line-up. A strip that darkens left to right is a gene that rises with division speed. Open any row.',
  },
  {
    id: 'gene',
    route: (d) => `/genes/${encodeURIComponent(topGene(d))}`,
    target: 'mirror',
    title: 'One gene, two daughter cells',
    body: (d) =>
      `This is ${topGene(d)}, our top-ranked gene. Luminal A sits left of the plate and Luminal B sits right. The scatter beside it asks the honest question: is this gene telling us something new, or just tracking how fast the cells divide?`,
  },
  {
    id: 'ladder',
    route: '/classifier',
    target: 'ladder',
    title: 'The ladder of baselines',
    body: 'Each rung is a classifier tested only on tumours it never saw during training (nested cross-validation). The pinch marks the average score, and each dark band is one test fold. A long chromosome means a shaky estimate.',
  },
  {
    id: 'prolif-rung',
    route: '/classifier',
    target: 'rung-prolif',
    title: 'The headline comparison',
    body: (d) => {
      const p = d.classifier.models.find((m) => m.key === 'prolif')
      const f = d.classifier.models.find((m) => m.key === 'full')
      return p && f
        ? `Cell-division genes alone score AUC ${p.auc.mean.toFixed(2)}, against ${f.auc.mean.toFixed(2)} for every probe, so division speed carries almost all of it. Now look lower down: removing proliferation barely hurts, because the HER2 amplicon takes over. Only the rung with both removed drops.`
        : 'Compare the proliferation-only rung with the full model.'
    },
  },
  {
    id: 'limits',
    route: '/method',
    target: 'limits',
    title: 'Where this stops being true',
    body: 'This is 59 tumours from one French hospital, and the labels were themselves defined from gene expression. The work is for research and coursework only and must never inform a clinical decision.',
  },
  {
    id: 'reopen',
    route: '/method',
    target: 'guide-key',
    title: 'Come back any time',
    body: 'Reopen this tour, tour a single screen, or read the glossary from Guide, or press ? anywhere.',
  },
]

export const resolveRoute = (s: Step, d: SiteData) => (typeof s.route === 'function' ? s.route(d) : s.route)
export const resolveBody = (s: Step, d: SiteData) => (typeof s.body === 'function' ? s.body(d) : s.body)

export const GLOSSARY: [string, string][] = [
  ['Gene', 'A stretch of DNA that holds the recipe for one protein (one working part of a cell).'],
  ['Gene expression', 'How strongly a gene is switched on right now, measured by how much of its message (RNA) the cell is making.'],
  ['Microarray', 'A glass chip holding about 54,000 tiny light meters, one per probe. The brighter a spot glows, the more of that gene’s message was in the sample.'],
  ['Probe', 'One spot on the chip, designed to catch the message of one gene. Some genes have several probes.'],
  ['Tumour subtype', 'A family of tumours that behave alike and get similar treatment.'],
  ['Luminal A', 'Hormone-sensitive breast cancer that grows slowly. It usually does well on hormone therapy alone.'],
  ['Luminal B', 'Also hormone-sensitive, but faster-growing. Doctors are more likely to add chemotherapy.'],
  ['Proliferation', 'How fast cells are dividing to make more cells.'],
  ['Differential expression', 'A gene that is reliably more switched on in one group than the other.'],
  ['p-value', 'If there were truly no difference, how often would chance alone produce a gap this big? Small means “rarely”.'],
  ['Multiple-testing correction', 'Adjusting p-values because running thousands of tests guarantees some lucky-looking results.'],
  ['False discovery rate (FDR)', 'Among the genes we call significant, the share we expect to be false alarms. FDR 5% means about 1 in 20.'],
  ['Cross-validation', 'Hiding some tumours, training on the rest, testing on the hidden ones, then rotating so that every tumour is tested once.'],
  ['Data leakage', 'When information from the test tumours sneaks into training, so the score looks better than it really is.'],
  ['Baseline', 'A deliberately simple model to compare against. If the fancy model can’t beat it, the fancy model hasn’t learned much.'],
  ['ROC-AUC', 'The chance that the model ranks a random Luminal B tumour above a random Luminal A one. 0.5 is a coin flip and 1.0 is perfect.'],
  ['Ki-67 / MKI67', 'A protein (and its gene) made only by dividing cells. Pathologists stain for it to measure how fast a tumour grows.'],
]
