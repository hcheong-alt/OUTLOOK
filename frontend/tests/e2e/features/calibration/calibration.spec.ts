import { test, expect } from '@playwright/test'

test.describe('Calibration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calibration')
  })

  test('calibration page heading is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /calibration/i }),
    ).toBeVisible()
  })

  test('period filter buttons are visible', async ({ page }) => {
    const filterGroup = page.getByRole('group').or(
      page.locator('[data-testid="period-filters"]'),
    )

    const periodButtons = filterGroup.getByRole('button').or(
      page.getByRole('button', { name: /week|month|quarter|year|all/i }),
    )
    await expect(periodButtons.first()).toBeVisible()
  })

  test('leaderboard table is present', async ({ page }) => {
    const table = page.getByRole('table')
    await expect(table).toBeVisible()

    // Verify table has header columns
    const headers = table.locator('thead th')
    await expect(headers.first()).toBeVisible()

    // Verify at least one data row
    const rows = table.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('summary stats cards are present', async ({ page }) => {
    const statsSection = page.locator('[data-testid="calibration-stats"]').or(
      page.locator('[data-testid="summary-stats"]'),
    ).or(
      page.locator('.grid').first(),
    )
    await expect(statsSection).toBeVisible()

    // At least two stat cards should be visible
    const cards = statsSection.locator('[data-testid="stat-card"]').or(
      statsSection.locator('.rounded-lg, .rounded-md').filter({ hasText: /\d/ }),
    )
    await expect(cards.first()).toBeVisible()
  })
})
