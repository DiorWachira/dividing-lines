import type { Page } from '@playwright/test'

/** Mark the first-run guide as already seen, so other tests are not interrupted by the invitation. */
export async function markGuideSeen(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('dl.guide.seen', '1')
      localStorage.setItem('dl.guide.invited', '1')
    } catch {
      /* ignore */
    }
  })
}

export async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}
