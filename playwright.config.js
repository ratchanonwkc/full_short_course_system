import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.resolve(__dirname, 'tests/.auth/admin.json');

/**
 * Playwright Configuration for Short Course ERP E2E Automation
 */
export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: false,
    workers: 1, // Sequential execution for ERP workflow dependencies
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 20000,
    },

    projects: [
        // 1. Authentication setup project
        {
            name: 'setup',
            testMatch: /auth\.setup\.js/,
        },

        // 2. Main E2E test project using saved admin session state
        {
            name: 'e2e',
            testMatch: /.*\.spec\.js/,
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1600, height: 900 },
                storageState: authFile,
            },
        },
    ],

    // Dev web servers (backend & frontend)
    webServer: [
        {
            command: 'cmd /c "cd backend && npm start"',
            url: 'http://localhost:5000',
            reuseExistingServer: true,
            timeout: 30000,
        },
        {
            command: 'cmd /c "cd frontend && npm run dev"',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 30000,
        },
    ],
});
