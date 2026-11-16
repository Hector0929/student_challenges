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

        await expect(page.locator('#top-right-hud')).toBeVisible();
        await expect(page.locator('#menu-modal')).toBeHidden();

        const isRunning = await page.evaluate(() => {
            const hook = (window as unknown as { __shaft?: { state: { running: boolean } } }).__shaft;
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

    test('keyboard moves the player and pause button opens the pause menu', async ({ page }) => {
        await page.goto('/games/ns_shaft.html?userId=kid-bob');
        await page.click('#btn-start');

        type Hook = { __shaft: { player: { x: number }; state: { paused: boolean } } };
        const startX = await page.evaluate(() => (window as unknown as Hook).__shaft.player.x);
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(400);
        await page.keyboard.up('ArrowLeft');
        const endX = await page.evaluate(() => (window as unknown as Hook).__shaft.player.x);
        expect(endX).toBeLessThan(startX);

        await page.click('#btn-pause');
        await expect(page.locator('#pause-modal')).toBeVisible();
        expect(await page.evaluate(() => (window as unknown as Hook).__shaft.state.paused)).toBe(true);

        await page.click('#btn-resume');
        await expect(page.locator('#pause-modal')).toBeHidden();
    });
});
