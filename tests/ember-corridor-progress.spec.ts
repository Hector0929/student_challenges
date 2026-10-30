import { test, expect } from '@playwright/test';

// 銀河守衛：每位小孩的關卡進度分開存，舊版共用進度第一次會沿用過來
test.describe('Ember corridor progress', () => {
    test('stage unlock progress is isolated by userId', async ({ page }) => {
        await page.goto('/games/ember_corridor.html?userId=playwright-user-a');

        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('ember_corridor_progress_playwright-user-a', '5');
        });
        await page.reload();

        // 六個星域都解鎖
        await expect(page.locator('#stageSeg button')).toHaveCount(6);
        await expect(page.locator('#stageSeg button:disabled')).toHaveCount(0);

        await page.goto('/games/ember_corridor.html?userId=playwright-user-b');

        // 另一位小孩只開第一關
        await expect(page.locator('#stageSeg button:disabled')).toHaveCount(5);
    });

    test('old shared progress is used on first load', async ({ page }) => {
        await page.goto('/games/ember_corridor.html?userId=playwright-user-c');

        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('ember_corridor_progress', '2');
        });
        await page.reload();

        await expect(page.locator('#stageSeg button:disabled')).toHaveCount(3);
    });

    test('picking a ship and launching starts the battle', async ({ page }) => {
        await page.goto('/games/ember_corridor.html?userId=playwright-user-d');

        await page.locator('#cards .card').nth(2).click();
        await expect(page.locator('#cards .card').nth(2)).toHaveClass(/sel/);

        await page.click('#launch');
        await expect(page.locator('#scene-game')).toHaveClass(/on/);
        await expect.poll(() => page.evaluate(() => (window as unknown as { __stg: { state: string; player: { ship: { id: string } } } }).__stg.player.ship.id)).toBe('titan');
    });
});
