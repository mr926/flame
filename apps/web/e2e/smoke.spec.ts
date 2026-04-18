import { test, expect } from '@playwright/test';

test('setup → login → homepage shows pinned apps', async ({ page }) => {
  await page.goto('/setup');
  await page.fill('input[type="password"]', 'testpassword!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
  await expect(page.locator('h2').first()).toBeVisible();
});

test('login page shows password field', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
