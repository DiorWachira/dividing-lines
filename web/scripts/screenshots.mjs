// Capture README / review screenshots of every screen in light, dark and mobile.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/screenshots.mjs [outDir]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '../docs/screenshots'
const base = process.env.BASE ?? 'http://localhost:4173/'
mkdirSync(out, { recursive: true })

const routes = [
  ['overview', '#/'],
  ['genes', '#/genes'],
  ['gene', '#/genes/MKI67'],
  ['classifier', '#/classifier'],
  ['method', '#/method'],
  ['tumour', '#/tumours/GSM1116182'],
  ['notfound', '#/nowhere'],
]

const browser = await chromium.launch()
for (const [mode, viewport, full] of [
  ['light', { width: 1360, height: 900 }, true],
  ['dark', { width: 1360, height: 900 }, true],
  ['mobile', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport, colorScheme: mode === 'dark' ? 'dark' : 'light', deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await ctx.addInitScript(() => {
    localStorage.setItem('dl.guide.seen', '1')
    localStorage.setItem('dl.guide.invited', '1')
  })
  const page = await ctx.newPage()
  for (const [name, hash] of routes) {
    await page.goto(base + hash)
    await page.waitForSelector('main')
    await page.waitForTimeout(700)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await page.screenshot({ path: `${out}/${mode}-${name}.png`, fullPage: full })
    console.log(mode, name, overflow > 1 ? `OVERFLOW ${overflow}px` : 'ok')
  }
  // the tour and the help drawer
  if (mode !== 'dark') {
    await page.evaluate(() => {
      localStorage.removeItem('dl.guide.seen')
      localStorage.removeItem('dl.guide.invited')
    })
    await ctx.clearCookies()
    const p2 = await ctx.newPage()
    await p2.addInitScript(() => localStorage.clear())
    await p2.goto(base + '#/')
    await p2.waitForSelector('[data-testid="guide-invite"]')
    await p2.screenshot({ path: `${out}/${mode}-invite.png` })
    await p2.getByRole('button', { name: 'Start the tour' }).click()
    await p2.getByTestId('tour-next').click()
    await p2.waitForTimeout(900)
    await p2.screenshot({ path: `${out}/${mode}-tour.png` })
    await p2.keyboard.press('Escape')
    await p2.keyboard.press('?')
    await p2.waitForTimeout(400)
    await p2.screenshot({ path: `${out}/${mode}-help.png` })
    await p2.close()
  }
  await ctx.close()
}
await browser.close()
