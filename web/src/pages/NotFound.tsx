import { Empty } from '../components/States'

export function NotFound() {
  return (
    <div className="page">
      <p className="label not-found-code">404 · off the slide</p>
      <Empty title="Nothing is mounted at this address.">
        The field of view is empty. The page may have moved, or the link was mistyped. There are four plates: the line-up, the genes, the classifier and the method.
      </Empty>
    </div>
  )
}
