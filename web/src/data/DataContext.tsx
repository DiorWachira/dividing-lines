import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { GeneRow, SiteData, Volcano } from './types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SiteData }

const DataCtx = createContext<State>({ status: 'loading' })

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    Promise.all([
      getJson<Omit<SiteData, 'genes' | 'volcano'>>('site.json'),
      getJson<GeneRow[]>('genes.json'),
      getJson<Volcano>('volcano.json'),
    ])
      .then(([site, genes, volcano]) => {
        if (alive) setState({ status: 'ready', data: { ...site, genes, volcano } })
      })
      .catch((err: unknown) => {
        if (alive) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      alive = false
    }
  }, [])

  return <DataCtx.Provider value={state}>{children}</DataCtx.Provider>
}

export function useDataState() {
  return useContext(DataCtx)
}

/** Only call inside <Ready>; throws if data is not loaded. */
export function useData(): SiteData {
  const s = useContext(DataCtx)
  if (s.status !== 'ready') throw new Error('useData called before data was ready')
  return s.data
}
