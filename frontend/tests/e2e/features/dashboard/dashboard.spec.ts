import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('dashboard page title is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible()
  })

  test('summary cards are present', async ({ page }) => {
    const openQuestionsCard = page.getByText(/open questions/i)
    await expect(openQuestionsCard).toBeVisible()

    const brierScoreCard = page.getByText(/brier score/i)
    await expect(brierScoreCard).toBeVisible()
  })

  test('recent resolutions section is visible', async ({ page }) => {
    const recentResolutions = page.getByRole('heading', { name: /recent resolutions/i }).or(
      page.getByText(/recent resolutions/i),
    )
    await expect(recentResolutions).toBeVisible()
  })

  test('"New Question" button is visible', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new question/i }).or(
      page.getByRole('link', { name: /new question/i }),
    )
    await expect(newButton).toBeVisible()
  })
})
