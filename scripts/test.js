// tests/example.spec.js
import { expect, test } from '@playwright/test'

test('Homepage loads', async ({ page }) => {
  await page.goto('http://localhost:8000')

  // Check if a specific element is present, for example, the Laravel welcome text.
  const welcomeText = await page.textContent('h1')

  expect(welcomeText).toContain('GWN')
})
