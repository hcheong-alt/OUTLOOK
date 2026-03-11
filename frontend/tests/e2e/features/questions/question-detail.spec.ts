import { test, expect } from '@playwright/test'

test.describe('Question Detail', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the questions list first, then click into the first question
    await page.goto('/questions')

    const firstRow = page.getByRole('table').locator('tbody tr').first()
    await expect(firstRow).toBeVisible()
    await firstRow.click()

    // Wait for navigation to detail page
    await page.waitForURL(/\/questions\/.+/)
  })

  test('question title and badges display', async ({ page }) => {
    const title = page.getByRole('heading').first()
    await expect(title).toBeVisible()
    await expect(title).not.toHaveText('')

    // Status badge should be present
    const badge = page.locator('[data-testid="question-status-badge"]').or(
      page.getByText(/open|closed|resolved|pending/i).first(),
    )
    await expect(badge).toBeVisible()
  })

  test('back link is present', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back/i }).or(
      page.getByRole('button', { name: /back/i }),
    ).or(
      page.locator('[data-testid="back-link"]'),
    )
    await expect(backLink).toBeVisible()
  })

  test('four tabs are visible', async ({ page }) => {
    const tabNames = ['Predict', 'Community', 'Comments', 'Activity']

    for (const tabName of tabNames) {
      const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') })
      await expect(tab).toBeVisible()
    }
  })

  test('prediction slider and submit button are present', async ({ page }) => {
    // Ensure we are on the Predict tab
    const predictTab = page.getByRole('tab', { name: /predict/i })
    await predictTab.click()

    const slider = page.getByRole('slider').or(
      page.locator('[data-testid="prediction-slider"]'),
    )
    await expect(slider).toBeVisible()

    const submitButton = page.getByRole('button', { name: /submit/i })
    await expect(submitButton).toBeVisible()
  })

  test('comment form is visible on Comments tab', async ({ page }) => {
    const commentsTab = page.getByRole('tab', { name: /comments/i })
    await commentsTab.click()

    const commentInput = page.getByRole('textbox', { name: /comment/i }).or(
      page.getByPlaceholder(/comment/i),
    ).or(
      page.locator('[data-testid="comment-input"]'),
    )
    await expect(commentInput).toBeVisible()
  })
})
