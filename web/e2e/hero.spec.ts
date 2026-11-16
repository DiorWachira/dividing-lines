import { expect, test } from '@playwright/test'
import { markGuideSeen } from './helpers'

test.beforeEach(async ({ page }) => {
  await markGuideSeen(page)
  await page.goto('./')
})

test('the line-up draws all 59 tumours', async ({ page }) => {
  await expect(page.locator('[data-testid^="nuc-GSM"]')).toHaveCount(59)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Luminal')
})

test('the dividing line moves with the keyboard and the readout follows', async ({ page }) => {
  const handle = page.getByRole('slider', { name: /dividing line/i })
  await handle.focus()
  const before = await handle.getAttribute('aria-valuenow')
  const readout = page.locator('[data-tour="readout"]')
  const textBefore = await readout.innerText()
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowRight')
  const after = await handle.getAttribute('aria-valuenow')
  expect(Number(after)).toBeGreaterThan(Number(before))
  await expect(readout).not.toHaveText(textBefore)
  // B snaps back to the best line
  await page.keyboard.press('b')
  await expect(handle).toHaveAttribute('aria-valuenow', before!)
})

test('hovering a nucleus shows a readout and clicking opens the tumour', async ({ page, isMobile }) => {
  const nuc = page.locator('[data-testid^="nuc-GSM"]').first()
  const id = (await nuc.getAttribute('data-testid'))!.replace('nuc-', '')
  if (!isMobile) {
    await nuc.hover()
    await expect(page.locator('.lineup-tip')).toContainText(id)
  }
  await nuc.click()
  await expect(page).toHaveURL(new RegExp(`#/tumours/${id}$`))
  await expect(page.locator('.tumour-head .label').first()).toContainText(id)
})
