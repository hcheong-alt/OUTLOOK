import { test, expect } from '@playwright/test'

test.describe('Questions List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/questions')
  })

  test('page title is visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /questions/i }),
    ).toBeVisible()
  })

  test('table renders with data', async ({ page }) => {
    const table = page.getByRole('table')
    await expect(table).toBeVisible()

    const rows = table.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('search input filters questions', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i),
    )
    await expect(searchInput).toBeVisible()

    await searchInput.fill('test query')
    await page.waitForTimeout(500)

    const table = page.getByRole('table')
    await expect(table).toBeVisible()
  })

  test('status filter dropdown works', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /status/i }).or(
      page.getByRole('combobox', { name: /status/i }),
    )
    await expect(filterButton).toBeVisible()

    await filterButton.click()

    const dropdown = page.getByRole('listbox').or(
      page.getByRole('menu'),
    )
    await expect(dropdown).toBeVisible()
  })

  test('pagination component is present', async ({ page }) => {
    const pagination = page.getByRole('navigation', { name: /pagination/i }).or(
      page.locator('[data-testid="pagination"]'),
    )
    await expect(pagination).toBeVisible()
  })

  test('clicking question navigates to detail page', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first()
    await expect(firstRow).toBeVisible()

    await firstRow.click()

    await page.waitForURL(/\/questions\/.+/)
  })

  test('"New Question" button is visible', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new question/i }).or(
      page.getByRole('link', { name: /new question/i }),
    )
    await expect(newButton).toBeVisible()
  })
})
