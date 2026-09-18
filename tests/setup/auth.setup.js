/**
 * tests/setup/auth.setup.js
 * -------------------------------------------------------------
 * Playwright setup project: Authenticates as Admin (badendgg)
 * and persists the authenticated browser storage state to
 * tests/.auth/admin.json for all subsequent E2E test suites.
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.resolve(__dirname, '../.auth/admin.json');

setup('authenticate as admin badendgg', async ({ page }) => {
    console.log('🔑 [Auth Setup] Authenticating as admin (badendgg@gmail.com)...');

    // Ensure the output directory exists
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Navigate to the login page
    await page.goto('/login');

    // Wait for login modal elements
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitButton = page.getByRole('button', { name: /เข้าสู่ระบบ/i });

    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await emailInput.fill('badendgg@gmail.com');
    await passwordInput.fill('Password123!');

    // Submit form
    await submitButton.click();

    // Wait for token to appear in localStorage or navigation to dashboard / role home
    await page.waitForFunction(() => {
        return Boolean(localStorage.getItem('token'));
    }, { timeout: 15000 });

    // Verify authenticated user profile was resolved
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // Save authenticated storage state
    await page.context().storageState({ path: authFile });
    console.log(`✅ [Auth Setup] Authenticated state saved to ${authFile}`);
});
