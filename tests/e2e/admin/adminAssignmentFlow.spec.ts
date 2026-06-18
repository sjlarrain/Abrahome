import { test, expect } from '@playwright/test'

/**
 * A-16: Admin booking assignment flow E2E test.
 *
 * Prerequisites:
 *   - .env.local has real Supabase credentials
 *   - `supabase db reset` has been run (seed provides house + beds + admin user)
 *   - Admin credentials:
 *       E2E_ADMIN_EMAIL (default: admin@test.abrahome.local)
 *       E2E_ADMIN_PASSWORD (default: adminpassword123)
 *   - A pending booking request exists (run the booking flow E2E first)
 */

test.describe('Admin assignment flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', process.env.E2E_ADMIN_EMAIL ?? 'admin@test.abrahome.local')
    await page.fill('[name=password]', process.env.E2E_ADMIN_PASSWORD ?? 'adminpassword123')
    await page.click('[type=submit]')
    await page.waitForURL(/\/admin/)
  })

  test('admin dashboard shows pending count', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Pending requests')).toBeVisible()
    await expect(page.getByText('Total beds')).toBeVisible()
  })

  test('pending bookings list shows pending requests', async ({ page }) => {
    await page.goto('/admin/bookings')
    await expect(page.getByText('Pending Bookings')).toBeVisible()
  })

  test('admin can reject a pending booking', async ({ page }) => {
    await page.goto('/admin/bookings')
    const reviewLink = page.locator('a:has-text("Review")').first()
    if (!(await reviewLink.isVisible())) {
      test.skip()
      return
    }
    await reviewLink.click()
    await page.waitForURL(/\/admin\/bookings\/[0-9a-f-]+$/)

    await page.getByRole('button', { name: 'Reject' }).click()
    await page.fill('textarea', 'Dates unavailable for admin reasons')
    await page.getByRole('button', { name: 'Confirm reject' }).click()

    await expect(page.getByText('rejected')).toBeVisible()
  })

  test('admin calendar renders current month', async ({ page }) => {
    await page.goto('/admin/calendar')
    await expect(page.getByText('Calendar')).toBeVisible()
    // Should show day headers
    await expect(page.getByText('Sun')).toBeVisible()
    await expect(page.getByText('Mon')).toBeVisible()
  })

  test('admin settings page loads', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page.getByText('Settings')).toBeVisible()
  })
})
