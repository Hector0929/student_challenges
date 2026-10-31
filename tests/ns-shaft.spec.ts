import { test, expect } from '@playwright/test';

test.describe('NS Shaft (怪獸下樓梯) Regression & Smoke Tests', () => {
    test('game loads cleanly with zero console errors and shows Monster Tower UI', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/games/ns_shaft.html?userId=test-user-1');

        expect(errors).toEqual([]);
        await expect(page.locator('#menu-modal')).toBeVisible();
        await expect(page.locator('#btn-start')).toBeVisible();
        await expect(page.locator('#canvas')).toBeVisible();
    });

    test('starting game initializes player, platforms and test hooks', async ({ page }) => {
        await page.goto('/games/ns_shaft.html?userId=test-user-2');

        await page.click('#btn-start');

        await expect(page.locator('#hud')).toBeVisible();
        await expect(page.locator('#floor-display')).toHaveText('第 1 層');

        const isRunning = await page.evaluate(() => {
            const hook = (window as any).__shaft;
            return hook && hook.state.running;
        });
        expect(isRunning).toBe(true);
    });

    test('supports user progress isolation and star reporting structure', async ({ page }) => {
        await page.goto('/games/ns_shaft.html?userId=kid-alice');

        await page.evaluate(() => {
            localStorage.setItem('ns_shaft_save_kid-alice', JSON.stringify({ bestFloor: 42, totalStars: 7, ctrlMode: 'drag' }));
        });
        await page.reload();

        await expect(page.locator('#menu-best')).toHaveText('42 層');
        await expect(page.locator('#menu-stars')).toHaveText('⭐ 7');
    });

    test('controls mode toggle switches between drag and on-screen buttons', async ({ page }) => {
        await page.goto('/games/ns_shaft.html?userId=kid-bob');

        const toggleBtn = page.locator('#btn-toggle-ctrl');
        await expect(toggleBtn).toHaveText(/單指滑動/);

        await toggleBtn.click();
        await expect(toggleBtn).toHaveText(/左右按鈕/);

        await page.click('#btn-start');
        await expect(page.locator('#btn-controls')).toBeVisible();
    });
});
