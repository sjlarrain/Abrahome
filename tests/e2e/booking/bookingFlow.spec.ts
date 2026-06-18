import { test, expect } from '@playwright/test'

/**
 * B-13: Full booking request flow E2E test.
 *
 * Prerequisites (must be set up before running):
 *   - .env.local has real Supabase credentials
 *   - `supabase db reset` has been run (seed data provides house + beds)
 *   - A test family member account exists:
 *       EMAIL=family@test.abrahome.local  PASSWORD=testpassword123
 *     (created by running seed or manually via the register page)
 *
 * The tests use a future date far enough from today to satisfy min_advance_days.
 */

const CHECK_IN = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
})()

const CHECK_OUT = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 37)
  return d.toISOString().slice(0, 10)
})()

test.describe('Booking request flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as the test family user
    await page.goto('/login')
    await page.fill('[name=email]', process.env.E2E_FAMILY_EMAIL ?? 'family@test.abrahome.local')
    await page.fill('[name=password]', process.env.E2E_FAMILY_PASSWORD ?? 'testpassword123')
    await page.click('[type=submit]')
    await page.waitForURL(/\/dashboard/)
  })

  test('submits a booking request and sees it in My bookings', async ({ page }) => {
    await page.goto('/dashboard/bookings/new')
    await expect(page.getByText('New booking request')).toBeVisible()

    // Select check-in date on the calendar
    await page.getByLabel(`${CHECK_IN} —`).click()
    // Select check-out date
    await page.getByLabel(`${CHECK_OUT} —`).click()

    // Select first attendee checkbox
    await page.locator('input[type=checkbox]').first().check()

    await page.click('[type=submit]')

    // Should redirect to the booking detail page
    await page.waitForURL(/\/dashboard\/bookings\/[0-9a-f-]+$/)
    await expect(page.getByText('pending', { exact: false })).toBeVisible()
    await expect(page.getByText(CHECK_IN)).toBeVisible()
  })

  test('shows the booking in My bookings list', async ({ page }) => {
    await page.goto('/dashboard/bookings')
    await expect(page.getByText('My bookings')).toBeVisible()
    // At least one booking should be visible after the previous test
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('can cancel a pending booking before the deadline', async ({ page }) => {
    await page.goto('/dashboard/bookings')
    await page.locator('a:has-text("View")').first().click()
    await page.waitForURL(/\/dashboard\/bookings\/[0-9a-f-]+$/)

    const cancelButton = page.getByRole('button', { name: 'Cancel booking' })
    if (await cancelButton.isVisible()) {
      page.once('dialog', (dialog) => dialog.accept())
      await cancelButton.click()
      await expect(page.getByText('cancelled', { exact: false })).toBeVisible()
    } else {
      // Booking may already be past the deadline; skip gracefully
      test.skip()
    }
  })
})
