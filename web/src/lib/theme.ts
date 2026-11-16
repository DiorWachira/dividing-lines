import { useEffect, useState } from 'react'
import { store } from './util'

/** Brightfield (light) vs fluorescence (dark) imaging mode. 'auto' follows the OS. */
export type Mode = 'auto' | 'light' | 'dark'

export function useMode() {
  const [mode, setMode] = useState<Mode>(() => {
    const m = store.get('dl.mode')
    return m === 'light' || m === 'dark' ? m : 'auto'
  })
  useEffect(() => {
    const el = document.documentElement
    if (mode === 'auto') el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', mode)
    store.set('dl.mode', mode)
  }, [mode])
  return [mode, setMode] as const
}

export function effectiveDark(mode: Mode) {
  if (mode !== 'auto') return mode === 'dark'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}
