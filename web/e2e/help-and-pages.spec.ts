import { expect, test } from '@playwright/test'
import { markGuideSeen, noHorizontalOverflow } from './helpers'

test.beforeEach(async ({ page }) => {
  await markGuideSeen(page)
})

test('? opens the Lab notes drawer from anywhere; Esc closes it', async ({ page }) => {
  await page.goto('./#/classifier')
  await expect(page.locator('main')).toBeVisible()
  await page.keyboard.press('?')
  const drawer = page.getByTestId('help-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('Glossary')
  await expect(drawer).toContainText('False discovery rate')
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
})

test('the Guide key opens the drawer, which can start a tour of this screen', async ({ page }) => {
  await page.goto('./#/genes')
  await page.getByRole('button', { name: /Guide/ }).click()
  await expect(page.getByTestId('help-drawer')).toBeVisible()
  await page.getByTestId('help-drawer').getByRole('button', { name: 'Tour this screen' }).click()
  const card = page.getByTestId('tour-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('1 / 3')
})

const ROUTES = ['./', './#/genes', './#/classifier', './#/method', './#/genes/MKI67', './#/does-not-exist']

for (const r of ROUTES) {
  test(`renders without horizontal overflow: ${r}`, async ({ page }) => {
    await page.goto(r)
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(400)
    expect(await noHorizontalOverflow(page)).toBe(true)
  })
}

test('404 is themed', async ({ page }) => {
  await page.goto('./#/nowhere')
  await expect(page.getByText('off the slide')).toBeVisible()
})

test('classifier rungs are selectable', async ({ page }) => {
  await page.goto('./#/classifier')
  await page.getByTestId('rung-full').click()
  await expect(page.locator('.model-head h2')).toContainText('Full model')
  await page.getByTestId('rung-prolif').press('Enter')
  await expect(page.locator('.model-head h2')).toContainText('Proliferation')
})

test('the volcano highlight switches gene sets', async ({ page }) => {
  await page.goto('./#/genes')
  const note = page.locator('.toolbar-note').first()
  const before = await note.innerText()
  await page.getByRole('radio', { name: /GO cell cycle/ }).click()
  await expect(note).not.toHaveText(before)
})
