import { expect, test } from '@playwright/test'

test('first visit: invite → tour across screens → Esc → never shown again', async ({ page }) => {
  await page.goto('./')
  const invite = page.getByTestId('guide-invite')
  await expect(invite).toBeVisible()
  await invite.getByRole('button', { name: 'Start the tour' }).click()

  const card = page.getByTestId('tour-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('1 / 12')
  // focus moves into the card
  await expect(page.getByTestId('tour-next')).toBeFocused()

  // the target stays clickable under the veil: the dividing-line handle (stop 3)
  await page.getByTestId('tour-next').click()
  await page.getByTestId('tour-next').click()
  await expect(card).toContainText('3 / 12')

  // keyboard → advances; stop 5 lives on another screen
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/#\/genes$/)
  await expect(card).toContainText('5 / 12')
  await expect(card).toContainText('Every probe')

  // ← goes back
  await page.keyboard.press('ArrowLeft')
  await expect(card).toContainText('4 / 12')

  await page.keyboard.press('Escape')
  await expect(card).toHaveCount(0)

  await page.goto('./')
  await page.reload()
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('guide-invite')).toHaveCount(0)
})

test('"Not now" dismisses the invitation for good', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('guide-invite').getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByTestId('guide-invite')).toHaveCount(0)
  await page.reload()
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('guide-invite')).toHaveCount(0)
})

test('the tour can be finished end to end', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('guide-invite').getByRole('button', { name: 'Start the tour' }).click()
  for (let i = 1; i < 12; i++) {
    await expect(page.getByTestId('tour-card')).toContainText(`${i} / 12`)
    await page.getByTestId('tour-next').click()
  }
  await expect(page).toHaveURL(/#\/method$/)
  await expect(page.getByTestId('tour-next')).toHaveText('Finish')
  await page.getByTestId('tour-next').click()
  await expect(page.getByTestId('tour-card')).toHaveCount(0)
})
