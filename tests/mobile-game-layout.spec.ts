import { test, expect } from '@playwright/test';

test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
});

test.describe('Mobile game layout smoke tests', () => {
    test('learning game (pronunciation) keeps options reachable on mobile', async ({ page }) => {
        await page.goto('/games/pronunciation_game.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        const firstCategoryBtn = page.locator('#category-screen .grid button').first();
        await expect(firstCategoryBtn).toBeVisible();
        await firstCategoryBtn.click();

        const firstOption = page.locator('#options-container button').first();
        await expect(firstOption).toBeVisible();
        await firstOption.click();

        await expect(page.locator('#feedback-panel')).toBeVisible();
    });

    test('fun game (2048) shows mobile controls on touch viewport', async ({ page }) => {
        await page.goto('/games/2048_cyber.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        const mobileControls = page.locator('#mobile-controls');
        await expect(mobileControls).toBeVisible();
        await expect(mobileControls.locator('button').first()).toBeVisible();
    });

    test('learning game (idiom) keeps container inside dynamic viewport', async ({ page }) => {
        await page.goto('/games/idiom_game.html');

        const metrics = await page.locator('.game-container').evaluate((el) => {
            const parsed = Number.parseFloat(getComputedStyle(el).maxHeight || '0');
            return {
                maxHeightPx: parsed,
                viewportHeight: window.innerHeight,
            };
        });
        expect(metrics.maxHeightPx).toBeGreaterThan(0);
        expect(metrics.maxHeightPx).toBeLessThanOrEqual(metrics.viewportHeight);

        await expect(page.locator('#start-screen')).toBeVisible();
        await expect(page.locator('.mode-btn').first()).toBeVisible();
    });

    test('fun game (snake) renders touch controls and board on mobile', async ({ page }) => {
        await page.goto('/games/snake_game.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        await expect(page.locator('#mobile-controls')).toBeVisible();
        await expect(page.locator('#gameCanvas')).toBeVisible();
    });

    test('learning game (division) has scroll-safe body and visible numpad', async ({ page }) => {
        await page.goto('/games/division_test.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        await page.click('#start-button');
        await expect(page.locator('#numpad')).toBeVisible();
        await expect(page.locator('#answer-input')).toBeVisible();
    });

    test('fun game (bubble shooter) keeps square board visible on mobile', async ({ page }) => {
        await page.goto('/games/bubble_shooter.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        await expect(page.locator('#gameCanvas')).toBeVisible();
        await expect(page.locator('#menu-screen')).toBeVisible();
    });

    test('learning game (multiplication) keeps numpad reachable on mobile', async ({ page }) => {
        await page.goto('/games/multiplication_test.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        await page.click('#start-button');
        await expect(page.locator('#numpad')).toBeVisible();
        await expect(page.locator('#question-display')).toBeVisible();
    });

    test('learning game (subtraction) keeps numpad reachable on mobile', async ({ page }) => {
        await page.goto('/games/subtraction_test.html');

        const overflowY = await page.evaluate(() => getComputedStyle(document.body).overflowY);
        expect(['auto', 'scroll']).toContain(overflowY);

        await page.click('#start-button');
        await expect(page.locator('#numpad')).toBeVisible();
        await expect(page.locator('#question-display')).toBeVisible();
    });
});
